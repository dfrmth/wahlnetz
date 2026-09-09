# Deployment auf Cloudflare (kostenlos)

## Wichtig: "Workers & Pages" gibt es bei dir vermutlich deshalb nicht mehr

Cloudflare hat "Pages" seit Ende 2025/2026 schrittweise durch **"Workers mit
Static Assets"** ersetzt – neue Accounts sehen oft gar keinen "Pages"-Tab mehr
im Dashboard, oder die Navigation ist umbenannt/umsortiert (z. B. unter
"Compute" statt "Workers & Pages"). Pages läuft für Bestandsprojekte weiter,
wird aber nicht mehr aktiv weiterentwickelt; Cloudflares eigene Empfehlung für
neue Projekte ist inzwischen "Workers". Das ist wahrscheinlich, warum du den
Menüpunkt aus der ursprünglichen Anleitung nicht findest – das ist keine
Fehlbedienung deinerseits, sondern Cloudflare hat die Oberfläche geändert.

Da sich das Dashboard offenbar gerade (wieder) verändert, ist der
**CLI-Weg unten die robusteste Variante** – der funktioniert unabhängig davon,
wie die Buttons im Dashboard gerade heißen.

## Option A (empfohlen): Deploy per Kommandozeile mit Wrangler

Diese Version enthält bereits `wahlnetz/wrangler.jsonc`, das dem Build sagt,
wie er als "Worker mit Static Assets" ausgeliefert werden soll.

```bash
cd wahlnetz
npm install
npm run deploy
```

Das führt intern `react-scripts build` aus und deployt danach den `build`-
Ordner über `npx wrangler deploy` (Wrangler wird beim ersten Aufruf automatisch
per npx geladen, keine separate Installation nötig). Beim allerersten Deploy
fragt Wrangler nach einem Login (öffnet den Browser zur Cloudflare-Anmeldung)
und legt den Worker unter dem in `wrangler.jsonc` festgelegten Namen
(`wahlspinne`) an. Danach ist die Seite unter
`https://wahlspinne.<dein-account>.workers.dev` erreichbar – kostenlos, keine
Kreditkarte nötig.

Für erneutes Deployen nach Änderungen reicht danach immer wieder
`npm run deploy`.

## Option B: Automatisch bei jedem `git push` (Dashboard-Git-Integration)

Falls du trotzdem den "Push-und-fertig"-Workflow willst statt manuell
`npm run deploy` auszuführen:

1. Im Cloudflare-Dashboard nach **"Workers & Pages"** oder **"Compute"** in
   der linken Navigation suchen (je nach Account-Stand heißt es unterschiedlich).
2. **Create application** → falls vorhanden **"Pages" → "Connect to Git"**
   wählen; falls kein Pages-Tab existiert, stattdessen bei den
   Worker-Optionen nach **"Import a repository"** bzw. Git-Integration
   suchen (das ist die Worker-Variante desselben Features).
3. Repo verbinden, Root-Verzeichnis/Build-Einstellungen wie in der vorherigen
   Fassung dieser Datei angeben:
   - **Build command:** `npm run build`
   - **Build/Output-Verzeichnis:** `wahlnetz/build`
   - **Root directory:** `/` (das Root-`package.json` in diesem Repo reicht
     den Build nur an `wahlnetz/` durch – siehe unten)

Falls dieser Dialog bei dir anders aussieht (Cloudflare ändert das gerade
öfter): Ziel ist einfach "Build-Befehl `npm run build` ausführen, Ergebnis aus
`wahlnetz/build` ausliefern". Wenn du im Dashboard nicht weiterkommst, ist
Option A der zuverlässigere Weg.

## Warum es beim letzten Versuch nicht ging (zur Erinnerung)

Im Repo lag ursprünglich **kein `package.json` im Root** – das eigentliche
React-Projekt liegt im Unterordner `wahlnetz/`. Baute Cloudflare vom
Root-Verzeichnis `/` aus, fand es kein Node-Projekt, der Build schlug fehl,
und die Seite existierte effektiv nie. Diese Version enthält deshalb ein
Root-`package.json`, dessen `build`-Skript den Build an `wahlnetz/`
durchreicht – relevant nur für Option B (Git-Integration mit Root `/`).
Bei Option A (CLI) spielt das keine Rolle, da du direkt im `wahlnetz/`-Ordner
arbeitest.

## Vor dem Deploy lokal testen

```bash
cd wahlnetz
npm run build
```

Läuft das lokal fehlerfrei durch und erzeugt einen `build`-Ordner, klappt auch
`npm run deploy`.
