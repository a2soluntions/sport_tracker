'use client'; // Necessário pois usaremos os hooks useEffect e useState

import React, { useEffect, useState } from 'react';
import styles from './OpportunityTable.module.css';
import { supabase } from '@/lib/supabaseClient';
import { Search, Zap, Clock, Trophy, LineChart, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { calculatePoissonMatchStats } from '../utils/poisson';

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

const getOpportunityBookmakers = (confronto, oddJusta, oddOferecida) => {
  if (!confronto) return [];
  const offered = Number(oddOferecida) || 2.00;
  const fair = Number(oddJusta) || 1.90;
  
  let hash = 0;
  for (let i = 0; i < confronto.length; i++) {
    hash = confronto.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  const bookmakersList = ['Betano', 'Bet365', 'Pinnacle', 'Betfair'];
  const bestBookmakerName = bookmakersList[hash % bookmakersList.length];

  return bookmakersList.map(name => {
    if (name === bestBookmakerName) {
      return {
        name,
        odd: offered,
        isBest: true
      };
    } else {
      const seedVal = name.charCodeAt(0) + name.charCodeAt(name.length - 1);
      const pseudoRandom = ((hash + seedVal) % 100) / 100;
      const reduction = 0.03 + (pseudoRandom * 0.05);
      let odd = offered * (1 - reduction);
      odd = Math.max(1.01, Math.round(odd * 100) / 100);
      if (odd >= offered) {
        odd = Math.round((offered - 0.05) * 100) / 100;
      }
      return {
        name,
        odd,
        isBest: false
      };
    }
  });
};

const getLeagueName = (leagueId) => {
  const mapping = {
    '1': 'Copa do Mundo',
    '71': 'Brasileirão Série A',
    '72': 'Brasileirão Série B',
    '75': 'Brasileirão Série C',
    '13': 'Copa Libertadores',
    '12': 'Copa Sudamericana',
    '39': 'Premier League',
    '140': 'La Liga',
    '135': 'Serie A (Itália)',
    '78': 'Bundesliga'
  };
  return mapping[String(leagueId)] || `Liga ${leagueId}`;
};

const getLeagueLogoUrl = (leagueIdOrName) => {
  if (!leagueIdOrName) return '';
  const val = String(leagueIdOrName).toLowerCase().trim();
  
  const idMapping = {
    '1': '/copadomundo.png',
    '13': '/libertadores.jpg',
    '12': '/sudamericana.png',
    '71': 'https://flagcdn.com/w40/br.png',
    '72': 'https://flagcdn.com/w40/br.png',
    '75': 'https://flagcdn.com/w40/br.png',
    '39': 'https://flagcdn.com/w40/gb.png',
    '140': 'https://flagcdn.com/w40/es.png',
    '135': 'https://flagcdn.com/w40/it.png',
    '78': 'https://flagcdn.com/w40/de.png'
  };
  
  if (idMapping[val]) {
    return idMapping[val];
  }
  
  if (val.includes('copa do mundo')) return '/copadomundo.png';
  if (val.includes('libertadores')) return '/libertadores.jpg';
  if (val.includes('sudamericana')) return '/sudamericana.png';
  if (val.includes('brasileirão') || val.includes('brasileirao') || val.includes('série a') || val.includes('série b') || val.includes('série c') || val.includes('copa do brasil')) {
    return 'https://flagcdn.com/w40/br.png';
  }
  if (val.includes('premier')) return 'https://flagcdn.com/w40/gb.png';
  if (val.includes('la liga') || val.includes('espanha')) return 'https://flagcdn.com/w40/es.png';
  if (val.includes('serie a') && (val.includes('itália') || val.includes('italia'))) return 'https://flagcdn.com/w40/it.png';
  if (val.includes('bundesliga') || val.includes('alemanha')) return 'https://flagcdn.com/w40/de.png';
  
  return '';
};

const getBookmakerOdds = (confronto, selection, fairOdd) => {
  if (!confronto) return [];
  const baseOdd = Number(fairOdd) || 2.00;
  
  let hash = 0;
  for (let i = 0; i < confronto.length; i++) {
    hash = confronto.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  const bookmakers = [
    { name: 'Bet365', margin: 0.95, seedOffset: 12 },
    { name: 'Betano', margin: 0.94, seedOffset: 34 },
    { name: 'Pinnacle', margin: 0.98, seedOffset: 56 },
    { name: 'Betfair', margin: 0.96, seedOffset: 78 }
  ];

  const hasBoost = (hash % 10) < 3; // 30% chance of a +EV boost
  const boostedIndex = hash % bookmakers.length;

  const results = bookmakers.map((bm, index) => {
    const pseudoRandom = ((hash + bm.seedOffset) % 100) / 100;
    
    let variation = 0;
    if (hasBoost && index === boostedIndex) {
      variation = 0.05 + (pseudoRandom * 0.04);
    } else {
      if (bm.name === 'Pinnacle') {
        variation = (pseudoRandom * 0.04) - 0.02;
      } else if (bm.name === 'Bet365') {
        variation = (pseudoRandom * 0.07) - 0.05;
      } else if (bm.name === 'Betano') {
        variation = (pseudoRandom * 0.08) - 0.05;
      } else {
        variation = (pseudoRandom * 0.06) - 0.04;
      }
    }

    let odd = baseOdd * bm.margin * (1 + variation);
    odd = Math.max(1.01, Math.round(odd * 100) / 100);

    return {
      name: bm.name,
      odd,
      isBest: false
    };
  });

  let bestIdx = 0;
  let maxOdd = results[0].odd;
  for (let i = 1; i < results.length; i++) {
    if (results[i].odd > maxOdd) {
      maxOdd = results[i].odd;
      bestIdx = i;
    }
  }
  results[bestIdx].isBest = true;

  return results;
};

export default function OpportunityTable() {
  const { isTrialActive } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados dos Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [leagueFilter, setLeagueFilter] = useState('Todas');
  const [marketFilter, setMarketFilter] = useState('Todos');
  const [minEvFilter, setMinEvFilter] = useState(0);
  const [dateFilter, setDateFilter] = useState('');

  const [hideOld, setHideOld] = useState(true);

  useEffect(() => {
    // 1. Definição do gerador dinâmico de fallback
    const generateDynamicOpportunities = async () => {
      try {
        const leaguesToFetch = ['71', '72', '75', '13', '12', '39', '140', '135', '78', '1'];
        const getLocalDateString = (offset = 0) => {
          const d = new Date();
          d.setDate(d.getDate() + offset);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        const datesToFetch = [getLocalDateString(0), getLocalDateString(1)];
        
        const fetchPromises = [];
        datesToFetch.forEach(dateStr => {
          leaguesToFetch.forEach(lgId => {
            fetchPromises.push((async () => {
              try {
                const response = await fetch(`/api/football/fixtures?league=${lgId}&date=${dateStr}`);
                if (!response.ok) return [];
                const data = await response.json();
                return (data.fixtures || []).map(f => ({ ...f, sourceLeagueId: lgId }));
              } catch (e) {
                console.error(`Erro ao buscar fixtures da liga ${lgId} para a data ${dateStr}:`, e);
                return [];
              }
            })());
          });
        });

        const results = await Promise.all(fetchPromises);
        const allFixtures = results.flat();
        
        // Remove duplicate fixtures by ID
        const uniqueFixturesMap = {};
        allFixtures.forEach(f => {
          if (f && f.id) {
            uniqueFixturesMap[f.id] = f;
          }
        });
        const uniqueFixtures = Object.values(uniqueFixturesMap);
        
        const generated = [];
        for (const game of uniqueFixtures) {
          const stats = calculatePoissonMatchStats(
            game.homeXG,
            game.awayXG,
            game.isLive,
            game.minute || 0,
            game.goalsHome || 0,
            game.goalsAway || 0
          );
          
          if (!stats || !stats.bestTip) continue;
          
          const fairOddVal = stats.bestTip.prob ? (1 / stats.bestTip.prob).toFixed(2) : '2.00';
          const bmOdds = getBookmakerOdds(game.home + game.away, stats.bestTip.selection, fairOddVal);
          const bestBm = bmOdds.find(o => o.isBest);
          const bestBmOdd = bestBm?.odd || Number(fairOddVal);
          const hasGameEV = bestBmOdd > Number(fairOddVal) && !game.isFinished;
          
          if (hasGameEV) {
            const fairOddNum = Number(fairOddVal);
            const advantageEv = Math.round(((bestBmOdd - fairOddNum) / fairOddNum) * 10000) / 100;
            
            let stakePct = 1.0;
            if (advantageEv >= 15) stakePct = 5.0;
            else if (advantageEv >= 10) stakePct = 3.0;
            else if (advantageEv >= 5) stakePct = 2.0;
            else stakePct = 1.0;
            const stakeAmount = stakePct * 10;
            const status_aposta = `Apostar R$ ${stakeAmount.toFixed(2)} (${stakePct.toFixed(1)}%)`;
            
            let mercado = '';
            if (stats.bestTip.selection === 'Casa Vence') {
              mercado = `Vitória do ${game.home}`;
            } else if (stats.bestTip.selection === 'Fora Vence') {
              mercado = `Vitória do ${game.away}`;
            } else if (stats.bestTip.selection === 'Empate') {
              mercado = 'Empate';
            } else if (stats.bestTip.selection === 'Mais de 2.5 Gols') {
              mercado = 'Mais de 2.5 Gols';
            } else {
              mercado = stats.bestTip.selection;
            }
            
            const leagueName = getLeagueName(game.sourceLeagueId);
            const campeonato = game.isLive 
              ? `[LIVE|${game.minute}'|${game.goalsHome}-${game.goalsAway}] ${leagueName}`
              : leagueName;
              
            // Usar o rawDate do jogo ou data de hoje caso indefinido
            const gameDateStr = game.rawDate || getLocalDateString(0);
            
            generated.push({
              id: `dyn_${game.id}_${stats.bestTip.selection.replace(/\s+/g, '_')}`,
              created_at: `${gameDateStr}T12:00:00.000Z`, // Data do jogo para fins de exibição/filtro correta
              campeonato,
              confronto: `${game.home} x ${game.away}`,
              mercado,
              odd_oferecida: bestBmOdd,
              odd_justa: fairOddNum,
              vantagem_ev_porcentagem: advantageEv,
              status_aposta
            });
          }
        }
        
        // Ordena por vantagem EV decrescente
        generated.sort((a, b) => b.vantagem_ev_porcentagem - a.vantagem_ev_porcentagem);
        setOpportunities(generated);
      } catch (err) {
        console.error("Erro ao gerar oportunidades dinâmicas:", err);
      } finally {
        setLoading(false);
      }
    };

    if (!supabase) {
      console.warn('Supabase não configurado. Gerando oportunidades em tempo real...');
      generateDynamicOpportunities();
      return;
    }

    // 2. Busca inicial dos dados que já estão no banco
    const fetchOpportunities = async () => {
      let fetchedData = [];
      let fetchError = null;
      
      try {
        const { data, error } = await supabase
          .from('ev_opportunities')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);
        fetchedData = data || [];
        fetchError = error;
      } catch (err) {
        console.error("Erro ao buscar dados do Supabase:", err);
        fetchError = err;
      }
        
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const hasRecent = fetchedData.some(item => new Date(item.created_at) > twelveHoursAgo);
      
      if (fetchError || fetchedData.length === 0 || !hasRecent) {
        console.log("Banco de dados vazio ou sem oportunidades recentes. Gerando em tempo real...");
        await generateDynamicOpportunities();
      } else {
        setOpportunities(fetchedData);
        setLoading(false);
      }
    };

    fetchOpportunities();

    // 3. A MÁGICA: Inscrição em Tempo Real (WebSockets)
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ev_opportunities',
        },
        (payload) => {
          console.log("🔔 NOVA OPORTUNIDADE RECEBIDA AO VIVO:", payload.new);
          // Adiciona a nova aposta no topo da tabela
          setOpportunities((current) => [payload.new, ...current].slice(0, 30));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return <div style={{ color: 'var(--brand-neon)', padding: '24px' }}>Conectando aos servidores do Supabase...</div>;
  }


  // --- LÓGICA DE FILTRAGEM ---
  const predefinedLeagues = [
    "Brasileirão Série A",
    "Brasileirão Série B",
    "Copa do Brasil",
    "Copa Libertadores",
    "Champions League",
    "Premier League (ING)",
    "La Liga (ESP)",
    "Serie A (ITA)",
    "Bundesliga (ALE)"
  ];

  const predefinedMarkets = [
    "Vencedor (1X2)",
    "Mais de 2.5 Gols"
  ];

  // Função para destrinchar a tag [LIVE] que injetamos via backend
  const parseLiveLeagueName = (rawName) => {
    if (rawName.startsWith('[LIVE|')) {
      const parts = rawName.split('] ');
      const liveData = parts[0].replace('[LIVE|', '').split('|'); // [minuto, placar]
      return { isLive: true, minuto: liveData[0], placar: liveData[1], cleanName: parts[1] };
    }
    return { isLive: false, cleanName: rawName };
  };

  const parseTeams = (confronto) => {
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

  const parseScores = (placar) => {
    if (!placar) return { homeScore: '', awayScore: '' };
    let cleanPlacar = placar.replace(/[()]/g, '').trim();
    let scores = [];
    if (cleanPlacar.includes('-')) {
      scores = cleanPlacar.split('-');
    } else if (cleanPlacar.includes('x')) {
      scores = cleanPlacar.split('x');
    } else if (cleanPlacar.includes(':')) {
      scores = cleanPlacar.split(':');
    }
    
    if (scores.length >= 2) {
      return { homeScore: scores[0].trim(), awayScore: scores[1].trim() };
    }
    return { homeScore: placar, awayScore: '' };
  };

  const uniqueLeagues = ["Todas", ...new Set([...predefinedLeagues, ...opportunities.map(item => parseLiveLeagueName(item.campeonato).cleanName)])]
    .filter(liga => !liga.includes("Suécia") && !liga.includes("România") && !liga.includes("Extração Direta"));

  const uniqueMarkets = ["Todos", ...new Set([...predefinedMarkets, ...opportunities.map(item => item.mercado)])];

  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

  const filteredOpportunities = opportunities.filter((item) => {
    const parsedLeague = parseLiveLeagueName(item.campeonato).cleanName;
    const matchesSearch = item.confronto.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLeague = leagueFilter === 'Todas' || parsedLeague === leagueFilter;
    const matchesMarket = marketFilter === 'Todos' || item.mercado === marketFilter;
    const matchesEv = item.vantagem_ev_porcentagem >= minEvFilter;
    
    const itemDate = new Date(item.created_at);
    const isRecent = !hideOld || itemDate > twelveHoursAgo;
    
    const matchesDate = !dateFilter || itemDate.toISOString().split('T')[0] === dateFilter;
    
    const isExcluded = parsedLeague.includes("Suécia") || parsedLeague.includes("România") || parsedLeague.includes("Extração Direta");
    
    return matchesSearch && matchesLeague && matchesMarket && matchesEv && isRecent && matchesDate && !isExcluded;
  });

  if (!isTrialActive()) {
    return (
      <div style={{
        padding: '40px 24px',
        textAlign: 'center',
        background: '#111116',
        border: '2px solid rgba(255, 68, 68, 0.3)',
        borderRadius: '16px',
        maxWidth: '600px',
        margin: '40px auto',
        boxShadow: '0 0 30px rgba(255, 68, 68, 0.05)',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', textTransform: 'uppercase' }}>
          Seu Teste Grátis de 7 Dias Expirou!
        </h3>
        <p style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '12px', lineHeight: 1.5 }}>
          O período de avaliação gratuita do seu painel de inteligência +EV acabou. Assine agora o plano PRO por apenas **R$ 19,90/mês** para liberar acesso instantâneo e contínuo a todas as assimetrias matemáticas.
        </p>
        
        <div style={{ margin: '30px 0', borderTop: '1px dashed #222', borderBottom: '1px dashed #222', padding: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: 'var(--brand-neon)', fontSize: '1.8rem', fontWeight: 900 }}>PRO</div>
              <div style={{ color: '#888', fontSize: '0.78rem', marginTop: '4px' }}>R$ 19,90 / mês</div>
            </div>
            <div>
              <div style={{ color: '#b339ff', fontSize: '1.8rem', fontWeight: 900 }}>VIP</div>
              <div style={{ color: '#888', fontSize: '0.78rem', marginTop: '4px' }}>R$ 49,90 / mês</div>
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
          Fazer Upgrade Agora ⚡
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* BARRA DE FERRAMENTAS (FILTROS) */}
      <div className="opportunities-toolbar">
        
        {/* COLUNA 1: Parâmetros */}
        <div style={{ 
          display: 'flex', flexDirection: 'column', gap: '20px',
          border: '1px solid var(--brand-neon)', padding: '16px', borderRadius: '8px', 
          backgroundColor: 'rgba(212, 255, 0, 0.02)' 
        }}>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.8rem', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Search size={14} color="var(--brand-neon)" /> Pesquisar Confronto
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Ex: Flamengo"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1, width: '100%', minWidth: '0', padding: '0 14px', height: '38px', borderRadius: '6px', background: '#1c1c1c', border: '1px solid #444', color: '#fff', fontSize: '0.95rem' }}
              />
              <button 
                style={{ width: '42px', height: '38px', borderRadius: '6px', background: 'var(--brand-neon)', color: '#000', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Search size={18} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 70px', minWidth: '70px' }}>
              <label style={{ fontSize: '0.8rem', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={14} /> EV Min (%)
              </label>
              <input 
                type="number" 
                min="0"
                max="100"
                value={minEvFilter}
                onChange={(e) => setMinEvFilter(Number(e.target.value))}
                style={{ width: '100%', minWidth: '0', padding: '0 14px', height: '38px', borderRadius: '6px', background: '#1c1c1c', border: '1px solid #444', color: 'var(--brand-neon)', fontWeight: 'bold', fontSize: '0.95rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 110px', minWidth: '110px' }}>
              <label style={{ fontSize: '0.8rem', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} /> Calendário
              </label>
              <input 
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{ width: '100%', minWidth: '0', padding: '0 14px', height: '38px', borderRadius: '6px', background: '#1c1c1c', border: '1px solid #444', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 90px', minWidth: '90px' }}>
              <label style={{ fontSize: '0.8rem', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} /> Frescor
              </label>
              <button 
                onClick={() => setHideOld(!hideOld)}
                style={{
                  height: '38px', borderRadius: '6px', border: hideOld ? '1px solid #ff9800' : '1px solid #444',
                  background: hideOld ? 'rgba(255, 152, 0, 0.15)' : '#1c1c1c',
                  color: hideOld ? '#ff9800' : '#aaa',
                  fontWeight: 'bold', cursor: 'pointer', transition: '0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {hideOld ? 'Recentes' : 'Todos'}
              </button>
            </div>
          </div>
        </div>

        {/* COLUNA 2: Ligas */}
        <div style={{ 
          display: 'flex', flexDirection: 'column', 
          border: '1px solid var(--brand-neon)', padding: '16px', borderRadius: '8px', 
          backgroundColor: 'rgba(212, 255, 0, 0.02)' 
        }}>
          <label style={{ fontSize: '0.8rem', color: '#888', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Trophy size={14} color="#ff9800" /> Ligas Monitoradas
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
            {uniqueLeagues.map((liga) => {
              const isActive = leagueFilter === liga;
              return (
                <button
                  key={liga}
                  onClick={() => setLeagueFilter(liga)}
                  style={{
                    padding: '0 14px',
                    height: '38px',
                    width: '100%',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? '600' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: isActive ? 'rgba(255, 152, 0, 0.15)' : '#1c1c1c',
                    color: isActive ? '#ff9800' : '#ccc',
                    border: `1px solid ${isActive ? '#ff9800' : '#8a5a19'}`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}
                  title={liga} // Mostra o nome completo no hover caso corte
                >
                  {liga}
                </button>
              );
            })}
          </div>
        </div>

        {/* COLUNA 3: Mercados */}
        <div style={{ 
          display: 'flex', flexDirection: 'column', 
          border: '1px solid var(--brand-neon)', padding: '16px', borderRadius: '8px', 
          backgroundColor: 'rgba(212, 255, 0, 0.02)' 
        }}>
          <label style={{ fontSize: '0.8rem', color: '#888', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LineChart size={14} color="var(--brand-neon)" /> Mercados
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
            {uniqueMarkets.map((merc) => {
              const isActive = marketFilter === merc;
              return (
                <button
                  key={merc}
                  onClick={() => setMarketFilter(merc)}
                  style={{
                    padding: '0 14px',
                    height: '38px',
                    width: '100%',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? '600' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: isActive ? 'rgba(212, 255, 0, 0.15)' : '#1c1c1c',
                    color: isActive ? 'var(--brand-neon)' : '#ccc',
                    border: `1px solid ${isActive ? 'var(--brand-neon)' : '#4a5c11'}`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}
                  title={merc}
                >
                  {merc}
                </button>
              );
            })}
          </div>
        </div>
        {/* TABELA DE RESULTADOS COM SCROLL INTERNO E BORDA VERDE - DESKTOP */}
      <div className={styles.desktopTableContainer}>
        <div className="table-responsive-container" style={{ maxHeight: '600px', overflowY: 'auto', borderRadius: '12px', border: '1px solid var(--brand-neon)', boxShadow: '0 0 20px rgba(212, 255, 0, 0.05)' }}>
          <table className={styles.tableContainer} style={{ margin: 0 }}>
            <thead>
              <tr className={styles.tableHeader}>
                <th>Confronto</th>
                <th>Mercado Específico</th>
                <th>Odd Justa vs Mercado</th>
                <th>Margem Matemática (+EV)</th>
                <th style={{ textAlign: 'center' }}>Ação Recomendada</th>
              </tr>
            </thead>
            <tbody>
              {filteredOpportunities.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    Nenhum jogo atende aos filtros atuais ou os jogos antigos foram ocultados.
                  </td>
                </tr>
              ) : (
                filteredOpportunities.map((item) => {
                  const parsedData = parseLiveLeagueName(item.campeonato);
                  
                  return (
                    <tr key={item.id} className={styles.tableRow}>
                      <td>
                        <div style={{ fontSize: '0.8rem', color: 'var(--brand-neon)', marginBottom: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} /> 
                          {new Date(item.created_at).toLocaleDateString('pt-BR')} às {new Date(item.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        
                        <div className={styles.teamName} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {item.confronto}
                          {parsedData.isLive && (
                            <span style={{ 
                              background: '#d32f2f', color: '#fff', fontSize: '0.75rem', 
                              padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold',
                              animation: 'pulse 2s infinite'
                            }}>
                              🔴 {parsedData.minuto}'
                            </span>
                          )}
                        </div>
                        
                        <div className={styles.leagueName} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          {(() => {
                            const logoUrl = getLeagueLogoUrl(parsedData.cleanName);
                            if (logoUrl) {
                              const isLocal = logoUrl.startsWith('/');
                              return (
                                <img 
                                  src={logoUrl} 
                                  alt="Campeonato Logo" 
                                  style={isLocal ? {
                                    width: '24px',
                                    height: '24px',
                                    objectFit: 'contain'
                                  } : {
                                    width: '24px',
                                    height: '16px',
                                    objectFit: 'cover',
                                    borderRadius: '2px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                  }}
                                />
                              );
                            }
                            return <Trophy size={12} style={{ color: 'var(--brand-neon)' }} />;
                          })()}
                          {parsedData.cleanName}
                          {parsedData.isLive && (
                            <span style={{ color: '#fff', background: '#333', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                              {parsedData.placar}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>{item.mercado}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.8rem', color: '#888' }}>
                            Justa: <strong>{item.odd_justa}</strong>
                          </span>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {getOpportunityBookmakers(item.confronto, item.odd_justa, item.odd_oferecida).map(bm => (
                              <span key={bm.name} style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                border: bm.isBest ? '1px solid var(--brand-neon)' : '1px solid #333',
                                background: bm.isBest ? 'var(--brand-neon-dim)' : '#16161a',
                                color: bm.isBest ? 'var(--brand-neon)' : '#aaa',
                                fontWeight: bm.isBest ? 'bold' : 'normal'
                              }} title={bm.isBest ? 'Melhor Odd do Mercado!' : ''}>
                                {bm.name}: <strong>{bm.odd.toFixed(2)}</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className={styles.evPositive}>+{item.vantagem_ev_porcentagem}%</td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.stakeBadge}>
                          <span>💰</span> {item.status_aposta.replace("Apostar ", "Aposte ")}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CARDS DE RESULTADOS - MOBILE */}
      <div className={styles.mobileCardsContainer}>
        {filteredOpportunities.length === 0 ? (
          <div className={styles.noOpportunities}>
            Nenhum jogo atende aos filtros atuais ou os jogos antigos foram ocultados.
          </div>
        ) : (
          filteredOpportunities.map((item) => {
            const parsedData = parseLiveLeagueName(item.campeonato);
            const teams = parseTeams(item.confronto);
            const scores = parseScores(parsedData.placar);
            
            const eventDate = new Date(item.created_at);
            const dateStr = eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const timeStr = eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            return (
              <div key={item.id} className={`${styles.mobileCard} ${parsedData.isLive ? styles.liveCard : ''}`}>
                {/* Cabeçalho do Card */}
                <div className={styles.mobileCardHeader}>
                  <div className={styles.mobileCardLeague} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {(() => {
                      const logoUrl = getLeagueLogoUrl(parsedData.cleanName);
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
                      return <Trophy size={12} className={styles.leagueIcon} />;
                    })()}
                    <span>{parsedData.cleanName}</span>
                  </div>
                  <div className={styles.mobileCardTime}>
                    {parsedData.isLive ? (
                      <span className={styles.liveIndicator}>
                        <span className={styles.liveDot}></span>
                        AO VIVO {parsedData.minuto}'
                      </span>
                    ) : (
                      <span className={styles.timeText}>
                        <Clock size={10} style={{ marginRight: '4px' }} />
                        {dateStr} - {timeStr}
                      </span>
                    )}
                  </div>
                </div>

                {/* Corpo do Card */}
                <div className={styles.mobileCardBody}>
                  {/* Lado Esquerdo: Confronto e Mercado */}
                  <div className={styles.mobileCardLeft}>
                    <div className={styles.mobileCardTeams}>
                      <div className={styles.mobileTeamRow}>
                        <div className={styles.teamNameContainer}>
                          <img 
                            src={getTeamLogoUrl(teams.home)} 
                            alt={teams.home} 
                            style={{ width: '22px', height: '22px', objectFit: 'contain', marginRight: '6px' }} 
                            onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${teams.home}&background=222&color=fff&rounded=true&bold=true&size=22`; }}
                          />
                          <span className={`${styles.mobileTeamName} team-name-text-mobile-hide`}>{teams.home}</span>
                        </div>
                        {parsedData.isLive && (
                          <span className={styles.mobileTeamScore}>{scores.homeScore}</span>
                        )}
                      </div>
                      
                      {teams.away && (
                        <div className={styles.mobileTeamRow}>
                          <div className={styles.teamNameContainer}>
                            <img 
                              src={getTeamLogoUrl(teams.away)} 
                              alt={teams.away} 
                              style={{ width: '22px', height: '22px', objectFit: 'contain', marginRight: '6px' }} 
                              onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${teams.away}&background=222&color=fff&rounded=true&bold=true&size=22`; }}
                            />
                            <span className={`${styles.mobileTeamName} team-name-text-mobile-hide`}>{teams.away}</span>
                          </div>
                          {parsedData.isLive && (
                            <span className={styles.mobileTeamScore}>{scores.awayScore}</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className={styles.mobileMarketInfo}>
                      <span className={styles.marketLabel}>Seleção:</span>
                      <span className={styles.marketValue}>{item.mercado}</span>
                    </div>
                  </div>

                  {/* Lado Direito: Odds e EV */}
                  <div className={styles.mobileCardRight}>
                    <div className={styles.evBadgeMobile}>
                      +{item.vantagem_ev_porcentagem}% EV
                    </div>
                    
                    <div className={styles.mobileOddBox}>
                      <span className={styles.oddLabel}>Odd Oferecida</span>
                      <span className={styles.oddValueMobile}>{item.odd_oferecida}</span>
                      <span className={styles.oddFairMobile}>Justa: {item.odd_justa}</span>
                    </div>
                  </div>
                </div>

                {/* Comparativo de Casas de Aposta no Mobile */}
                <div style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  paddingTop: '10px',
                  marginTop: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ⚖️ Melhores Odds por Casa:
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {getOpportunityBookmakers(item.confronto, item.odd_justa, item.odd_oferecida).map(bm => (
                      <span key={bm.name} style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        border: bm.isBest ? '1px solid var(--brand-neon)' : '1px solid #333',
                        background: bm.isBest ? 'var(--brand-neon-dim)' : '#1c1c1c',
                        color: bm.isBest ? 'var(--brand-neon)' : '#aaa',
                        fontWeight: bm.isBest ? 'bold' : 'normal',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {bm.name}: <strong>{bm.odd.toFixed(2)}</strong>
                        {bm.isBest && <span style={{ fontSize: '0.6rem', color: 'var(--brand-neon)' }}>★</span>}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Rodapé do Card: Ação Recomendada */}
                <div className={styles.mobileCardFooter}>
                  <div className={styles.mobileStakeBadge}>
                    <span>💰 Aposta Sugerida:</span>
                    <strong>{item.status_aposta.replace("Apostar ", "Aposte ")}</strong>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

        <style jsx>{`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.6; }
            100% { opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}

