import React, { useState, useRef, useEffect } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import partyData from './data/parties.json';
import html2canvas from "html2canvas";
import logo from './logo.svg';
import './App.css';

// Einheitliche Partei-Farben (werden im Chart UND auf der Share-Card verwendet)
const PARTY_COLORS = {
  Union: "#000000",
  AfD: "#0489DB",
  SPD: "#E3000F",
  "Grüne": "#1AA037",
  Linke: "#FF0046",
  FDP: "#FFEF00",
  BSW: "#792351"
};
const getPartyColor = (party) => PARTY_COLORS[party] || "#00C49F";

// TODO: durch die echte, live erreichbare URL ersetzen (Cloudflare-Worker-
// oder Custom-Domain-Adresse), sobald final geklärt.
const SITE_URL = "https://wahlspinne.pages.dev";

// Schlichter, moderner Pfeil als Vektor-Icon (kein Icon-Font/-Paket nötig).
// Zwei eigene Pfad-Varianten statt CSS-Spiegelung, damit Hover-Animationen
// (transform: translateX) weiterhin frei per CSS steuerbar bleiben.
const ArrowIcon = ({ direction = 'right', size = 20, className = '' }) => (
  <svg
    className={`arrow-icon ${className}`}
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {direction === 'left' ? (
      <>
        <line x1="20" y1="12" x2="4" y2="12" />
        <polyline points="10 6 4 12 10 18" />
      </>
    ) : (
      <>
        <line x1="4" y1="12" x2="20" y2="12" />
        <polyline points="14 6 20 12 14 18" />
      </>
    )}
  </svg>
);

// Die Themenfragen, die nacheinander abgefragt werden
const questions = [
  { id: 0, topic: "Frieden", question: "Frieden: Soft Power (1) oder Abschreckung (10)", description: "(Entscheidungshilfe: Abhängigkeiten vs. Kosten)" },
  { id: 1, topic: "Sicherheit", question: "Sicherheit: Freiheit (1) oder Kontrolle (10)", description: "(Entscheidungshilfe: Überwachungsstaat vs. Kriminalitätsbekämpfung)" },
  { id: 2, topic: "Migration", question: "Migration: offen (1) oder restriktiv (10)", description: "(Entscheidungshilfe: Überforderung vs. Fachkräftemangel)" },
  { id: 3, topic: "Bürgergeld/Wohnen", question: "Bürgergeld/Wohnen: Eigenverantwortung (1) oder Sicherheitsnetz (10)", description: "(Entscheidungshilfe: Ungleichheit vs. Kosten)" },
  { id: 4, topic: "Arbeit", question: "Arbeit: Wirtschaftswachstum (1) oder Arbeitsbedingungen (10)", description: "(Entscheidungshilfe: weniger Unternehmenssteuern vs. weniger Unternehmen)" },
  { id: 5, topic: "Rente", question: "Rente: privat (1) oder öffentlich (10)", description: "(Entscheidungshilfe: Anlagerisiko vs. Kosten)" },
  { id: 6, topic: "Pflege", question: "Pflege: Leistung (1) oder Bezahlbarkeit (10)", description: "(Entscheidungshilfe: Eigenkosten vs. Staatskosten)" },
  { id: 7, topic: "Kinder", question: "Kinder: Verantwortung bei Eltern (1) oder Staat (10)", description: "(Entscheidungshilfe: Ungleichheit vs. Kosten)" },
  { id: 8, topic: "Bildung", question: "Bildung: Leistung (1) oder Förderung (10)", description: "(Entscheidungshilfe: Ungleichheit vs. Kosten (aber auch Fachkräftebindung))" },
  { id: 9, topic: "Sport", question: "Sport: Erfolge (1) oder Bürgergesundheit (10)", description: "(Entscheidungshilfe: Nationalstolz vs. Kosten (aber auch Prävention))" },
  { id: 10, topic: "Kultur", question: "Kultur: Mainstream (1) oder Förderung (10)", description: "(Entscheidungshilfe: weniger Vielfalt vs. Kosten)" },
  { id: 11, topic: "Haushalt", question: "Haushalt: Handlungsspielraum (1) oder Transformation (10)", description: "(Entscheidungshilfe: Investitionsstau vs. Zinslast)" },
  { id: 12, topic: "Steuern", question: "Steuern: Wachstum (1) oder Umverteilung (10)", description: "(Entscheidungshilfe: Ungleichheit vs. Steuerflucht)" },
  { id: 13, topic: "Klima/Energie", question: "Klima/Energie: Offenheit (1) oder Klimaschutz (10)", description: "(Entscheidungshilfe: spätere Anpassungskosten vs. heutige Transformationskosten)" }
];

// ============================================================================
// Finanzierbarkeits-Modell v2 (9 Wirkungsdimensionen, Zeit-Gewichtung,
// gestufte Interaktionen) - komplett ersetzt gegenüber der ersten Version.
// ============================================================================
// Jede der 14 Fragen hat zwei Pole (Antwort 1 / Antwort 10). Für jeden Pol
// sind hier die Wirkungswerte hinterlegt. Für "F" (Staatsfinanzen) wird
// zusätzlich zwischen kurz-/mittelfristig ("F_short") und langfristig
// ("F_long") unterschieden, weil genau dieser Zeit-Mismatch (heute teuer,
// später entlastend oder umgekehrt) laut Vorlage ein zentraler Modellfehler
// wäre, wenn man ihn ignoriert. Bei den übrigen 8 Dimensionen wird EIN
// zeitlich geglätteter Wert verwendet, weil der Fragebogen keine separaten
// Kurz-/Mittel-/Langfrist-Antworten erhebt - eine vollständige 3-Zeithorizonte-
// Tabelle für 9 Dimensionen wäre reine Erfindung ohne Grundlage im
// Fragebogen. Das ist eine bewusste, kommentierte Vereinfachung.
//
//   F_short/F_long = Staatsfinanzen        (+3 = starker Ausgabendruck)
//   W  = Wirtschaft (Wachstum/Produktivität/Steuerbasis)   (+3 = stark positiv)
//   A  = Arbeit (Erwerbsbeteiligung/Beschäftigung)          (+3 = stark positiv)
//   P  = Privatbelastung (Kosten/Risiken bei Bürgern/Firmen)(+3 = stark belastend)
//   S  = Sozialverträglichkeit (Armut/Absicherung/Ungleichheit) (+3 = sozial positiv)
//   T  = Zusammenhalt (Vertrauen/Integration/Legitimität)   (+3 = stark positiv)
//   K  = Kapazität (Überlastung von Verwaltung/Infrastruktur)(+3 = hohes Überlastungsrisiko)
//   R  = Resilienz (Sicherheit/Krisenfestigkeit/Autonomie)  (+3 = stark positiv)
//   Z  = Zukunft (Demografie/Humankapital/Klima/Folgekosten)(+3 = stark zukunftsfähig)
const FISCAL_DIMENSION_KEYS = ['F_short', 'F_long', 'W', 'A', 'P', 'S', 'T', 'K', 'R', 'Z'];

