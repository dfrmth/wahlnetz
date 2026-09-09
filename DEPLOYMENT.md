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

So sieht der Ablauf inzwischen konkret aus (Stand: beobachtet über die
"Workers"-Git-Integration im Dashboard):

1. Im Cloudflare-Dashboard nach **"Workers & Pages"** oder **"Compute"** in
   der linken Navigation suchen (je nach Account-Stand heißt es unterschiedlich),
   dann **Create application** → Repo verbinden ("Import a repository" /
   Git-Integration).
2. Cloudflare fragt getrennt nach:
   - **Build command:** `npm run build`
   - **Deploy command:** Vorschlag ist meist `npx wrangler deploy` – das
     einfach so übernehmen.
3. **Wichtig:** Beide Befehle laufen vom **Repo-Root** aus, nicht aus
   `wahlnetz/`. Das bedeutet, `npx wrangler deploy` sucht die
   `wrangler.jsonc` ebenfalls im Root. Deshalb liegt in diesem Repo jetzt
   **zusätzlich** eine `wrangler.jsonc` im Root (neben der in `wahlnetz/` für
   den lokalen CLI-Weg), die auf `./wahlnetz/build` zeigt. Ohne die schlägt
   der Deploy-Schritt mit `Could not detect a directory containing static
   files` fehl, auch wenn der Build selbst erfolgreich war.

Falls der Dialog bei dir anders aussieht oder noch ein "Build/Output-
Verzeichnis"-Feld separat abfragt: Ziel ist immer "Build-Befehl `npm run
build`, danach `wahlnetz/build` ausliefern". Wenn du im Dashboard nicht
weiterkommst, ist Option A der zuverlässigere Weg.

## Zwei `wrangler.jsonc`-Dateien – warum?

- **`/wrangler.jsonc`** (Root): wird verwendet, wenn Wrangler vom Repo-Root
  aus aufgerufen wird (Option B, Cloudflares Git-Integration). Zeigt auf
  `./wahlnetz/build`.
- **`/wahlnetz/wrangler.jsonc`**: wird verwendet, wenn du lokal per CLI aus
  dem `wahlnetz/`-Ordner deployst (Option A, `npm run deploy`). Zeigt auf
  `./build` (relativ zu `wahlnetz/`).

Beide deployen denselben Worker (`name: "wahlspinne"`), nur der Aufrufkontext
unterscheidet sich – Wrangler sucht die Konfiguration immer im aktuellen
Verzeichnis und wandert von dort nach oben, bis es eine findet.

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
