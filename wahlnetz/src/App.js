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
import logo from './assets/logo.svg';
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
  { id: 0, topic: "Außenpolitik", question: "Außenpolitik: Abschreckung (1) oder Soft Power (10)", description: "(Entscheidungshilfe: Kosten vs. Abhängigkeiten)" },
  { id: 1, topic: "Innenpolitik", question: "Innenpolitik: Kontrolle (1) oder Freiheit (10)", description: "(Entscheidungshilfe: Kriminalitätsbekämpfung vs. Überwachungsstaat)" },
  { id: 2, topic: "Migration", question: "Migration: restriktiv (1) oder offen (10)", description: "(Entscheidungshilfe: Fachkräftemangel vs. Überforderung)" },
  { id: 3, topic: "Bürgergeld/Armut/Wohnen", question: "Bürgergeld/Armut/Wohnen: Eigenverantwortung (1) oder Sicherheitsnetz (10)", description: "(Entscheidungshilfe: Ungleichheit vs. Kosten)" },
  { id: 4, topic: "Arbeit", question: "Arbeit: Wirtschaftswachstum (1) oder Arbeitsbedingungen (10)", description: "(Entscheidungshilfe: weniger Unternehmenssteuern vs. weniger Unternehmen)" },
  { id: 5, topic: "Rente", question: "Rente: privat (1) oder öffentlich (10)", description: "(Entscheidungshilfe: Anlagerisiko vs. Kosten)" },
  { id: 6, topic: "Pflege", question: "Pflege: Leistung (1) oder Bezahlbarkeit (10)", description: "(Entscheidungshilfe: Eigenkosten vs. Staatskosten)" },
  { id: 7, topic: "Kinder", question: "Kinder: Verantwortung bei Eltern (1) oder Staat (10)", description: "(Entscheidungshilfe: Ungleichheit vs. Kosten)" },
  { id: 8, topic: "Bildung", question: "Bildung: Leistung (1) oder Förderung (10)", description: "(Entscheidungshilfe: Ungleichheit vs. Kosten (aber auch Fachkräftebindung))" },
  { id: 9, topic: "Sport", question: "Sport: Erfolge (1) oder Bürgergesundheit (10)", description: "(Entscheidungshilfe: Nationalstolz vs. Kosten (aber auch Prävention))" },
  { id: 10, topic: "Kultur", question: "Kultur: Mainstream (1) oder Förderung (10)", description: "(Entscheidungshilfe: weniger Vielfalt vs. Kosten)" },
  { id: 11, topic: "Schuldenbremse/Haushalt", question: "Schuldenbremse/Haushalt: Handlungsspielraum (1) oder Transformation (10)", description: "(Entscheidungshilfe: Investitionsstau vs. Zinslast)" },
  { id: 12, topic: "Steuern", question: "Steuern: Wachstum (1) oder Umverteilung (10)", description: "(Entscheidungshilfe: Ungleichheit vs. Steuerflucht)" },
  { id: 13, topic: "Klima-/Energiepolitik", question: "Klima-/Energiepolitik: wenig (1) oder viel (10)", description: "(Entscheidungshilfe: spätere Anpassungskosten vs. heutige Transformationskosten)" }
];

// ============================================================================
// Finanzierbarkeits-Modell (8-Dimensionen-Scoring einer anderen KI)
// ============================================================================
// Jede Frage hat zwei Pole (Antwort 1 und Antwort 10). Für jeden Pol sind hier
// die 8 Dimensionswerte aus der Vorlage hinterlegt:
// [F0, F∞, W, A, H, R, G, V]
//   F0   = heutige öffentliche Finanzlast       (+3 = sehr teuer)
//   F∞   = langfristige öffentliche Finanzlast  (+3 = sehr teuer)
//   W    = Wachstum/Produktivität/Steuerbasis   (+3 = stark positiv)
//   A    = Arbeitsangebot/Erwerbsbeteiligung    (+3 = stark positiv)
//   H    = private Haushalts-/Unternehmensbel.  (+3 = stark belastend)
//   R    = Resilienz/strategische Autonomie     (+3 = stark positiv)
//   G    = gesellschaftlicher Zusammenhalt      (+3 = stark positiv)
//   V    = Verwaltungs-/Umsetzbarkeit           (+3 = sehr gut umsetzbar)
//
// Die Vorlage gibt für einige Zellen Bandbreiten an (z. B. "-1 bis +2"), weil
// der Nettoeffekt von der Ausgestaltung abhängt. Für ein deterministisches
// Scoring wird hier jeweils der Mittelwert der Bandbreite verwendet – das ist
// eine bewusste Vereinfachung.
const FISCAL_DIMENSION_KEYS = ['F0', 'Finf', 'W', 'A', 'H', 'R', 'G', 'V'];

