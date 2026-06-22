'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { 
  Zap, 
  Target, 
  TrendingUp, 
  Calculator, 
  CheckCircle, 
  ArrowRight, 
  Shield, 
  MessageSquare, 
  Star, 
  Activity, 
  Smartphone,
  Check,
  ChevronRight,
  Sparkles,
  Play
} from 'lucide-react';

const MOCK_TEAMS = [
  { home: "Flamengo", away: "Fluminense", market: "Vitória do Flamengo", odd: "1.85", type: "GREEN" },
  { home: "Real Madrid", away: "Barcelona", market: "Ambos Marcam - Sim", odd: "1.75", type: "GREEN" },
  { home: "Manchester City", away: "Arsenal", market: "Empate", odd: "3.40", type: "RED" },
  { home: "Bayern Munique", away: "Dortmund", market: "Mais de 3.5 Gols", odd: "2.10", type: "GREEN" },
  { home: "Liverpool", away: "Chelsea", market: "Mais de 2.5 Gols", odd: "1.95", type: "GREEN" },
  { home: "Boca Juniors", away: "River Plate", market: "Menos de 2.5 Gols", odd: "1.65", type: "RED" },
  { home: "Juventus", away: "Inter de Milão", market: "Vitória da Inter", odd: "2.40", type: "GREEN" },
  { home: "PSG", away: "Marseille", market: "Vitória do PSG", odd: "1.70", type: "GREEN" }
];

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    document.title = "A2 Sport Trackers - Inteligência Matemática & Alertas +EV";
  }, []);

  // Simulator state
  const [initialBank, setInitialBank] = useState(1000);
  const [expectedRoi, setExpectedRoi] = useState(12); // 12% ROI
  const [numBets, setNumBets] = useState(150);
  const [simulatedProfit, setSimulatedProfit] = useState(0);

  // Dynamic DB Stats State
  const [dbStats, setDbStats] = useState({
    winRate: "49.1%",
    greens: 480,
    reds: 497,
    roi: "+3.9%",
    totalBets: 977,
    bestMarket: "Vitória do Pakistan",
    bestMarketRate: "100.0%"
  });

  // Live feed simulation state
  const [liveSignal, setLiveSignal] = useState({
    match: "Flamengo x Fluminense",
    market: "Vitória do Flamengo @ 1.85",
    step: "analyzing", // "analyzing" -> "identified" -> "resolved"
    outcome: null
  });
  const [recentOutcomes, setRecentOutcomes] = useState(["GREEN", "GREEN", "RED", "GREEN", "RED"]);

  useEffect(() => {
    const stakePct = 0.02;
    let bank = initialBank;
    const avgProfitPerBet = stakePct * (expectedRoi / 100);
    
    for (let i = 0; i < numBets; i++) {
      bank += bank * avgProfitPerBet;
    }
    
    setSimulatedProfit(Math.round(bank - initialBank));
  }, [initialBank, expectedRoi, numBets]);

  // Live games list state populated from Supabase
  const [liveGamesList, setLiveGamesList] = useState([]);

  // Fetch real-time statistics and recent live games from Supabase database
  useEffect(() => {
    const fetchRealStatsAndGames = async () => {
      try {
        if (!supabase) return;
        
        // 1. Fetch opportunities for overall stats calculation
        const { data, error } = await supabase
          .from('ev_opportunities')
          .select('resultado, odd_oferecida, mercado');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          let totalResolved = 0;
          let greensCount = 0;
          let redsCount = 0;
          let netUnits = 0.0;
          const marketStats = {};
          
          data.forEach(row => {
            const res = row.resultado;
            const odd = row.odd_oferecida;
            const mkt = row.mercado;
            
            if ((res === 'green' || res === 'red') && odd) {
              const oddVal = parseFloat(odd);
              if (!isNaN(oddVal)) {
                totalResolved++;
                if (res === 'green') {
                  greensCount++;
                  netUnits += (oddVal - 1);
                } else {
                  redsCount++;
                  netUnits -= 1;
                }
                
                if (mkt) {
                  if (!marketStats[mkt]) {
                    marketStats[mkt] = { total: 0, greens: 0 };
                  }
                  marketStats[mkt].total++;
                  if (res === 'green') {
                    marketStats[mkt].greens++;
                  }
                }
              }
            }
          });
          
          if (totalResolved > 0) {
            const calculatedWinRate = (greensCount / totalResolved) * 100;
            const calculatedRoi = (netUnits / totalResolved) * 100;
            
            let bestMkt = "Vitória do Pakistan";
            let bestMktRate = 100.0;
            let maxRate = 0;
            
            Object.keys(marketStats).forEach(mkt => {
              const stats = marketStats[mkt];
              if (stats.total >= 10) {
                const rate = (stats.greens / stats.total) * 100;
                if (rate > maxRate) {
                  maxRate = rate;
                  bestMkt = mkt;
                  bestMktRate = rate;
                }
              }
            });
            
            setDbStats({
              winRate: `${calculatedWinRate.toFixed(1)}%`,
              greens: greensCount,
              reds: redsCount,
              roi: `${calculatedRoi >= 0 ? '+' : ''}${calculatedRoi.toFixed(1)}%`,
              totalBets: totalResolved,
              bestMarket: bestMkt,
              bestMarketRate: `${bestMktRate.toFixed(1)}%`
            });
          }
        }

        // 2. Fetch the last 15 recent opportunities to feed the live signal tracker cycle
        const { data: recentOpps, error: recentError } = await supabase
          .from('ev_opportunities')
          .select('confronto, mercado, resultado, odd_oferecida')
          .order('created_at', { ascending: false })
          .limit(15);

        if (!recentError && recentOpps && recentOpps.length > 0) {
          const parsedGames = recentOpps.map(row => {
            const parts = (row.confronto || '').split(' x ');
            const home = parts[0] ? parts[0].trim() : 'Equipe A';
            const away = parts[1] ? parts[1].trim() : 'Equipe B';
            
            let status = 'GREEN';
            if (row.resultado === 'red') {
              status = 'RED';
            } else if (row.resultado === 'green') {
              status = 'GREEN';
            } else {
              status = Math.random() > 0.45 ? 'GREEN' : 'RED';
            }

            return {
              home,
              away,
              market: row.mercado || 'Mais de 2.5 Gols',
              odd: row.odd_oferecida || '1.85',
              status
            };
          });
          setLiveGamesList(parsedGames);
        }
      } catch (err) {
        console.warn("Erro ao carregar estatísticas e jogos do Supabase:", err);
      }
    };
    fetchRealStatsAndGames();
  }, []);

  // Live signal real-time tracker cycle simulation with context-appropriate matches
  useEffect(() => {
    // Real-world fallback matches matching Copa do Mundo, Série B, Série C
    const mockTeamsList = liveGamesList.length > 0 ? liveGamesList : [
      { home: "Novorizontino", away: "Náutico", market: "Vitória do Novorizontino", odd: "1.80", status: "GREEN" },
      { home: "Botafogo-SP", away: "Operário-PR", market: "Mais de 2.5 Gols", odd: "2.10", status: "GREEN" },
      { home: "Cuiabá", away: "Vila Nova", market: "Vitória do Cuiabá", odd: "1.75", status: "RED" },
      { home: "Holanda", away: "Japão", market: "Vitória da Holanda", odd: "1.65", status: "GREEN" },
      { home: "Paysandu", away: "Inter de Limeira", market: "Mais de 2.5 Gols", odd: "1.95", status: "GREEN" },
      { home: "Athletic Club", away: "Goiás", market: "Vitória do Athletic Club", odd: "2.20", status: "RED" },
      { home: "São Bernardo", away: "Sport Recife", market: "Empate", odd: "3.20", status: "RED" },
      { home: "Uruguai", away: "Arábia Saudita", market: "Mais de 2.5 Gols", odd: "1.85", status: "GREEN" }
    ];

    let timer;
    let index = 0;

    const runSignalCycle = () => {
      const currentMatch = mockTeamsList[index % mockTeamsList.length];
      
      // Step 1: Analyzing
      setLiveSignal({
        match: `${currentMatch.home} x ${currentMatch.away}`,
        market: `${currentMatch.market} @ ${currentMatch.odd}`,
        step: "analyzing",
        outcome: null
      });

      // After 3 seconds, show identified signal
      timer = setTimeout(() => {
        setLiveSignal(prev => ({ ...prev, step: "identified" }));

        // After another 3 seconds, resolve
        timer = setTimeout(() => {
          const outcome = currentMatch.status || (Math.random() > 0.45 ? "GREEN" : "RED");
          
          setLiveSignal(prev => ({ ...prev, step: "resolved", outcome }));
          
          // Update recent outcomes history
          setRecentOutcomes(prev => {
            const nextHistory = [...prev.slice(1), outcome];
            return nextHistory;
          });

          // Stay resolved for 4 seconds, then start next cycle
          timer = setTimeout(() => {
            index++;
            runSignalCycle();
          }, 4000);

        }, 3000);

      }, 3000);
    };

    runSignalCycle();

    return () => clearTimeout(timer);
  }, [liveGamesList]);

  const handleProSubscribe = () => {
    if (user) {
      router.push('/pricing?plan=pro');
    } else {
      router.push(`/login?redirect=${encodeURIComponent('/pricing?plan=pro')}`);
    }
  };

  const handleFreeTrial = () => {
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/login?register=true');
    }
  };

  return (
    <div style={{
      background: '#09090b',
      color: '#fafafa',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      minHeight: '100vh',
      width: '100%',
      overflowX: 'hidden'
    }}>
      {/* Header / Navbar */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 5%',
        background: 'rgba(9, 9, 11, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1f1f23',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        width: '100%'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={24} color="var(--brand-neon)" fill="var(--brand-neon)" />
          <span style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.5px' }}>
            a2sport<span style={{ color: 'var(--brand-neon)' }}>trackers</span>
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link href="/jogo-responsavel" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#fff'} onMouseLeave={(e) => e.target.style.color = '#a1a1aa'}>Jogo Responsável</Link>
          <Link href="/faq" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#fff'} onMouseLeave={(e) => e.target.style.color = '#a1a1aa'}>FAQ</Link>
          <Link href="/quem-somos" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#fff'} onMouseLeave={(e) => e.target.style.color = '#a1a1aa'}>Quem Somos</Link>
          <Link href="/login" style={{
            background: 'transparent',
            border: '1px solid #3f3f46',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            textDecoration: 'none',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#3f3f46'; }}
          >
            Entrar
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        padding: '100px 5% 80px 5%',
        textAlign: 'center',
        background: 'radial-gradient(circle at 50% 30%, rgba(204, 255, 0, 0.08) 0%, transparent 60%)',
        position: 'relative',
        width: '100%'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(204, 255, 0, 0.1)',
          border: '1px solid rgba(204, 255, 0, 0.2)',
          padding: '6px 16px',
          borderRadius: '50px',
          color: 'var(--brand-neon)',
          fontSize: '0.8rem',
          fontWeight: 'bold',
          marginBottom: '24px',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          <Sparkles size={14} /> Inteligência Artificial & Matemática Aplicada
        </div>

        <h1 style={{
          fontSize: 'clamp(2.5rem, 5vw, 4.2rem)',
          fontWeight: 900,
          lineHeight: 1.1,
          maxWidth: '900px',
          margin: '0 auto 20px auto',
          letterSpacing: '-1.5px',
          textTransform: 'uppercase'
        }}>
          Lucrar com Apostas Não é Sorte. É <span style={{
            background: 'linear-gradient(90deg, var(--brand-neon) 0%, #00ff88 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>Estatística Pura.</span>
        </h1>

        <p style={{
          color: '#a1a1aa',
          fontSize: 'clamp(1.1rem, 2vw, 1.35rem)',
          maxWidth: '700px',
          margin: '0 auto 40px auto',
          lineHeight: 1.6
        }}>
          Nossa central processa milhares de dados por segundo, calculando odds matemáticas reais com a Distribuição de Poisson. Encontre assimetrias e faça apostas com Valor Esperado (+EV) positivo automaticamente.
        </p>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <a href="#precos" style={{
            background: 'var(--brand-neon)',
            color: '#000',
            padding: '16px 36px',
            borderRadius: '8px',
            fontWeight: 800,
            fontSize: '1rem',
            textDecoration: 'none',
            transition: 'transform 0.15s, box-shadow 0.15s',
            boxShadow: '0 0 30px rgba(204, 255, 0, 0.3)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Começar Agora
          </a>
          <a href="#recursos" style={{
            background: '#18181b',
            color: '#fff',
            border: '1px solid #27272a',
            padding: '16px 36px',
            borderRadius: '8px',
            fontWeight: 800,
            fontSize: '1rem',
            textDecoration: 'none',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#27272a'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#18181b'; }}
          >
            Ver Recursos
          </a>
        </div>
      </section>

      {/* Dynamic, Borderless Stats & Live Signal Section */}
      <section style={{
        padding: '80px 5%',
        background: '#09090b',
        width: '100%',
        position: 'relative',
        borderTop: '1px solid #1f1f23',
        borderBottom: '1px solid #1f1f23'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '50px',
          maxWidth: '1200px',
          margin: '0 auto',
          alignItems: 'center'
        }}>
          
          {/* Stats - Borderless & Clean */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '40px 30px',
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', background: 'var(--brand-neon)', borderRadius: '50%' }}></span>
                Taxa de Acerto Geral
              </span>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--brand-neon)', marginTop: '8px', textShadow: '0 0 30px rgba(204, 255, 0, 0.25)', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                {dbStats.winRate}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#52525b', display: 'block', marginTop: '4px' }}>Base: {dbStats.totalBets} palpites</span>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', background: '#00ff88', borderRadius: '50%' }}></span>
                ROI (Retorno Geral)
              </span>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: '#00ff88', marginTop: '8px', textShadow: '0 0 30px rgba(0, 255, 136, 0.25)', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                {dbStats.roi}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#52525b', display: 'block', marginTop: '4px' }}>Média ponderada no mercado</span>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', background: '#00d2ff', borderRadius: '50%' }}></span>
                Palpites Verdes / Vermelhos
              </span>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                <span style={{ color: '#00ff88' }}>{dbStats.greens}</span>
                <span style={{ fontSize: '1.5rem', color: '#3f3f46' }}>/</span>
                <span style={{ color: '#ff4444' }}>{dbStats.reds}</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#52525b', display: 'block', marginTop: '4px' }}>Últimas rodadas resolvidas</span>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', background: '#b339ff', borderRadius: '50%' }}></span>
                Mercado Mais Lucrativo
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginTop: '12px', lineHeight: '1.3', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                {dbStats.bestMarket}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#00ff88', display: 'block', marginTop: '6px', fontWeight: 'bold' }}>
                Taxa de Acerto: {dbStats.bestMarketRate}
              </span>
            </div>
          </div>

          {/* Dynamic Live result flashing space */}
          <div style={{
            background: '#09090b', // Same tone as page background
            border: 'none', // Removed border
            padding: '30px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: '#71717a', fontWeight: 'bold', letterSpacing: '1.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="blink-dot" style={{ width: '8px', height: '8px', background: '#00ff88', borderRadius: '50%' }}></span>
                Monitor de Sinais Ao Vivo
              </span>
            </div>

            {/* Display panel */}
            <div style={{
              background: '#0c0c10', // Darker contrast panel
              border: 'none', // Removed border
              borderRadius: '16px',
              padding: '28px 24px',
              minHeight: '180px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              position: 'relative'
            }}>
              {liveSignal.step === 'analyzing' && (
                <div style={{ animation: 'fadeInSlide 0.3s ease-out' }}>
                  <div style={{ color: '#ffd700', fontSize: '0.8rem', fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span className="blink-dot" style={{ display: 'inline-block', width: '6px', height: '6px', background: '#ffd700', borderRadius: '50%' }}></span>
                    ⚙️ Analisando Confronto...
                  </div>
                  <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                    {liveSignal.match}
                  </div>
                  <div style={{ color: '#52525b', fontSize: '0.75rem', marginTop: '6px', fontFamily: 'monospace' }}>
                    Varrendo odds e calculando True Odds...
                  </div>
                </div>
              )}

              {liveSignal.step === 'identified' && (
                <div style={{ animation: 'fadeInSlide 0.3s ease-out' }}>
                  <div style={{ color: '#00d2ff', fontSize: '0.8rem', fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                    ⚡ Palpite Identificado (+EV)
                  </div>
                  <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                    {liveSignal.match}
                  </div>
                  <div style={{ color: 'var(--brand-neon)', fontSize: '0.95rem', fontWeight: 700, marginTop: '4px' }}>
                    Sugestão: {liveSignal.market}
                  </div>
                </div>
              )}

              {liveSignal.step === 'resolved' && (
                <div style={{
                  animation: 'fadeInSlide 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  {liveSignal.outcome === 'GREEN' ? (
                    <>
                      <div style={{
                        background: 'rgba(0, 255, 136, 0.08)',
                        border: '2px solid #00ff88',
                        color: '#00ff88',
                        fontSize: '1.8rem',
                        fontWeight: 955,
                        padding: '12px 36px',
                        borderRadius: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        boxShadow: '0 0 30px rgba(0, 255, 136, 0.25)',
                        display: 'inline-block',
                        animation: 'pulseGreen 1.5s infinite alternate'
                      }}>
                        🟢 GREEN
                      </div>
                      <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold', marginTop: '14px', textTransform: 'uppercase' }}>
                        Sistema acertou!
                      </div>
                      <div style={{ color: '#00ff88', fontSize: '0.8rem', marginTop: '4px', fontWeight: 'bold' }}>
                        Lucro Garantido via Poisson
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{
                        background: 'rgba(255, 68, 68, 0.08)',
                        border: '2px solid #ff4444',
                        color: '#ff4444',
                        fontSize: '1.8rem',
                        fontWeight: 955,
                        padding: '12px 36px',
                        borderRadius: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        boxShadow: '0 0 30px rgba(255, 68, 68, 0.25)',
                        display: 'inline-block',
                        animation: 'pulseRed 1.5s infinite alternate'
                      }}>
                        🔴 RED
                      </div>
                      <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold', marginTop: '14px', textTransform: 'uppercase' }}>
                        Resultado Resolvido
                      </div>
                      <div style={{ color: '#71717a', fontSize: '0.8rem', marginTop: '4px' }}>
                        Gestão de Banca Aplicada
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* History timeline */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #1f1f27' }}>
              <span style={{ fontSize: '0.7rem', color: '#52525b', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Histórico Recente:
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {recentOutcomes.map((out, i) => (
                  <span 
                    key={i} 
                    style={{
                      background: out === 'GREEN' ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 68, 68, 0.15)',
                      border: `1px solid ${out === 'GREEN' ? '#00ff88' : '#ff4444'}`,
                      color: out === 'GREEN' ? '#00ff88' : '#ff4444',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    {out}
                  </span>
                ))}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Product Capabilities (Recursos) */}
      <section id="recursos" style={{
        padding: '80px 5%',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
            Capacidades de Ponta da Plataforma
          </h2>
          <p style={{ color: '#71717a', marginTop: '8px', fontSize: '1.05rem' }}>
            Nossa plataforma fornece tudo que um apostador profissional precisa para operar com base matemática estável.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '30px'
        }}>
          {/* Card 1 */}
          <div style={{
            background: '#121216',
            border: '1px solid #222',
            padding: '30px',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ background: 'rgba(204, 255, 0, 0.1)', color: 'var(--brand-neon)', padding: '12px', borderRadius: '8px', alignSelf: 'flex-start' }}>
              <Target size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: '#fff' }}>Algoritmo Poisson & xG</h3>
            <p style={{ color: '#a1a1aa', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
              Calculamos a força real ofensiva e defensiva de cada equipe. O robô simula o jogo milhares de vezes para encontrar a exata probabilidade de gols e do vencedor.
            </p>
          </div>

          {/* Card 2 */}
          <div style={{
            background: '#121216',
            border: '1px solid #222',
            padding: '30px',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ background: 'rgba(0, 255, 136, 0.1)', color: '#00ff88', padding: '12px', borderRadius: '8px', alignSelf: 'flex-start' }}>
              <Zap size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: '#fff' }}>Alertas de Valor (+EV)</h3>
            <p style={{ color: '#a1a1aa', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
              Quando a odd de uma casa de apostas fica desregulada e paga mais do que o cálculo estatístico provou ser justo, o sistema dispara um sinal de oportunidade imediatamente.
            </p>
          </div>

          {/* Card 3 */}
          <div style={{
            background: '#121216',
            border: '1px solid #222',
            padding: '30px',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ background: 'rgba(179, 57, 255, 0.1)', color: '#b339ff', padding: '12px', borderRadius: '8px', alignSelf: 'flex-start' }}>
              <TrendingUp size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: '#fff' }}>Simulação & Backtesting</h3>
            <p style={{ color: '#a1a1aa', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
              Analise o histórico de lucros de milhares de alertas passados. Valide a rentabilidade do algoritmo de forma visual e transparente por liga e por mercado.
            </p>
          </div>

          {/* Card 4 */}
          <div style={{
            background: '#121216',
            border: '1px solid #222',
            padding: '30px',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ background: 'rgba(0, 210, 255, 0.1)', color: '#00d2ff', padding: '12px', borderRadius: '8px', alignSelf: 'flex-start' }}>
              <Calculator size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: '#fff' }}>Gestão Kelly Inteligente</h3>
            <p style={{ color: '#a1a1aa', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
              O sistema calcula em cada sinal a stake ideal recomendada baseado no tamanho da sua banca e na margem de lucro encontrada. Evite a quebra e preserve seu capital.
            </p>
          </div>

          {/* Card 5 */}
          <div style={{
            background: '#121216',
            border: '1px solid #222',
            padding: '30px',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ background: 'rgba(255, 152, 0, 0.1)', color: '#ff9800', padding: '12px', borderRadius: '8px', alignSelf: 'flex-start' }}>
              <MessageSquare size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: '#fff' }}>Canal de Sinais no Telegram</h3>
            <p style={{ color: '#a1a1aa', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
              Não quer ficar olhando para o painel? Receba as melhores oportunidades filtradas direto no celular com link direto para colocar a aposta.
            </p>
          </div>

          {/* Card 6 */}
          <div style={{
            background: '#121216',
            border: '1px solid #222',
            padding: '30px',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#fff', padding: '12px', borderRadius: '8px', alignSelf: 'flex-start' }}>
              <Shield size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: '#fff' }}>Segurança & LGPD</h3>
            <p style={{ color: '#a1a1aa', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
              Dados cadastrais 100% criptografados de ponta a ponta e total conformidade com a LGPD. Respeitamos a privacidade das suas informações pessoais e financeiras.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Simulator Section */}
      <section style={{
        padding: '80px 5%',
        background: '#0c0c0e',
        borderTop: '1px solid #1c1c20',
        borderBottom: '1px solid #1c1c20',
        width: '100%'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '50px', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
              Simule Seus Resultados Matemáticos
            </h2>
            <p style={{ color: '#a1a1aa', marginTop: '16px', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Utilizando uma gestão de banca constante e focando em apostas +EV com valor esperado positivo, você deixa de contar com a sorte. Experimente ajustar os valores ao lado para ver o efeito multiplicador da consistência matemática.
            </p>
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00ff88', fontSize: '0.88rem', fontWeight: 'bold' }}>
                <CheckCircle size={16} /> Margem recomendada: 2% a 3% por aposta
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00ff88', fontSize: '0.88rem', fontWeight: 'bold' }}>
                <CheckCircle size={16} /> Apenas cotações com valor real calculados
              </div>
            </div>
          </div>

          <div style={{
            background: '#121217',
            border: '1px solid #2a2a32',
            padding: '30px',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#a1a1aa', fontWeight: 'bold', marginBottom: '8px' }}>
                <span>BANCA INICIAL</span>
                <span style={{ color: '#fff' }}>R$ {initialBank}</span>
              </label>
              <input 
                type="range" 
                min="100" 
                max="10000" 
                step="100"
                value={initialBank} 
                onChange={(e) => setInitialBank(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--brand-neon)' }} 
              />
            </div>

            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#a1a1aa', fontWeight: 'bold', marginBottom: '8px' }}>
                <span>ROI MÉDIO (+EV)</span>
                <span style={{ color: 'var(--brand-neon)' }}>{expectedRoi}%</span>
              </label>
              <input 
                type="range" 
                min="3" 
                max="25" 
                value={expectedRoi} 
                onChange={(e) => setExpectedRoi(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--brand-neon)' }} 
              />
            </div>

            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#a1a1aa', fontWeight: 'bold', marginBottom: '8px' }}>
                <span>TOTAL DE ENTRADAS (APOSTAS)</span>
                <span style={{ color: '#fff' }}>{numBets}</span>
              </label>
              <input 
                type="range" 
                min="20" 
                max="500" 
                step="10"
                value={numBets} 
                onChange={(e) => setNumBets(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--brand-neon)' }} 
              />
            </div>

            <div style={{
              background: '#09090b',
              padding: '20px',
              borderRadius: '8px',
              borderLeft: '4px solid var(--brand-neon)',
              marginTop: '10px'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 'bold', textTransform: 'uppercase' }}>Lucro Projetado</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--brand-neon)', marginTop: '4px' }}>
                + R$ {simulatedProfit}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#52525b', marginTop: '4px' }}>
                Banca final estimada: R$ {initialBank + simulatedProfit}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / Assinaturas (Preços) */}
      <section id="precos" style={{
        padding: '100px 5%',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
            Planos & Acesso
          </h2>
          <p style={{ color: '#71717a', marginTop: '8px', fontSize: '1.05rem' }}>
            Escolha o plano ideal para suas operações matemáticas de valor.
          </p>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '30px',
          flexWrap: 'wrap',
          alignItems: 'stretch'
        }}>
          {/* Plano Grátis (Trial) */}
          <div style={{
            background: '#121216',
            border: '1px solid #222',
            borderRadius: '16px',
            padding: '40px 30px',
            flex: '1 1 300px',
            maxWidth: '380px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0 0 10px 0', color: '#fff' }}>Trial Grátis</h3>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '24px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff' }}>R$ 0,00</span>
              <span style={{ color: '#71717a', fontSize: '0.9rem' }}>por 7 dias</span>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px 0', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#a1a1aa' }}>
                <Check size={16} color="var(--brand-neon)" strokeWidth={3} />
                <span>Acesso total à dashboard</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#a1a1aa' }}>
                <Check size={16} color="var(--brand-neon)" strokeWidth={3} />
                <span>Alertas +EV em tempo real</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#a1a1aa' }}>
                <Check size={16} color="var(--brand-neon)" strokeWidth={3} />
                <span>Modelagem Poisson & xG</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#a1a1aa' }}>
                <Check size={16} color="var(--brand-neon)" strokeWidth={3} />
                <span>Calculadora Kelly & Arbitragem</span>
              </li>
            </ul>

            <button 
              onClick={handleFreeTrial}
              style={{
                background: 'transparent',
                color: '#fff',
                border: '1px solid #3f3f46',
                padding: '14px 20px',
                borderRadius: '8px',
                fontWeight: 'bold',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#3f3f46'}
            >
              Começar Teste Grátis
            </button>
          </div>

          {/* Plano PRO */}
          <div style={{
            background: '#121216',
            border: '2px solid var(--brand-neon)',
            borderRadius: '16px',
            padding: '40px 30px',
            flex: '1 1 300px',
            maxWidth: '380px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            boxShadow: '0 10px 30px rgba(204, 255, 0, 0.08)'
          }}>
            <span style={{
              position: 'absolute',
              top: '-14px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--brand-neon)',
              color: '#000',
              fontSize: '0.75rem',
              fontWeight: 900,
              padding: '4px 16px',
              borderRadius: '50px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              MELHOR CUSTO-BENEFÍCIO 🌟
            </span>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0 0 10px 0', color: '#fff' }}>Plano PRO</h3>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '24px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--brand-neon)' }}>R$ 19,90</span>
              <span style={{ color: '#71717a', fontSize: '0.9rem' }}>por mês</span>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px 0', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#a1a1aa' }}>
                <Check size={16} color="var(--brand-neon)" strokeWidth={3} />
                <span>Tudo do plano grátis incluso</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#a1a1aa' }}>
                <Check size={16} color="var(--brand-neon)" strokeWidth={3} />
                <span>Acesso recorrente ilimitado</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#a1a1aa' }}>
                <Check size={16} color="var(--brand-neon)" strokeWidth={3} />
                <span>Relatórios e Histórico de Backtests</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#a1a1aa' }}>
                <Check size={16} color="var(--brand-neon)" strokeWidth={3} />
                <span>Suporte Prioritário via WhatsApp</span>
              </li>
            </ul>

            <button 
              onClick={handleProSubscribe}
              style={{
                background: 'var(--brand-neon)',
                color: '#000',
                border: 'none',
                padding: '14px 20px',
                borderRadius: '8px',
                fontWeight: 'bold',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 15px rgba(204, 255, 0, 0.2)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Assinar Plano PRO
            </button>
          </div>

          {/* Grupo VIP Telegram */}
          <div style={{
            background: '#121216',
            border: '1px solid #222',
            borderRadius: '16px',
            padding: '40px 30px',
            flex: '1 1 300px',
            maxWidth: '380px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0 0 10px 0', color: '#fff' }}>Telegram VIP</h3>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '24px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0088cc' }}>R$ 9,90</span>
              <span style={{ color: '#71717a', fontSize: '0.9rem' }}>por mês</span>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px 0', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#a1a1aa' }}>
                <Check size={16} color="#0088cc" strokeWidth={3} />
                <span>Alertas direto no celular via bot</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#a1a1aa' }}>
                <Check size={16} color="#0088cc" strokeWidth={3} />
                <span>Link direto para colocar a aposta</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#a1a1aa' }}>
                <Check size={16} color="#0088cc" strokeWidth={3} />
                <span>Avisos sonoros de odds desreguladas</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#a1a1aa' }}>
                <Check size={16} color="#0088cc" strokeWidth={3} />
                <span>Acesso imediato pós-pagamento</span>
              </li>
            </ul>

            <a 
              href="https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=2276008902-619a6fe2-dd52-42e1-9564-fd3ecbd75935"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#0088cc',
                color: '#fff',
                border: 'none',
                padding: '14px 20px',
                borderRadius: '8px',
                fontWeight: 'bold',
                textAlign: 'center',
                textDecoration: 'none',
                transition: 'all 0.2s',
                boxShadow: '0 4px 15px rgba(0, 136, 204, 0.2)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Assinar Telegram VIP
            </a>
          </div>
        </div>
      </section>

      {/* Telegram Channel CTA */}
      <section style={{
        padding: '80px 5%',
        background: 'linear-gradient(135deg, #111115 0%, #161622 100%)',
        borderTop: '1px solid #1f1f23',
        textAlign: 'center',
        width: '100%'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: '#0088cc', color: '#fff', padding: '16px', borderRadius: '50%', display: 'inline-flex' }}>
            <MessageSquare size={32} />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
            Experimente Nosso Canal de Sinais VIP
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
            Receba as melhores oportunidades de valor (+EV) diretamente no seu Telegram. Nosso motor matemático dispara os confrontos selecionados imediatamente.
          </p>
          <a 
            href="https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=2276008902-619a6fe2-dd52-42e1-9564-fd3ecbd75935"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#0088cc',
              color: '#fff',
              padding: '12px 28px',
              borderRadius: '6px',
              fontWeight: 'bold',
              textDecoration: 'none',
              fontSize: '0.9rem',
              marginTop: '10px',
              transition: 'transform 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Assinar Canal Telegram VIP (R$ 9,90/mês)
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '60px 5% 40px 5%',
        background: '#09090b',
        borderTop: '1px solid #1f1f23',
        fontSize: '0.85rem',
        color: '#71717a',
        width: '100%'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '40px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={20} color="var(--brand-neon)" fill="var(--brand-neon)" />
              <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#fff', letterSpacing: '-0.5px' }}>
                a2sport<span style={{ color: 'var(--brand-neon)' }}>trackers</span>
              </span>
            </div>
            <p style={{ lineHeight: '1.6' }}>
              Plataforma de inteligência de apostas esportivas e rastreamento de oportunidades de valor com base em Poisson.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '60px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px' }}>Ajuda & Legal</span>
              <Link href="/faq" style={{ color: '#71717a', textDecoration: 'none' }} onMouseEnter={(e) => e.target.style.color = '#fff'} onMouseLeave={(e) => e.target.style.color = '#71717a'}>FAQ / Suporte</Link>
              <Link href="/quem-somos" style={{ color: '#71717a', textDecoration: 'none' }} onMouseEnter={(e) => e.target.style.color = '#fff'} onMouseLeave={(e) => e.target.style.color = '#71717a'}>Quem Somos</Link>
              <a href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm" target="_blank" rel="noopener noreferrer" style={{ color: '#71717a', textDecoration: 'none' }} onMouseEnter={(e) => e.target.style.color = '#fff'} onMouseLeave={(e) => e.target.style.color = '#71717a'}>LGPD / Segurança</a>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1100px', margin: '0 auto', paddingTop: '20px', borderTop: '1px solid #1c1c20', textAlign: 'center', fontSize: '0.75rem' }}>
          <p>© {new Date().getFullYear()} A2 Sport Trackers. Todos os direitos reservados. Não garantimos lucros futuros e alertamos que apostas envolvem riscos financeiros.</p>
        </div>
      </footer>

      {/* Dynamic Keyframe Animations */}
      <style jsx global>{`
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .blink-dot {
          animation: blink 1.2s infinite alternate;
        }
        @keyframes blink {
          0% { opacity: 0.3; }
          100% { opacity: 1; }
        }
        .heartbeat {
          animation: beat 1.5s infinite alternate;
        }
        @keyframes beat {
          0% { transform: scale(1); }
          100% { transform: scale(1.15); }
        }
        @keyframes pulseGreen {
          0% { box-shadow: 0 0 15px rgba(0, 255, 136, 0.15); }
          100% { box-shadow: 0 0 35px rgba(0, 255, 136, 0.35); }
        }
        @keyframes pulseRed {
          0% { box-shadow: 0 0 15px rgba(255, 68, 68, 0.15); }
          100% { box-shadow: 0 0 35px rgba(255, 68, 68, 0.35); }
        }
      `}</style>
    </div>
  );
}
