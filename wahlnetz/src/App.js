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
              <span className="arrow-icon">→</span>
            </button>
          </main>
          <footer className="app-footer">
            <div className="footer-content">
              <div className="footer-links">
                <a href="#methodology">Methodik</a>
                <a href="#about">Über uns</a>
                <a href="#impressum">Impressum</a>
                <a href="#datenschutz">Datenschutz</a>
                <span>&copy; 2025 Wahlspinne</span>
              </div>
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
              <div className="footer-links">
                <a href="#methodology">Methodik</a>
                <a href="#about">Über uns</a>
                <a href="#impressum">Impressum</a>
                <a href="#datenschutz">Datenschutz</a>
                <span>&copy; 2025 Wahlspinne</span>
              </div>
            </div>
          </footer>
        </div>
      );
    }
    
    if (step === 'result') {
      const chartData = buildChartData();
      const similarityRanking = computeSimilarityRanking();
      const topicInsights = computeTopicInsights();
      
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
              <div className="footer-links">
                <a href="#methodology">Methodik</a>
                <a href="#about">Über uns</a>
                <a href="#impressum">Impressum</a>
                <a href="#datenschutz">Datenschutz</a>
                <span>&copy; 2025 Wahlspinne</span>
              </div>
            </div>
          </footer>
        </div>
      );
    }
  
  return null;
}

export default App;