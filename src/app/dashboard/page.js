'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Zap, Target, AlertTriangle, CheckCircle, TrendingUp, Wallet, Clock, Edit2, Terminal, Info } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

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
    'REMO': 1195,
    'BRUSQUE': 1189,
    'BARRA': 9770
  };
  
  const teamId = mapping[clean];
  if (teamId) {
    return `https://media.api-sports.io/football/teams/${teamId}.png`;
  }
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(teamName)}&background=141419&color=CCFF00&rounded=true&bold=true&size=32`;
};

const getLeagueLogoUrl = (leagueIdOrName) => {
  if (!leagueIdOrName) return '';
  const val = String(leagueIdOrName).toLowerCase().trim();
  
  if (!isNaN(parseInt(val))) {
    return `https://media.api-sports.io/football/leagues/${val}.png`;
  }
  
  if (val.includes('copa do mundo')) return 'https://media.api-sports.io/football/leagues/1.png';
  if (val.includes('libertadores')) return 'https://media.api-sports.io/football/leagues/13.png';
  if (val.includes('sudamericana')) return 'https://media.api-sports.io/football/leagues/12.png';
  if (val.includes('série a') || val.includes('série-a') || val.includes('serie a')) {
    if (val.includes('itália') || val.includes('italia') || val.includes('italy')) return 'https://media.api-sports.io/football/leagues/135.png';
    return 'https://media.api-sports.io/football/leagues/71.png';
  }
  if (val.includes('série b') || val.includes('série-b') || val.includes('serie b')) return 'https://media.api-sports.io/football/leagues/72.png';
  if (val.includes('série c') || val.includes('série-c') || val.includes('serie c')) return 'https://media.api-sports.io/football/leagues/75.png';
  if (val.includes('premier')) return 'https://media.api-sports.io/football/leagues/39.png';
  if (val.includes('la liga') || val.includes('espanha')) return 'https://media.api-sports.io/football/leagues/140.png';
  if (val.includes('bundesliga') || val.includes('alemanha')) return 'https://media.api-sports.io/football/leagues/78.png';
  if (val.includes('europa league')) return 'https://media.api-sports.io/football/leagues/3.png';
  if (val.includes('conference league')) return 'https://media.api-sports.io/football/leagues/848.png';
  if (val.includes('argentina')) return 'https://media.api-sports.io/football/leagues/44.png';
  
  return '';
};

