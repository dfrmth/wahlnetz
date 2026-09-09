# Methodik & Disclaimer

## Wie sind die Partei-Werte entstanden?

Die Werte in `wahlnetz/src/data/parties.json` (1–10 je Thema) wurden mithilfe
eines KI-Modells erzeugt, das die Wahlprogramme der Bundestagsparteien zur
Bundestagswahl 2025 zusammengefasst und je Thema auf einer 10-stufigen Skala
eingeordnet hat.

Das bedeutet konkret:

- Es handelt sich **nicht** um offizielle Selbstauskünfte der Parteien
  (anders als z. B. beim Wahl-O-Mat, wo Parteien ihre Antworten selbst geben).
- Die Einordnung ist eine **Interpretation** des Wahlprogramm-Texts durch ein
  KI-Modell und kann Nuancen, Kompromissformulierungen oder Änderungen nach
  Veröffentlichung des Programms nicht abbilden.
- Für Transparenz sollte langfristig für jede Zahl eine Quellenangabe
  (Seite/Abschnitt im jeweiligen Wahlprogramm) hinterlegt werden.

## Warum das wichtig ist

Ein Tool, das Parteien anhand von KI-generierten Zahlen positioniert, sollte
das gegenüber Nutzer:innen klar kennzeichnen – sowohl aus Transparenzgründen
als auch, um Fehleinschätzungen einzelner Positionen nicht als „amtlich"
erscheinen zu lassen. Ein entsprechender Kurzhinweis sollte in der App selbst
(z. B. im Footer oder als Tooltip) sichtbar sein.

## Offene Punkte für eine spätere Überarbeitung

- Re-Scoring mit dokumentiertem Prompt/Modell/Datum pro Durchlauf, damit
  Ergebnisse nachvollziehbar und reproduzierbar sind.
- Pro Thema eine kurze Begründung/Zitat aus dem Wahlprogramm hinterlegen.
- Regelmäßige Aktualisierung, sobald Parteien ihre Programme ändern oder neue
  Wahlen (z. B. nächste Bundestagswahl, Europawahl) anstehen.