const FISCAL_TOPIC_MODEL = {
  "Außenpolitik": {
    pole1: [2, 1, 1, 0, 0, 3, 1, 1],      // Abschreckung
    pole2: [1, -1, 2, 0, 0, 3, 2, 1],     // Soft Power / Diplomatie
  },
  "Innenpolitik": {
    pole1: [2, 1, -1, 0, 1, 1, -1, -1],   // mehr Kontrolle
    pole2: [-1, 0, 1, 0, -1, 0, 2, 2],    // mehr Freiheit
  },
  "Migration": {
    pole1: [-1, -1, -1, -1, 0, 1, 0, 1],       // restriktiv
    pole2: [1, 0.5, 1.5, 2, 1, 1, 1, -1],      // offen
  },
  "Bürgergeld/Armut/Wohnen": {
    pole1: [-2, 0.5, 0, -1, 2, 0, -2, 1],  // Eigenverantwortung
    pole2: [2, -1, 1, 1, -2, 0, 2, 0],     // Sicherheitsnetz
  },
  "Arbeit": {
    pole1: [-1, 0, 3, 2, 1, 1, 0, 1],       // Wirtschaftswachstum/Flexibilität
    pole2: [1, 0, 1.5, 1, -1, 0, 2, -1],    // bessere Arbeitsbedingungen
  },
  "Rente": {
    pole1: [-1, -1, 1, 1, 2, 1, -1, 0],    // stärker privat
    pole2: [2, 2.5, -1, -1, -2, 0, 1, 1],  // stärker öffentlich
  },
  "Pflege": {
    // Achtung: in unserem Fragebogen ist 1 = Leistung, 10 = Bezahlbarkeit,
    // also umgekehrt zur Reihenfolge in der Vorlage – hier nach Bedeutung
    // (nicht nach Zeilenreihenfolge) zugeordnet.
    pole1: [2, 2, 1, 2, -2, 0, 2, 0],       // Leistung -> "höherer Leistungsumfang"
    pole2: [-2, -0.5, 0, -1, 3, 0, -1, 1],  // Bezahlbarkeit -> "stärker auf Bezahlbarkeit"
  },
  "Kinder": {
    pole1: [-1, 0.5, -1, -1, 2, 0, -1, 1], // primär Eltern
    pole2: [2, -1, 2, 2, -2, 0, 2, 0],     // stärker Staat
  },
  "Bildung": {
    pole1: [0, 0, 2, 1, 1, 0, 0, 1],        // Leistung/Selektion
    pole2: [2, -1, 2.5, 2, -1, 0, 2, -1],   // Förderung/Teilhabe
  },
  "Sport": {
    pole1: [1, 0, 0, 0, 0, 1, 1, 1],       // Spitzensport
    pole2: [1, -1, 1, 1, -1, 1, 2, 1],     // Breitensport/Gesundheit
  },
  "Kultur": {
    pole1: [-1, 0, 0, 0, 1, 0, -1, 1],      // Mainstream/wenig Förderung
    pole2: [1, -0.5, 0, 0, -1, 0, 2, -1],   // Förderung/Vielfalt
  },
  "Schuldenbremse/Haushalt": {
    pole1: [-2, 0, 0, 0, 1, -1, 0, 2],      // Handlungsspielraum -> strikte Ausgabendisziplin
    pole2: [3, 0, 2, 1, -1, 2, 1, -1],      // Transformation -> kreditfinanzierte Transformation
  },
  "Steuern": {
    pole1: [-2, 0, 2, 2, -2, 0, 0, 1],   // Wachstum -> niedrigere Belastung
    // H bei "Umverteilung" ist in der Vorlage "+2 bei Zahlern / -2 bei
    // Empfängern" - netto nicht eindeutig, hier vereinfachend auf 0 gesetzt.
    pole2: [2, 0, 0, -1, 0, 0, 2, 0],    // Umverteilung -> höhere Einnahmen
  },
  "Klima-/Energiepolitik": {
    // W bei "wenig Intervention" ist laut Vorlage "+1 kurzfristig / -2
    // langfristig" - hier grob als -0.5 gemittelt (Vereinfachung).
    pole1: [-2, 2.5, -0.5, 0, -2, -3, -1, 1],  // wenig Intervention
    pole2: [3, -0.5, 1.5, 1, 1, 3, 1, -1],     // starke Transformation
  },
};

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

  // Finanzierbarkeits-Check: übersetzt die 14 Antworten (1-10) über das oben
  // definierte 8-Dimensionen-Modell in einen Finanzierungsindex (FI) und
  // einen Tragfähigkeits-Index (GT), inklusive eines Teils der in der
  // Vorlage beschriebenen Interaktionseffekte.
  //
  // Einschränkung: Einige Interaktionseffekte aus der Vorlage beziehen sich
  // auf Konzepte, die unser Fragebogen gar nicht separat abfragt (z. B.
  // "hohe Importabhängigkeit bei Rüstung" oder "hohe internationale
  // Kooperation" als eigene Größe neben Soft Power). Diese wurden
  // weggelassen. Andere wurden über die naheliegendste vorhandene Frage als
  // Näherung abgebildet (z. B. "gute Arbeitsmarktintegration" über die
  // Bildungsfrage) - das ist unten jeweils kommentiert.
  const computeFiscalAnalysis = () => {
    // t[topic] = 0..1, wie stark die Antwort Richtung Pol 2 (Wert 10) geht
    const t = {};
    questions.forEach((q, index) => {
      const answer = userAnswers[index] ?? 5.5;
      t[q.topic] = (answer - 1) / 9;
    });

    // Basiswerte: Durchschnitt über alle 14 Themen (linear zwischen den Polen)
    const totals = { F0: 0, Finf: 0, W: 0, A: 0, H: 0, R: 0, G: 0, V: 0 };
    let topicCount = 0;
    Object.keys(FISCAL_TOPIC_MODEL).forEach(topic => {
      const frac = t[topic];
      if (frac === undefined) return;
      const { pole1, pole2 } = FISCAL_TOPIC_MODEL[topic];
      FISCAL_DIMENSION_KEYS.forEach((key, i) => {
        totals[key] += pole1[i] + frac * (pole2[i] - pole1[i]);
      });
      topicCount += 1;
    });
    const dims = {};
    FISCAL_DIMENSION_KEYS.forEach(key => {
      dims[key] = topicCount > 0 ? totals[key] / topicCount : 0;
    });

    // Interaktionseffekte (Auswahl, siehe Kommentar oben). Jeder Effekt wird
    // mit einem Gewicht 0..1 skaliert, das ausdrückt, wie stark beide
    // beteiligten Antworten tatsächlich in die jeweilige Richtung zeigen -
    // statt eines harten Ja/Nein-Schwellwerts wie in der Vorlage.
    const addEffect = (weight, effect) => {
      Object.keys(effect).forEach(key => {
        dims[key] += weight * effect[key];
      });
    };

    // Migration offen + gute Integration (Näherung: Bildung -> Förderung)
    addEffect(t["Migration"] * t["Bildung"], { W: 1, A: 1, Finf: -1 });
    // Migration offen + großzügige Transfers + geringe Integration
    addEffect(
      t["Migration"] * t["Bürgergeld/Armut/Wohnen"] * (1 - t["Bildung"]),
      { F0: 1, Finf: 1, A: -1 }
    );
    // Starke Kinderpolitik + Bildungsförderung
    addEffect(t["Kinder"] * t["Bildung"], { W: 1, A: 1, Finf: -1 });
    // Starke Kinderpolitik + gute Arbeitsbedingungen
    addEffect(t["Kinder"] * t["Arbeit"], { A: 1, W: 1 });
    // Breitensport + Prävention/Gesundheitsförderung (kein zweites Thema nötig)
    addEffect(t["Sport"], { Finf: -1 });
    // Soft Power + offene Handels-/Wirtschaftspolitik (Näherung: Steuern -> Wachstumspol)
    addEffect(t["Außenpolitik"] * (1 - t["Steuern"]), { W: 1, R: 1 });
    // Klimatransformation + kreditfinanzierte Investitionen (Infrastruktur/Netzausbau)
    addEffect(t["Klima-/Energiepolitik"] * t["Schuldenbremse/Haushalt"], {
      W: 1,
      V: 1,
      Finf: -1,
    });
    // Klimatransformation gewollt, aber strikte Ausgabendisziplin (Finanzierungslücke/langsame Umsetzung)
    addEffect(
      t["Klima-/Energiepolitik"] * (1 - t["Schuldenbremse/Haushalt"]),
      { W: -1, H: 1, G: -1 }
    );
    // Kreditfinanzierung + breites, dauerhaftes Leistungsversprechen (Rente/Pflege/Kinder)
    const broadBenefit =
      (t["Rente"] + (1 - t["Pflege"]) + t["Kinder"]) / 3;
    addEffect(t["Schuldenbremse/Haushalt"] * broadBenefit, { Finf: 2 });
    // Niedrige Steuern + gleichzeitig breites Leistungsversprechen
    addEffect((1 - t["Steuern"]) * broadBenefit, { Finf: 2 });
    // Sehr hohe Umverteilung + starke Arbeitsanreize (Näherung: Arbeit -> Wachstumspol)
    addEffect(t["Steuern"] * (1 - t["Arbeit"]), { W: 2 });

    // Finanzierungsindex und gesellschaftlicher Tragfähigkeits-Index
    const FI = 0.35 * dims.F0 + 0.4 * dims.Finf - 0.15 * dims.W - 0.1 * dims.A;
    const GT = 0.35 * dims.G + 0.25 * dims.R + 0.2 * dims.V + 0.2 * dims.W;

    // Harte Warnregeln, unabhängig von der FI-Einstufung
    const langfristigeFalle = dims.Finf >= 2.0;
    const dauerhafteBelastung = dims.F0 >= 1.5 && dims.Finf >= 1.5;
    const finanzierungOhneWachstum = FI >= 1.25 && dims.W <= 0 && dims.A <= 0;
    const privateVerlagerung = FI < 1.25 && dims.H >= 2.0;

    const hardRuleTriggered =
      langfristigeFalle || dauerhafteBelastung || finanzierungOhneWachstum;

    let level = 'green';
    if (FI > 1.75) level = 'red';
    else if (FI >= 1.25) level = 'orange';
    else if (FI >= 0.75) level = 'yellow';
    if (hardRuleTriggered) level = 'red';

    const messages = [];
    if (privateVerlagerung && !hardRuleTriggered) {
      messages.push({
        level: 'yellow',
        icon: '🟡',
        title: 'Staatlich finanzierbar, private Belastung',
        text: 'Staatlich finanzierbar, aber mit hoher Belastungsverlagerung auf private Haushalte oder Unternehmen.',
      });
    } else if (level === 'green') {
      messages.push({
        level: 'green',
        icon: '🟢',
        title: 'Tragfähig',
        text: 'Deine Auswahl liegt insgesamt innerhalb eines plausiblen langfristigen Finanzierungskorridors.',
      });
    } else if (level === 'red') {
      messages.push({
        level: 'red',
        icon: '🔴',
        title: 'Zielkonflikt',
        text: 'Deine Auswahl verbindet hohe dauerhafte Ausgaben mit begrenzten zusätzlichen Einnahmen bzw. Wachstumseffekten. Ohne zusätzliche Einnahmen, andere Einsparungen oder geänderte Prioritäten erscheint die langfristige Finanzierung schwierig.',
      });
    } else {
      messages.push({
        level,
        icon: level === 'orange' ? '🟠' : '🟡',
        title: 'Finanzierungsdruck',
        text: 'Deine Auswahl erzeugt voraussichtlich einen erhöhten langfristigen Finanzierungsbedarf. Je nach Ausgestaltung wären höhere Einnahmen, Einsparungen an anderer Stelle, zusätzliche Verschuldung oder positive Wachstums-/Beschäftigungseffekte nötig.',
      });
    }

    let gtLevel = null;
    if (GT < -2) gtLevel = 'red';
    else if (GT < -1.5) gtLevel = 'orange';
    else if (GT < -0.75) gtLevel = 'yellow';
    if (gtLevel) {
      messages.push({
        level: gtLevel,
        icon: gtLevel === 'red' ? '🔴' : gtLevel === 'orange' ? '🟠' : '🟡',
        title: 'Gesellschaftliche Tragfähigkeit',
        text: 'Deine Auswahl könnte zwar fiskalisch tragfähig sein, verlagert aber einen erheblichen Teil der Belastungen auf private Haushalte, Unternehmen oder bestimmte Gruppen bzw. kann Vertrauen, Zusammenhalt oder staatliche Handlungsfähigkeit beeinträchtigen.',
      });
    }

    return { dims, FI, GT, messages };
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

  const handleShare = async () => {
    const shareDataBase = {
      title: 'Meine Wahlspinne',
      text: 'Mein politisches Netzdiagramm zur Bundestagswahl 2025 🕸️ #Wahlspinne'
    };

    try {
      // Wenn das Bild bereits vorbereitet wurde:
      if (shareImageBlob) {
        const file = new File(
          [shareImageBlob],
          'wahlspinne.png',
          { type: 'image/png' }
        );

        // Native Android-/iOS-Share-Auswahl
        if (
          navigator.share &&
          navigator.canShare &&
          navigator.canShare({ files: [file] })
        ) {
          await navigator.share({
            ...shareDataBase,
            files: [file]
          });

          setShareState('done');
          return;
        }
      }

      // Fallback: Native Share-Auswahl ohne Bild.
      // Das ist besser als automatisch herunterzuladen,
      // wenn der Browser Web Share grundsätzlich unterstützt.
      if (navigator.share) {
        await navigator.share(shareDataBase);
        setShareState('done');
        return;
      }

      // Letzter Fallback für Desktop-Browser ohne Web Share.
      if (shareImageBlob) {
        const url = URL.createObjectURL(shareImageBlob);
        const link = document.createElement('a');

        link.href = url;
        link.download = 'wahlspinne.png';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
        setShareState('done');
      } else {
        throw new Error('Bild konnte nicht erzeugt werden.');
      }
    } catch (error) {
      // Nutzer hat das native Share-Menü geschlossen
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
                <a href="#methodology">Methodik</a>
                <a href="#about">Über uns</a>
                <a href="#impressum">Impressum</a>
                <a href="#datenschutz">Datenschutz</a>
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
                <a href="#about">Über uns</a>
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
                    <span className={`ranking-number rank-${index + 1}`}>
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

            {/* Finanzierbarkeits-Check: eigener Block, siehe computeFiscalAnalysis */}
            <section className="fiscal-panel">
              <h3>Wie finanzierbar ist deine Auswahl?</h3>
              <p className="fiscal-intro">
                Nicht alles, was wünschenswert wäre, kann sich der Staat auch
                leisten. Diese Einschätzung schätzt grob ab, ob deine Antworten
                eher zu einer soliden, einer angespannten oder einer schwer
                finanzierbaren Gesamtlage führen würden.
              </p>

              {fiscalAnalysis.messages.map((msg, i) => (
                <div key={i} className={`fiscal-message fiscal-${msg.level}`}>
                  <span className="fiscal-message-icon" aria-hidden="true">{msg.icon}</span>
                  <div>
                    <div className="fiscal-message-title">{msg.title}</div>
                    <p className="fiscal-message-text">{msg.text}</p>
                  </div>
                </div>
              ))}

              <details className="fiscal-details">
                <summary>Details zu den 8 Dimensionen anzeigen</summary>
                <ul className="fiscal-dimension-list">
                  <li><strong>Heutige Finanzlast (F₀):</strong> {fiscalAnalysis.dims.F0.toFixed(1)}</li>
                  <li><strong>Langfristige Finanzlast (F∞):</strong> {fiscalAnalysis.dims.Finf.toFixed(1)}</li>
                  <li><strong>Wachstum/Produktivität (W):</strong> {fiscalAnalysis.dims.W.toFixed(1)}</li>
                  <li><strong>Arbeitsangebot (A):</strong> {fiscalAnalysis.dims.A.toFixed(1)}</li>
                  <li><strong>Belastung Privater (H):</strong> {fiscalAnalysis.dims.H.toFixed(1)}</li>
                  <li><strong>Resilienz/Autonomie (R):</strong> {fiscalAnalysis.dims.R.toFixed(1)}</li>
                  <li><strong>Gesellschaftlicher Zusammenhalt (G):</strong> {fiscalAnalysis.dims.G.toFixed(1)}</li>
                  <li><strong>Umsetzbarkeit (V):</strong> {fiscalAnalysis.dims.V.toFixed(1)}</li>
                </ul>
                <p className="fiscal-index-line">
                  Finanzierungsindex: {fiscalAnalysis.FI.toFixed(2)} · Gesellschaftliche Tragfähigkeit: {fiscalAnalysis.GT.toFixed(2)}
                </p>
                <p className="fiscal-disclaimer">
                  Grobes, vereinfachtes Modell (u. a. Mittelwerte statt Bandbreiten,
                  einige Interaktionseffekte als Näherung) – keine offizielle
                  Haushalts- oder Steuerschätzung.
                </p>
              </details>
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
                <a href="#about">Über uns</a>
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