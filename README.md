# Wahlspinne

Ein Wahl-O-Mat-ähnliches Tool, das die politische Position von Nutzer:innen und
Parteien statt auf einer Links-Rechts-Skala als **Spinnendiagramm (Radar-Chart)**
über 14 Themenfelder darstellt.

- **App-Code:** [`wahlnetz/`](./wahlnetz) (React, Create React App)
- **Parteidaten:** [`wahlnetz/src/data/parties.json`](./wahlnetz/src/data/parties.json) –
  Werte 1–10 pro Thema, KI-gestützt aus den Wahlprogrammen zur Bundestagswahl 2025 abgeleitet
- **Methodik & Disclaimer:** [`METHODOLOGY.md`](./METHODOLOGY.md)
- **Deployment (Cloudflare Pages):** [`DEPLOYMENT.md`](./DEPLOYMENT.md)

## Lokale Entwicklung

```bash
cd wahlnetz
npm install
npm start
```

## Warum liegt hier ein `package.json` im Repo-Root, obwohl die App in `wahlnetz/` liegt?

Ausschließlich, damit Cloudflare Pages mit den **Standard-Einstellungen**
(Root-Verzeichnis `/`, Build-Befehl `npm run build`) funktioniert – es reicht
den Build nur an `wahlnetz/` durch. Siehe `DEPLOYMENT.md` für Details.

## Bekannte Einschränkungen / Ideen für später

- Die Skala pro Thema (1–10) ist bewusst grob; für mehr Nuance könnte man
  langfristig über ein 3D-Achsenmodell mit thematischen Clustern nachdenken
  (siehe Diskussion in der Projekt-Historie).
- Parteidaten sind Stand der Wahlprogramme 2025 und müssten für künftige
  Wahlen (Bundesland, Europawahl, nächste Bundestagswahl) neu erhoben werden.
- Es gibt aktuell keine automatisierten Tests für die Chart-Logik.