// Grobe relative fiskalische/systemische Gewichtung je Thema (Rente oder
// Bürgergeld bewegen real viel mehr Geld/Verwaltung als z. B. Sport oder
// Kultur) - fließt als Gewicht in den gewichteten Durchschnitt über alle
// 14 Themen ein.
const FISCAL_TOPIC_WEIGHTS = {
  "Frieden": 1.0,
  "Sicherheit": 0.6,
  "Migration": 1.0,
  "Bürgergeld/Wohnen": 1.5,
  "Arbeit": 0.9,
  "Rente": 2.0,
  "Pflege": 1.6,
  "Kinder": 1.3,
  "Bildung": 1.3,
  "Sport": 0.3,
  "Kultur": 0.3,
  "Haushalt": 1.4,
  "Steuern": 1.5,
  "Klima/Energie": 1.5,
};

// Reihenfolge je Vektor: [F_short, F_long, W, A, P, S, T, K, R, Z]
const FISCAL_TOPIC_MODEL = {
  "Frieden": {
    // Abschreckung: leicht negatives Z ergaenzt (Eskalations-/Ruestungs-
    // wettlauf-Risiko als langfristiger Kehrseiten-Effekt starker Abschreckung).
    pole1: [2, 1, 1, 0, 0, 0, 1, -1, 3, -0.3],    // Abschreckung
    pole2: [1, -1, 2, 0, 0, 1, 1, -1, 3, 0.5],    // Soft Power / Diplomatie
  },
  "Sicherheit": {
    // Freiheit: Z leicht angehoben (Demokratiestaerkung/institutionelle
    // Legitimitaet als langfristig positiver Effekt).
    pole1: [2, 1, -1, 0, 1, -0.5, -1, 1, 1, -0.3],  // mehr Kontrolle
    pole2: [-1, 0, 1, 0, -1, 1, 2, -2, 0, 0.5],     // mehr Freiheit
  },
  "Migration": {
    pole1: [-1, -1, -1, -1, 0, 0, 0, -1, 1, -0.3],   // restriktiv
    pole2: [1, 0.5, 1.5, 2, 1, 0.5, 0.5, 1, 1, 0.5], // offen
  },
  "Bürgergeld/Wohnen": {
    // Sicherheitsnetz: T angehoben (ein tragfaehiges soziales Netz senkt
    // laut politoekonomischer Literatur das Risiko sozialer Unruhen/
    // Vertrauensverlusts bei hoher Ungleichheit).
    pole1: [-2, 0.5, 0, -1, 2, -1.5, -0.5, -1, 0, 0],  // Eigenverantwortung
    pole2: [2, -1, 1, 1, -2, 1.5, 1, 0, 0, 0.2],       // Sicherheitsnetz
  },
  "Arbeit": {
    pole1: [-1, 0, 3, 2, 1, -0.3, 0.3, -1, 1, 0.3],   // Wirtschaftswachstum/Flexibilität
    pole2: [1, 0, 1.5, 1, -1, 1, 1, 1, 0, 0.2],       // bessere Arbeitsbedingungen
  },
  "Rente": {
    pole1: [-1, -1, 1, 1, 2, -1, 0, 0, 1, -0.2],    // stärker privat
    pole2: [2, 2.5, -1, -1, -2, 1, 0.5, -1, 0, 0],  // stärker öffentlich
  },
  "Pflege": {
    // KORRIGIERT nach Nutzer-Klarstellung: "Bezahlbarkeit" meint bezahlbare
    // Eigenanteile für Bürger:innen durch staatliche Bezuschussung - das ist
    // die für den Staat TEURERE Seite, nicht die günstigere (vorher genau
    // umgekehrt kodiert). "Leistung" = Fokus auf Versorgungsqualität/-umfang
    // (Personal, Standards) - kostet ebenfalls, aber über einen anderen
    // Kanal (Angebot statt direkter Zuschuss) und in geringerem Ausmaß.
    pole1: [1, 0.5, 0.5, 1, 0.5, 0.5, 0.3, -0.5, 0, 0.3],    // Leistung/Leistungsumfang
    pole2: [2.5, 1.5, -0.5, -0.5, -2.5, 1.5, 0.5, 0.5, 0, 0], // Bezahlbarkeit (staatl. subventioniert)
  },
  "Kinder": {
    pole1: [-1, 0.5, -1, -1, 2, -0.5, 0, -1, 0, -0.3],  // primär Eltern
    pole2: [2, -1, 2, 2, -2, 1.5, 0.5, 0, 0, 0.8],      // stärker Staat
  },
  "Bildung": {
    pole1: [0, 0, 2, 1, 1, -0.5, 0, -1, 0, 0.2],        // Leistung/Selektion
    pole2: [2, -1, 2.5, 2, -1, 1.5, 0.5, 1, 0, 1],      // Förderung/Teilhabe
  },
  "Sport": {
    // Breitensport: Z angehoben (Adipositas-/Krankheitspraevention senkt
    // langfristige Gesundheits- und Erwerbsausfallkosten).
    pole1: [1, 0, 0, 0, 0, 0, 0.5, -1, 1, 0],       // Spitzensport
    pole2: [1, -1, 1, 1, -1, 1, 1, -1, 1, 0.5],     // Breitensport/Gesundheit
  },
  "Kultur": {
    pole1: [-1, 0, 0, 0, 1, -0.3, -0.3, -1, 0, 0],    // Mainstream/wenig Förderung
    pole2: [1, -0.5, 0, 0, -1, 1, 1, 1, 0, 0.2],      // Förderung/Vielfalt
  },
  "Haushalt": {
    pole1: [-2, 0, 0, 0, 1, 0, 0, -2, -1, 0.5],     // Handlungsspielraum -> strikte Disziplin
    pole2: [3, 0, 2, 1, -1, 0.5, 0.5, 1, 2, 0.8],   // Transformation -> kreditfinanziert
  },
  "Steuern": {
    // KORRIGIERT: F_short/F_long spiegeln jetzt die EINNAHMENSEITE direkt
    // wider (weniger Steuern = weniger Einnahmen = mehr Finanzierungsdruck,
    // nicht weniger). Der Wachstumsausgleich läuft separat über W in der
    // Finanzierungsdruck-Formel (-0.15*W) - beides gleichzeitig über F
    // UND W gegenzurechnen hätte den Wachstumseffekt doppelt gezählt und
    // im Extremfall sogar das Vorzeichen verkehrt (siehe Testlauf).
    pole1: [2, 1, 2, 2, -2, -0.3, 0, -1, 0, 0.2],     // Wachstum/niedrigere Belastung
    pole2: [-2, -1, 0, -1, 0, 1.5, 1, 0, 0, 0.1],     // Umverteilung/höhere Einnahmen
  },
  "Klima/Energie": {
    pole1: [-2, 2.5, -0.5, 0, -2, -0.5, -0.5, -1, -3, -1.5],  // wenig Intervention
    pole2: [3, -0.5, 1.5, 1, 1, 0.5, 0.5, 1, 3, 1.5],         // starke Transformation
  },
};

