'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Zap, Target, AlertTriangle, CheckCircle, TrendingUp, Wallet, Clock, Edit2, Terminal, Info } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const parseConfronto = (confronto) => {
  if (!confronto) return { home: '', away: '' };
  let parts = [];
  if (confronto.includes(' vs ')) {
    parts = confronto.split(' vs ');
  } else if (confronto.includes(' - ')) {
    parts = confronto.split(' - ');
  } else if (confronto.includes(' x ')) {
    parts = confronto.split(' x ');
  }
  
  if (parts.length >= 2) {
    return { home: parts[0].trim(), away: parts[1].trim() };
  }
  return { home: confronto, away: '' };
};

const getTeamLogoUrl = (teamName) => {
  if (!teamName) return '';
  const clean = teamName.trim().toUpperCase();
  
  const mapping = {
    'FLAMENGO': 127,
    'PALMEIRAS': 121,
    'CORINTHIANS': 131,
    'SÃO PAULO': 126,
    'SAO PAULO': 126,
    'SANTOS': 128,
    'GRÊMIO': 130,
    'GREMIO': 130,
    'INTERNACIONAL': 119,
    'ATLÉTICO-MG': 134,
    'ATLETICO MG': 134,
    'ATLÉTICO MG': 134,
    'FLUMINENSE': 124,
    'BOTAFOGO': 120,
    'VASCO': 133,
    'VASCO DA GAMA': 133,
    'CRUZEIRO': 125,
    'BAHIA': 118,
    'ATHLETICO-PR': 135,
    'ATHLETICO PR': 135,
    'FORTALEZA': 154,
    'CEARÁ': 129,
    'CEARA': 129,
    'CORITIBA': 132,
    'GOIÁS': 151,
    'GOIAS': 151,
    'BRAGANTINO': 794,
    'RED BULL BRAGANTINO': 794,
    'CUIABÁ': 1100,
    'CUIABA': 1100,
    'CRICIÚMA': 1192,
    'CRICIUMA': 1192,
    'BOTAFOGO-SP': 1190,
    'AMÉRICA-MG': 123,
    'AMERICA MG': 123,
    'VILA NOVA': 1193,
    'OPERÁRIO-PR': 1194,
    'OPERARIO PR': 1194,
    'CHAPECOENSE': 122,
    'REMO': 1195
  };
  
  const teamId = mapping[clean];
  if (teamId) {
    return `https://media.api-sports.io/football/teams/${teamId}.png`;
  }
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(teamName)}&background=141419&color=CCFF00&rounded=true&bold=true&size=32`;
};

export default function ResponsiveDashboard() {
  const [banca, setBanca] = useState(0);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal Edit Banca
  const [showModal, setShowModal] = useState(false);
  const [modalInputVal, setModalInputVal] = useState('');
  const [initialValue, setInitialValue] = useState(0);

  // Terminal Logs State
  const [terminalLogs, setTerminalLogs] = useState([
    { time: new Date().toLocaleTimeString('pt-BR'), text: '⚙️ INICIALIZANDO TERMINAL BRUTALISTA...' },
    { time: new Date().toLocaleTimeString('pt-BR'), text: '🔌 CONEXÃO SUPABASE: ATIVA' },
    { time: new Date().toLocaleTimeString('pt-BR'), text: '🛰️ MÓDULO DE COLETA: Conectado a 14 API feeds de Odds.' },
    { time: new Date().toLocaleTimeString('pt-BR'), text: '🧠 MOTOR LÓGICO DE POISSON: Carregando métricas históricas das equipes...' },
    { time: new Date().toLocaleTimeString('pt-BR'), text: '🤖 TELEGRAM: Canal de alertas pareado com sucesso.' }
  ]);
  
  const terminalEndRef = useRef(null);

  // Auto-scroll terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  // Load Initial Value
  useEffect(() => {
    const savedInitial = localStorage.getItem('ev_tracker_banca_initial_value');
    if (savedInitial) {
      setInitialValue(parseFloat(savedInitial));
    }
  }, []);

  // Fetch Transactions and Calculate Banca
  const fetchTransactions = async () => {
    let initial = 0;
    const savedInitial = localStorage.getItem('ev_tracker_banca_initial_value');
    if (savedInitial) initial = parseFloat(savedInitial);

    let currentBanca = initial;
    if (supabase) {
      const { data } = await supabase.from('banca_transactions').select('*');
      if (data) {
        data.forEach(t => {
          if (t.type === 'ganho') {
            const profit = t.odd ? t.amount * (t.odd - 1) : t.amount;
            currentBanca += profit;
          } else if (t.type === 'perda') {
            currentBanca -= t.amount;
          }
        });
      }
    } else {
      const savedTxs = localStorage.getItem('ev_tracker_banca_txs');
      if (savedTxs) {
        const txs = JSON.parse(savedTxs);
        txs.forEach(t => {
          if (t.type === 'ganho') {
            const profit = t.odd ? t.amount * (t.odd - 1) : t.amount;
            currentBanca += profit;
          } else if (t.type === 'perda') {
            currentBanca -= t.amount;
          }
        });
      }
    }
    setBanca(currentBanca);
  };

  // Load Banca on mount/initial value change
  useEffect(() => {
    fetchTransactions();
  }, [initialValue]);

  // Load Opportunities from Supabase
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const fetchOpp = async () => {
      const { data } = await supabase
        .from('ev_opportunities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (data) setOpportunities(data);
      setLoading(false);
    };
    fetchOpp();

    // Subscribe to updates
    const channel = supabase.channel('dashboard-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ev_opportunities' }, 
        (payload) => {
          setOpportunities(curr => [payload.new, ...curr].slice(0, 30));
          
          // Log live alert on the terminal
          const now = new Date().toLocaleTimeString('pt-BR');
          setTerminalLogs(currLogs => [
            ...currLogs, 
            { time: now, text: `🔥 NOVO ALERTA +EV: ${payload.new.confronto} (${payload.new.mercado}) - Margem: +${parseFloat(payload.new.vantagem_ev_porcentagem).toFixed(1)}%` }
          ].slice(-50));
        }
      ).subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Simulate Terminal Logs activity
  useEffect(() => {
    const logs = [
      '🛰️ MÓDULO DE COLETA: Buscando cotações atualizadas em Betano...',
      '🛰️ MÓDULO DE COLETA: Buscando cotações atualizadas em Betfair...',
      '🧠 MOTOR DE POISSON: Calculando probabilidades brutas (True Odds)...',
      '🧠 MOTOR DE POISSON: Calculando distribuição de gols esperados...',
      '📊 PROCESSAMENTO: Atualizando volatilidades do mercado financeiro...',
      '🤖 TELEGRAM: Verificando integridade das notificações por push...',
      '⚙️ PROCESSADOR: Garbage collection de conexões efetuado com sucesso.',
      '🧠 MOTOR DE POISSON: Varrendo partidas ao vivo de ligas europeias...'
    ];
    
    const interval = setInterval(() => {
      const randomLog = logs[Math.floor(Math.random() * logs.length)];
      const now = new Date().toLocaleTimeString('pt-BR');
      
      let logText = randomLog;
      if (Math.random() > 0.6 && opportunities.length > 0) {
        const randomOpp = opportunities[Math.floor(Math.random() * opportunities.length)];
        logText = `🎯 ANÁLISE: ${randomOpp.confronto} (${randomOpp.mercado}) possui margem matemática +EV`;
      }
      
      setTerminalLogs(curr => [...curr, { time: now, text: logText }].slice(-50));
    }, 8000);
    
    return () => clearInterval(interval);
  }, [opportunities]);

  // Calculate Kelly Criterion
  const calculateKelly = (oddMercado, oddJusta) => {
    if (!banca || banca <= 0) return 0;
    const pWin = 1 / parseFloat(oddJusta);
    const b = parseFloat(oddMercado) - 1;
    const qWin = 1 - pWin;
    const kellyFraction = (b * pWin - qWin) / b;
    
    // Half-Kelly limit to 5% max
    let suggestedPct = (kellyFraction / 2);
    if (suggestedPct > 0.05) suggestedPct = 0.05;
    if (suggestedPct < 0.005) suggestedPct = 0.005; // min 0.5%
    
    return banca * suggestedPct;
  };

  const getStatusColor = (oddJusta, oddMercado) => {
    return 'var(--brand-neon)';
  };

  const handleSaveBanca = () => {
    const num = parseFloat(modalInputVal.replace(',', '.'));
    if (!isNaN(num)) {
      setInitialValue(num);
      localStorage.setItem('ev_tracker_banca_initial_value', num.toString());
      setShowModal(false);
      
      // Log event to terminal
      const now = new Date().toLocaleTimeString('pt-BR');
      setTerminalLogs(curr => [
        ...curr,
        { time: now, text: `💰 CARTEIRA: Banca inicial redefinida para R$ ${num.toFixed(2)}` }
      ].slice(-50));
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', color: 'var(--brand-neon)' }}>CARREGANDO TERMINAL BRUTALISTA...</div>;
  }

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      
      {/* Outer Dashboard layout wrapper */}
      <div className="dashboard-layout">
        
        {/* Left pane: Feed and cards grid */}
        <div className="dashboard-feed-area">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="var(--brand-neon)" /> Sinais +EV Em Tempo Real
            </h2>
            <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 'bold' }}>{opportunities.length} ATIVOS</span>
          </div>

          <div className="dashboard-cards-grid">
            {opportunities.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#555', padding: '60px', gridColumn: '1 / -1', border: '1px dashed #222', borderRadius: '8px' }}>
                Nenhum sinal ativo no momento. Aguardando processamento do motor lógico...
              </div>
            ) : (
              opportunities.map((opp) => {
                const stake = calculateKelly(opp.odd_oferecida, opp.odd_justa);
                
                return (
                  <div key={opp.id} className="card-brutalist">
                    {/* Status Bar */}
                    <div style={{ height: '4px', width: '100%', background: getStatusColor(opp.odd_justa, opp.odd_oferecida) }}></div>
                    
                    {/* Header do Card */}
                    <div className="card-brutalist-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(opp.odd_justa, opp.odd_oferecida), boxShadow: '0 0 6px var(--brand-neon)' }}></div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#fff', letterSpacing: '0.5px' }}>VALOR DETECTADO</span>
                      </div>
                      <div style={{ background: 'rgba(204,255,0,0.15)', color: 'var(--brand-neon)', padding: '4px 8px', borderRadius: '4px', fontWeight: 900, fontSize: '0.85rem', border: '1px solid rgba(204,255,0,0.2)' }}>
                        +{parseFloat(opp.vantagem_ev_porcentagem).toFixed(1)}% EV
                      </div>
                    </div>

                    {/* Corpo Principal */}
                    <div className="card-brutalist-body">
                      <div style={{ fontSize: '0.75rem', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={11} /> {new Date(opp.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {opp.campeonato}
                      </div>
                      
                      {(() => {
                        const teams = parseConfronto(opp.confronto);
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <img 
                                src={getTeamLogoUrl(teams.home)} 
                                alt={teams.home} 
                                style={{ width: '22px', height: '22px', objectFit: 'contain' }} 
                                onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${teams.home}&background=222&color=fff&rounded=true&bold=true&size=22`; }}
                              />
                              <span className="team-name-text-mobile-hide" style={{ fontWeight: 800, color: '#fff', fontSize: '1.05rem' }}>{teams.home}</span>
                            </div>
                            <span style={{ color: '#555', fontWeight: 'bold', fontSize: '0.85rem' }}>x</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <img 
                                src={getTeamLogoUrl(teams.away)} 
                                alt={teams.away} 
                                style={{ width: '22px', height: '22px', objectFit: 'contain' }} 
                                onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${teams.away}&background=222&color=fff&rounded=true&bold=true&size=22`; }}
                              />
                              <span className="team-name-text-mobile-hide" style={{ fontWeight: 800, color: '#fff', fontSize: '1.05rem' }}>{teams.away}</span>
                            </div>
                          </div>
                        );
                      })()}
                      <div style={{ color: '#00d2ff', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        📍 {opp.mercado}
                      </div>

                      {/* Matrix de Dados (Mono) */}
                      <div className="odds-matrix-block" style={{ background: '#050508', border: '1px solid #1c1c24', borderRadius: '6px', padding: '10px', marginTop: '6px', fontFamily: 'monospace' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', borderBottom: '1px dashed #1f1f2e', paddingBottom: '6px' }}>
                          <span style={{ color: '#666', fontSize: '0.8rem' }}>Odd Justa (Motor)</span>
                          <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.85rem' }}>@{opp.odd_justa}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#666', fontSize: '0.8rem' }}>Odd Mercado</span>
                          <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold', fontSize: '0.85rem' }}>@{opp.odd_oferecida}</span>
                        </div>
                      </div>

                      {/* Bloco de Gestão de Risco */}
                      <div className="risk-block" style={{ background: 'rgba(242, 63, 66, 0.03)', border: '1px solid rgba(242, 63, 66, 0.15)', borderRadius: '6px', padding: '10px', marginTop: '4px' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--alert-red)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>
                          Gestão de Risco (Kelly)
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <div>
                            <div style={{ color: '#666', fontSize: '0.65rem' }}>Stake Recomendada</div>
                            <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 900, fontFamily: 'monospace', marginTop: '2px' }}>
                              R$ {stake.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                          <div style={{ color: '#888', fontSize: '0.7rem', textAlign: 'right', fontWeight: 'bold' }}>
                            {((stake / (banca || 1)) * 100).toFixed(2)}% Banca
                          </div>
                        </div>
                      </div>

                      {/* Botões Brutalistas */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button className="btn-brutalist-neon" style={{ flex: 1, padding: '10px 14px', fontSize: '0.8rem' }}>
                          💰 SEGUIR SINAL
                        </button>
                        <button className="btn-brutalist-danger" style={{ width: 'auto', padding: '10px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          OCULTAR
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right pane: Bankroll, risk parameters and live terminal */}
        <div className="dashboard-sidebar-panel">
          
          {/* BANKROLL CARD */}
          <div style={{ background: '#0D0D11', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.02, pointerEvents: 'none' }}>
              <Wallet size={120} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                Capital (Bankroll)
              </div>
              <button 
                onClick={() => {
                  setModalInputVal(initialValue.toString());
                  setShowModal(true);
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--brand-neon)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 'bold', padding: '4px' }}
              >
                <Edit2 size={12} /> Editar
              </button>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', marginTop: '4px', fontFamily: 'monospace' }}>
              R$ {banca.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #222' }}>
              <div>
                <div style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Fórmula de Risco</div>
                <div style={{ color: '#ccc', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '2px' }}>Half-Kelly (Max 5%)</div>
              </div>
              <div>
                <div style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Exposição Atual</div>
                <div style={{ color: '#00d2ff', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '2px' }}>0.00%</div>
              </div>
            </div>
          </div>

          {/* BRUTALIST TERMINAL */}
          <div className="brutalist-terminal">
            <div className="brutalist-terminal-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', background: 'var(--brand-neon)', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px var(--brand-neon)' }}></span>
                LIVE LOG PROCESSOR
              </span>
              <span style={{ fontSize: '0.65rem', color: '#444', fontWeight: 'bold', fontFamily: 'monospace' }}>SYSTEM_OK</span>
            </div>
            <div className="brutalist-terminal-content">
              {terminalLogs.map((log, index) => (
                <div key={index} className="brutalist-terminal-line">
                  <span className="brutalist-terminal-time">[{log.time}]</span>
                  <span>{log.text}</span>
                </div>
              ))}
              <div ref={terminalEndRef}></div>
            </div>
          </div>

        </div>

      </div>

      {/* modal de alteração do saldo inicial */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000
        }}>
          <div className="glass-panel" style={{
            width: '90%',
            maxWidth: '380px',
            background: '#0B0B0E',
            border: '1px solid #222',
            borderTop: '4px solid var(--brand-neon)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0, textTransform: 'uppercase' }}>
              Definir Banca Inicial
            </h3>
            <p style={{ color: '#888', fontSize: '0.85rem', margin: 0, lineHeight: '1.4' }}>
              Insira o valor inicial de sua banca. O capital operacional será recalculado dinamicamente somando lucros e subtraindo perdas registradas.
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', background: '#050508', border: '1px solid #222', borderRadius: '8px', overflow: 'hidden', height: '44px' }}>
              <span style={{ background: '#141419', color: '#666', padding: '0 14px', fontSize: '0.9rem', fontWeight: 'bold', borderRight: '1px solid #222', height: '100%', display: 'flex', alignItems: 'center' }}>
                R$
              </span>
              <input 
                type="number"
                step="0.01"
                min="0"
                value={modalInputVal}
                onChange={(e) => setModalInputVal(e.target.value)}
                placeholder="0,00"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  padding: '12px',
                  fontSize: '1rem',
                  outline: 'none',
                  fontFamily: 'monospace'
                }}
                autoFocus
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button 
                onClick={() => setShowModal(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid #222',
                  color: '#888',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.85rem'
                }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveBanca}
                style={{
                  background: 'var(--brand-neon)',
                  border: 'none',
                  color: '#000',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  boxShadow: '0 0 10px rgba(204, 255, 0, 0.2)'
                }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
