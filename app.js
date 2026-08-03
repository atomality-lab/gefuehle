const APP_VERSION='1.3';
'use strict';

const KEY='gefuehlsrad.pwa.v1';
const defaultGroups=[
  {name:'Freude',color:'#4CAF50',sub:['fröhlich','zufrieden','erleichtert','hoffnungsvoll']},
  {name:'Angst',color:'#E53935',sub:['ängstlich','unsicher','nervös','überfordert']},
  {name:'Scham',color:'#F48FB1',sub:['beschämt','unzulänglich','bloßgestellt']},
  {name:'Ekel',color:'#FF9800',sub:['angewidert','abgestoßen','widerwillig']},
  {name:'Trauer',color:'#7E57C2',sub:['traurig','einsam','enttäuscht','verletzt']},
  {name:'Ärger',color:'#2196F3',sub:['genervt','wütend','frustriert','ungerecht behandelt']},
  {name:'Schuld',color:'#FFEB3B',sub:['schuldig','reuevoll','verantwortlich']}
];
const defaultBody=['Hunger','Durst','Schmerz','Kälte','Wärme','Druck','Müdigkeit','Schwäche','Stärke'];
let state=load();
let screen='track';
let draft={group:'',sub:'',intensity:5,body:[],date:formatDate(new Date()),situation:''};
const content=document.querySelector('#content');
const app=document.querySelector('#app');
const lock=document.querySelector('#lock-screen');
const dialog=document.querySelector('#dialog');
const dialogForm=document.querySelector('#dialog-form');
const fileInput=document.querySelector('#file-input');

function load(){
  try{return {...{pin:'',groups:defaultGroups,bodyCatalog:defaultBody,entries:[]},...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {pin:'',groups:defaultGroups,bodyCatalog:defaultBody,entries:[]}}
}
function save(){localStorage.setItem(KEY,JSON.stringify(state));}
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function formatDate(d){return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d).replace(',','');}
function parseDate(v){
  if(v instanceof Date)return isNaN(v.getTime())?null:v;
  if(v===null||v===undefined||String(v).trim()==='')return null;
  const raw=String(v).trim();

  // Echte Excel-Datumszellen kommen beim XLSX-Import als Seriennummer an.
  if(/^\d+(?:[.,]\d+)?$/.test(raw)){
    const serial=Number(raw.replace(',','.'));
    if(Number.isFinite(serial)&&serial>=1&&serial<100000){
      const totalSeconds=Math.round(serial*86400);
      const utc=new Date(Date.UTC(1899,11,30)+totalSeconds*1000);
      const d=new Date(utc.getUTCFullYear(),utc.getUTCMonth(),utc.getUTCDate(),utc.getUTCHours(),utc.getUTCMinutes(),utc.getUTCSeconds());
      return isNaN(d.getTime())?null:d;
    }
  }

  const de=raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if(de){
    const d=new Date(+de[3],+de[2]-1,+de[1],+(de[4]||0),+(de[5]||0),+(de[6]||0));
    return validDateParts(d,+de[3],+de[2],+de[1])?d:null;
  }

  const iso=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/);
  if(iso){
    const d=new Date(+iso[1],+iso[2]-1,+iso[3],+(iso[4]||0),+(iso[5]||0),+(iso[6]||0));
    return validDateParts(d,+iso[1],+iso[2],+iso[3])?d:null;
  }

  const d=new Date(raw);
  return isNaN(d.getTime())?null:d;
}
function validDateParts(d,year,month,day){
  return d.getFullYear()===year&&d.getMonth()===month-1&&d.getDate()===day;
}
function chipSize(t){const n=t.length;return n>22?'.72rem':n>16?'.8rem':n>11?'.9rem':'1rem';}
function toast(msg){const el=document.createElement('div');el.className='toast';el.textContent=msg;document.body.append(el);setTimeout(()=>el.remove(),2600);}
function normalizeLabel(value){
  return String(value??'')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g,' ')
    .toLocaleLowerCase('de-DE');
}
function groupOf(name){
  const key=normalizeLabel(name);
  return state.groups.find(g=>normalizeLabel(g.name)===key);
}
function subOf(group,name){
  const key=normalizeLabel(name);
  return group?.sub.find(x=>normalizeLabel(x)===key)||null;
}
function groupContainingSub(name){
  const key=normalizeLabel(name);
  return state.groups.find(g=>g.sub.some(x=>normalizeLabel(x)===key))||null;
}
function resolveCatalogEmotion(mainValue,subValue){
  let main=String(mainValue??'').trim();
  let sub=String(subValue??'').trim();
  let group=main?groupOf(main):null;

  // Hauptgefühl immer gegen den vollständigen Rad-Katalog prüfen,
  // nicht gegen bereits vorhandene Verlaufseinträge.
  if(group) main=group.name;

  // Fehlt das Hauptgefühl, kann es aus einem bekannten Untergefühl
  // des Rad-Katalogs abgeleitet werden.
  if(!group&&sub){
    const owner=groupContainingSub(sub);
    if(owner){
      group=owner;
      main=owner.name;
      sub=subOf(owner,sub)||sub;
    }else{
      const sameAsMain=groupOf(sub);
      if(sameAsMain){
        group=sameAsMain;
        main=sameAsMain.name;
        sub=subOf(sameAsMain,sub)||sub;
      }
    }
  }

  // Manche Tabellen enthalten das konkrete Gefühl versehentlich in
  // der Spalte Hauptgefühl. Auch dann im Katalog nach dem Besitzer suchen.
  if(!group&&main){
    const owner=groupContainingSub(main);
    if(owner&&!sub){
      group=owner;
      sub=subOf(owner,main)||main;
      main=owner.name;
    }
  }

  return {main,sub,group};
}
function uid(){return Date.now()*1000+Math.floor(Math.random()*1000);}

