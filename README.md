# Gefühlsrad PWA V2.0

Version 2.0 stellt die lokale Datenhaltung auf eine versionierte **IndexedDB** um.

## Wichtigste Änderungen

- Katalog und Verlauf werden getrennt gespeichert.
- Bestehende Daten aus V1.x werden beim ersten Start aus `localStorage` übernommen.
- App- und Service-Worker-Updates überschreiben den persönlichen Katalog nicht.
- Standardgefühle werden nur verwendet, wenn noch kein gespeicherter Katalog existiert.
- Hauptgefühle, Untergefühle, Farben und Körpergefühle können als JSON-Katalog exportiert und wieder importiert werden.
- Verlaufseinträge bleiben weiterhin per CSV oder XLSX übertragbar.
- Sichtbare App-Version: 2.0.

## Datenbereiche

- `catalog`: Hauptgefühle, Untergefühle, Farben und Körpergefühle
- `entries`: Verlaufseinträge
- `settings`: PIN und zukünftige Einstellungen

## Migration von V1.x

Beim ersten Start prüft V2.0, ob bereits IndexedDB-Daten vorhanden sind. Falls nicht, werden vorhandene Daten aus dem bisherigen Schlüssel `gefuehlsrad.pwa.v1` übernommen und anschließend in IndexedDB gespeichert. Der alte Speicher wird nicht automatisch gelöscht.

## Katalog sichern

Unter **PIN → Datensicherung** stehen zur Verfügung:

- **Katalog exportieren**: erzeugt eine JSON-Datei
- **Katalog importieren**: stellt Hauptgefühle, Untergefühle, Farben und Körpergefühle wieder her

Das Katalog-Backup enthält keine Verlaufseinträge. Diese werden weiterhin separat als CSV oder XLSX exportiert.

## Installation und Update

Den vollständigen Inhalt dieses Ordners auf den bisherigen Webspace hochladen. Anschließend die installierte PWA vollständig schließen und wieder öffnen. Der Service Worker verwendet den Cache `gefuehlsrad-v2.0`.
