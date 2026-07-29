# Gefühlsrad PWA V1.1.0

Eine eigenständige Progressive Web App auf Basis des Funktionsumfangs von Gefühlsrad V3.7.

## Enthalten

- installierbare PWA für Tablet, Smartphone und Desktop
- Offline-Nutzung über Service Worker
- lokale Speicherung im Browser (`localStorage`)
- Gefühlsrad mit Haupt- und Untergefühlen
- frei erweiterbare Gefühlskataloge und Körpergefühle
- graue Schlagwortwolke für Körpergefühle
- adaptive Schriftgröße bei langen Schlagworten
- Intensität, Situation und editierbares deutsches Datum
- Verlauf mit Bearbeiten und Löschen
- Kreis- und Balkendiagramm
- PIN-Schutz pro Browser/Gerät
- CSV- und XLSX-Import
- CSV- und XLSX-Export
- Dublettenprüfung und automatische Katalogergänzung beim Import

## Starten

Eine PWA muss über einen Webserver geladen werden, nicht direkt über `file://`.

### Lokal testen

Im Projektordner beispielsweise:

```bash
python -m http.server 8080
```

Dann im Browser öffnen:

```text
http://localhost:8080
```

### Veröffentlichen

Der komplette Ordner kann etwa bei Netlify, GitHub Pages oder auf einem eigenen HTTPS-Webserver veröffentlicht werden. Für Installation und Service Worker ist HTTPS erforderlich; `localhost` ist beim lokalen Test ausgenommen.

## Installation

- Android/Chrome: Browsermenü → „App installieren“ oder „Zum Startbildschirm hinzufügen“
- iPad/iPhone/Safari: Teilen → „Zum Home-Bildschirm“
- Desktop-Chrome/Edge: Installationssymbol in der Adressleiste

## Datenspeicherung

Die Daten liegen ausschließlich im jeweiligen Browserprofil. Es gibt keine automatische Synchronisierung zwischen Geräten. Für den Umzug werden CSV oder XLSX exportiert und auf dem anderen Gerät importiert.

## Importspalten

Empfohlene Überschriften:

```text
Zeitpunkt;Hauptgefühl;Untergefühl;Intensität;Körpergefühle;Situation
```

Datumsformat:

```text
TT.MM.JJJJ HH:MM
```


## Änderungen in V1.1

- Erkennt echte Excel-Datumszellen und Excel-Seriennummern.
- Akzeptiert deutsche und ISO-Datumsangaben mit oder ohne Sekunden.
- Überspringt fehlerhafte Zeilen, statt den gesamten Import zu stoppen.
- Zeigt importierte Einträge, Dubletten und übersprungene Zeilen getrennt an.