function boot(){
  if(state.pin){lock.classList.remove('hidden');app.classList.add('hidden');}
  else{lock.classList.add('hidden');app.classList.remove('hidden');render();}
}
document.querySelector('#unlock-button').onclick=()=>{
  if(document.querySelector('#unlock-pin').value===state.pin){lock.classList.add('hidden');app.classList.remove('hidden');render();}
  else document.querySelector('#unlock-error').textContent='PIN stimmt nicht.';
};
document.querySelector('#unlock-pin').addEventListener('keydown',e=>{if(e.key==='Enter')document.querySelector('#unlock-button').click();});
document.querySelectorAll('.nav-button').forEach(b=>b.onclick=()=>{screen=b.dataset.screen;document.querySelectorAll('.nav-button').forEach(x=>x.classList.toggle('active',x===b));render();});

function render(){
  if(screen==='track')renderTrack();
  if(screen==='history')renderHistory();
  if(screen==='stats')renderStats();
  if(screen==='edit')renderEdit();
  if(screen==='settings')renderSettings();
  window.scrollTo({top:0,behavior:'smooth'});
}
function wheelHtml(){
  const gradient=state.groups.map((g,i)=>`${g.color} ${i/state.groups.length*100}% ${(i+1)/state.groups.length*100}%`).join(',');
  return `<div class="wheel-wrap"><div class="wheel" style="background:conic-gradient(${gradient})">${state.groups.map((g,i)=>`<button class="wheel-button ${draft.group===g.name?'selected':''}" data-group="${esc(g.name)}" style="--angle:${i*360/state.groups.length}deg" title="${esc(g.name)}">${esc(g.name)}</button>`).join('')}</div></div>`;
}
function chips(items,selected,color,kind){return `<div class="chip-cloud">${items.map(x=>`<button class="chip ${selected.includes(x)?'selected':''}" data-${kind}="${esc(x)}" style="--chip-bg:${color};--chip-size:${chipSize(x)}">${esc(x)}</button>`).join('')}</div>`;}
function renderTrack(){
  const g=groupOf(draft.group);
  content.innerHTML=`<h1 class="screen-title">Gefühlsrad</h1><p class="intro">Wähle ein Hauptgefühl und anschließend das passende Untergefühl.</p>
  <section class="panel">${wheelHtml()}</section>
  ${g?`<section class="panel" style="background:${g.color}20"><h2 style="text-align:center">${esc(g.name)}</h2>${chips(g.sub,[draft.sub],g.color+'35','sub')}</section>
  <section class="panel"><div class="range-row"><label for="intensity"><strong>Intensität</strong></label><strong id="intensity-value">${draft.intensity}</strong></div><input id="intensity" type="range" min="1" max="10" value="${draft.intensity}">
  <h3>Körpergefühle</h3>${chips(state.bodyCatalog,draft.body,'#e3e3e6','body')}
  <label class="field"><span>Datum und Uhrzeit</span><input id="date" value="${esc(draft.date)}"></label><p class="hint">Format: TT.MM.JJJJ HH:MM, Beispiel: 07.06.2026 14:30</p>
  <label class="field"><span>Situation</span><textarea id="situation" class="situation" placeholder="Was ist passiert?">${esc(draft.situation)}</textarea></label>
  <button id="save-entry" class="primary wide">Eintrag speichern</button></section>`:'<section class="panel empty">Tippe zuerst auf ein Hauptgefühl im Rad.</section>'}`;
  content.querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>{draft.group=b.dataset.group;draft.sub='';renderTrack();});
  content.querySelectorAll('[data-sub]').forEach(b=>b.onclick=()=>{draft.sub=b.dataset.sub;renderTrack();});
  content.querySelectorAll('[data-body]').forEach(b=>b.onclick=()=>{const x=b.dataset.body;draft.body=draft.body.includes(x)?draft.body.filter(y=>y!==x):[...draft.body,x];renderTrack();});
  const range=content.querySelector('#intensity');if(range)range.oninput=e=>{draft.intensity=+e.target.value;content.querySelector('#intensity-value').textContent=draft.intensity;};
  const saveBtn=content.querySelector('#save-entry');if(saveBtn)saveBtn.onclick=()=>{
    draft.date=content.querySelector('#date').value;draft.situation=content.querySelector('#situation').value.trim();
    const d=parseDate(draft.date);if(!draft.sub)return toast('Bitte ein Untergefühl auswählen.');if(!draft.situation)return toast('Bitte die Situation eintragen.');if(!d)return toast('Das Datum ist nicht gültig.');
    state.entries.unshift({id:uid(),main:draft.group,sub:draft.sub,intensity:draft.intensity,body:[...draft.body],situation:draft.situation,time:d.toISOString()});save();
    draft={group:draft.group,sub:'',intensity:5,body:[],date:formatDate(new Date()),situation:''};toast('Eintrag gespeichert.');renderTrack();
  };
}
function entryCard(e){const g=groupOf(e.main)||{color:'#888'};return `<article class="panel entry-card" style="--entry-color:${g.color}"><div class="entry-head"><div><h3>${esc(e.main)} · ${esc(e.sub)}</h3><div class="meta">${formatDate(new Date(e.time))} · Intensität ${e.intensity}/10</div></div></div>${e.body?.length?`<div class="badges">${e.body.map(x=>`<span class="badge">${esc(x)}</span>`).join('')}</div>`:''}<p>${esc(e.situation).replace(/\n/g,'<br>')}</p><div class="button-row"><button class="secondary" data-edit-entry="${e.id}">Bearbeiten</button><button class="danger" data-delete-entry="${e.id}">Löschen</button></div></article>`;}
function renderHistory(){
  content.innerHTML=`<h1 class="screen-title">Verlauf</h1><p class="intro">Gespeicherte und importierte Einträge.</p><section class="panel"><div class="button-row"><button id="import" class="primary">Importieren</button><button id="export-csv" class="secondary">CSV exportieren</button><button id="export-xlsx" class="secondary">Excel exportieren</button><button id="clear" class="danger">Alle löschen</button></div></section>${state.entries.length?state.entries.sort((a,b)=>new Date(b.time)-new Date(a.time)).map(entryCard).join(''):'<section class="panel empty">Noch keine Einträge vorhanden.</section>'}`;
  content.querySelector('#import').onclick=()=>fileInput.click();
  content.querySelector('#export-csv').onclick=exportCSV;content.querySelector('#export-xlsx').onclick=exportXLSX;
  content.querySelector('#clear').onclick=()=>confirmDialog('Alle Einträge löschen?','Diese Aktion kann nicht rückgängig gemacht werden.',()=>{state.entries=[];save();renderHistory();});
  content.querySelectorAll('[data-delete-entry]').forEach(b=>b.onclick=()=>confirmDialog('Eintrag löschen?','Der ausgewählte Eintrag wird entfernt.',()=>{state.entries=state.entries.filter(e=>String(e.id)!==b.dataset.deleteEntry);save();renderHistory();}));
  content.querySelectorAll('[data-edit-entry]').forEach(b=>b.onclick=()=>editEntry(state.entries.find(e=>String(e.id)===b.dataset.editEntry)));
}
function editEntry(e){const g=groupOf(e.main)||state.groups[0];dialogForm.innerHTML=`<h2>Eintrag bearbeiten</h2><label class="field"><span>Hauptgefühl</span><select id="ed-main">${state.groups.map(x=>`<option ${x.name===e.main?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label><label class="field"><span>Untergefühl</span><input id="ed-sub" value="${esc(e.sub)}"></label><label class="field"><span>Intensität</span><input id="ed-int" type="number" min="1" max="10" value="${e.intensity}"></label><label class="field"><span>Körpergefühle, mit Komma getrennt</span><input id="ed-body" value="${esc((e.body||[]).join(', '))}"></label><label class="field"><span>Datum</span><input id="ed-date" value="${formatDate(new Date(e.time))}"></label><label class="field"><span>Situation</span><textarea id="ed-situation" class="situation">${esc(e.situation)}</textarea></label><div class="button-row"><button value="cancel" class="ghost">Abbrechen</button><button id="ed-save" value="default" class="primary">Speichern</button></div>`;dialog.showModal();dialogForm.querySelector('#ed-save').onclick=ev=>{ev.preventDefault();const d=parseDate(dialogForm.querySelector('#ed-date').value);if(!d)return toast('Datum ungültig.');Object.assign(e,{main:dialogForm.querySelector('#ed-main').value,sub:dialogForm.querySelector('#ed-sub').value.trim(),intensity:+dialogForm.querySelector('#ed-int').value,body:dialogForm.querySelector('#ed-body').value.split(',').map(x=>x.trim()).filter(Boolean),time:d.toISOString(),situation:dialogForm.querySelector('#ed-situation').value.trim()});save();dialog.close();renderHistory();};}
function renderStats(){
  const counts={};state.entries.forEach(e=>counts[e.main]=(counts[e.main]||0)+1);const hours=[0,0,0,0];state.entries.forEach(e=>{const h=new Date(e.time).getHours();hours[h<6?0:h<12?1:h<18?2:3]++;});
  content.innerHTML=`<h1 class="screen-title">Statistik</h1><p class="intro">Eine ruhige Draufsicht auf deine Einträge.</p>${state.entries.length?`<div class="stats-grid"><section class="panel"><h2>Häufigste Gefühle</h2><canvas id="pie" class="chart" width="600" height="420"></canvas><div class="legend">${Object.entries(counts).map(([n,c])=>`<div class="legend-row"><i class="legend-color" style="background:${(groupOf(n)||{color:'#888'}).color}"></i><span>${esc(n)}</span><strong>${c}</strong></div>`).join('')}</div></section><section class="panel"><h2>Tageszeiten</h2><canvas id="bars" class="chart" width="600" height="420"></canvas></section></div>`:'<section class="panel empty">Für eine Statistik braucht es zunächst Einträge.</section>'}`;
  if(state.entries.length){drawPie(document.querySelector('#pie'),counts);drawBars(document.querySelector('#bars'),hours);}
}
function drawPie(canvas,counts){const c=canvas.getContext('2d'),total=Object.values(counts).reduce((a,b)=>a+b,0);let a=-Math.PI/2;for(const [n,v] of Object.entries(counts)){const next=a+v/total*Math.PI*2;c.beginPath();c.moveTo(300,205);c.arc(300,205,155,a,next);c.closePath();c.fillStyle=(groupOf(n)||{color:'#888'}).color;c.fill();a=next;}c.beginPath();c.arc(300,205,72,0,Math.PI*2);c.fillStyle='#fff';c.fill();c.fillStyle='#3c3341';c.font='bold 30px system-ui';c.textAlign='center';c.fillText(total,300,215);}
function drawBars(canvas,values){const c=canvas.getContext('2d'),labels=['Nacht','Morgen','Nachmittag','Abend'],max=Math.max(1,...values);c.clearRect(0,0,600,420);c.font='18px system-ui';c.textAlign='center';values.forEach((v,i)=>{const h=v/max*290,x=55+i*135;c.fillStyle='#8d789c';c.fillRect(x,340-h,82,h);c.fillStyle='#403746';c.fillText(String(v),x+41,325-h);c.fillText(labels[i],x+41,380);});}
function renderEdit(){
  content.innerHTML=`<h1 class="screen-title">Rad verwalten</h1><p class="intro">Hauptgefühle, Untergefühle, Farben und Körpergefühle anpassen.</p><section class="panel"><h2>Hauptgefühle</h2>${state.groups.map((g,i)=>`<div class="catalog-row"><div><strong>${esc(g.name)}</strong><div class="meta">${g.sub.map(esc).join(', ')}</div></div><i class="color-dot" style="background:${g.color}"></i><button class="secondary" data-edit-group="${i}">Bearbeiten</button></div>`).join('')}<button id="add-group" class="primary wide" style="margin-top:12px">Hauptgefühl hinzufügen</button></section><section class="panel"><h2>Körpergefühle</h2>${state.bodyCatalog.map((x,i)=>`<div class="catalog-row"><strong>${esc(x)}</strong><button class="danger" data-del-body="${i}">Löschen</button></div>`).join('')}<button id="add-body" class="primary wide" style="margin-top:12px">Körpergefühl hinzufügen</button></section>`;
  content.querySelector('#add-group').onclick=()=>groupDialog();content.querySelectorAll('[data-edit-group]').forEach(b=>b.onclick=()=>groupDialog(+b.dataset.editGroup));
  content.querySelector('#add-body').onclick=()=>promptDialog('Körpergefühl hinzufügen','Bezeichnung',v=>{if(v&&!state.bodyCatalog.some(x=>x.toLowerCase()===v.toLowerCase())){state.bodyCatalog.push(v);save();renderEdit();}});
  content.querySelectorAll('[data-del-body]').forEach(b=>b.onclick=()=>{state.bodyCatalog.splice(+b.dataset.delBody,1);save();renderEdit();});
}
function groupDialog(index){const old=index==null?{name:'',color:'#8D6E63',sub:[]}:state.groups[index];dialogForm.innerHTML=`<h2>${index==null?'Hauptgefühl hinzufügen':'Hauptgefühl bearbeiten'}</h2><label class="field"><span>Name</span><input id="g-name" value="${esc(old.name)}"></label><label class="field"><span>Farbe</span><input id="g-color" type="color" value="${old.color}"></label><label class="field"><span>Untergefühle, mit Komma getrennt</span><textarea id="g-sub">${esc(old.sub.join(', '))}</textarea></label><div class="button-row">${index==null?'':`<button id="g-delete" class="danger" type="button">Löschen</button>`}<button value="cancel" class="ghost">Abbrechen</button><button id="g-save" class="primary" type="button">Speichern</button></div>`;dialog.showModal();dialogForm.querySelector('#g-save').onclick=()=>{const g={name:dialogForm.querySelector('#g-name').value.trim(),color:dialogForm.querySelector('#g-color').value,sub:dialogForm.querySelector('#g-sub').value.split(',').map(x=>x.trim()).filter(Boolean)};if(!g.name||!g.sub.length)return toast('Name und mindestens ein Untergefühl eintragen.');if(index==null)state.groups.push(g);else state.groups[index]=g;save();dialog.close();renderEdit();};const del=dialogForm.querySelector('#g-delete');if(del)del.onclick=()=>{state.groups.splice(index,1);save();dialog.close();renderEdit();};}
function renderSettings(){content.innerHTML=`<h1 class="screen-title">PIN-Schutz</h1><p class="intro">Die PIN schützt den Zugriff auf diesem Gerät und in diesem Browser.</p><section class="panel"><label class="field"><span>Neue PIN</span><input id="new-pin" type="password" inputmode="numeric" value="${esc(state.pin)}"></label><label class="field"><span>PIN wiederholen</span><input id="repeat-pin" type="password" inputmode="numeric"></label><button id="pin-save" class="primary wide">PIN speichern</button><p class="hint">Leer lassen und speichern, um den PIN-Schutz auszuschalten.</p></section><section class="panel"><h2>Datensicherung</h2><p>Für einen Gerätewechsel exportierst du die Einträge und importierst sie auf dem anderen Gerät. Die App synchronisiert nicht automatisch über das Internet.</p></section><p class="app-version">Gefühlsrad · Version ${APP_VERSION}</p>`;content.querySelector('#pin-save').onclick=()=>{const a=content.querySelector('#new-pin').value,b=content.querySelector('#repeat-pin').value;if(a!==b)return toast('Die PIN-Eingaben stimmen nicht überein.');state.pin=a;save();toast(a?'PIN gespeichert.':'PIN-Schutz ausgeschaltet.');};}
function promptDialog(title,label,done){dialogForm.innerHTML=`<h2>${esc(title)}</h2><label class="field"><span>${esc(label)}</span><input id="prompt-value"></label><div class="button-row"><button value="cancel" class="ghost">Abbrechen</button><button id="prompt-ok" type="button" class="primary">Übernehmen</button></div>`;dialog.showModal();dialogForm.querySelector('#prompt-ok').onclick=()=>{const v=dialogForm.querySelector('#prompt-value').value.trim();dialog.close();done(v);};}
function confirmDialog(title,text,done){dialogForm.innerHTML=`<h2>${esc(title)}</h2><p>${esc(text)}</p><div class="button-row"><button value="cancel" class="ghost">Abbrechen</button><button id="confirm-ok" type="button" class="danger">Bestätigen</button></div>`;dialog.showModal();dialogForm.querySelector('#confirm-ok').onclick=()=>{dialog.close();done();};}

fileInput.onchange=async()=>{const file=fileInput.files[0];if(!file)return;try{const rows=file.name.toLowerCase().endsWith('.xlsx')?await parseXLSX(file):parseCSV(await file.text());const result=importRows(rows);showImportResult(result);renderHistory();}catch(err){console.error(err);toast('Import fehlgeschlagen: '+err.message);}finally{fileInput.value='';}};
function normalizeHeader(h){return String(h).trim().toLowerCase().replace(/[ä]/g,'ae').replace(/[ö]/g,'oe').replace(/[ü]/g,'ue').replace(/ß/g,'ss').replace(/[^a-z]/g,'');}
function importRows(rows){
  if(rows.length<2)throw new Error('Keine Datenzeilen gefunden.');
  const head=rows[0].map(normalizeHeader),ix=n=>head.findIndex(h=>n.includes(h));
  const map={time:ix(['zeitpunkt','datum','datetime']),main:ix(['hauptgefuehl','hauptgefuhl','hauptemotion']),sub:ix(['untergefuehl','untergefuhl','emotion']),intensity:ix(['intensitaet','intensitat']),body:ix(['koerpergefuehle','korpergefuhle','koerper','korper']),situation:ix(['situation','notiz','text'])};
  if(map.time<0||map.main<0||map.sub<0)throw new Error('Benötigte Spalten fehlen.');
  let added=0,duplicates=0,skipped=0;
  const errors=[];
  rows.slice(1).forEach((r,index)=>{
    const rowNumber=index+2;
    try{
      if(!r.some(v=>String(v??'').trim()!==''))return;
      const d=parseDate(r[map.time]);
      const resolved=resolveCatalogEmotion(r[map.main],r[map.sub]);
      let {main,sub,group:g}=resolved;
      if(!d)throw new Error('Datum nicht erkannt');
      if(!main)throw new Error('Hauptgefühl fehlt und konnte nicht aus dem Rad-Katalog ermittelt werden');
      if(!sub)throw new Error('Untergefühl fehlt und konnte nicht aus dem Rad-Katalog ermittelt werden');
      const body=map.body>=0?String(r[map.body]??'').split(/[,;|]/).map(x=>x.trim()).filter(Boolean):[];
      const rawIntensity=map.intensity>=0?Number(String(r[map.intensity]??'').replace(',','.')):5;
      const intensity=Number.isFinite(rawIntensity)?Math.min(10,Math.max(1,rawIntensity)):5;
      const e={id:uid(),main,sub,intensity,body,situation:map.situation>=0?String(r[map.situation]??''):'',time:d.toISOString()};
      const dupe=state.entries.some(x=>x.main===e.main&&x.sub===e.sub&&x.intensity===e.intensity&&x.situation===e.situation&&new Date(x.time).getTime()===d.getTime()&&JSON.stringify([...(x.body||[])].sort())===JSON.stringify([...body].sort()));
      if(dupe){duplicates++;return;}
      state.entries.push(e);added++;
      if(!g){
        g={name:main,color:'#8D6E63',sub:[sub]};
        state.groups.push(g);
      }else{
        main=g.name;
        const knownSub=subOf(g,sub);
        if(knownSub)sub=knownSub;
        else g.sub.push(sub);
        e.main=main;
        e.sub=sub;
      }
      body.forEach(x=>{
        if(!state.bodyCatalog.some(y=>normalizeLabel(y)===normalizeLabel(x)))state.bodyCatalog.push(x);
      });
    }catch(err){
      skipped++;
      if(errors.length<8)errors.push(`Zeile ${rowNumber}: ${err.message}`);
    }
  });
  state.entries.sort((a,b)=>new Date(b.time)-new Date(a.time));
  save();
  return {added,duplicates,skipped,errors};
}
function showImportResult(result){
  const parts=[`${result.added} Einträge importiert`,`${result.duplicates} Dubletten übersprungen`,`${result.skipped} fehlerhafte Zeilen übersprungen`];
  if(!result.skipped)return toast(parts.slice(0,2).join(', ')+'.');
  dialogForm.innerHTML=`<h2>Import abgeschlossen</h2><p>${parts.map(esc).join('<br>')}</p>${result.errors.length?`<div class="import-errors">${result.errors.map(x=>`<div>${esc(x)}</div>`).join('')}</div>`:''}<p class="hint">Der Import wurde trotz fehlerhafter Zeilen vollständig fortgesetzt.</p><div class="button-row"><button value="default" class="primary">Schließen</button></div>`;
  dialog.showModal();
}
function parseCSV(text){const delimiter=(text.split('\n')[0].match(/;/g)||[]).length>=(text.split('\n')[0].match(/,/g)||[]).length?';':',';const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(q&&text[i+1]==='"'){cell+='"';i++;}else q=!q;}else if(ch===delimiter&&!q){row.push(cell);cell='';}else if((ch==='\n'||ch==='\r')&&!q){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}else cell+=ch;}if(cell||row.length){row.push(cell);rows.push(row);}return rows;}
function exportCSV(){const rows=exportRows();const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');download(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),'Gefuehlsrad_Export.csv');}
function exportRows(){return [['Zeitpunkt','Hauptgefühl','Untergefühl','Intensität','Körpergefühle','Situation'],...state.entries.map(e=>[formatDate(new Date(e.time)),e.main,e.sub,e.intensity,(e.body||[]).join(', '),e.situation])];}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}

async function parseXLSX(file){const files=await unzip(new Uint8Array(await file.arrayBuffer()));const sheetName=[...files.keys()].find(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n));if(!sheetName)throw new Error('Kein Tabellenblatt gefunden.');const xml=new TextDecoder().decode(files.get(sheetName)),shared=files.has('xl/sharedStrings.xml')?[...new DOMParser().parseFromString(new TextDecoder().decode(files.get('xl/sharedStrings.xml')),'application/xml').querySelectorAll('si')].map(si=>si.textContent):[];const doc=new DOMParser().parseFromString(xml,'application/xml'),rows=[];doc.querySelectorAll('row').forEach(row=>{const out=[];row.querySelectorAll('c').forEach(c=>{const ref=c.getAttribute('r')||'A1',col=lettersToIndex(ref.match(/[A-Z]+/)[0]);while(out.length<col)out.push('');const type=c.getAttribute('t'),v=c.querySelector('v')?.textContent??c.querySelector('is')?.textContent??'';out[col]=type==='s'?shared[+v]??'':v;});rows.push(out);});return rows;}
function lettersToIndex(s){let n=0;for(const ch of s)n=n*26+ch.charCodeAt(0)-64;return n-1;}
async function unzip(bytes){const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let eocd=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){eocd=i;break;}if(eocd<0)throw new Error('Ungültige XLSX-Datei.');const count=view.getUint16(eocd+10,true),offset=view.getUint32(eocd+16,true),out=new Map();let p=offset;for(let i=0;i<count;i++){if(view.getUint32(p,true)!==0x02014b50)break;const method=view.getUint16(p+10,true),comp=view.getUint32(p+20,true),nameLen=view.getUint16(p+28,true),extraLen=view.getUint16(p+30,true),commentLen=view.getUint16(p+32,true),local=view.getUint32(p+42,true),name=new TextDecoder().decode(bytes.slice(p+46,p+46+nameLen));const ln=view.getUint16(local+26,true),le=view.getUint16(local+28,true),start=local+30+ln+le,data=bytes.slice(start,start+comp);if(!name.endsWith('/'))out.set(name,method===0?data:await inflateRaw(data));p+=46+nameLen+extraLen+commentLen;}return out;}
async function inflateRaw(data){if(!('DecompressionStream'in window))throw new Error('Dieser Browser kann XLSX nicht entpacken.');const stream=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));return new Uint8Array(await new Response(stream).arrayBuffer());}
function xmlEsc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
function colName(n){let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode((n-1)%26+65)+s;return s;}
function exportXLSX(){const rows=exportRows(),sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((r,ri)=>`<row r="${ri+1}">${r.map((v,ci)=>typeof v==='number'?`<c r="${colName(ci)}${ri+1}"><v>${v}</v></c>`:`<c r="${colName(ci)}${ri+1}" t="inlineStr"><is><t>${xmlEsc(v)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;const files={
'[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
'_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
'xl/workbook.xml':'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Gefühlsrad" sheetId="1" r:id="rId1"/></sheets></workbook>',
'xl/_rels/workbook.xml.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
'xl/worksheets/sheet1.xml':sheet};download(new Blob([zipStore(files)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'Gefuehlsrad_Export.xlsx');}
function crc32(data){let c=0xffffffff;for(const b of data){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function zipStore(files){const enc=new TextEncoder(),parts=[],central=[];let offset=0,count=0;for(const [name,text] of Object.entries(files)){const n=enc.encode(name),d=enc.encode(text),crc=crc32(d),local=new Uint8Array(30+n.length+d.length),v=new DataView(local.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(8,0,true);v.setUint32(14,crc,true);v.setUint32(18,d.length,true);v.setUint32(22,d.length,true);v.setUint16(26,n.length,true);local.set(n,30);local.set(d,30+n.length);parts.push(local);const cen=new Uint8Array(46+n.length),cv=new DataView(cen.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint32(16,crc,true);cv.setUint32(20,d.length,true);cv.setUint32(24,d.length,true);cv.setUint16(28,n.length,true);cv.setUint32(42,offset,true);cen.set(n,46);central.push(cen);offset+=local.length;count++;}const centralSize=central.reduce((a,b)=>a+b.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,count,true);ev.setUint16(10,count,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);return new Blob([...parts,...central,end]);}

if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.error));
boot();