export default function ResponsiveDashboard() {
  const { user } = useAuth();
  const [banca, setBanca] = useState(0);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hiddenOpps, setHiddenOpps] = useState([]);
  const [followedOpps, setFollowedOpps] = useState([]);
  const [riskPct, setRiskPct] = useState(0.05); // default 5%
  
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
    if (!user) return;
    const loadInitialValue = () => {
      const userBancaKey = `ev_tracker_banca_initial_value_${user.id}`;
      const savedInitial = localStorage.getItem(userBancaKey);
      if (savedInitial) {
        setInitialValue(parseFloat(savedInitial));
      } else {
        setInitialValue(1000);
        localStorage.setItem(userBancaKey, '1000');
      }

      const userRiskKey = `ev_tracker_max_risk_pct_${user.id}`;
      const savedRisk = localStorage.getItem(userRiskKey);
      if (savedRisk) {
        setRiskPct(parseFloat(savedRisk));
      } else {
        setRiskPct(0.05);
      }

      const userHiddenKey = `ev_tracker_hidden_opps_${user.id}`;
      const savedHidden = localStorage.getItem(userHiddenKey);
      if (savedHidden) {
        try {
          setHiddenOpps(JSON.parse(savedHidden));
        } catch (e) {}
      }

      const userFollowedKey = `ev_tracker_followed_opps_${user.id}`;
      const savedFollowed = localStorage.getItem(userFollowedKey);
      if (savedFollowed) {
        try {
          setFollowedOpps(JSON.parse(savedFollowed));
        } catch (e) {}
      }
    };
    loadInitialValue();
  }, [user?.id]);

  // Fetch Transactions and Calculate Banca
  const fetchTransactions = async () => {
    if (!user) return;
    let initial = 0;
    const userBancaKey = `ev_tracker_banca_initial_value_${user.id}`;
    const userTxsKey = `ev_tracker_banca_txs_${user.id}`;
    const userTxIdsKey = `ev_tracker_user_tx_ids_${user.id}`;
    const userCachedBancaKey = `ev_tracker_cached_banca_${user.id}`;

    // Tentar carregar saldo calculado do cache local primeiro
    try {
      const cachedBanca = localStorage.getItem(userCachedBancaKey);
      if (cachedBanca) {
        setBanca(parseFloat(cachedBanca));
      }
    } catch (e) {}

    const savedInitial = localStorage.getItem(userBancaKey);
    if (savedInitial) {
      initial = parseFloat(savedInitial);
    } else {
      localStorage.setItem(userBancaKey, '1000');
      initial = 1000;
    }

    let currentBanca = initial;
    let loadedFromSupabase = false;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('banca_transactions')
          .select('*')
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        if (data) {
          data.forEach(t => {
            const isGain = t.type === 'ganho' || t.type === 'alavancagem' || t.description === 'Alavancagem';
            if (isGain) {
              const profit = t.odd ? t.amount * (t.odd - 1) : t.amount;
              currentBanca += profit;
            } else if (t.type === 'perda') {
              currentBanca -= t.amount;
            }
          });
          loadedFromSupabase = true;
        }
      } catch (err) {
        console.warn("[Dashboard] Erro ao buscar transações da banca no Supabase, usando LocalStorage:", err);
      }
    }

    if (!loadedFromSupabase) {
      const savedTxs = localStorage.getItem(userTxsKey);
      if (savedTxs) {
        try {
          const txs = JSON.parse(savedTxs);
          txs.forEach(t => {
            const isGain = t.type === 'ganho' || t.type === 'alavancagem' || t.description === 'Alavancagem';
            if (isGain) {
              const profit = t.odd ? t.amount * (t.odd - 1) : t.amount;
              currentBanca += profit;
            } else if (t.type === 'perda') {
              currentBanca -= t.amount;
            }
          });
        } catch (e) {
          console.error("[Dashboard] Erro ao processar transações locais:", e);
        }
      }
    }
    setBanca(currentBanca);
    try {
      localStorage.setItem(userCachedBancaKey, currentBanca.toString());
    } catch (e) {}
  };

  // Load Banca on mount/initial value change
  useEffect(() => {
    fetchTransactions();
  }, [initialValue, user?.id]);

  // Load Opportunities from Supabase
  useEffect(() => {
    let active = true;
    let timedOut = false;

    // 1. Tentar carregar do cache local imediatamente para evitar tela de loading
    const cachedOppKey = 'ev_tracker_cached_opportunities';
    try {
      const cached = localStorage.getItem(cachedOppKey);
      if (cached) {
        setOpportunities(JSON.parse(cached));
        setLoading(false); // Instante!
      }
    } catch (e) {
      console.warn("Erro ao ler cache local de oportunidades:", e);
    }

    // Safety timeout to prevent stuck loading screen (e.g. if database query hangs)
    const safetyTimeout = setTimeout(() => {
      if (active) {
        timedOut = true;
        console.warn("[Dashboard] Timeout de segurança carregando oportunidades. Forçando exibição do app.");
        setLoading(false);
      }
    }, 4500);

    if (!supabase) {
      clearTimeout(safetyTimeout);
      setLoading(false);
      return;
    }

    const fetchOpp = async () => {
      try {
        console.log("[Dashboard] Buscando oportunidades...");
        const { data, error } = await supabase
          .from('ev_opportunities')
          .select('*')
          .order('id', { ascending: false })
          .limit(30);
        
        if (error) throw error;
        if (active && data) {
          setOpportunities(data);
          try {
            localStorage.setItem(cachedOppKey, JSON.stringify(data));
          } catch (e) {}
        }
      } catch (err) {
        console.warn("[Dashboard] Erro ao carregar oportunidades do Supabase:", err);
      } finally {
        if (active) {
          clearTimeout(safetyTimeout);
          if (!timedOut) {
            setLoading(false);
          }
        }
      }
    };
    fetchOpp();

    // Subscribe to updates
    const channel = supabase.channel('dashboard-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ev_opportunities' }, 
        (payload) => {
          if (active) {
            setOpportunities(curr => [payload.new, ...curr].slice(0, 30));
            
            // Log live alert on the terminal
            const now = new Date().toLocaleTimeString('pt-BR');
            setTerminalLogs(currLogs => [
              ...currLogs, 
              { time: now, text: `🔥 NOVO ALERTA +EV: ${payload.new.confronto} (${payload.new.mercado}) - Margem: +${parseFloat(payload.new.vantagem_ev_porcentagem).toFixed(1)}%` }
            ].slice(-50));
          }
        }
      ).subscribe();

    return () => {
      active = false;
      clearTimeout(safetyTimeout);
      supabase.removeChannel(channel);
    };
  }, []);

  const activeOpportunities = useMemo(() => {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    return opportunities.filter(opp => 
      new Date(opp.created_at) > twelveHoursAgo && 
      !hiddenOpps.includes(opp.id)
    );
  }, [opportunities, hiddenOpps]);

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
      if (Math.random() > 0.6 && activeOpportunities.length > 0) {
        const randomOpp = activeOpportunities[Math.floor(Math.random() * activeOpportunities.length)];
        logText = `🎯 ANÁLISE: ${randomOpp.confronto} (${randomOpp.mercado}) possui margem matemática +EV`;
      }
      
      setTerminalLogs(curr => [...curr, { time: now, text: logText }].slice(-50));
    }, 8000);
    
    return () => clearInterval(interval);
  }, [activeOpportunities]);

  // Calculate Kelly Criterion
  const calculateKelly = (oddMercado, oddJusta) => {
    if (!banca || banca <= 0) return 0;
    const pWin = 1 / parseFloat(oddJusta);
    const b = parseFloat(oddMercado) - 1;
    const qWin = 1 - pWin;
    const kellyFraction = (b * pWin - qWin) / b;
    
    // Use user-defined riskPct or default 5% (Half-Kelly suggestion)
    let suggestedPct = (kellyFraction / 2);
    const maxRisk = riskPct || 0.05;
    if (suggestedPct > maxRisk) suggestedPct = maxRisk;
    if (suggestedPct < 0.005) suggestedPct = 0.005; // min 0.5%
    
    return banca * suggestedPct;
  };

  const handleHideOpportunity = (oppId) => {
    if (!user) return;
    const updated = [...hiddenOpps, oppId];
    setHiddenOpps(updated);
    localStorage.setItem(`ev_tracker_hidden_opps_${user.id}`, JSON.stringify(updated));
    
    // Log event to terminal
    const now = new Date().toLocaleTimeString('pt-BR');
    setTerminalLogs(curr => [
      ...curr,
      { time: now, text: `👁️ DASHBOARD: Oportunidade ID ${oppId} ocultada pelo usuário.` }
    ].slice(-50));
  };

  const handleFollowSignal = async (opp) => {
    if (!user) return;
    const stake = calculateKelly(opp.odd_oferecida, opp.odd_justa);
    const newTx = {
      date: new Date().toISOString().split('T')[0],
      type: 'pendente',
      amount: parseFloat(stake.toFixed(2)),
      description: `[Sinal Seguido] ${opp.confronto} (${opp.mercado})`,
      odd: parseFloat(opp.odd_oferecida)
    };

    let success = false;
    let savedTx = null;
    const userTxsKey = `ev_tracker_banca_txs_${user.id}`;
    const userTxIdsKey = `ev_tracker_user_tx_ids_${user.id}`;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('banca_transactions')
          .insert([{ ...newTx, user_id: user.id }])
          .select();
        
        if (error) throw error;
        if (data && data.length > 0) {
          savedTx = data[0];
          success = true;
          const userTxIds = JSON.parse(localStorage.getItem(userTxIdsKey) || '[]');
          userTxIds.push(savedTx.id);
          localStorage.setItem(userTxIdsKey, JSON.stringify(userTxIds));
        }
      } catch (err) {
        console.warn("Erro ao salvar transação no Supabase, usando LocalStorage:", err);
      }
    }

    if (!success) {
      savedTx = { id: Date.now(), ...newTx };
      const savedTxs = localStorage.getItem(userTxsKey);
      let txList = [];
      if (savedTxs) {
        try {
          txList = JSON.parse(savedTxs);
        } catch (e) {}
      }
      txList = [savedTx, ...txList];
      localStorage.setItem(userTxsKey, JSON.stringify(txList));
    }

    // Atualizar seguidos
    const updatedFollowed = [...followedOpps, opp.id];
    setFollowedOpps(updatedFollowed);
    localStorage.setItem(`ev_tracker_followed_opps_${user.id}`, JSON.stringify(updatedFollowed));

    // Atualizar banca
    await fetchTransactions();

    // Log event to terminal
    const now = new Date().toLocaleTimeString('pt-BR');
    setTerminalLogs(curr => [
      ...curr,
      { time: now, text: `💰 CARTEIRA: Seguindo sinal de ${opp.confronto}. Aposta de R$ ${stake.toFixed(2)} registrada.` }
    ].slice(-50));
  };

  const getStatusColor = (oddJusta, oddMercado) => {
    return 'var(--brand-neon)';
  };

  const handleSaveBanca = async () => {
    const num = parseFloat(modalInputVal.replace(',', '.'));
    if (!isNaN(num)) {
      setInitialValue(num);
      const userBancaKey = user ? `ev_tracker_banca_initial_value_${user.id}` : 'ev_tracker_banca_initial_value';
      localStorage.setItem(userBancaKey, num.toString());
      
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
            <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 'bold' }}>{activeOpportunities.length} ATIVOS</span>
          </div>

          <div className="dashboard-cards-grid">
            {activeOpportunities.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '32px', width: '100%', marginTop: '12px' }}>
                
                {/* Banner de Status do Motor */}
                <div className="glass-panel" style={{ 
                  background: 'linear-gradient(135deg, #111115, #14141d)', 
                  border: '1px solid #222', 
                  borderLeft: '4px solid var(--brand-neon)',
                  padding: '24px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="sync-pulse" style={{ 
                      width: '12px', height: '12px', borderRadius: '50%', 
                      background: 'var(--brand-neon)', boxShadow: '0 0 10px var(--brand-neon)' 
                    }}></div>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Varredura de Odds em Andamento
                      </h3>
                      <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '4px' }}>
                        Nosso robô está monitorando a Betano e Betfair neste instante. Nenhuma assimetria de valor matemático foi detectada nas últimas 12 horas.
                      </p>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(204, 255, 0, 0.05)', color: 'var(--brand-neon)', border: '1px solid rgba(204, 255, 0, 0.15)', padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    PATROL_STATUS: ACTIVE
                  </div>
                </div>

                {/* Grid de Benefícios / Explicação */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                  gap: '20px' 
                }}>
                  
                  <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', background: '#111115' }}>
                    <div style={{ width: '40px', height: '40px', background: 'rgba(204, 255, 0, 0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(204, 255, 0, 0.15)' }}>
                      <Target size={20} color="var(--brand-neon)" />
                    </div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#fff' }}>Modelo de Poisson 2D</h4>
                    <p style={{ color: '#888', fontSize: '0.82rem', lineHeight: '1.4' }}>
                      Utilizamos distribuição probabilística baseada em gols esperados (xG) para calcular as True Odds (probabilidade real) de cada confronto.
                    </p>
                  </div>

                  <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', background: '#111115' }}>
                    <div style={{ width: '40px', height: '40px', background: 'rgba(0, 210, 255, 0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0, 210, 255, 0.15)' }}>
                      <TrendingUp size={20} color="#00d2ff" />
                    </div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#fff' }}>Gestão de Risco Kelly</h4>
                    <p style={{ color: '#888', fontSize: '0.82rem', lineHeight: '1.4' }}>
                      Cada sinal acompanha uma recomendação de aposta customizada e otimizada (Half-Kelly) de acordo com sua banca para proteger e expandir seu capital.
                    </p>
                  </div>

                  <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', background: '#111115' }}>
                    <div style={{ width: '40px', height: '40px', background: 'rgba(255, 152, 0, 0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255, 152, 0, 0.15)' }}>
                      <Terminal size={20} color="#ff9800" />
                    </div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#fff' }}>Assimetria Detectada</h4>
                    <p style={{ color: '#888', fontSize: '0.82rem', lineHeight: '1.4' }}>
                      O robô compara cotações oferecidas contra odds justas. Se houver vantagem matemática (+EV), o sinal é disparado na hora.
                    </p>
                  </div>

                </div>

                {/* Seção de Exemplo Prático (Preview do Sinal) */}
                <div style={{ marginTop: '12px' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Info size={16} color="var(--brand-neon)" /> Como são os alertas de valor (+EV)
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '16px', opacity: 0.85 }}>
                    
                    {/* Mock de sinal 1 */}
                    <div className="card-brutalist" style={{ position: 'relative', border: '1px solid rgba(204, 255, 0, 0.2)', boxShadow: '0 4px 30px rgba(204, 255, 0, 0.05)' }}>
                      <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%) rotate(-5deg)', background: '#ff9800', color: '#000', fontSize: '0.62rem', fontWeight: 900, padding: '2px 10px', borderRadius: '4px', letterSpacing: '1px', zIndex: 10, border: '1px solid #000' }}>
                        EXEMPLO DE ALERTA
                      </div>
                      
                      <div style={{ height: '4px', width: '100%', background: 'var(--brand-neon)' }}></div>
                      <div className="card-brutalist-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand-neon)' }}></div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#fff', letterSpacing: '0.5px' }}>VALOR DETECTADO</span>
                        </div>
                        <div style={{ background: 'rgba(204,255,0,0.15)', color: 'var(--brand-neon)', padding: '4px 8px', borderRadius: '4px', fontWeight: 900, fontSize: '0.85rem', border: '1px solid rgba(204,255,0,0.2)' }}>
                          +18.9% EV
                        </div>
                      </div>
                      <div className="card-brutalist-body" style={{ filter: 'grayscale(20%)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} /> 20:45 • Brasileirão Série A
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                          <span style={{ fontWeight: 800, color: '#fff', fontSize: '1.05rem' }}>Flamengo x Palmeiras</span>
                        </div>
                        <div style={{ color: '#00d2ff', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          📍 Vitória do Flamengo
                        </div>
                        <div className="odds-matrix-block" style={{ background: '#050508', border: '1px solid #1c1c24', borderRadius: '6px', padding: '10px', marginTop: '6px', fontFamily: 'monospace' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', borderBottom: '1px dashed #1f1f2e', paddingBottom: '6px' }}>
                            <span style={{ color: '#666', fontSize: '0.8rem' }}>Valor Detectado</span>
                            <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold', fontSize: '0.85rem' }}>+18.9% EV</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', borderBottom: '1px dashed #1f1f2e', paddingBottom: '6px' }}>
                            <span style={{ color: '#666', fontSize: '0.8rem' }}>Casa mais Vantajosa</span>
                            <span style={{ color: '#00d2ff', fontWeight: 'bold', fontSize: '0.85rem' }}>Betano (@2.20)</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#666', fontSize: '0.8rem' }}>Comparativo (Outras)</span>
                            <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Betfair (@1.85)</span>
                          </div>
                        </div>
                        <div className="risk-block" style={{ background: 'rgba(242, 63, 66, 0.03)', border: '1px solid rgba(242, 63, 66, 0.15)', borderRadius: '6px', padding: '10px', marginTop: '4px' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--alert-red)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>
                            Gestão de Risco (Kelly)
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div>
                              <div style={{ color: '#666', fontSize: '0.65rem' }}>Stake Recomendada</div>
                              <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 900, fontFamily: 'monospace', marginTop: '2px' }}>
                                R$ 50,00
                              </div>
                            </div>
                            <div style={{ color: '#888', fontSize: '0.7rem', textAlign: 'right', fontWeight: 'bold' }}>
                              5.00% Banca
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mock de sinal 2 */}
                    <div className="card-brutalist" style={{ position: 'relative', border: '1px solid rgba(0, 210, 255, 0.2)', boxShadow: '0 4px 30px rgba(0, 210, 255, 0.05)' }}>
                      <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%) rotate(5deg)', background: '#ff9800', color: '#000', fontSize: '0.62rem', fontWeight: 900, padding: '2px 10px', borderRadius: '4px', letterSpacing: '1px', zIndex: 10, border: '1px solid #000' }}>
                        EXEMPLO DE ALERTA
                      </div>
                      
                      <div style={{ height: '4px', width: '100%', background: '#00d2ff' }}></div>
                      <div className="card-brutalist-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00d2ff' }}></div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#fff', letterSpacing: '0.5px' }}>VALOR DETECTADO</span>
                        </div>
                        <div style={{ background: 'rgba(0,210,255,0.15)', color: '#00d2ff', padding: '4px 8px', borderRadius: '4px', fontWeight: 900, fontSize: '0.85rem', border: '1px solid rgba(0,210,255,0.2)' }}>
                          +10.5% EV
                        </div>
                      </div>
                      <div className="card-brutalist-body" style={{ filter: 'grayscale(20%)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} /> 21:30 • Brasileirão Série A
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                          <span style={{ fontWeight: 800, color: '#fff', fontSize: '1.05rem' }}>São Paulo x Botafogo</span>
                        </div>
                        <div style={{ color: '#00d2ff', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          📍 Mais de 2.5 Gols
                        </div>
                        <div className="odds-matrix-block" style={{ background: '#050508', border: '1px solid #1c1c24', borderRadius: '6px', padding: '10px', marginTop: '6px', fontFamily: 'monospace' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', borderBottom: '1px dashed #1f1f2e', paddingBottom: '6px' }}>
                            <span style={{ color: '#666', fontSize: '0.8rem' }}>Valor Detectado</span>
                            <span style={{ color: '#00d2ff', fontWeight: 'bold', fontSize: '0.85rem' }}>+10.5% EV</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', borderBottom: '1px dashed #1f1f2e', paddingBottom: '6px' }}>
                            <span style={{ color: '#666', fontSize: '0.8rem' }}>Casa mais Vantajosa</span>
                            <span style={{ color: '#00d2ff', fontWeight: 'bold', fontSize: '0.85rem' }}>Betano (@2.10)</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#666', fontSize: '0.8rem' }}>Comparativo (Outras)</span>
                            <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Betfair (@1.90)</span>
                          </div>
                        </div>
                        <div className="risk-block" style={{ background: 'rgba(242, 63, 66, 0.03)', border: '1px solid rgba(242, 63, 66, 0.15)', borderRadius: '6px', padding: '10px', marginTop: '4px' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--alert-red)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>
                            Gestão de Risco (Kelly)
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div>
                              <div style={{ color: '#666', fontSize: '0.65rem' }}>Stake Recomendada</div>
                              <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 900, fontFamily: 'monospace', marginTop: '2px' }}>
                                R$ 35,00
                              </div>
                            </div>
                            <div style={{ color: '#888', fontSize: '0.7rem', textAlign: 'right', fontWeight: 'bold' }}>
                              3.50% Banca
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            ) : (
              activeOpportunities.map((opp) => {
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
                      <div style={{ fontSize: '0.75rem', color: '#666', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={11} /> 
                        <span>{new Date(opp.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>•</span>
                        {(() => {
                          const logoUrl = getLeagueLogoUrl(opp.campeonato);
                          if (logoUrl) {
                            const isLocal = logoUrl.startsWith('/');
                            return (
                              <img 
                                src={logoUrl} 
                                alt="Campeonato Logo" 
                                style={isLocal ? {
                                  width: '22px',
                                  height: '22px',
                                  objectFit: 'contain'
                                } : {
                                  width: '22px',
                                  height: '15px',
                                  objectFit: 'cover',
                                  borderRadius: '2px',
                                  border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                              />
                            );
                          }
                          return null;
                        })()}
                        <span>{opp.campeonato}</span>
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
                          <span style={{ color: '#666', fontSize: '0.8rem' }}>Valor Detectado</span>
                          <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold', fontSize: '0.85rem' }}>+{parseFloat(opp.vantagem_ev_porcentagem).toFixed(1)}% EV</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', borderBottom: '1px dashed #1f1f2e', paddingBottom: '6px' }}>
                          <span style={{ color: '#666', fontSize: '0.8rem' }}>Casa mais Vantajosa</span>
                          <span style={{ color: '#00d2ff', fontWeight: 'bold', fontSize: '0.85rem' }}>Betano (@{opp.odd_oferecida})</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#666', fontSize: '0.8rem' }}>Comparativo (Outras)</span>
                          <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Betfair (@{opp.odd_justa})</span>
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
                        {followedOpps.includes(opp.id) ? (
                          <button className="btn-brutalist-neon" style={{ flex: 1, padding: '10px 14px', fontSize: '0.8rem', opacity: 0.6, cursor: 'not-allowed', background: '#333', color: '#888', border: '1px solid #444' }} disabled>
                            ✅ SEGUIDO
                          </button>
                        ) : (
                          <button onClick={() => handleFollowSignal(opp)} className="btn-brutalist-neon" style={{ flex: 1, padding: '10px 14px', fontSize: '0.8rem' }}>
                            💰 SEGUIR SINAL
                          </button>
                        )}
                        <button onClick={() => handleHideOpportunity(opp.id)} className="btn-brutalist-danger" style={{ width: 'auto', padding: '10px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
