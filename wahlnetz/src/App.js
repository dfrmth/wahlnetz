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
  
  // Ermittelt pro Thema, welche Partei(en) den höchsten Wert haben
  const computeLeadingParty = (index) => {
    let maxVal = -Infinity;
    let leaders = [];
    Object.keys(partyData).forEach(party => {
      const val = partyData[party][index];
      if (val > maxVal) {
        maxVal = val;
        leaders = [party];
      } else if (val === maxVal) {
        leaders.push(party);
      }
    });
    return leaders.join(', ');
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

  // Neue Insights: Größte & kleinste Unterschiede für ALLE Parteien
  const computeGreatestDifferences = () => {
    const activeIndices = questions
      .map((q, i) => ({ topic: q.topic, index: i }))
      .filter(q => topicFilters[q.topic]);
    
    const differences = {};
    Object.keys(partyData).forEach(party => {
      const diffs = activeIndices
        .map(q => ({ topic: q.topic, diff: Math.abs((userAnswers[q.index] ?? 0) - partyData[party][q.index]) }))
        .sort((a, b) => b.diff - a.diff);
      
      differences[party] = {
        greatest: diffs[0],
        nearest: diffs[diffs.length - 1]
      };
    });
    return differences;
  };
  
  // Neue Insights: User-Konsistenz (wie variabel sind die Antworten)
  const computeConsistency = () => {
    const validAnswers = userAnswers.filter(a => a !== null);
    if (validAnswers.length === 0) return 0;
    const avg = validAnswers.reduce((a, b) => a + b, 0) / validAnswers.length;
    const variance = validAnswers.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / validAnswers.length;
    const stdDev = Math.sqrt(variance);
    // Normalisiere auf 0-100 Skala (0 = sehr konsistent, 100 = sehr variabel)
    return Math.round((stdDev / 4.5) * 100);
  };
  
  // Helper: Konsistenz-Label
  const getConsistencyLabel = () => {
    const consistency = computeConsistency();
    if (consistency < 25) return '🎯 Sehr konsistent';
    if (consistency < 50) return '⚖️ Gemischt';
    if (consistency < 75) return '📊 Variabel';
    return '🌈 Sehr vielfältig';
  };

  // Erzeugt einen PNG-Blob der (unsichtbar gerenderten) Share-Card.
  // Kein Fremd-Hosting mehr nötig – das Bild bleibt lokal im Browser.
  const [shareState, setShareState] = useState('idle'); // idle | generating | done | error
  const shareCardRef = useRef(null);

  const generateShareImage = async () => {
    const node = shareCardRef.current;
    if (!node) return null;
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff' });
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  };

  const handleShare = async () => {
    setShareState('generating');
    try {
      const imageBlob = await generateShareImage();
      if (!imageBlob) throw new Error('Bild konnte nicht erzeugt werden.');

      const file = new File([imageBlob], 'wahlspinne.png', { type: 'image/png' });
      const shareData = {
        files: [file],
        title: 'Meine Wahlspinne',
        text: 'Mein politisches Netzdiagramm zur Bundestagswahl 2025 🕸️ #Wahlspinne',
      };

      // Bevorzugt: natives Share-Sheet des Geräts (funktioniert u. a. mit
      // Instagram, X/Twitter, WhatsApp, Telegram, Mail – ganz ohne Umweg
      // über einen extern gehosteten Upload).
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share(shareData);
        setShareState('done');
        return;
      }

      // Fallback (z. B. Desktop-Browser ohne Web-Share-Unterstützung):
      // Bild direkt herunterladen, damit man es manuell hochladen kann.
      const url = URL.createObjectURL(imageBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'wahlspinne.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setShareState('done');
    } catch (error) {
      // AbortError = Nutzer hat das Share-Sheet einfach geschlossen, kein echter Fehler
      if (error?.name !== 'AbortError') {
        console.error('Fehler beim Teilen:', error);
        setShareState('error');
      } else {
        setShareState('idle');
      }
    }
  };
  

  // Rendern der verschiedenen Phasen
  if (step === 'welcome') {
    return (
      <div className="container">
        <header>
          <img src={logo} alt="Logo" className="logo" />
        </header>
        <main className="welcome-box">
          <h1>Willkommen bei der Wahlspinne!</h1>
          <p>
            Webe dir dein politisches Netz und vergleiche es mit den Bundestagsparteien.
            Klicke auf den Pfeil, um loszulegen.
          </p>
          <button onClick={() => setStep('questions')} className="arrow-button" aria-label="Zum Fragebogen">
            <span className="arrow-icon">→</span>
          </button>
        </main>
        <footer className="app-footer">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Über die Wahlspinne</h4>
              <p>Die Wahlspinne hilft dir, deine politischen Positionen mit den Positionen der Bundestagsparteien zu vergleichen.</p>
            </div>
            <div className="footer-section">
              <h4>Links</h4>
              <ul>
                <li><a href="#methodology">Methodik</a></li>
                <li><a href="#about">Über uns</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Rechtliches</h4>
              <ul>
                <li><a href="#impressum">Impressum</a></li>
                <li><a href="#datenschutz">Datenschutz</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Wahlspinne. Alle Rechte vorbehalten.</p>
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
          <img src={logo} alt="Logo" className="logo" />
        </header>
        <main className={`question-box question-slide-in ${fadeDirection ? `fade-out-${fadeDirection}` : ''}`}>
          <h2>{currentQ.question}</h2>
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
              <span className="arrow-icon">←</span> Zurück
            </button>
            <p className="question-counter">Frage {currentQuestion + 1} von {questions.length}</p>
            <button 
              onClick={handleNextQuestion} 
              className="nav-button nav-next"
              disabled={userAnswers[currentQuestion] === null}
              aria-label="Weiter zur nächsten Frage"
            >
              Weiter <span className="arrow-icon">→</span>
            </button>
          </div>
        </main>
        <footer className="app-footer">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Über die Wahlspinne</h4>
              <p>Die Wahlspinne hilft dir, deine politischen Positionen mit den Positionen der Bundestagsparteien zu vergleichen.</p>
            </div>
            <div className="footer-section">
              <h4>Links</h4>
              <ul>
                <li><a href="#methodology">Methodik</a></li>
                <li><a href="#about">Über uns</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Rechtliches</h4>
              <ul>
                <li><a href="#impressum">Impressum</a></li>
                <li><a href="#datenschutz">Datenschutz</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Wahlspinne. Alle Rechte vorbehalten.</p>
          </div>
        </footer>
      </div>
    );
  }
  
  if (step === 'result') {
    const chartData = buildChartData();
    const similarityRanking = computeSimilarityRanking();
    
    // Filter umschalten
    const togglePartyFilter = (party) => {
      setPartyFilters({ ...partyFilters, [party]: !partyFilters[party] });
    };
    const toggleTopicFilter = (topic) => {
      setTopicFilters({ ...topicFilters, [topic]: !topicFilters[topic] });
    };
    
    return (
      <div className="container">
        <header>
          <img src={logo} alt="Logo" className="logo" />
        </header>
        <main className="result-page">
          {/* Filter-Menu */}
          <section className="filter-menu-section">
            <button 
              className="filter-toggle-button"
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              aria-label="Filter-Menü öffnen/schließen"
            >
              <span className="filter-icon">⚙️</span>
              Filter
              <span className={`chevron ${showFilterMenu ? 'open' : ''}`}>▼</span>
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
          
          {/* Ranking-Panel */}
          <section className="ranking-panel">
            <h3>Am nächsten an deiner Position</h3>
            <ol className="ranking-list">
              {similarityRanking.map(({ party, matchPercent }) => (
                <li key={party}>
                  <span
                    className="ranking-dot"
                    style={{ backgroundColor: getPartyColor(party) }}
                  />
                  {party} – {matchPercent}% Übereinstimmung
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

          <section className="chart-overview">
            <div className="chart-container">
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
              
              <div className="insight-card">
                <div className="insight-title">Größte Unterschiede zu jeder Partei</div>
                <div className="insight-content">
                  {Object.entries(computeGreatestDifferences()).map(([party, diffs]) => (
                    <div key={party} className="insight-item">
                      <span className="insight-party" style={{ color: getPartyColor(party) }}>●</span>
                      <div className="insight-details">
                        <div><strong>{party}</strong></div>
                        <div className="insight-diff-item">
                          <span className="label">Größter Unterschied:</span>
                          <span className="topic">{diffs.greatest?.topic || 'N/A'}</span>
                        </div>
                        <div className="insight-diff-item">
                          <span className="label">Größte Übereinstimmung:</span>
                          <span className="topic">{diffs.nearest?.topic || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="insight-card">
                <div className="insight-title">Deine Konsistenz</div>
                <div className="insight-content">
                  <div className="consistency-bar">
                    <div 
                      className="consistency-fill" 
                      style={{ width: `${computeConsistency()}%` }}
                    ></div>
                  </div>
                  <p className="consistency-label">
                    {getConsistencyLabel()}
                  </p>
                  <p className="consistency-description">
                    {computeConsistency() < 25 ? 'Du hast eine sehr klare, konsistente politische Linie.' :
                     computeConsistency() < 50 ? 'Du hast eine gemischte politische Haltung mit Schwerpunkten.' :
                     computeConsistency() < 75 ? 'Du hast variable Positionen zu verschiedenen Themen.' :
                     'Du hast eine sehr diverse und vielfältige politische Einstellung.'}
                  </p>
                </div>
              </div>
            </div>
          </section>
          
          <section className="share-section">
            <button onClick={handleShare} disabled={shareState === 'generating'} className="share-button">
              {shareState === 'generating' ? 'Bild wird erstellt …' : '📤 Ergebnis teilen'}
            </button>
            {shareState === 'error' && (
              <p className="share-error">
                Teilen hat nicht geklappt. Bitte versuche es erneut oder mach einen Screenshot.
              </p>
            )}
          </section>

          <p className="disclaimer">
            Parteipositionen sind KI-gestützte Einordnungen der Wahlprogramme 2025,
            keine offiziellen Angaben der Parteien. Mehr dazu in der Methodik.
          </p>

          {/* Unsichtbar gerenderte Share-Card: eigenes, für Social Media optimiertes
              Design (1080×1080, quadratisch) statt eines rohen UI-Screenshots.
              Bleibt im DOM (nicht display:none), damit html2canvas sie erfassen kann. */}
          <div className="share-card-offscreen">
            <div ref={shareCardRef} className="share-card share-card-white">
              <div className="share-card-header">
                <img src={logo} alt="Logo" className="share-card-logo" />
                <div>
                  <div className="share-card-title">Wahlspinne</div>
                  <div className="share-card-subtitle">Bundestagswahl 2025</div>
                </div>
              </div>

              <RadarChart
                cx={540}
                cy={430}
                outerRadius={280}
                width={1080}
                height={780}
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
                Parteipositionen KI-gestützt aus den Wahlprogrammen 2025 · Weiter außen = mehr Staat
              </div>
            </div>
          </div>

        </main>
        <footer className="app-footer">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Über die Wahlspinne</h4>
              <p>Die Wahlspinne hilft dir, deine politischen Positionen mit den Positionen der Bundestagsparteien zu vergleichen.</p>
            </div>
            <div className="footer-section">
              <h4>Links</h4>
              <ul>
                <li><a href="#methodology">Methodik</a></li>
                <li><a href="#about">Über uns</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Rechtliches</h4>
              <ul>
                <li><a href="#impressum">Impressum</a></li>
                <li><a href="#datenschutz">Datenschutz</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Wahlspinne. Alle Rechte vorbehalten.</p>
          </div>
        </footer>
      </div>
    );
  }
  
  return null;
}

export default App;
