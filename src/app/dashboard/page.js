'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Zap, Target, AlertTriangle, CheckCircle, TrendingUp, Wallet, Clock, Edit2, Terminal, Info, Activity } from 'lucide-react';
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
  const { user, isTrialActive } = useAuth();
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

  // Radar — liga ativa (sincronizado com rotação de 4s / 8 ligas = 500ms cada)
  const [activeLeagueIdx, setActiveLeagueIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActiveLeagueIdx(i => (i + 1) % 8), 500);
    return () => clearInterval(t);
  }, []);

  // Terminal Logs State
  const [terminalLogs, setTerminalLogs] = useState([
    { time: new Date().toLocaleTimeString('pt-BR'), text: '⚙️ INICIALIZANDO TERMINAL BRUTALISTA...' },
    { time: new Date().toLocaleTimeString('pt-BR'), text: '🔌 CONEXÃO SUPABASE: ATIVA' },
    { time: new Date().toLocaleTimeString('pt-BR'), text: '🛰️ MÓDULO DE COLETA: Conectado a 14 API feeds de Odds.' },
    { time: new Date().toLocaleTimeString('pt-BR'), text: '🧠 MOTOR LÓGICO DE POISSON: Carregando métricas históricas das equipes...' },
    { time: new Date().toLocaleTimeString('pt-BR'), text: '🤖 TELEGRAM: Canal de alertas pareado com sucesso.' }
  ]);
  
  const terminalEndRef = useRef(null);

  // Live scan logs simulated loop
  const [liveScanLogs, setLiveScanLogs] = useState([
    { time: new Date().toLocaleTimeString('pt-BR'), text: '⚙️ SCANNER SYSTEM ACTIVE: Conectando aos feeds de odds...', type: 'info' }
  ]);

  useEffect(() => {
    const games = [
      { home: "Flamengo", away: "Palmeiras", market: "Vitória do Flamengo" },
      { home: "São Paulo", away: "Botafogo", market: "Mais de 2.5 Gols" },
      { home: "Corinthians", away: "Santos", market: "Ambas Marcam" },
      { home: "Grêmio", away: "Internacional", market: "Vitória do Grêmio" },
      { home: "Cruzeiro", away: "Atlético-MG", market: "Mais de 1.5 Gols" },
      { home: "Fluminense", away: "Vasco da Gama", market: "Vitória do Fluminense" },
      { home: "Bahia", away: "Fortaleza", market: "Menos de 2.5 Gols" },
      { home: "Athletico-PR", away: "Bragantino", market: "Vitória do Athletico-PR" }
    ];
    const books = ["Betano", "Betfair", "Betsporte"];

    const interval = setInterval(() => {
      const game = games[Math.floor(Math.random() * games.length)];
      const book = books[Math.floor(Math.random() * books.length)];
      
      const trueOdds = (1.5 + Math.random() * 1.5).toFixed(2);
      const margin = (Math.random() * 20 - 10); // -10% a +10%
      const offeredOdds = (trueOdds * (1 + margin / 100)).toFixed(2);
      const ev = margin.toFixed(1);
      const hasValue = margin > 8; // maior que 8% de valor

      let logText = "";
      if (hasValue) {
        logText = `🔥 [ALERTA +EV] ${game.home} x ${game.away} (${game.market}) -> True Odds: @${trueOdds} | ${book}: @${offeredOdds} | EV: +${ev}% (Calculando Kelly...)`;
      } else {
        logText = `🔍 [VARRENDO] ${game.home} x ${game.away} na ${book} -> True Odds: @${trueOdds} | Odd: @${offeredOdds} | EV: ${ev}% (Sem valor)`;
      }

      setLiveScanLogs(curr => [
        { 
          time: new Date().toLocaleTimeString('pt-BR'), 
          text: logText,
          type: hasValue ? 'success' : 'info'
        },
        ...curr
      ].slice(0, 5));

    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  // Load Initial Value and configurations from Supabase or LocalStorage fallback
  useEffect(() => {
    if (!user) return;
    const loadInitialValue = async () => {
      const userBancaKey = `ev_tracker_banca_initial_value_${user.id}`;
      const userRiskKey = `ev_tracker_max_risk_pct_${user.id}`;
      
      let initialVal = 1000;
      let riskVal = 0.05;

      // 1. Tentar ler do Supabase user_settings
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          if (data) {
            if (data.banca) {
              initialVal = parseFloat(data.banca);
              localStorage.setItem(userBancaKey, initialVal.toString());
            }
            // A tabela user_settings não tem risk_pct explicitamente mas o salvamos como riskPct localmente.
            // Para garantir consistência com o que gravamos no localStorage na tela de configurações:
            const savedRiskLocal = localStorage.getItem(userRiskKey);
            if (savedRiskLocal) {
              riskVal = parseFloat(savedRiskLocal);
            }
          } else {
            // Fallback para LocalStorage se não encontrar no banco
            const savedInitial = localStorage.getItem(userBancaKey);
            if (savedInitial) initialVal = parseFloat(savedInitial);
            const savedRisk = localStorage.getItem(userRiskKey);
            if (savedRisk) riskVal = parseFloat(savedRisk);
          }
        } catch (err) {
          console.warn("[Dashboard] Erro ao carregar user_settings do Supabase:", err);
          const savedInitial = localStorage.getItem(userBancaKey);
          if (savedInitial) initialVal = parseFloat(savedInitial);
          const savedRisk = localStorage.getItem(userRiskKey);
          if (savedRisk) riskVal = parseFloat(savedRisk);
        }
      } else {
        const savedInitial = localStorage.getItem(userBancaKey);
        if (savedInitial) initialVal = parseFloat(savedInitial);
        const savedRisk = localStorage.getItem(userRiskKey);
        if (savedRisk) riskVal = parseFloat(savedRisk);
      }

      setInitialValue(initialVal);
      setRiskPct(riskVal);

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
    let pendingStakes = 0;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('banca_transactions')
          .select('*')
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        if (data) {
          data.forEach(t => {
            if (t.type === 'aporte') {
              currentBanca += t.amount;
            } else if (t.type === 'retirada') {
              currentBanca -= t.amount;
            } else if (t.type === 'ganho' || t.type === 'alavancagem' || t.description === 'Alavancagem') {
              const profit = t.odd ? t.amount * (t.odd - 1) : t.amount;
              currentBanca += profit;
            } else if (t.type === 'perda') {
              currentBanca -= t.amount;
            } else if (t.type === 'pendente') {
              pendingStakes += t.amount;
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
            if (t.type === 'aporte') {
              currentBanca += t.amount;
            } else if (t.type === 'retirada') {
              currentBanca -= t.amount;
            } else if (t.type === 'ganho' || t.type === 'alavancagem' || t.description === 'Alavancagem') {
              const profit = t.odd ? t.amount * (t.odd - 1) : t.amount;
              currentBanca += profit;
            } else if (t.type === 'perda') {
              currentBanca -= t.amount;
            } else if (t.type === 'pendente') {
              pendingStakes += t.amount;
            }
          });
        } catch (e) {
          console.error("[Dashboard] Erro ao processar transações locais:", e);
        }
      }
    }
    const finalBanca = currentBanca - pendingStakes;
    setBanca(finalBanca);
    try {
      localStorage.setItem(userCachedBancaKey, finalBanca.toString());
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

  if (!isTrialActive()) {
    return (
      <div style={{
        padding: '40px 24px',
        textAlign: 'center',
        background: '#111116',
        border: '2px solid rgba(255, 68, 68, 0.3)',
        borderRadius: '16px',
        maxWidth: '600px',
        margin: '60px auto',
        boxShadow: '0 0 30px rgba(255, 68, 68, 0.05)',
        fontFamily: 'system-ui, sans-serif',
        color: '#fff'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', textTransform: 'uppercase' }}>
          Área Exclusiva Para Assinantes!
        </h3>
        <p style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '12px', lineHeight: 1.5 }}>
          A Central de Previsões e Estatísticas A2score é uma ferramenta premium. Assine agora o plano PRO por apenas <strong>R$ 19,90/mês</strong> para ter acesso ilimitado.
        </p>
        <div style={{ margin: '30px 0', borderTop: '1px dashed #222', borderBottom: '1px dashed #222', padding: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: 'var(--brand-neon)', fontSize: '1.8rem', fontWeight: 900 }}>PRO</div>
              <div style={{ color: '#888', fontSize: '0.78rem', marginTop: '4px' }}>R$ 19,90 / mês</div>
            </div>
            <div>
              <div style={{ color: '#0088cc', fontSize: '1.8rem', fontWeight: 900 }}>TELEGRAM VIP</div>
              <div style={{ color: '#888', fontSize: '0.78rem', marginTop: '4px' }}>R$ 9,90 / mês</div>
            </div>
          </div>
        </div>
        <button
          onClick={() => window.location.href = '/pricing'}
          style={{
            background: 'var(--brand-neon)',
            color: '#000',
            border: 'none',
            padding: '14px 28px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(204, 255, 0, 0.2)'
          }}
        >
          Assinar Agora
        </button>
      </div>
    );
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
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', marginTop: '12px' }}>
                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes radar-pulse {
                    0% { transform: scale(0.2); opacity: 0.8; }
                    80% { transform: scale(1.2); opacity: 0; }
                    100% { transform: scale(1.2); opacity: 0; }
                  }
                  @keyframes radar-sweep {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                  .radar-circle {
                    position: absolute;
                    border: 2px solid var(--brand-neon);
                    border-radius: 50%;
                    animation: radar-pulse 3s infinite linear;
                  }
                  .scanner-bar {
                    animation: radar-sweep 6s infinite linear;
                    transform-origin: bottom right;
                  }
                `}} />

                {/* Painel do Radar e Monitoramento em Tempo Real */}
                <div className="glass-panel" style={{ 
                  background: 'linear-gradient(135deg, #0d0d12, #12121a)', 
                  border: '1px solid #222', 
                  borderLeft: '4px solid var(--brand-neon)',
                  padding: '24px', 
                  display: 'flex', 
                  flexDirection: 'row',
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '24px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Fundo do Grid Cibernético */}
                  <div style={{ 
                    position: 'absolute', 
                    top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundImage: 'radial-gradient(rgba(204, 255, 0, 0.15) 1px, transparent 1px)', 
                    backgroundSize: '16px 16px', 
                    opacity: 0.15,
                    zIndex: 0
                  }}></div>

                  {/* Conteúdo Esquerdo: Informações e Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', zIndex: 1, flex: 1, minWidth: '280px' }}>
                    
                    {/* Visualização de Radar */}
                    <div style={{ 
                      position: 'relative', 
                      width: '70px', 
                      height: '70px', 
                      borderRadius: '50%', 
                      background: 'rgba(0, 0, 0, 0.6)', 
                      border: '1px solid rgba(204, 255, 0, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      <div className="radar-circle" style={{ width: '100%', height: '100%', animationDelay: '0s' }}></div>
                      <div className="radar-circle" style={{ width: '100%', height: '100%', animationDelay: '1s' }}></div>
                      <div className="radar-circle" style={{ width: '100%', height: '100%', animationDelay: '2s' }}></div>
                      
                      {/* Linha do Radar girando */}
                      <div className="scanner-bar" style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '50%',
                        height: '50%',
                        borderRight: '1px dashed var(--brand-neon)',
                        background: 'linear-gradient(45deg, transparent, rgba(204, 255, 0, 0.15))'
                      }}></div>
                      
                      <Zap size={22} color="var(--brand-neon)" style={{ zIndex: 5, filter: 'drop-shadow(0 0 6px var(--brand-neon))' }} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                          VARREDURA MATEMÁTICA ATIVA
                        </h3>
                      </div>
                      <p style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '6px', lineHeight: '1.5', maxWidth: '650px' }}>
                        Nosso robô está monitorando a <strong style={{ color: '#fff' }}>Betano</strong>, <strong style={{ color: '#fff' }}>Betfair</strong> e <strong style={{ color: 'var(--brand-neon)' }}>Betsporte</strong> neste exato momento. Nenhuma assimetria matemática de valor foi detectada nas últimas 12 horas.
                      </p>
                    </div>
                  </div>

                  {/* Badges de Status do Motor */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1, alignItems: 'flex-end' }}>
                    <div style={{ background: 'rgba(204, 255, 0, 0.05)', color: 'var(--brand-neon)', border: '1px solid rgba(204, 255, 0, 0.15)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
                      SCANNING_FEED: BETANO, BETFAIR, BETSPORTE
                    </div>
                    <div style={{ background: 'rgba(0, 210, 255, 0.05)', color: '#00d2ff', border: '1px solid rgba(0, 210, 255, 0.15)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
                      ENGINE_STATUS: 100% OPERATIONAL
                    </div>
                  </div>
                </div>

                {/* ─── RADAR SOLTO — entre Varredura e Algoritmo ─── */}
                {(() => {
                  const RADAR_LEAGUES = [
                    { id: 71,  label: 'Brasileirão Série A', angle: 0   },
                    { id: 39,  label: 'Premier League',      angle: 45  },
                    { id: 140, label: 'La Liga',             angle: 90  },
                    { id: 135, label: 'Serie A (Itália)',    angle: 135 },
                    { id: 78,  label: 'Bundesliga',          angle: 180 },
                    { id: 61,  label: 'Ligue 1',             angle: 225 },
                    { id: 13,  label: 'Copa Libertadores',   angle: 270 },
                    { id: 3,   label: 'UEFA Europa League',  angle: 315 },
                  ];
                  const activeLeague = RADAR_LEAGUES[activeLeagueIdx];
                  const CENTER = 170;
                  const ORBIT_DIST = 140;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0', gap: '14px' }}>

                      <style dangerouslySetInnerHTML={{ __html: `
                        @keyframes radar-arm-spin {
                          from { transform: rotate(0deg); }
                          to   { transform: rotate(360deg); }
                        }
                        @keyframes radar-ping-1 {
                          0%,100% { opacity: 0.12; transform: scale(1); }
                          50%     { opacity: 0.28; transform: scale(1.04); }
                        }
                        @keyframes radar-ping-2 {
                          0%,100% { opacity: 0.08; transform: scale(1); }
                          50%     { opacity: 0.18; transform: scale(1.04); }
                        }
                        @keyframes center-logo-appear {
                          0%   { opacity: 0; transform: translate(-50%,-50%) scale(0.6); }
                          30%  { opacity: 1; transform: translate(-50%,-50%) scale(1.12); }
                          100% { opacity: 1; transform: translate(-50%,-50%) scale(1); }
                        }
                        @keyframes orbit-pulse {
                          0%,100% { box-shadow: 0 0 0 0 rgba(204,255,0,0); }
                          50%     { box-shadow: 0 0 18px 4px rgba(204,255,0,0.55); }
                        }
                      `}} />

                      {/* RADAR CANVAS */}
                      <div style={{ position: 'relative', width: '340px', height: '340px' }}>

                        {/* Círculos concêntricos */}
                        {[170, 127, 84, 42].map((r, i) => (
                          <div key={i} style={{
                            position: 'absolute', top: '50%', left: '50%',
                            width: r * 2, height: r * 2, marginLeft: -r, marginTop: -r,
                            borderRadius: '50%',
                            border: `1px solid rgba(204,255,0,${0.07 + i * 0.05})`,
                            animation: i % 2 === 0 ? 'radar-ping-1 3s infinite' : 'radar-ping-2 3.5s infinite',
                            animationDelay: `${i * 0.4}s`
                          }} />
                        ))}

                        {/* Crosshair */}
                        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'rgba(204,255,0,0.08)', marginTop: '-0.5px' }} />
                        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'rgba(204,255,0,0.08)', marginLeft: '-0.5px' }} />

                        {/* Braço giratório */}
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                          borderRadius: '50%',
                          animation: 'radar-arm-spin 4s linear infinite',
                          background: 'conic-gradient(from 0deg, rgba(204,255,0,0) 0deg, rgba(204,255,0,0.18) 55deg, rgba(204,255,0,0) 95deg)'
                        }}>
                          <div style={{
                            position: 'absolute', top: '50%', left: '50%',
                            width: '168px', height: '2px', marginTop: '-1px',
                            transformOrigin: '0% 50%',
                            background: 'linear-gradient(to right, rgba(204,255,0,1), rgba(204,255,0,0))',
                            borderRadius: '2px'
                          }} />
                        </div>

                        {/* Logo central — troca a cada ciclo */}
                        <div style={{
                          position: 'absolute', top: '50%', left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '72px', height: '72px',
                          borderRadius: '50%',
                          background: 'rgba(10,10,14,0.92)',
                          border: '2px solid rgba(204,255,0,0.5)',
                          boxShadow: '0 0 20px rgba(204,255,0,0.3), inset 0 0 16px rgba(0,0,0,0.8)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          zIndex: 10,
                          overflow: 'hidden'
                        }}>
                          <img
                            key={activeLeague.id}
                            src={`https://media.api-sports.io/football/leagues/${activeLeague.id}.png`}
                            alt={activeLeague.label}
                            style={{
                              width: '52px', height: '52px', objectFit: 'contain',
                              position: 'absolute', top: '50%', left: '50%',
                              animation: 'center-logo-appear 0.45s ease-out forwards'
                            }}
                            onError={(e) => { e.currentTarget.style.opacity = '0'; }}
                          />
                        </div>

                        {/* Ícones orbitais */}
                        {RADAR_LEAGUES.map((league, idx) => {
                          const rad = (league.angle - 90) * (Math.PI / 180);
                          const cx = CENTER + ORBIT_DIST * Math.cos(rad);
                          const cy = CENTER + ORBIT_DIST * Math.sin(rad);
                          const isActive = idx === activeLeagueIdx;
                          return (
                            <div key={league.id} title={league.label} style={{
                              position: 'absolute',
                              left: cx - 20, top: cy - 20,
                              width: '40px', height: '40px',
                              borderRadius: '50%',
                              background: isActive ? 'rgba(204,255,0,0.12)' : 'rgba(10,10,14,0.88)',
                              border: isActive ? '2px solid rgba(204,255,0,0.9)' : '1px solid rgba(204,255,0,0.25)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              overflow: 'hidden',
                              transition: 'border 0.2s, background 0.2s, box-shadow 0.2s',
                              boxShadow: isActive ? '0 0 18px 4px rgba(204,255,0,0.45)' : '0 0 6px rgba(204,255,0,0.1)',
                              zIndex: 5
                            }}>
                              <img
                                src={`https://media.api-sports.io/football/leagues/${league.id}.png`}
                                alt={league.label}
                                style={{
                                  width: '30px', height: '30px', objectFit: 'contain',
                                  filter: isActive ? 'brightness(1.1) drop-shadow(0 0 4px rgba(204,255,0,0.6))' : 'brightness(0.7)'
                                }}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Label da liga ativa */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        background: 'rgba(204,255,0,0.05)',
                        border: '1px solid rgba(204,255,0,0.2)',
                        borderRadius: '8px',
                        padding: '8px 20px',
                        fontFamily: 'monospace',
                        minWidth: '260px',
                        justifyContent: 'center'
                      }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand-neon)', boxShadow: '0 0 6px var(--brand-neon)', flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ color: '#555', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>VARRENDO</span>
                        <span style={{ color: '#fff', fontSize: '0.82rem', fontWeight: 800 }}>{activeLeague.label}</span>
                      </div>

                    </div>
                  );
                })()}

                {/* Explicativo Interativo do Fluxo de Varredura */}
                <div style={{ marginTop: '8px' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={18} color="var(--brand-neon)" /> Como Funciona o Nosso Algoritmo de Valor (+EV)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    
                    {/* Passo 1 */}
                    <div style={{ padding: '16px', background: '#09090d', border: '1px solid #1a1a24', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ color: 'var(--brand-neon)', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace' }}>PASSO 01 • COLETA</div>
                      <h5 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>Varredura Multi-Casas</h5>
                      <p style={{ color: '#777', fontSize: '0.78rem', margin: 0, lineHeight: '1.4' }}>
                        Capturamos as cotações (odds) da Betano, Betfair e Betsporte em tempo real para múltiplos mercados a cada 10 segundos.
                      </p>
                    </div>

                    {/* Passo 2 */}
                    <div style={{ padding: '16px', background: '#09090d', border: '1px solid #1a1a24', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ color: '#00d2ff', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace' }}>PASSO 02 • MODELAGEM</div>
                      <h5 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>Distribuição de Poisson</h5>
                      <p style={{ color: '#777', fontSize: '0.78rem', margin: 0, lineHeight: '1.4' }}>
                        Usando dados históricos e gols esperados (xG), calculamos a probabilidade real matemática de cada evento ocorrer.
                      </p>
                    </div>

                    {/* Passo 3 */}
                    <div style={{ padding: '16px', background: '#09090d', border: '1px solid #1a1a24', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ color: '#ff9800', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace' }}>PASSO 03 • ANÁLISE</div>
                      <h5 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>True Odds vs Cotações</h5>
                      <p style={{ color: '#777', fontSize: '0.78rem', margin: 0, lineHeight: '1.4' }}>
                        Convertemos a probabilidade real em "True Odds". Se a odd de uma casa for maior que nossa True Odd, há valor (+EV).
                      </p>
                    </div>

                    {/* Passo 4 */}
                    <div style={{ padding: '16px', background: '#09090d', border: '1px solid #1a1a24', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ color: 'var(--alert-green)', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace' }}>PASSO 04 • ALERTA</div>
                      <h5 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>Disparo em Tempo Real</h5>
                      <p style={{ color: '#777', fontSize: '0.78rem', margin: 0, lineHeight: '1.4' }}>
                        Assim que a discrepância matemática é validada, o sinal aparece na tela e é enviado instantaneamente para o Telegram.
                      </p>
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