// Gestufte Interaktionen: nur Kombinationen, für die aus den 14 Fragen ein
// plausibler Wirkungsmechanismus ableitbar ist (siehe Vorlage Abschnitt 5).
// weight = fracA * fracB * interactionStrength - wirkt graduell, kein
// Schwellenwert. fracX ist die Interpolationsposition Richtung Pol 2, außer
// wo "1 - fracX" (Richtung Pol 1) vermerkt ist.
const FISCAL_INTERACTIONS = [
  {
    label: "Migration × Arbeit",
    weight: (t) => t["Migration"] * (1 - t["Arbeit"]),
    effect: { A: 0.5, W: 0.3, T: 0.2 },
  },
  {
    label: "Migration × Bildung",
    weight: (t) => t["Migration"] * t["Bildung"],
    effect: { Z: 0.5, A: 0.3, F_long: -0.3 },
  },
  {
    label: "Migration × Bürgergeld",
    weight: (t) => t["Migration"] * t["Bürgergeld/Wohnen"],
    effect: { F_short: 0.5, F_long: 0.4, K: 0.3 },
  },
  {
    label: "Kinder × Bildung",
    weight: (t) => t["Kinder"] * t["Bildung"],
    effect: { Z: 0.5, A: 0.3, F_long: -0.3 },
  },
  {
    label: "Kinder × Arbeit",
    weight: (t) => t["Kinder"] * t["Arbeit"],
    effect: { A: 0.5, W: 0.2 },
  },
  {
    label: "Rente × Pflege",
    weight: (t) => t["Rente"] * (1 - t["Pflege"]),
    effect: { F_long: 0.6, K: 0.3 },
  },
  {
    label: "Rente × Steuern",
    weight: (t) => t["Rente"] * (1 - t["Steuern"]),
    effect: { F_long: 0.7, F_short: 0.2 },
  },
  {
    label: "Pflege × Arbeit",
    weight: (t) => (1 - t["Pflege"]) * t["Arbeit"],
    effect: { A: 0.4, W: 0.2 },
  },
  {
    label: "Sport (Prävention)",
    weight: (t) => t["Sport"],
    effect: { Z: 0.3, A: 0.2, F_long: -0.2 },
  },
  {
    label: "Arbeit × Steuern",
    weight: (t) => (1 - t["Arbeit"]) * (1 - t["Steuern"]),
    effect: { W: 0.5, F_short: 0.2 },
  },
  {
    label: "Haushalt × Klima",
    weight: (t) => t["Schuldenbremse/Haushalt"] * t["Klima/Energie"],
    effect: { F_short: 0.4, Z: 0.5, F_long: -0.4, W: 0.2 },
  },
  {
    label: "Frieden × Migration",
    weight: (t) => t["Frieden"] * t["Migration"],
    effect: { R: 0.3, T: 0.2, Z: 0.2 },
  },
  {
    label: "Sicherheit × Migration",
    weight: (t) => (1 - t["Sicherheit"]) * t["Migration"],
    effect: { T: -0.4, K: 0.3 },
  },
];

