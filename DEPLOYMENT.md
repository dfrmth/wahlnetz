# Deployment auf Cloudflare Pages (kostenlos)

## Das ursprüngliche Problem

Im Repo lag **kein `package.json` im Root** – das eigentliche React-Projekt
befindet sich im Unterordner `wahlnetz/`. Wenn Cloudflare Pages beim Verbinden
mit GitHub mit Standard-Root-Verzeichnis `/` baut, findet es dort kein
Node-Projekt, der Build schlägt fehl und die Seite existiert effektiv nie
(daher vermutlich die "Website existiert nicht"-Meldung).

Diese Version behebt das durch ein **Root-`package.json`**, dessen
`build`-Skript den Build lediglich an `wahlnetz/` durchreicht. Dadurch
funktioniert der Standard-Workflow von Cloudflare Pages ohne Sonderkonfiguration.

## Einrichtung (einmalig)

1. Repo (mit den Änderungen aus diesem Ordner) zu GitHub pushen.
2. Auf [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**
   → **Create application** → **Pages** → **Connect to Git** → Repo auswählen.
3. Build-Einstellungen:
   - **Framework preset:** `Create React App` (oder "None")
   - **Build command:** `npm run build`
   - **Build output directory:** `wahlnetz/build`
   - **Root directory:** `/` (Standard, nichts ändern)
4. Deploy starten. Cloudflare Pages baut danach bei jedem Push auf den
   verbundenen Branch automatisch neu (kostenlos, inkl. eigener
   `*.pages.dev`-Subdomain; eine eigene Domain lässt sich später kostenlos
   hinzufügen).

## Alternative (falls stattdessen der Ordner "geradegezogen" werden soll)

Statt des Root-`package.json`-Tricks kann man auch dauerhaft den Inhalt von
`wahlnetz/` eine Ebene nach oben ins Repo-Root verschieben und im Cloudflare-
Dashboard **Build output directory** auf `build` setzen. Das ist die
"klassischere" Struktur, erfordert aber, Git-Historie und Pfade im Repo
anzupassen – aktuell nicht nötig, da die Durchreiche-Lösung funktioniert.

## Vor dem ersten Deploy lokal testen

```bash
npm run build   # im Repo-Root ausführen – testet exakt das, was Cloudflare tut
```

Falls das lokal erfolgreich einen `wahlnetz/build`-Ordner erzeugt, sollte auch
der Cloudflare-Build funktionieren.