function App() {
  // Schritte: 'welcome' → 'questions' → 'result'
  const [step, setStep] = useState('welcome');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState(Array(questions.length).fill(null));
  const [fadeDirection, setFadeDirection] = useState(null); // 'left' oder 'right' für Fade-Out
  
  // Filter-Zustände: Für Parteien und Themen (Parteien per Default inaktiv, Themen aktiv)
  const [partyFilters, setPartyFilters] = useState(() => {
    const filters = {};
    Object.keys(partyData).forEach(party => {
      filters[party] = false;  // Standardmäßig ausgeblendet, nur Top 3 werden aktiviert
    });
    return filters;
  });
  const [topicFilters, setTopicFilters] = useState(() => {
    const filters = {};
    questions.forEach(q => {
      filters[q.topic] = true;
    });
    return filters;
  });
  
  // Filter-Menu Toggle
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  
  // Berechne automatisch die Top 3 Parteien wenn zum Ergebnis gewechselt wird
  useEffect(() => {
    if (step === 'result') {
      // Berechne Ranking
      const activeIndices = questions
        .map((q, i) => ({ topic: q.topic, index: i }))
        .filter(q => topicFilters[q.topic]);
      
      if (activeIndices.length > 0) {
        const ranking = Object.keys(partyData)
          .map(party => {
            const totalAbsDiff = activeIndices.reduce((sum, { index }) => {
              return sum + Math.abs((userAnswers[index] ?? 0) - partyData[party][index]);
            }, 0);
            const avgAbsDiff = totalAbsDiff / activeIndices.length;
            return { party, avgAbsDiff };
          })
          .sort((a, b) => a.avgAbsDiff - b.avgAbsDiff);
        
        // Setze nur die Top 3 Parteien auf true
        const topThreeParties = ranking.slice(0, 3).map(r => r.party);
        const newFilters = {};
        Object.keys(partyData).forEach(party => {
          newFilters[party] = topThreeParties.includes(party);
        });
        setPartyFilters(newFilters);
      }
    }
  }, [step, userAnswers, topicFilters]);
  
  // Antwort des Nutzers verarbeiten
  const handleAnswer = (value) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = value;
    setUserAnswers(newAnswers);
    
    // Setze Fade-Out Richtung: 1-5 = links, 6-10 = rechts
    setFadeDirection(value <= 5 ? 'left' : 'right');
    
    // Warte auf Animation bevor zur nächsten Frage gewechselt wird
    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        setStep('result');
      }
      setFadeDirection(null);
    }, 300);
  };
  
  // Navigation zwischen Fragen
  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };
  
  const handleNextQuestion = () => {
    if (userAnswers[currentQuestion] !== null) {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        setStep('result');
      }
    }
  };
  
  // Daten für das Radar-Diagramm zusammenbauen
  // Wichtig: zuerst den ORIGINAL-Index jeder Frage sichern, dann erst filtern –
  // sonst verschieben sich beim Ausblenden eines Themas alle nachfolgenden Werte
  // (Bug: vorher wurde nach dem Filtern neu durchnummeriert, wodurch Nutzer- und
  // Parteiwerte dem falschen Thema zugeordnet wurden).
  const buildChartData = () => {
    return questions
      .map((q, originalIndex) => ({ ...q, originalIndex }))
      .filter(q => topicFilters[q.topic])
      .map(q => {
        const dataPoint = {
          topic: q.topic,
          user: userAnswers[q.originalIndex]
        };
        Object.keys(partyData).forEach(party => {
          if (partyFilters[party]) {
            dataPoint[party] = partyData[party][q.originalIndex];
          }
        });
        return dataPoint;
      });
  };

  // Ähnlichkeits-Ranking: mittlere absolute Abweichung pro (gefiltertem) Thema.
  // Je kleiner der Wert, desto näher die Partei an den eigenen Antworten.
  // Skala ist 1-10, also max. mögliche Abweichung pro Thema = 9 -> daraus
  // eine leichter lesbare "Übereinstimmung in %" ableiten (100% = 0 Abweichung
  // über alle aktiven Themen, 0% = maximale Abweichung in jedem Thema).
  const computeSimilarityRanking = () => {
    const activeIndices = questions
      .map((q, i) => ({ topic: q.topic, index: i }))
      .filter(q => topicFilters[q.topic]);

    if (activeIndices.length === 0) return [];

    return Object.keys(partyData)
      .filter(party => partyFilters[party])
      .map(party => {
        const totalAbsDiff = activeIndices.reduce((sum, { index }) => {
          return sum + Math.abs((userAnswers[index] ?? 0) - partyData[party][index]);
        }, 0);
        const avgAbsDiff = totalAbsDiff / activeIndices.length;
        const matchPercent = Math.round(100 - (avgAbsDiff / 9) * 100);
        return { party, avgAbsDiff, matchPercent };
      })
      .sort((a, b) => a.avgAbsDiff - b.avgAbsDiff);
  };

  // Für jedes Thema:
  // - Partei mit der größten Nähe zur eigenen Position
  // - Partei mit der größten Entfernung zur eigenen Position
  const computeTopicInsights = () => {
    return questions
      .map((question, index) => {
        if (!topicFilters[question.topic]) return null;

        const partyDifferences = Object.keys(partyData).map(party => ({
          party,
          diff: Math.abs(
            (userAnswers[index] ?? 0) - partyData[party][index]
          )
        }));

        const nearest = [...partyDifferences]
          .sort((a, b) => a.diff - b.diff)[0];

        const furthest = [...partyDifferences]
          .sort((a, b) => b.diff - a.diff)[0];

        return {
          topic: question.topic,
          nearest,
          furthest
        };
      })
      .filter(Boolean);
  };
  // Finanzierbarkeits-Check v3: KERNÄNDERUNG gegenüber v2.
  //
  // v2 bildete pro Dimension einen gewichteten DURCHSCHNITT über die 14
  // Themen. Das war der entscheidende Fehler: ein Durchschnitt kann nicht
  // "explodieren", egal wie viele teure Antworten man gleichzeitig wählt,
  // weil sich alles zur Mitte hin nivelliert - ein Ergebnis wie
  // "nicht finanzierbar" war rechnerisch praktisch ausgeschlossen. Reale
  // Kostenstudien zu Wahlprogrammen (z. B. vor der Bundestagswahl 2025)
  // SUMMIEREN dagegen die Kosten aller Einzelversprechen und vergleichen die
  // Summe mit realistisch verfügbarer Gegenfinanzierung - ein Summen-,
  // kein Mittelwert-Problem.
  //
  // v3 summiert deshalb über alle 14 Themen (statt zu mitteln) und setzt das
  // Ergebnis dann relativ zur theoretisch schlechtestmöglichen Antwort-
  // Kombination (bei EXAKT diesen 14 Fragen, inkl. Interaktionseffekten):
  //
  //   normiert = (tatsächlicher Wert − neutraler Wert)
  //              / (schlechtestmöglicher Wert − neutraler Wert)
  //
  // "Neutral" = alle Antworten in der Mitte (5,5). "Schlechtestmöglich" wird
  // je Ampel eigens berechnet (für den Finanzierungsdruck z. B. die Kombi aus
  // allen Antworten, die diesen speziellen Wert maximieren würde). Dadurch
  // KANN ein Ergebnis nahe 1.0 (= praktisch am schlechtestmöglichen Punkt)
  // tatsächlich Rot auslösen, wenn jemand konsequent auf teure Optionen
  // ohne Gegenfinanzierung antwortet - analog zu einem Wahlprogramm, das
  // durchgehend teure Zusagen ohne Deckungsvorschlag macht. Ein gemischtes,
  // in sich stimmiges Antwortprofil bleibt dagegen im grünen/gelben Bereich.
  // Die Grenzwerte (0.35/0.55/0.75) sind eine eigene, im Code dokumentierte
  // Kalibrierung, keine externe Vorgabe.
  const computeFiscalAnalysis = () => {
    const t = {};
    questions.forEach((q, index) => {
      const answer = userAnswers[index] ?? 5.5;
      t[q.topic] = (answer - 1) / 9;
    });

    // Liefert den vollen (Basis + Interaktionen) Dimensions-Vektor als SUMME
    // (nicht Durchschnitt!) für eine beliebige Zuordnung topic -> t (0..1).
    const computeDimsForT = (tMap) => {
      const dims = {};
      FISCAL_DIMENSION_KEYS.forEach(key => { dims[key] = 0; });
      Object.keys(FISCAL_TOPIC_MODEL).forEach(topic => {
        const frac = tMap[topic];
        if (frac === undefined) return;
        const weight = FISCAL_TOPIC_WEIGHTS[topic] ?? 1;
        const { pole1, pole2 } = FISCAL_TOPIC_MODEL[topic];
        FISCAL_DIMENSION_KEYS.forEach((key, i) => {
          dims[key] += weight * (pole1[i] + frac * (pole2[i] - pole1[i]));
        });
      });
      const interactionContributions = [];
      FISCAL_INTERACTIONS.forEach(({ label, weight, effect }) => {
        const w = weight(tMap);
        if (w <= 0) return;
        Object.keys(effect).forEach(key => {
          dims[key] += w * effect[key];
        });
        interactionContributions.push({ label, weight: w });
      });
      return { dims, interactionContributions };
    };

    const actual = computeDimsForT(t);

    const neutralT = {};
    Object.keys(FISCAL_TOPIC_MODEL).forEach(topic => { neutralT[topic] = 0.5; });
    const neutral = computeDimsForT(neutralT).dims;

    // Komposit-Formeln für die vier Ampeln (linear in den Dimensionen).
    const composites = {
      finanzen: (d) => 0.6 * d.F_short + 0.4 * d.F_long - 0.15 * d.W - 0.1 * d.A,
      gesellschaft: (d) => 0.3 * -d.S + 0.3 * -d.T + 0.2 * d.P + 0.2 * d.K,
      kapazitaet: (d) => d.K,
      zukunft: (d) => -d.Z,
      verlagerung: (d) => d.P,
    };

    // Schlechtestmöglicher Wert je Komposit: weil jede Komposit-Formel linear
    // in den (pro Thema summierten) Dimensionen ist, lässt sich das Maximum
    // exakt je Thema einzeln bestimmen (kein globales Optimierungsproblem).
    // Für Interaktionen wird - als bewusst konservative Näherung, weil eine
    // exakte gemeinsame Optimierung über 14 korrelierte Variablen den Rahmen
    // sprengen würde - jede Interaktion unabhängig bei Gewicht=1 betrachtet.
    const worstCaseFor = (compositeFn) => {
      let base = 0;
      Object.keys(FISCAL_TOPIC_MODEL).forEach(topic => {
        const weight = FISCAL_TOPIC_WEIGHTS[topic] ?? 1;
        const { pole1, pole2 } = FISCAL_TOPIC_MODEL[topic];
        const vecToObj = (vec) => {
          const o = {};
          FISCAL_DIMENSION_KEYS.forEach((key, i) => { o[key] = vec[i]; });
          return o;
        };
        const score1 = compositeFn(vecToObj(pole1));
        const score2 = compositeFn(vecToObj(pole2));
        base += weight * Math.max(score1, score2);
      });
      let interactionExtra = 0;
      FISCAL_INTERACTIONS.forEach(({ effect }) => {
        const effectObj = {};
        FISCAL_DIMENSION_KEYS.forEach(key => { effectObj[key] = effect[key] ?? 0; });
        interactionExtra += Math.max(0, compositeFn(effectObj));
      });
      return base + interactionExtra;
    };

    const ampelLevel = (score, worst, neutralScore) => {
      const span = worst - neutralScore;
      const normalized = span !== 0 ? (score - neutralScore) / span : 0;
      if (normalized > 0.75) return { level: 'red', normalized };
      if (normalized > 0.55) return { level: 'orange', normalized };
      if (normalized > 0.35) return { level: 'yellow', normalized };
      return { level: 'green', normalized };
    };

    const results = {};
    Object.keys(composites).forEach(key => {
      const fn = composites[key];
      const score = fn(actual.dims);
      const neutralScore = fn(neutral);
      const worst = worstCaseFor(fn);
      results[key] = ampelLevel(score, worst, neutralScore);
    });

    // --- Warum drei Ampeln statt einer einzigen Kennzahl ---
    // Eine einzige Kennzahl lässt sich nur über kompensatorische Mittelung
    // ("gute Werte gleichen schlechte aus") oder über künstliche
    // Sonderregeln ("Finanzierung schlägt immer durch") erzeugen - beides
    // wurde hier ausprobiert und beides ist eine Verzerrung der Realität,
    // keine Vereinfachung von ihr. Fachlich sauberer ist die Unterscheidung
    // zwischen "schwacher" und "starker" Nachhaltigkeit (OECD-Well-Being-
    // Rahmen, IMF/EU Debt-Sustainability-Analysen): manche Kapitalarten
    // (menschlich, sozial, natürlich) sind untereinander tendenziell
    // austauschbar - gute Bildungspolitik kann fehlende Klimapolitik ein
    // Stück weit kompensieren. Fiskalische Solvenz und staatliche
    // Handlungsfähigkeit sind das dagegen NICHT: ein Staat kann eine
    // Finanzierungslücke nicht mit gesellschaftlichem Zusammenhalt
    // stopfen, und Verwaltung/Infrastruktur, die überlastet ist, wird
    // durch eine gute Wirtschaftslage nicht automatisch leistungsfähiger.
    // Deshalb: "Gesellschaft" und "Zukunft" (menschliches/soziales/
    // natürliches Kapital) werden zu EINER Ampel gemittelt (kompensatorisch,
    // dort methodisch vertretbar), "Finanzierung" und "Staatliche Kapazität"
    // bleiben als jeweils eigene, nicht kompensierbare Ampeln stehen -
    // macht in Summe genau die gewünschten maximal drei Kategorien.
    const gesellschaftZukunftNormalized =
      0.55 * results.gesellschaft.normalized + 0.45 * results.zukunft.normalized;
    const levelFromNormalized = (n) =>
      n > 0.75 ? 'red' : n > 0.55 ? 'orange' : n > 0.35 ? 'yellow' : 'green';

    const ampeln = [
      { key: 'finanzen', icon: '💶', label: 'Finanzierung', level: results.finanzen.level },
      {
        key: 'gesellschaftZukunft',
        icon: '🌍',
        label: 'Gesellschaft & Zukunft',
        level: levelFromNormalized(gesellschaftZukunftNormalized),
      },
      { key: 'kapazitaet', icon: '🏛️', label: 'Staatliche Kapazität', level: results.kapazitaet.level },
    ];
    const shiftLevelLabel =
      results.verlagerung.normalized > 0.55 ? 'hoch'
      : results.verlagerung.normalized > 0.3 ? 'mittel'
      : 'niedrig';
    const shift = { icon: '↔️', label: 'Belastungsverlagerung', value: shiftLevelLabel };

    // "Was treibt das Ergebnis?": je Thema der Netto-Beitrag zur Summe aus
    // Finanzierungs- + Gesellschafts- + Kapazitätsdruck minus Zukunft -
    // gleiche Logik wie oben, aber pro Thema statt aufsummiert, um die 2-3
    // stärksten Treiber (und den stärksten Gegenpol) zu benennen.
    const totalPressure = (d) =>
      composites.finanzen(d) + composites.gesellschaft(d) + composites.kapazitaet(d) - d.Z;
    const topicDriverScore = (topic) => {
      const frac = t[topic];
      if (frac === undefined) return 0;
      const weight = FISCAL_TOPIC_WEIGHTS[topic] ?? 1;
      const { pole1, pole2 } = FISCAL_TOPIC_MODEL[topic];
      const v = {};
      const vNeutral = {};
      FISCAL_DIMENSION_KEYS.forEach((key, i) => {
        v[key] = pole1[i] + frac * (pole2[i] - pole1[i]);
        vNeutral[key] = pole1[i] + 0.5 * (pole2[i] - pole1[i]);
      });
      // Abweichung von der neutralen Mitte (5,5), nicht der Rohwert -
      // sonst würden Themen mit "teurem" Mittelwert auch bei exakt
      // neutraler Antwort fälschlich als Treiber erscheinen.
      return weight * (totalPressure(v) - totalPressure(vNeutral));
    };
    const topicScores = Object.keys(FISCAL_TOPIC_MODEL)
      .map(topic => ({ topic, score: topicDriverScore(topic) }))
      .sort((a, b) => b.score - a.score);

    const drivers = [];
    if (topicScores.length > 0 && topicScores[0].score > 0.5) {
      drivers.push(`${topicScores[0].topic} erhöht den Druck am stärksten.`);
    }
    const strongestInteraction = [...actual.interactionContributions].sort(
      (a, b) => b.weight - a.weight
    )[0];
    if (strongestInteraction && strongestInteraction.weight > 0.3) {
      drivers.push(
        `Die Kombination "${strongestInteraction.label}" verstärkt diesen Effekt zusätzlich.`
      );
    }
    const mildest = topicScores[topicScores.length - 1];
    if (mildest && mildest.score < -0.5) {
      drivers.push(`${mildest.topic} wirkt dem am ehesten entgegen.`);
    }

    return { ampeln, shift, drivers };
  };

  // Erzeugt einen PNG-Blob der (unsichtbar gerenderten) Share-Card.
  // Kein Fremd-Hosting mehr nötig – das Bild bleibt lokal im Browser.
  const [shareState, setShareState] = useState('idle'); // idle | generating | done | error
  const [shareImageBlob, setShareImageBlob] = useState(null);
  const shareCardRef = useRef(null);

  // Erzeugt einen PNG-Blob der Share-Card.
  // Das Bild wird bereits auf der Ergebnisseite vorbereitet,
  // damit navigator.share() später direkt beim Button-Klick
  // aufgerufen werden kann.
  const generateShareImage = async () => {
    const node = shareCardRef.current;
    if (!node) return null;

    const canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: '#ffffff'
    });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  };

  // Share-Bild vorbereiten, sobald die Ergebnisseite geladen ist.
  useEffect(() => {
    if (step !== 'result') return;

    let cancelled = false;

    const prepareShareImage = async () => {
      // Kurz warten, damit die unsichtbare Share-Card vollständig
      // gerendert wurde.
      await new Promise(resolve => setTimeout(resolve, 300));

      const blob = await generateShareImage();

      if (!cancelled && blob) {
        setShareImageBlob(blob);
      }
    };

    prepareShareImage();

    return () => {
      cancelled = true;
    };
  }, [step, topicFilters, partyFilters, userAnswers]);

  // Misst die tatsächliche Footer-Höhe (der Footer ist position:fixed und
  // wickelt seine Links je nach Bildschirmbreite unterschiedlich um) und
  // schreibt sie als CSS-Variable, damit .container immer genug Platz am
  // unteren Rand frei lässt (behebt: letzte Zeile des Disclaimers wird auf
  // dem Smartphone vom Footer verdeckt).
  useEffect(() => {
    const setFooterHeightVar = () => {
      const footerEl = document.querySelector('.app-footer');
      if (footerEl) {
        document.documentElement.style.setProperty(
          '--footer-height',
          `${footerEl.offsetHeight}px`
        );
      }
    };
    setFooterHeightVar();
    window.addEventListener('resize', setFooterHeightVar);

    const footerEl = document.querySelector('.app-footer');
    const resizeObserver = new ResizeObserver(setFooterHeightVar);
    if (footerEl) resizeObserver.observe(footerEl);

    return () => {
      window.removeEventListener('resize', setFooterHeightVar);
      resizeObserver.disconnect();
    };
  }, [step]);

  // Kleines Logo, das beim Scrollen auf der Ergebnisseite oben links
  // eingeblendet bleibt (das große Logo im Header scrollt normal mit).
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    if (step !== 'result') {
      setIsScrolled(false);
      return;
    }
    const handleScroll = () => setIsScrolled(window.scrollY > 120);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [step]);

  // App(4).js – handleShare komplett ersetzen

  const handleShare = async () => {
    try {
      let blob = shareImageBlob;

      if (!blob) {
        setShareState('generating');
        blob = await generateShareImage();
        if (blob) setShareImageBlob(blob);
      }

      if (!blob) {
        throw new Error('Bild konnte nicht erzeugt werden.');
      }

      const file = new File(
        [blob],
        'wahlspinne.png',
        { type: 'image/png', lastModified: Date.now() }
      );

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: 'Meine Wahlspinne',
          text: 'Mein politisches Netzdiagramm zur Bundestagswahl 2025 🕸️ #Wahlspinne',
          files: [file]
        });

        setShareState('done');
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: 'Meine Wahlspinne',
          text: 'Mein politisches Netzdiagramm zur Bundestagswahl 2025 🕸️ #Wahlspinne'
        });

        setShareState('done');
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'wahlspinne.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setShareState('done');
    } catch (error) {
      if (error?.name === 'AbortError') {
        setShareState('idle');
        return;
      }

      console.error('Fehler beim Teilen:', error);
      setShareState('error');
    }
  };
  

    // Rendern der verschiedenen Phasen
    if (step === 'welcome') {
      return (
        <div className="container">
          <header>
            <button
              className="logo-button"
              onClick={() => {
                setStep('welcome');
                setCurrentQuestion(0);
              }}
              aria-label="Zur Startseite"
            >
            <img src={logo} alt="Wahlspinne" className="logo" />
            </button>
          </header>
          <main className="welcome-box">
            <h1>Willkommen bei der Wahlspinne!</h1>
            <p>
              Webe dir dein politisches Netz und vergleiche es mit den Bundestagsparteien.
              Klicke auf den Pfeil, um loszulegen.
            </p>
            <button onClick={() => setStep('questions')} className="arrow-button" aria-label="Zum Fragebogen">
              <ArrowIcon direction="right" size={28} />
            </button>
          </main>
          <footer className="app-footer">
            <div className="footer-content">
              <div className="footer-links">
                <a href={`${SITE_URL}/methodik`} target="_blank" rel="noopener noreferrer">Methodik</a>
                <a href={`${SITE_URL}/impressum`} target="_blank" rel="noopener noreferrer">Impressum</a>
                <a href={`${SITE_URL}/datenschutz`} target="_blank" rel="noopener noreferrer">Datenschutz</a>
              </div>
              <p className="footer-copyright">&copy; 2026 Wahlspinne</p>
            </div>
          </footer>
        </div>
      );
    }
    
    if (step === 'questions') {
      const currentQ = questions[currentQuestion];
      return (
        <div className="container">
          <header>
            <button
              className="logo-button"
              onClick={() => {
                setStep('welcome');
                setCurrentQuestion(0);
              }}
              aria-label="Zur Startseite"
            >
              <img src={logo} alt="Wahlspinne" className="logo" />
            </button>
          </header>
          <main className={`question-box question-slide-in ${fadeDirection ? `fade-out-${fadeDirection}` : ''}`}>
            {(() => {
              const [heading, ...rest] = currentQ.question.split(':');
              const scaleText = rest.join(':').trim();
              return (
                <>
                  <h2>{heading}:</h2>
                  {scaleText && <p className="question-scale">{scaleText}</p>}
                </>
              );
            })()}
            <div className="options">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                <button
                  key={num}
                  onClick={() => handleAnswer(num)}
                  className={`option-button ${userAnswers[currentQuestion] === num ? 'selected' : ''}`}
                  aria-label={`Antwort ${num} von 10`}
                >
                  {num}
                </button>
              ))}
            </div>
            {currentQ.description && <p className="description">{currentQ.description}</p>}
            <div className="question-navigation">
              <button 
                onClick={handlePrevQuestion} 
                className="nav-button nav-prev"
                disabled={currentQuestion === 0}
                aria-label="Zurück zur vorherigen Frage"
              >
                <ArrowIcon direction="left" />
              </button>
              <p className="question-counter">Frage {currentQuestion + 1} von {questions.length}</p>
              <button 
                onClick={handleNextQuestion} 
                className="nav-button nav-next"
                disabled={userAnswers[currentQuestion] === null}
                aria-label="Weiter zur nächsten Frage"
              >
                <ArrowIcon direction="right" />
              </button>
            </div>
            <p className="deselect-hint">
              Du kannst einzelne Themen und Parteien später auf der Ergebnisseite
              über die Filter wieder abwählen.
            </p>
          </main>
          <footer className="app-footer">
            <div className="footer-content">
              <div className="footer-links">
                <a href="#methodology">Methodik</a>
                <a href="#impressum">Impressum</a>
                <a href="#datenschutz">Datenschutz</a>
              </div>
              <p className="footer-copyright">&copy; 2026 Wahlspinne</p>
            </div>
          </footer>
        </div>
      );
    }
    
    if (step === 'result') {
      const chartData = buildChartData();
      const similarityRanking = computeSimilarityRanking();
      const topicInsights = computeTopicInsights();
      const fiscalAnalysis = computeFiscalAnalysis();
      
      // Filter umschalten
      const togglePartyFilter = (party) => {
        setPartyFilters({ ...partyFilters, [party]: !partyFilters[party] });
      };
      const toggleTopicFilter = (topic) => {
        setTopicFilters({ ...topicFilters, [topic]: !topicFilters[topic] });
      };
      
      return (
        <div className="container">
          <button
            className={`sticky-logo ${isScrolled ? 'visible' : ''}`}
            onClick={() => {
              setStep('welcome');
              setCurrentQuestion(0);
            }}
            aria-label="Zur Startseite"
            tabIndex={isScrolled ? 0 : -1}
          >
            <img src={logo} alt="Wahlspinne" />
          </button>
          <header>
            <button
              className="logo-button"
              onClick={() => {
                setStep('welcome');
                setCurrentQuestion(0);
              }}
              aria-label="Zur Startseite"
            >
              <img src={logo} alt="Wahlspinne" className="logo" />
            </button>
          </header>
          <main className="result-page">

            {/* Ranking-Panel */}
            <section className="ranking-panel">
              <h3>Am nächsten an deiner Position</h3>
              <ol className="ranking-list">
                {similarityRanking.map(({ party, matchPercent }, index) => (
                  <li key={party}>
                    <span className={`ranking-number ${index < 3 ? `rank-${index + 1}` : 'rank-other'}`}>
                      {index + 1}
                    </span>
                    <span style={{ color: getPartyColor(party) }}>
                      {party} – {matchPercent}% Übereinstimmung
                    </span>
                  </li>
                ))}
              </ol>
              <p className="ranking-note">
                Berechnung: mittlere absolute Abweichung deiner Antworten zu den
                Partei-Werten über alle ausgewählten Themen (Skala 1–10), umgerechnet
                in eine Übereinstimmung in %. 100 % hieße: identische Antworten in
                jedem einzelnen Thema.
              </p>
            </section>
            
            {/* Filter-Menu */}
            <section className="filter-menu-section">
              <button 
                className="filter-toggle-button"
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                aria-label="Parteien und Themen filtern"
              >
                <span className="filter-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 5h18" />
                    <path d="M6 12h12" />
                    <path d="M10 19h4" />
                  </svg>
                </span>
                
                <span>Filtere Parteien und Themen</span>
                
                <span
                  className={`chevron ${showFilterMenu ? 'open' : ''}`}
                  aria-hidden="true"
                >
                  ▼
                </span>
              </button>
              
              {showFilterMenu && (
                <div className="filter-menu-content">
                  <div className="filter-group">
                    <h4>Parteien</h4>
                    <div className="checkbox-group compact">
                      {Object.keys(partyFilters).map(party => (
                        <label key={party}>
                          <input
                            type="checkbox"
                            checked={partyFilters[party]}
                            onChange={() => togglePartyFilter(party)}
                          />
                          {party}
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="filter-group">
                    <h4>Themen</h4>
                    <div className="checkbox-group compact">
                      {questions.map(q => (
                        <label key={q.topic}>
                          <input
                            type="checkbox"
                            checked={topicFilters[q.topic]}
                            onChange={() => toggleTopicFilter(q.topic)}
                          />
                          {q.topic}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
            
            <section className="chart-overview">
              <div className="chart-container">
                <h3>Dein politisches Netz</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart outerRadius="70%" data={chartData}>
                    <PolarGrid stroke="#c8c8c8" strokeDasharray="2 3" strokeWidth={1.5} />
                    <PolarAngleAxis dataKey="topic" tick={{ fontSize: 12, fill: '#333', fontWeight: 600 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e8e8e8', borderRadius: '8px' }}
                      formatter={(value) => Math.round(value * 10) / 10}
                    />
                    <Legend wrapperStyle={{ paddingTop: '1rem' }} />
                    <Radar
                      name="Du"
                      dataKey="user"
                      stroke="#ffb81c"
                      fill="#ffb81c"
                      fillOpacity={0.6}
                      strokeWidth={2.5}
                    />
                    {Object.keys(partyData).map(party =>
                      partyFilters?.[party] && (
                        <Radar
                          key={party}
                          name={party}
                          dataKey={party}
                          stroke={getPartyColor(party)}
                          fillOpacity={0}
                        />
                      )
                    )}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Neue Insights */}
              <div className="insights-panel">
                <h3>Deine politischen Insights</h3>
                <ul className="insights-list">
                  {topicInsights.map(({ topic, nearest, furthest }) => (
                    <li key={topic}>
                      <strong>{topic}:</strong> am nächsten an{' '}
                      <span style={{ color: getPartyColor(nearest.party) }}>{nearest.party}</span>,
                      am weitesten weg von{' '}
                      <span style={{ color: getPartyColor(furthest.party) }}>{furthest.party}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Finanzierbarkeits-Check v5: drei eigenständige Ampeln statt einer
                künstlich verrechneten Gesamtzahl. Finanzierung und Staatliche
                Kapazität bleiben unverwässert (nicht kompensierbar durch gute
                Werte anderswo, siehe Kommentar in computeFiscalAnalysis);
                Gesellschaft und Zukunft sind zu einer Ampel gemittelt, weil
                menschliches/soziales/natürliches Kapital sich laut OECD-
                Wohlstandsrahmen tendenziell gegenseitig kompensieren können. */}
            <section className="fiscal-panel">
              <h3>Langfristige Tragfähigkeit deiner Auswahl</h3>
              <p className="fiscal-intro">
                Nicht alles, was wünschenswert wäre, kann sich der Staat auch
                leisten. Diese Einschätzung berücksichtigt kurzfristige und
                langfristige Wirkungen sowie Wechselwirkungen zwischen deinen
                Antworten. Finanzierung und Staatliche Kapazität werden bewusst
                nicht mit den anderen Bereichen verrechnet: Eine Finanzierungslücke
                wird durch gesellschaftlichen Zusammenhalt nicht kleiner.
              </p>

              <div className="fiscal-ampel-table">
                {fiscalAnalysis.ampeln.map((a) => (
                  <div key={a.key} className={`fiscal-ampel-row fiscal-${a.level}`}>
                    <span className="fiscal-ampel-icon" aria-hidden="true">{a.icon}</span>
                    <span className="fiscal-ampel-label">{a.label}</span>
                    <span className={`fiscal-dot fiscal-dot-${a.level}`} aria-hidden="true" />
                  </div>
                ))}
                <div className="fiscal-ampel-row fiscal-shift-row">
                  <span className="fiscal-ampel-icon" aria-hidden="true">{fiscalAnalysis.shift.icon}</span>
                  <span className="fiscal-ampel-label">{fiscalAnalysis.shift.label}</span>
                  <span className="fiscal-shift-value">{fiscalAnalysis.shift.value}</span>
                </div>
              </div>

              {fiscalAnalysis.drivers.length > 0 && (
                <div className="fiscal-drivers">
                  <h4>Was treibt das Ergebnis?</h4>
                  <ul>
                    {fiscalAnalysis.drivers.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="fiscal-disclaimer">
                Dies ist keine Haushaltsprognose und keine Vorhersage des
                politischen Erfolgs. Bewertet wird die innere Tragfähigkeit
                der gewählten Kombination anhand plausibler Wirkungsrichtungen
                aus deinen Antworten – die Stärke der Effekte ist relativ,
                kein Eurobetrag. Kein Haushaltsgutachten.
              </p>
            </section>

            <section className="share-section">
              <button
                onClick={handleShare}
                disabled={shareState === 'generating'}
                className="share-button"
              >
                📤 Ergebnis teilen
              </button>

              {shareState === 'error' && (
                <p className="share-error">
                  Teilen hat nicht geklappt. Bitte versuche es erneut oder
                  mach einen Screenshot.
                </p>
              )}

              <p className="share-hint">
                Tipp für Instagram: Im Teilen-Menü landet das Bild im Chat.
                Für die Story speichere es stattdessen (Download-Symbol im
                Teilen-Menü) und lade es in der Instagram-App über "Story
                hinzufügen" hoch.
              </p>
            </section>

            <p className="disclaimer">
              Parteipositionen sind KI-gestützte Einordnungen der Wahlprogramme 2025,
              keine offiziellen Angaben der Parteien. Mehr dazu in der Methodik.
            </p>

            {/* Unsichtbar gerenderte Share-Card: eigenes, für Social Media optimiertes
                Design (1080px breit, Höhe passt sich dem Inhalt an) statt eines
                rohen UI-Screenshots. Bleibt im DOM (nicht display:none), damit
                html2canvas sie erfassen kann. isAnimationActive={false} auf beiden
                Radar-Elementen ist wichtig: ohne das kann html2canvas mitten in der
                Recharts-Eintritts-Animation (Linien wachsen von der Mitte nach außen)
                auslösen -> Ergebnis war ein winziges Netz in der Bildmitte. */}
            <div className="share-card-offscreen">
              <div ref={shareCardRef} className="share-card-frame">
                <div className="share-card share-card-white">
                  <div className="share-card-header">
                    <img src={logo} alt="Logo" className="share-card-logo" />
                    <div className="share-card-titles">
                      <span className="share-card-title">Wahlspinne</span>
                      <span className="share-card-subtitle">Bundestagswahl 2025</span>
                    </div>
                  </div>

                  <RadarChart
                    cx={540}
                    cy={410}
                    outerRadius={280}
                    width={1080}
                    height={740}
                    data={chartData}
                  >
                    <PolarGrid stroke="#d8d8d8" strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="topic" tick={{ fill: '#333', fontSize: 18, fontWeight: 500 }} />
                    <Radar 
                      name="Du" 
                      dataKey="user" 
                      stroke="#ffb81c" 
                      fill="#ffb81c" 
                      fillOpacity={0.5} 
                      strokeWidth={3}
                      isAnimationActive={false}
                    />
                    {Object.keys(partyData).map(party =>
                      partyFilters?.[party] && (
                        <Radar
                          key={party}
                          name={party}
                          dataKey={party}
                          stroke={getPartyColor(party)}
                          fillOpacity={0}
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                      )
                    )}
                  </RadarChart>

                  <div className="share-card-legend">
                    <span className="share-card-legend-item">
                      <span className="share-card-dot" style={{ backgroundColor: '#FFD166' }} /> Du
                    </span>
                    {Object.keys(partyData).map(party =>
                      partyFilters?.[party] && (
                        <span className="share-card-legend-item" key={party}>
                          <span className="share-card-dot" style={{ backgroundColor: getPartyColor(party) }} /> {party}
                        </span>
                      )
                    )}
                  </div>

                  <div className="share-card-footer">
                    <div>Parteipositionen KI-gestützt aus den Wahlprogrammen 2025 · Weiter außen = mehr Staat</div>
                    <div className="share-card-cta">Probier's selbst unter {SITE_URL.replace('https://', '')}</div>
                  </div>
                </div>
              </div>
            </div>

          </main>
          <footer className="app-footer">
            <div className="footer-content">
              <div className="footer-links">
                <a href="#methodology">Methodik</a>
                <a href="#impressum">Impressum</a>
                <a href="#datenschutz">Datenschutz</a>
              </div>
              <p className="footer-copyright">&copy; 2026 Wahlspinne</p>
            </div>
          </footer>
        </div>
      );
    }
  
  return null;
}

export default App;