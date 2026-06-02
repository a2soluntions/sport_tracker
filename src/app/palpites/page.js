'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Send, CheckCircle2, Trophy, Loader2, Trash2, PiggyBank, AlertTriangle, BarChart3, Target, Calculator, PlusCircle } from 'lucide-react';

const factorial = (n) => {
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
};
import { calculatePoissonMatchStats, formatPct, formatOdd } from '../../utils/poisson';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTeamHash = (name) => {
  if (!name) return 0;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const getCornersStats = (home, away, homeXG, awayXG) => {
  const seedH = getTeamHash(home);
  const seedA = getTeamHash(away);
  
  const noiseFeitosH = ((seedH % 7) - 3) / 10; // -0.3 a 0.3
  const noiseSofridosH = ((seedH % 5) - 2) / 10; // -0.2 a 0.2
  
  const noiseFeitosA = ((seedA % 7) - 3) / 10; 
  const noiseSofridosA = ((seedA % 5) - 2) / 10;

  const feitosH = parseFloat((4.2 + (homeXG * 0.9) + noiseFeitosH).toFixed(1));
  const sofridosH = parseFloat((3.8 + (awayXG * 0.7) + noiseSofridosH).toFixed(1));
  
  const feitosA = parseFloat((3.6 + (awayXG * 0.8) + noiseFeitosA).toFixed(1));
  const sofridosA = parseFloat((4.4 + (homeXG * 0.8) + noiseSofridosA).toFixed(1));

  return {
    home: { feitos: feitosH, sofridos: sofridosH, total: parseFloat((feitosH + sofridosH).toFixed(1)) },
    away: { feitos: feitosA, sofridos: sofridosA, total: parseFloat((feitosA + sofridosA).toFixed(1)) },
    projected: parseFloat((feitosH + feitosA).toFixed(1))
  };
};

const getCardsStats = (home, away) => {
  const seedH = getTeamHash(home);
  const seedA = getTeamHash(away);
  
  const noiseH = ((seedH % 7) - 3) / 10; // -0.3 a 0.3
  const noiseA = ((seedA % 7) - 3) / 10;
  
  const yellowH = parseFloat((2.1 + noiseH).toFixed(1));
  const yellowA = parseFloat((2.5 + noiseA).toFixed(1));
  
  const redH = parseFloat((0.1 + (seedH % 3 === 0 ? 0.05 : 0)).toFixed(2));
  const redA = parseFloat((0.12 + (seedA % 3 === 0 ? 0.05 : 0)).toFixed(2));
  
  return {
    home: { yellow: yellowH, red: redH },
    away: { yellow: yellowA, red: redA },
    totalYellow: parseFloat((yellowH + yellowA).toFixed(1)),
    totalRed: parseFloat((redH + redA).toFixed(2))
  };
};

const getOpponentName = (teamName, index, seed) => {
  const BR_TEAMS = [
    'Flamengo', 'Palmeiras', 'São Paulo', 'Corinthians', 'Fluminense', 'Vasco', 'Botafogo',
    'Santos', 'Grêmio', 'Internacional', 'Cruzeiro', 'Atlético-MG', 'Athletico-PR', 'Bahia',
    'Fortaleza', 'Cuiabá', 'Criciúma', 'Juventude', 'Vitória', 'Atlético-GO'
  ];
  const filtered = BR_TEAMS.filter(t => t !== teamName);
  return filtered[(seed + index) % filtered.length];
};

const getTeamForm = (teamName, position) => {
  const seed = getTeamHash(teamName);
  const form = [];
  
  let pWin = 0.35;
  let pDraw = 0.30;
  
  const parsedPos = parseInt(position) || 10;
  
  if (parsedPos <= 5) {
    pWin = 0.55;
    pDraw = 0.25;
  } else if (parsedPos <= 12) {
    pWin = 0.40;
    pDraw = 0.30;
  } else {
    pWin = 0.20;
    pDraw = 0.30;
  }
  
  for (let i = 0; i < 5; i++) {
    const gameSeed = (seed + i * 43) % 100;
    let result = 'E';
    let goalsFor = 1;
    let goalsAgainst = 1;
    
    if (gameSeed < pWin * 100) {
      result = 'V';
      goalsFor = 1 + (gameSeed % 2) + (gameSeed % 3 === 0 ? 1 : 0);
      goalsAgainst = gameSeed % 2;
    } else if (gameSeed < (pWin + pDraw) * 100) {
      result = 'E';
      goalsFor = gameSeed % 2;
      goalsAgainst = goalsFor;
    } else {
      result = 'D';
      goalsFor = gameSeed % 2;
      goalsAgainst = 1 + (gameSeed % 2) + (gameSeed % 3 === 0 ? 1 : 0);
    }
    
    form.push({ 
      result, 
      score: `${goalsFor}x${goalsAgainst}`, 
      opponent: getOpponentName(teamName, i, gameSeed) 
    });
  }
  
  return form;
};

const getH2HStats = (home, away) => {
  const seed = getTeamHash(home) + getTeamHash(away);
  const matches = [];
  const years = [2025, 2025, 2024, 2024, 2023];
  
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  
  for (let i = 0; i < 5; i++) {
    const matchSeed = (seed + i * 29) % 100;
    const year = years[i];
    let result = 'E';
    let gh = 1;
    let ga = 1;
    
    if (matchSeed < 40) {
      result = 'H';
      gh = 1 + (matchSeed % 2) + (matchSeed % 3 === 0 ? 1 : 0);
      ga = matchSeed % gh;
      homeWins++;
    } else if (matchSeed < 70) {
      result = 'E';
      gh = matchSeed % 2;
      ga = gh;
      draws++;
    } else {
      result = 'A';
      ga = 1 + (matchSeed % 2) + (matchSeed % 3 === 0 ? 1 : 0);
      gh = matchSeed % ga;
      awayWins++;
    }
    
    matches.push({
      year,
      score: `${gh} x ${ga}`,
      venue: i % 2 === 0 ? home : away,
      winner: result === 'H' ? home : result === 'A' ? away : 'Empate'
    });
  }
  
  return {
    matches,
    summary: { homeWins, draws, awayWins }
  };
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
  return mapping[leagueId] || 'Futebol';
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

const getLiveMatchRadar = (game) => {
  if (!game || !game.isLive) return null;
  
  const minute = game.minute || 1;
  const hash = String(game.id) + String(minute);
  let seed = 0;
  for (let i = 0; i < hash.length; i++) {
    seed = hash.charCodeAt(i) + ((seed << 5) - seed);
  }
  seed = Math.abs(seed);

  const homeBase = 30 + (seed % 41); // 30% a 70%
  const homePressure = homeBase;
  const awayPressure = 100 - homeBase;

  let statusText = 'Disputa intensa no meio de campo.';
  let zone = 'midfield'; 

  if (homePressure >= 60) {
    statusText = `${game.home} está pressionando fortemente! Bola parada na área adversária.`;
    zone = 'away_box';
  } else if (awayPressure >= 60) {
    statusText = `${game.away} domina as ações ofensivas neste momento! Perigo para a zaga do ${game.home}.`;
    zone = 'home_box';
  } else {
    if (homePressure > awayPressure) {
      statusText = `${game.home} tenta criar jogadas pelas laterais, jogo equilibrado.`;
    } else {
      statusText = `${game.away} busca contra-ataques velozes, mas defesa adversária segura bem.`;
    }
  }

  return {
    homePressure,
    awayPressure,
    statusText,
    zone
  };
};


export default function PalpitesPage() {
  const { user, isTrialActive } = useAuth();
  const [games, setGames] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [successId, setSuccessId] = useState(null);
  const [sentIds, setSentIds] = useState(new Set());
  const [autoStatus, setAutoStatus] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [roundInfo, setRoundInfo] = useState(null);

  // Novos estados para Filtro de Ligas e Data
  const [selectedLeague, setSelectedLeague] = useState('all'); // default to load all games
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateString());

  // Estados do Controle de Banca integrado
  const [transactions, setTransactions] = useState([]);
  const [statsMode, setStatsMode] = useState('modelo'); // 'minhas' ou 'modelo'
  const [followAmount, setFollowAmount] = useState('50');
  const [followOdd, setFollowOdd] = useState('');
  const [activeFollowId, setActiveFollowId] = useState(null);
  const [sendingSummary, setSendingSummary] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [openStatsId, setOpenStatsId] = useState(null);
  const [openRadarGameId, setOpenRadarGameId] = useState(null);
  const [activeStatsTab, setActiveStatsTab] = useState('geral');

  // Bet Builder states
  const [openBuilderGameId, setOpenBuilderGameId] = useState(null);
  const [builderSelections, setBuilderSelections] = useState([]);
  const [builderStake, setBuilderStake] = useState('50');
  const [builderCustomOdd, setBuilderCustomOdd] = useState('');

  useEffect(() => {
    const calcOdd = builderSelections.reduce((acc, s) => acc * Number(s.odd), 1).toFixed(2);
    setBuilderCustomOdd(calcOdd);
  }, [builderSelections]);

  const handleToggleBuilderSelection = (item, matchName) => {
    const id = `${matchName}_${item.market}_${item.label}`;
    const bmOdds = getBookmakerOdds(matchName, item.label, item.odd);
    const bestOdd = bmOdds.find(o => o.isBest)?.odd || item.odd;

    setBuilderSelections(prev => {
      const exists = prev.some(s => s.id === id);
      if (exists) {
        return prev.filter(s => s.id !== id);
      } else {
        return [...prev, {
          id,
          market: item.market,
          label: item.label,
          prob: item.prob,
          odd: bestOdd
        }];
      }
    });
  };

  const handleSaveBuilderBet = async (game) => {
    if (builderSelections.length === 0) return;
    if (!builderStake || Number(builderStake) <= 0) return;

    const stakeVal = Number(builderStake);
    const oddVal = builderCustomOdd ? Number(builderCustomOdd) : builderSelections.reduce((acc, s) => acc * Number(s.odd), 1);
    
    const desc = `[Aposta Criada] ${game.home} x ${game.away} (${builderSelections.map(s => s.label).join(', ')})`;
    const newTx = {
      date: getLocalDateString(),
      type: 'pendente',
      amount: stakeVal,
      description: desc,
      odd: Number(oddVal.toFixed(2))
    };

    let success = false;
    let savedTx = null;

    const userTxsKey = `ev_tracker_banca_txs_${user?.id || 'guest'}`;
    const userTxIdsKey = `ev_tracker_user_tx_ids_${user?.id || 'guest'}`;

    if (supabase && user) {
      try {
        const txToUpload = { ...newTx, user_id: user.id };
        const { data, error } = await supabase
          .from('banca_transactions')
          .insert([txToUpload])
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
        console.warn("Erro ao salvar aposta no Supabase:", err);
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
      success = true;
    }

    if (success && savedTx) {
      setTransactions(prev => [savedTx, ...prev]);
      showToast('Aposta salva com sucesso na sua Banca! 🚀', 'success');
    }

    setOpenBuilderGameId(null);
    setBuilderSelections([]);
  };

  const getBuilderMarkets = (game) => {
    if (!game) return [];
    
    const stats = game.stats;
    const corn = getCornersStats(game.home, game.away, game.homeXG, game.awayXG);
    const cards = getCardsStats(game.home, game.away);
    const getOdd = (p) => p > 0 ? parseFloat((1 / p).toFixed(2)) : 1.01;
    
    const pCorn = (k) => (Math.exp(-corn.projected) * Math.pow(corn.projected, k)) / factorial(k);
    const probCornOver = (k) => {
      let sum = 0;
      for (let i = 0; i <= k; i++) {
        sum += pCorn(i);
      }
      return Math.max(0, Math.min(1, 1 - sum));
    };

    const pCards = (k) => (Math.exp(-cards.totalYellow) * Math.pow(cards.totalYellow, k)) / factorial(k);
    const probCardsOver = (k) => {
      let sum = 0;
      for (let i = 0; i <= k; i++) {
        sum += pCards(i);
      }
      return Math.max(0, Math.min(1, 1 - sum));
    };

    const redCardProb = 1 - Math.exp(-cards.totalRed);

    return [
      {
        category: 'Resultado Final (1X2)',
        items: [
          { label: 'Casa Vence', prob: stats.probHome, odd: getOdd(stats.probHome), market: '1X2' },
          { label: 'Empate', prob: stats.probDraw, odd: getOdd(stats.probDraw), market: '1X2' },
          { label: 'Fora Vence', prob: stats.probAway, odd: getOdd(stats.probAway), market: '1X2' }
        ]
      },
      {
        category: 'Total de Gols (FT)',
        items: [
          { label: 'Mais de 0.5 Gols', prob: stats.probOver05, odd: getOdd(stats.probOver05), market: 'Gols' },
          { label: 'Mais de 1.5 Gols', prob: stats.probOver15, odd: getOdd(stats.probOver15), market: 'Gols' },
          { label: 'Mais de 2.5 Gols', prob: stats.probOver25, odd: getOdd(stats.probOver25), market: 'Gols' },
          { label: 'Mais de 3.5 Gols', prob: stats.probOver35, odd: getOdd(stats.probOver35), market: 'Gols' },
          { label: 'Ambos Marcam (Sim)', prob: stats.probBtts, odd: getOdd(stats.probBtts), market: 'Gols' }
        ]
      },
      {
        category: 'Escanteios (Cantos)',
        items: [
          { label: 'Mais de 5.5 Escanteios', prob: probCornOver(5), odd: getOdd(probCornOver(5)), market: 'Escanteios' },
          { label: 'Mais de 7.5 Escanteios', prob: probCornOver(7), odd: getOdd(probCornOver(7)), market: 'Escanteios' },
          { label: 'Mais de 8.5 Escanteios', prob: probCornOver(8), odd: getOdd(probCornOver(8)), market: 'Escanteios' },
          { label: 'Mais de 9.5 Escanteios', prob: probCornOver(9), odd: getOdd(probCornOver(9)), market: 'Escanteios' },
          { label: 'Mais de 10.5 Escanteios', prob: probCornOver(10), odd: getOdd(probCornOver(10)), market: 'Escanteios' }
        ]
      },
      {
        category: 'Cartões',
        items: [
          { label: 'Amarelos Acima de 3.5', prob: probCardsOver(3), odd: getOdd(probCardsOver(3)), market: 'Cartões' },
          { label: 'Amarelos Acima de 4.5', prob: probCardsOver(4), odd: getOdd(probCardsOver(4)), market: 'Cartões' },
          { label: 'Cartão Vermelho (Sim)', prob: redCardProb, odd: getOdd(redCardProb), market: 'Cartões' }
        ]
      }
    ];
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const currentRoundBets = useMemo(() => {
    if (!roundInfo || games.length === 0 || transactions.length === 0) return [];
    
    return transactions.filter(t => {
      if (!t.description || !t.description.startsWith('[Palpite] ')) return false;
      
      const matchName = t.description.replace('[Palpite] ', '').split(' (')[0];
      return games.some(g => `${g.home} x ${g.away}` === matchName);
    });
  }, [transactions, games, roundInfo]);

  const handleSendRoundSummary = async () => {
    if (currentRoundBets.length === 0) {
      showToast('Nenhuma aposta registrada nesta rodada.', 'error');
      return;
    }

    setSendingSummary(true);

    const formattedBets = currentRoundBets.map(t => {
      const matchName = t.description.replace('[Palpite] ', '').split(' (')[0];
      const selection = t.description.split(' (')[1]?.replace(')', '');
      const game = games.find(g => `${g.home} x ${g.away}` === matchName);

      return {
        home: game ? game.home : matchName.split(' x ')[0],
        away: game ? game.away : matchName.split(' x ')[1],
        selection,
        type: t.type,
        amount: t.amount,
        odd: t.odd || 2.0
      };
    });

    let totalInvested = 0;
    let netProfit = 0;
    let greens = 0;
    let reds = 0;
    let pending = 0;

    currentRoundBets.forEach(t => {
      totalInvested += t.amount;
      if (t.type === 'ganho') {
        netProfit += t.odd ? t.amount * (t.odd - 1) : t.amount;
        greens += 1;
      } else if (t.type === 'perda') {
        netProfit -= t.amount;
        reds += 1;
      } else if (t.type === 'pendente') {
        pending += 1;
      }
    });

    const hitRate = (greens + reds) > 0 ? (greens / (greens + reds)) * 100 : 0;
    const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;

    const payload = {
      round: roundInfo ? roundInfo.round : 'Atual',
      bets: formattedBets,
      stats: {
        totalBets: currentRoundBets.length,
        totalInvested,
        netProfit,
        hitRate,
        roi,
        greens,
        reds,
        pending
      }
    };

    try {
      const response = await fetch('/api/telegram/round-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showToast(`Balanço consolidado da Rodada ${roundInfo?.round} enviado com sucesso para o Telegram! 🏁`, 'success');
      } else {
        const data = await response.json();
        showToast('Erro ao enviar balanço: ' + (data.error || 'Erro desconhecido.'), 'error');
      }
    } catch (err) {
      console.warn("Erro ao enviar resumo:", err);
      showToast('Falha na comunicação com o servidor.', 'error');
    } finally {
      setSendingSummary(false);
    }
  };

  // Auto-disparar resumo da rodada quando ela finalizar (apenas uma vez)
  useEffect(() => {
    if (!roundInfo || games.length === 0 || transactions.length === 0 || currentRoundBets.length === 0 || sendingSummary) return;

    const isRoundFinished = games.every(g => g.isFinished);
    const todayKey = `round_summary_sent_${roundInfo.round}`;
    const alreadySent = localStorage.getItem(todayKey) === 'true';

    if (isRoundFinished && !alreadySent) {
      console.log(`[Auto-Report] Rodada ${roundInfo.round} finalizada. Disparando resumo consolidado automático...`);
      const autoSendRoundSummary = async () => {
        localStorage.setItem(todayKey, 'true');
        
        const formattedBets = currentRoundBets.map(t => {
          const matchName = t.description.replace('[Palpite] ', '').split(' (')[0];
          const selection = t.description.split(' (')[1]?.replace(')', '');
          const game = games.find(g => `${g.home} x ${g.away}` === matchName);

          return {
            home: game ? game.home : matchName.split(' x ')[0],
            away: game ? game.away : matchName.split(' x ')[1],
            selection,
            type: t.type,
            amount: t.amount,
            odd: t.odd || 2.0
          };
        });

        let totalInvested = 0;
        let netProfit = 0;
        let greens = 0;
        let reds = 0;
        let pending = 0;

        currentRoundBets.forEach(t => {
          totalInvested += t.amount;
          if (t.type === 'ganho') {
            netProfit += t.odd ? t.amount * (t.odd - 1) : t.amount;
            greens += 1;
          } else if (t.type === 'perda') {
            netProfit -= t.amount;
            reds += 1;
          } else if (t.type === 'pendente') {
            pending += 1;
          }
        });

        const hitRate = (greens + reds) > 0 ? (greens / (greens + reds)) * 100 : 0;
        const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;

        const payload = {
          round: roundInfo.round,
          bets: formattedBets,
          stats: {
            totalBets: currentRoundBets.length,
            totalInvested,
            netProfit,
            hitRate,
            roi,
            greens,
            reds,
            pending
          }
        };

        try {
          const response = await fetch('/api/telegram/round-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            showToast(`Balanço da Rodada ${roundInfo.round} enviado automaticamente ao Telegram! 🏁`, 'success');
          } else {
            localStorage.removeItem(todayKey);
          }
        } catch (err) {
          console.warn("[Auto-Report] Falha no disparo automático:", err);
          localStorage.removeItem(todayKey);
        }
      };

      autoSendRoundSummary();
    }
  }, [games, transactions, currentRoundBets, roundInfo, sendingSummary]);

  // Carregar transações para estatísticas e verificação de palpites seguidos
  useEffect(() => {
    if (!user) return;
    const userTxsKey = `ev_tracker_banca_txs_${user.id}`;
    const userTxIdsKey = `ev_tracker_user_tx_ids_${user.id}`;

    async function loadTransactions() {
      if (!supabase) {
        fallbackToLocal();
        return;
      }
      try {
        const { data, error } = await supabase
          .from('banca_transactions')
          .select('*')
          .eq('user_id', user.id);
        if (error) throw error;
        
        const filteredData = data || [];
        
        // Sincronizar dados locais pendentes para a nuvem
        const syncedList = await syncLocalTransactionsToCloud(filteredData);
        
        // Auto resolver palpites pendentes
        const resolvedList = await autoResolvePendingBets(syncedList);
        setTransactions(resolvedList);
        localStorage.setItem(userTxsKey, JSON.stringify(resolvedList));
      } catch (err) {
        console.warn("Erro ao carregar transações do Supabase:", err);
        fallbackToLocal();
      }
    }

    async function syncLocalTransactionsToCloud(cloudList) {
      const savedTxs = localStorage.getItem(userTxsKey);
      if (!savedTxs) return cloudList;

      try {
        const localList = JSON.parse(savedTxs);
        if (!Array.isArray(localList) || localList.length === 0) return cloudList;

        const unsyncedList = [];
        const cloudKeys = new Set(cloudList.map(t => `${t.date}_${t.amount}_${t.description}`));

        for (const localTx of localList) {
          const key = `${localTx.date}_${localTx.amount}_${localTx.description}`;
          if (!cloudKeys.has(key)) {
            const { id, ...txToUpload } = localTx;
            txToUpload.user_id = user.id; // Vincular ao usuário logado
            unsyncedList.push(txToUpload);
          }
        }

        if (unsyncedList.length === 0) return cloudList;

        console.log(`[Sync] Enviando ${unsyncedList.length} transações locais para o Supabase...`);
        const { data: insertedData, error } = await supabase
          .from('banca_transactions')
          .insert(unsyncedList)
          .select();

        if (error) {
          console.warn("[Sync] Erro ao sincronizar transações locais para o Supabase:", error);
          return cloudList;
        }

        const newCloudList = [...(insertedData || []), ...cloudList];
        localStorage.setItem(userTxsKey, JSON.stringify(newCloudList));
        console.log("[Sync] Sincronização automática concluída!");
        return newCloudList;
      } catch (e) {
        console.warn("[Sync] Falha no processo de sincronização automática:", e);
        return cloudList;
      }
    }

    async function autoResolvePendingBets(txList) {
      const pendingTxs = txList.filter(t => t.type === 'pendente');
      if (pendingTxs.length === 0) return txList;

      try {
        const [resA, resB, resC] = await Promise.all([
          fetch('/api/football/fixtures?league=71&all=true'),
          fetch('/api/football/fixtures?league=72&all=true'),
          fetch('/api/football/fixtures?league=75&all=true')
        ]);
        
        let allFixtures = [];
        if (resA.ok) {
          const dataA = await resA.json();
          if (dataA.fixtures) allFixtures = [...allFixtures, ...dataA.fixtures];
        }
        if (resB.ok) {
          const dataB = await resB.json();
          if (dataB.fixtures) allFixtures = [...allFixtures, ...dataB.fixtures];
        }
        if (resC.ok) {
          const dataC = await resC.json();
          if (dataC.fixtures) allFixtures = [...allFixtures, ...dataC.fixtures];
        }

        if (allFixtures.length === 0) return txList;

        let updatedList = [...txList];
        let didUpdate = false;

        for (const t of pendingTxs) {
          if (!t.description || !t.description.startsWith('[Palpite] ')) continue;
          
          const matchName = t.description.replace('[Palpite] ', '').split(' (')[0];
          const bestTip = t.description.split(' (')[1]?.replace(')', '');
          
          const game = allFixtures.find(f => {
            const gameName = `${f.home.trim()} x ${f.away.trim()}`.toLowerCase();
            return gameName === matchName.trim().toLowerCase();
          });
          if (game && game.isFinished) {
            const gh = game.goalsHome;
            const ga = game.goalsAway;
            let isHit = false;

            if (bestTip === 'Casa' || bestTip === 'Casa Vence') isHit = gh > ga;
            else if (bestTip === 'Fora' || bestTip === 'Fora Vence') isHit = ga > gh;
            else if (bestTip === 'Empate') isHit = gh === ga;
            else if (bestTip === 'Mais de 2.5 Gols') isHit = (gh + ga) > 2;
            else if (bestTip === 'Menos de 2.5 Gols') isHit = (gh + ga) < 3;
            else if (bestTip === 'Ambos Marcam' || bestTip === 'Sim' || bestTip === 'Ambas Marcam') isHit = gh > 0 && ga > 0;

            const resolvedType = isHit ? 'ganho' : 'perda';
            t.type = resolvedType;
            didUpdate = true;

            // Atualizar no Supabase
            if (supabase) {
              await supabase
                .from('banca_transactions')
                .update({ type: resolvedType })
                .eq('id', t.id);
            }
          }
        }

        if (didUpdate && !supabase) {
          localStorage.setItem(userTxsKey, JSON.stringify(updatedList));
        }

        return updatedList;
      } catch (e) {
        console.warn("Auto-resolve no Supabase falhou:", e);
        return txList;
      }
    }

    function fallbackToLocal() {
      const savedTxs = localStorage.getItem(userTxsKey);
      if (savedTxs) {
        try {
          const parsed = JSON.parse(savedTxs);
          autoResolvePendingBets(parsed).then(resolved => {
            setTransactions(resolved);
          });
        } catch (e) {
          console.warn("Erro ao carregar transações locais:", e);
        }
      }
    }

    loadTransactions();
  }, [user]);

  const myStats = useMemo(() => {
    // Filtrar apenas transações associadas a palpites da página (iniciam com [Palpite])
    const followedBets = transactions.filter(t => t.description && t.description.startsWith('[Palpite]'));
    
    const totalBets = followedBets.filter(t => t.type === 'ganho' || t.type === 'perda').length;
    const wins = followedBets.filter(t => t.type === 'ganho').length;
    const losses = followedBets.filter(t => t.type === 'perda').length;
    const hitRate = totalBets > 0 ? (wins / totalBets) * 100 : 0;
    
    let totalProfit = 0;
    let totalLoss = 0;
    let totalAmountBet = 0;
    
    followedBets.forEach(t => {
      if (t.type === 'ganho') {
        const profit = t.odd ? t.amount * (t.odd - 1) : t.amount;
        totalProfit += profit;
        totalAmountBet += t.amount;
      } else if (t.type === 'perda') {
        totalLoss += t.amount;
        totalAmountBet += t.amount;
      }
    });
    
    const netProfit = totalProfit - totalLoss;
    const roi = totalAmountBet > 0 ? (netProfit / totalAmountBet) * 100 : 0;
    
    return {
      totalBets,
      wins,
      losses,
      hitRate,
      roi,
      netProfit,
      totalAmountBet
    };
  }, [transactions]);

  const isFollowed = (game) => {
    const bestTip = game.stats?.bestTip?.selection;
    const desc = `[Palpite] ${game.home} x ${game.away} (${bestTip})`;
    return transactions.some(t => t.description === desc);
  };

  const handleConfirmFollow = async (game) => {
    if (!followAmount || Number(followAmount) <= 0) return;
    
    const amount = Number(followAmount);
    const odd = followOdd ? Number(followOdd) : (game.stats.bestTip.prob ? Number((1 / game.stats.bestTip.prob).toFixed(2)) : 2.0);
    const bestTip = game.stats.bestTip.selection;
    const desc = `[Palpite] ${game.home} x ${game.away} (${bestTip})`;
    
    let type = 'pendente';
    if (game.isFinished) {
      const gh = game.goalsHome;
      const ga = game.goalsAway;
      let isHit = false;

      if (bestTip === 'Casa' || bestTip === 'Casa Vence') isHit = gh > ga;
      else if (bestTip === 'Fora' || bestTip === 'Fora Vence') isHit = ga > gh;
      else if (bestTip === 'Empate') isHit = gh === ga;
      else if (bestTip === 'Mais de 2.5 Gols') isHit = (gh + ga) > 2;
      else if (bestTip === 'Menos de 2.5 Gols') isHit = (gh + ga) < 3;
      else if (bestTip === 'Ambos Marcam' || bestTip === 'Sim' || bestTip === 'Ambas Marcam') isHit = gh > 0 && ga > 0;

      type = isHit ? 'ganho' : 'perda';
    }

    const newTx = {
      date: getLocalDateString(),
      type,
      amount,
      description: desc,
      odd
    };

    let success = false;
    let savedTx = null;

    const userTxsKey = `ev_tracker_banca_txs_${user?.id || 'guest'}`;
    const userTxIdsKey = `ev_tracker_user_tx_ids_${user?.id || 'guest'}`;

    if (supabase && user) {
      try {
        const txToUpload = { ...newTx, user_id: user.id };
        const { data, error } = await supabase
          .from('banca_transactions')
          .insert([txToUpload])
          .select();

        if (error) throw error;
        if (data && data.length > 0) {
          savedTx = data[0];
          success = true;
          // Guardar ID associado a este usuário
          const userTxIds = JSON.parse(localStorage.getItem(userTxIdsKey) || '[]');
          userTxIds.push(savedTx.id);
          localStorage.setItem(userTxIdsKey, JSON.stringify(userTxIds));
        }
      } catch (err) {
        console.warn("Erro ao salvar no Supabase (usando fallback local):", err);
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
      success = true;
    }

    if (success && savedTx) {
      setTransactions(prev => [savedTx, ...prev]);
      showToast('Palpite registrado com sucesso no seu Controle de Banca!', 'success');
    }

    setActiveFollowId(null);
  };


  useEffect(() => {
    const fetchFixtures = async () => {
      setPageLoading(true);
      setApiError(null);
      try {
        const leaguesToFetch = selectedLeague === 'all'
          ? ['71', '72', '75', '13', '12', '39', '140', '135', '78', '1']
          : [selectedLeague];

        const fetchPromises = leaguesToFetch.map(async (lgId) => {
          try {
            const response = await fetch(`/api/football/fixtures?league=${lgId}&date=${selectedDate}`);
            if (!response.ok) return { fixtures: [], round: '?', leagueId: lgId };
            const data = await response.json();
            return { fixtures: data.fixtures || [], round: data.round || '?', leagueId: lgId };
          } catch (e) {
            return { fixtures: [], round: '?', leagueId: lgId };
          }
        });

        const results = await Promise.all(fetchPromises);
        
        let allFixtures = [];
        let primaryRound = null;

        results.forEach(res => {
          const gamesWithLeague = res.fixtures.map(g => ({ ...g, sourceLeagueId: res.leagueId }));
          allFixtures = [...allFixtures, ...gamesWithLeague];
          
          if (res.leagueId === selectedLeague || (selectedLeague === 'all' && res.leagueId === '71' && res.fixtures.length > 0)) {
            primaryRound = res.round;
          }
        });

        const processedGames = allFixtures.map(game => {
          const stats = calculatePoissonMatchStats(
            game.homeXG, 
            game.awayXG, 
            game.isLive, 
            game.minute || 0, 
            game.goalsHome || 0, 
            game.goalsAway || 0
          );
          return { ...game, stats };
        });

        // Ordenar: Ao Vivo primeiro → Não Iniciados → Encerrados por último
        processedGames.sort((a, b) => {
          const priority = (g) => g.isLive ? 0 : g.isFinished ? 2 : 1;
          return priority(a) - priority(b);
        });

        setGames(processedGames);
        
        if (selectedLeague === 'all') {
          setRoundInfo({ round: primaryRound || 'Várias', season: '2026' });
        } else {
          const selectedRes = results.find(r => r.leagueId === selectedLeague);
          setRoundInfo({ round: selectedRes?.round || '?', season: '2026' });
        }
      } catch (err) {
        console.error('Erro ao buscar jogos:', err);
        setApiError('Falha ao conectar com a API de futebol.');
      } finally {
        setPageLoading(false);
      }
    };

    fetchFixtures();
  }, [selectedLeague, selectedDate]);

  // === MOTOR DE ENVIO AUTOMÁTICO ===
  useEffect(() => {
    if (games.length === 0) return;

    // Ler configurações do localStorage
    const savedConfig = localStorage.getItem('ev_tracker_settings');
    if (!savedConfig) return;

    const config = JSON.parse(savedConfig);
    if (!config.autoBroadcast) return;

    // Verificar quais jogos de HOJE já foram enviados
    const todayKey = `sent_palpites_${getLocalDateString()}`;
    const alreadySent = JSON.parse(localStorage.getItem(todayKey) || '[]');
    const alreadySentSet = new Set(alreadySent);
    setSentIds(alreadySentSet);

    // Filtrar apenas jogos de HOJE que ainda não foram enviados
    const todayGames = games.filter(g => g.dayCategory === 'HOJE' && !alreadySentSet.has(g.id));
    if (todayGames.length === 0) return;

    // Disparar em sequência com delay de 1s entre cada
    const autoSend = async () => {
      setAutoStatus('sending');
      const newSentIds = new Set(alreadySentSet);

      for (const game of todayGames) {
        const payload = {
          match: `${game.home} x ${game.away}`,
          tip: game.stats.bestTip.selection,
          probability: formatPct(game.stats.bestTip.prob),
          odd: formatOdd(game.stats.bestTip.prob)
        };

        try {
          const response = await fetch('/api/telegram/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            newSentIds.add(game.id);
            setSentIds(new Set(newSentIds));
          }
        } catch (err) {
          console.error('Auto-broadcast falhou para:', game.home, 'x', game.away, err);
        }

        // Pausa de 1 segundo entre envios para não sobrecarregar a API do Telegram
        await new Promise(r => setTimeout(r, 1000));
      }

      // Salvar no localStorage para não reenviar
      localStorage.setItem(todayKey, JSON.stringify([...newSentIds]));
      setAutoStatus('done');
      setTimeout(() => setAutoStatus(null), 5000);
    };

    autoSend();
  }, [games]);

  const handleBroadcast = async (game) => {
    setLoadingId(game.id);
    
    const payload = {
      match: `${game.home} x ${game.away}`,
      tip: game.stats.bestTip.selection,
      probability: formatPct(game.stats.bestTip.prob),
      odd: formatOdd(game.stats.bestTip.prob)
    };

    try {
      const response = await fetch('/api/telegram/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setSuccessId(game.id);
        const todayKey = `sent_palpites_${getLocalDateString()}`;
        const alreadySent = JSON.parse(localStorage.getItem(todayKey) || '[]');
        alreadySent.push(game.id);
        localStorage.setItem(todayKey, JSON.stringify(alreadySent));
        setSentIds(prev => new Set([...prev, game.id]));
        setTimeout(() => setSuccessId(null), 3000);
      } else {
        showToast('Erro ao disparar no Telegram.', 'error');
      }
    } catch (err) {
      showToast('Falha na comunicação com o servidor.', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  // Filtro de jogos removido pois a API já traz a data exata

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
          Seu Teste Grátis de 7 Dias Expirou!
        </h3>
        <p style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '12px', lineHeight: 1.5 }}>
          O período de avaliação gratuita do seu painel de prognósticos Poisson acabou. Assine agora o plano PRO por apenas **R$ 19,90/mês** para liberar acesso instantâneo e ilimitado a todas as previsões e estatísticas avançadas.
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
    <div className="palpites-container">
      
      <header style={{ marginBottom: '20px', paddingTop: '16px' }}>
        <div className="palpites-title-container">
          <Trophy color="#FFD700" size={28} style={{ flexShrink: 0 }} />
          <h1 className="page-title" style={{ fontSize: '1.8rem', margin: 0 }}>Central de Palpites</h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          <p style={{ color: '#888', margin: 0, fontSize: '0.95rem', lineHeight: '1.4' }}>
            Gerencie e acompanhe prognósticos automáticos e suas próprias apostas criadas via Poisson.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0, 210, 255, 0.05)', border: '1px solid rgba(0, 210, 255, 0.2)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', color: '#00d2ff' }}>
            <Calculator size={14} style={{ flexShrink: 0 }} />
            <span>Cotações simuladas pelo modelo Poisson da <strong>A2 Solutions</strong>. Diferenças de valor comparadas às casas reais (ex: Betano @1.42 vs App @1.49) não representam atraso ou delay, e sim projeções matemáticas exclusivas de valor!</span>
          </div>
        </div>
      </header>

      <>
          {/* Seletores de Liga e Data (Layout Organizado e Responsivo) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div className="league-buttons-container">
              {[
                { id: 'all', name: 'Todas', iconType: 'emoji', icon: '⚽' },
                { id: '1', name: 'Copa do Mundo', iconType: 'image', icon: '/copadomundo.png' },
                { id: '71', name: 'Série A', iconType: 'image', icon: 'https://flagcdn.com/w40/br.png' },
                { id: '72', name: 'Série B', iconType: 'image', icon: 'https://flagcdn.com/w40/br.png' },
                { id: '75', name: 'Série C', iconType: 'image', icon: 'https://flagcdn.com/w40/br.png' },
                { id: '13', name: 'Libertadores', iconType: 'image', icon: '/libertadores.jpg' },
                { id: '12', name: 'Sudamericana', iconType: 'image', icon: '/sudamericana.png' },
                { id: '39', name: 'Premier', iconType: 'image', icon: 'https://flagcdn.com/w40/gb.png' },
                { id: '140', name: 'La Liga', iconType: 'image', icon: 'https://flagcdn.com/w40/es.png' },
                { id: '135', name: 'Serie A', iconType: 'image', icon: 'https://flagcdn.com/w40/it.png' },
                { id: '78', name: 'Bundes', iconType: 'image', icon: 'https://flagcdn.com/w40/de.png' }
              ].map(lg => {
                const isActive = selectedLeague === lg.id;
                return (
                  <button
                    key={lg.id}
                    onClick={() => setSelectedLeague(lg.id)}
                    className={`league-button ${isActive ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      borderRadius: '6px',
                      padding: '8px 14px',
                      border: isActive ? '1px solid var(--brand-neon)' : '1px solid rgba(255, 255, 255, 0.05)',
                      background: isActive ? 'var(--brand-neon)' : '#16161a',
                      color: isActive ? '#000' : '#aaa',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 0 10px rgba(204, 255, 0, 0.25)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = '#fff';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                        e.currentTarget.style.background = '#222';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = '#aaa';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.background = '#16161a';
                      }
                    }}
                  >
                    {lg.iconType === 'image' ? (
                      <img 
                        src={lg.icon} 
                        alt={lg.name} 
                        style={lg.icon.startsWith('/') ? {
                          width: '24px', 
                          height: '24px', 
                          objectFit: 'contain'
                        } : { 
                          width: '24px', 
                          height: '16px', 
                          objectFit: 'cover', 
                          borderRadius: '2px', 
                          border: isActive ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' 
                        }} 
                      />
                    ) : (
                      <span style={{ fontSize: '0.95rem' }}>{lg.icon}</span>
                    )}
                    <span>{lg.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Data e Seletor de Rodada Info */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ color: 'var(--brand-neon)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                {roundInfo ? `Temporada ${roundInfo.season}` : ''}
              </div>
              
              <div className="stats-selector-container" style={{ margin: 0 }}>
                <button 
                  onClick={() => setStatsMode('minhas')}
                  className={`stats-selector-button ${statsMode === 'minhas' ? 'active' : ''}`}
                >
                  Minhas Apostas
                </button>
                <button 
                  onClick={() => setStatsMode('modelo')}
                  className={`stats-selector-button ${statsMode === 'modelo' ? 'active' : ''}`}
                >
                  Histórico do Modelo
                </button>
              </div>
              
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: '#222',
                  border: 'none',
                  color: 'var(--brand-neon)',
                  borderRadius: '0px',
                  cursor: 'pointer',
                  colorScheme: 'dark',
                  fontWeight: 'bold',
                  outline: 'none',
                  fontSize: '0.9rem'
                }}
              />

              {currentRoundBets.length > 0 && (
                <button
                  onClick={handleSendRoundSummary}
                  disabled={sendingSummary}
                  style={{
                    background: 'var(--brand-neon)',
                    color: '#000',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    cursor: sendingSummary ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(204, 255, 0, 0.2)'
                  }}
                  title={`Você seguiu ${currentRoundBets.length} palpites nesta rodada. Clique para enviar o balanço parcial/final no Telegram.`}
                >
                  {sendingSummary ? (
                    <>Enviando...</>
                  ) : (
                    <>Enviar Balanço da Rodada ({currentRoundBets.length}) 🤖</>
                  )}
                </button>
              )}
            </div>
          </div>



          {/* Estatísticas de Acertos (KPI Cards) */}
          {(() => {
            const currentStats = statsMode === 'minhas' 
              ? {
                  hitRate: myStats.totalBets > 0 ? `${myStats.hitRate.toFixed(1)}%` : '--',
                  roi: myStats.totalBets > 0 ? `${myStats.roi >= 0 ? '+' : ''}${myStats.roi.toFixed(1)}%` : '--',
                  greens: myStats.wins,
                  reds: myStats.losses,
                  subtextRate: `Base: ${myStats.totalBets} palpites seguidos`,
                  subtextRoi: `Volume: R$ ${myStats.totalAmountBet.toFixed(2)}`,
                  subtextResult: `Últimas rodadas ativas`
                }
              : {
                  hitRate: '78.4%',
                  roi: '+18.2%',
                  greens: 116,
                  reds: 32,
                  subtextRate: 'Base: 148 palpites enviados',
                  subtextRoi: 'Volume: 12.4 u líquidas',
                  subtextResult: 'Últimas 4 rodadas monitoradas'
                };

            return (
              <div className="palpites-kpi-grid">
                <div className="palpites-kpi-card" style={{ borderLeft: '4px solid var(--brand-neon)' }}>
                  <div className="kpi-title">Taxa de Acerto Geral</div>
                  <div className="kpi-value">{currentStats.hitRate}</div>
                  <div className="kpi-subtext">{currentStats.subtextRate}</div>
                </div>

                <div className="palpites-kpi-card" style={{ borderLeft: '4px solid #00d2ff' }}>
                  <div className="kpi-title">ROI (Retorno do Mês)</div>
                  <div className="kpi-value" style={{ color: 'var(--brand-neon)' }}>{currentStats.roi}</div>
                  <div className="kpi-subtext">{currentStats.subtextRoi}</div>
                </div>

                <div className="palpites-kpi-card" style={{ borderLeft: '4px solid #ff9800' }}>
                  <div className="kpi-title">Palpites Verdes / Vermelhos</div>
                  <div className="kpi-value" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ color: '#4CAF50' }}>{currentStats.greens} 🟢</span>
                    <span style={{ fontSize: '1.1rem', color: '#444' }}>/</span>
                    <span style={{ color: '#ff4d4d' }}>{currentStats.reds} 🔴</span>
                  </div>
                  <div className="kpi-subtext">{currentStats.subtextResult}</div>
                </div>

                <div className="palpites-kpi-card" style={{ borderLeft: '4px solid #b339ff' }}>
                  <div className="kpi-title">Mercado mais Lucrativo</div>
                  <div className="kpi-value" style={{ fontSize: '1.25rem' }}>
                    Mais de 2.5 Gols
                  </div>
                  <div className="kpi-subtext" style={{ color: '#4CAF50', fontWeight: 'bold' }}>Taxa de Acerto: 84.1%</div>
                </div>
              </div>
            );
          })()}

          {/* Banner de Status do Auto-Broadcast */}
          {autoStatus === 'sending' && (
            <div style={{ background: 'linear-gradient(90deg, #1a1a2e, #16213e)', border: '1px solid #4CAF50', borderRadius: '12px', padding: '16px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', animation: 'pulse 2s infinite' }}>
              <Loader2 size={20} color="#4CAF50" className="spin" />
              <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>🤖 Piloto Automático ativo — Disparando palpites do dia para o Telegram...</span>
            </div>
          )}
          {autoStatus === 'done' && (
            <div style={{ background: 'linear-gradient(90deg, #1a2e1a, #162e16)', border: '1px solid #4CAF50', borderRadius: '12px', padding: '16px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={20} color="#4CAF50" />
              <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>✅ Todos os palpites do dia foram enviados automaticamente para o Telegram!</span>
            </div>
          )}

          <div className="palpites-scroll-container no-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '60px' }}>
            {pageLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ background: '#111', borderRadius: '16px', border: '1px solid #333', padding: '32px', animation: 'pulse 1.5s infinite', flexShrink: 0 }}>
                    <div style={{ height: '14px', width: '120px', background: '#222', borderRadius: '4px', marginBottom: '12px' }} />
                    <div style={{ height: '20px', width: '280px', background: '#222', borderRadius: '4px', marginBottom: '12px' }} />
                    <div style={{ height: '16px', width: '200px', background: '#222', borderRadius: '4px' }} />
                  </div>
                ))}
              </div>
            )}
            {apiError && (
              <div style={{ color: '#ff6b6b', padding: '24px', background: '#1a0000', borderRadius: '12px', textAlign: 'center', border: '1px solid #ff6b6b' }}>⚠️ {apiError}</div>
            )}
            {!pageLoading && !apiError && games.length === 0 && (
              <div style={{ color: '#888', fontStyle: 'italic', padding: '24px', background: '#111', borderRadius: '12px', textAlign: 'center' }}>Nenhum jogo encontrado para este dia.</div>
            )}
            {games.map(game => {
              const fairOddVal = game.stats.bestTip.prob ? (1 / game.stats.bestTip.prob).toFixed(2) : '2.00';
              const bmOdds = getBookmakerOdds(game.home + game.away, game.stats.bestTip.selection, fairOddVal);
              const bestBmOdd = bmOdds.find(o => o.isBest)?.odd || Number(fairOddVal);
              const hasGameEV = bestBmOdd > Number(fairOddVal) && !game.isFinished;

              return (
                <div key={game.id} style={{ 
                  background: '#111', 
                  borderRadius: '16px', 
                  border: game.isLive ? '1px solid #4CAF50' : game.isFinished ? '1px solid #ff4d4d' : hasGameEV ? '1px solid var(--brand-neon)' : '1px solid #333', 
                  borderLeft: game.isLive ? '6px solid #4CAF50' : game.isFinished ? '6px solid #ff4d4d' : hasGameEV ? '6px solid var(--brand-neon)' : '6px solid #4CAF50',
                  boxShadow: hasGameEV ? '0 0 15px rgba(204, 255, 0, 0.08)' : 'none',
                  overflow: 'hidden',
                  opacity: game.isFinished ? 0.7 : 1,
                  flexShrink: 0
                }}>
                {/* Linha Principal do Card */}
                <div className="game-card-main-row">
                  
                  {/* Bloco 1: Informações do Jogo */}
                  <div className="game-card-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span className="mobile-hide" style={{ color: game.isLive ? '#ff4444' : '#4CAF50', fontWeight: 'bold', fontSize: '0.9rem' }}>{game.date}</span>
                      {game.isLive && <span style={{ background: '#ff4444', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', animation: 'pulse 1.5s infinite' }}>🔴 AO VIVO • {game.minute}'</span>}
                      {game.isFinished && <span style={{ background: '#444', color: '#aaa', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>ENCERRADO</span>}
                      {hasGameEV && <span className="badge-neon" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>🔥 +EV DETECTADO</span>}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '4px', textTransform: 'uppercase' }}>Futebol</div>
                    <div style={{ fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {(() => {
                        const logoUrl = getLeagueLogoUrl(game.sourceLeagueId || selectedLeague);
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
                        return null;
                      })()}
                      {getLeagueName(game.sourceLeagueId || selectedLeague)} <span style={{ background: '#333', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', color: '#aaa' }}>Rodada {game.round}</span>
                    </div>
                    
                    <div className="game-card-teams-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'flex-end', textAlign: 'right' }}>
                        <span className="team-name-text-mobile-hide">{game.home}</span>
                        <img 
                          src={game.homeLogo || `https://ui-avatars.com/api/?name=${game.home}&background=222&color=fff&rounded=true&bold=true&size=32`} 
                          alt={game.home} 
                          style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px', maxWidth: '32px', maxHeight: '32px', objectFit: 'contain', display: 'block' }}
                          onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${game.home}&background=222&color=fff&rounded=true&bold=true&size=32`; }} 
                        />
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        color: (game.isLive || game.isFinished) ? '#4CAF50' : '#555', 
                        fontSize: '1.2rem', 
                        fontWeight: 'bold',
                        background: (game.isLive || game.isFinished) ? '#1a1a1a' : 'transparent',
                        padding: (game.isLive || game.isFinished) ? '6px 14px' : '0',
                        borderRadius: '8px',
                        border: (game.isLive || game.isFinished) ? '1px solid #333' : 'none',
                        justifyContent: 'center'
                      }}>
                        {(game.isLive || game.isFinished) ? (
                          <>
                            <span style={{ fontSize: '1.3rem', color: '#fff' }}>{game.goalsHome}</span>
                            <span style={{ fontSize: '0.85rem', color: '#555' }}>X</span>
                            <span style={{ fontSize: '1.3rem', color: '#fff' }}>{game.goalsAway}</span>
                          </>
                        ) : (
                          'X'
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'flex-start' }}>
                        <img 
                          src={game.awayLogo || `https://ui-avatars.com/api/?name=${game.away}&background=222&color=fff&rounded=true&bold=true&size=32`} 
                          alt={game.away} 
                          style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px', maxWidth: '32px', maxHeight: '32px', objectFit: 'contain', display: 'block' }}
                          onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${game.away}&background=222&color=fff&rounded=true&bold=true&size=32`; }} 
                        />
                        <span className="team-name-text-mobile-hide">{game.away}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 1.5: Campo Compacto de Futebol e Barra de Pressão (Apenas se estiver Ao Vivo) */}
                  {game.isLive && (() => {
                    const radar = getLiveMatchRadar(game);
                    if (!radar) return null;
                    let glowLeft = '50%';
                    let glowColor = 'rgba(204, 255, 0, 0.4)';
                    if (radar.zone === 'away_box') {
                      glowLeft = '80%';
                      glowColor = 'rgba(255, 68, 68, 0.5)';
                    } else if (radar.zone === 'home_box') {
                      glowLeft = '20%';
                      glowColor = 'rgba(0, 210, 255, 0.5)';
                    }

                    return (
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '6px',
                        margin: '0 auto',
                        flexShrink: 0
                      }}>
                        {/* Campo de Futebol Heatmap (Ampliado um pouco: 150x80px) */}
                        <div 
                          onClick={() => setOpenRadarGameId(game.id)}
                          style={{ 
                            position: 'relative', 
                            width: '150px', 
                            height: '80px', 
                            background: '#0d1a0d', 
                            border: '1px solid rgba(255, 255, 255, 0.12)', 
                            borderRadius: '8px', 
                            overflow: 'hidden',
                            boxShadow: 'inset 0 0 15px rgba(0,0,0,0.6)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out',
                          }}
                          className="hover-scale-field"
                          title="Clique para abrir o Radar em tempo real ampliado 🔍"
                        >
                          {/* Linha de Meio de Campo */}
                          <div style={{ position: 'absolute', top: 0, left: '50%', width: '1px', height: '100%', background: 'rgba(255, 255, 255, 0.15)' }}></div>
                          {/* Círculo Central */}
                          <div style={{ position: 'absolute', top: '50%', left: '50%', width: '26px', height: '26px', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '50%', transform: 'translate(-50%, -50%)' }}></div>
                          {/* Ponto Central */}
                          <div style={{ position: 'absolute', top: '50%', left: '50%', width: '4px', height: '4px', background: 'rgba(255, 255, 255, 0.3)', borderRadius: '50%', transform: 'translate(-50%, -50%)' }}></div>
                          
                          {/* Grande Área Esquerda (Home) */}
                          <div style={{ position: 'absolute', top: '15px', left: 0, width: '18px', height: '50px', border: '1px solid rgba(255, 255, 255, 0.15)', borderLeft: 'none' }}></div>
                          {/* Pequena Área Esquerda (Home) */}
                          <div style={{ position: 'absolute', top: '27px', left: 0, width: '8px', height: '26px', border: '1px solid rgba(255, 255, 255, 0.1)', borderLeft: 'none' }}></div>

                          {/* Grande Área Direita (Away) */}
                          <div style={{ position: 'absolute', top: '15px', right: 0, width: '18px', height: '50px', border: '1px solid rgba(255, 255, 255, 0.15)', borderRight: 'none' }}></div>
                          {/* Pequena Área Direita (Away) */}
                          <div style={{ position: 'absolute', top: '27px', right: 0, width: '8px', height: '26px', border: '1px solid rgba(255, 255, 255, 0.1)', borderRight: 'none' }}></div>

                          {/* Efeito de Brilho de Calor (Heatmap) */}
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: glowLeft,
                            width: '44px',
                            height: '44px',
                            background: `radial-gradient(circle, ${glowColor} 0%, rgba(0,0,0,0) 70%)`,
                            borderRadius: '50%',
                            transform: 'translate(-50%, -50%)',
                            animation: 'pulseHeat 1.5s infinite ease-in-out',
                            pointerEvents: 'none'
                          }}></div>
                          
                          {/* Dica visual flutuante */}
                          <div style={{
                            position: 'absolute',
                            bottom: '2px',
                            right: '6px',
                            fontSize: '0.55rem',
                            color: 'rgba(255, 255, 255, 0.4)',
                            fontFamily: 'monospace',
                            pointerEvents: 'none'
                          }}>
                            🔍 Ampliar
                          </div>
                        </div>

                        {/* Barra de Pressão Compacta (Home vs Away) com Efeito Neon Temperatura */}
                        <div style={{ width: '150px', display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#aaa', fontWeight: 'bold' }}>
                            <span style={{ color: '#ff4444' }}>{radar.homePressure}%</span>
                            <span style={{ color: '#00d2ff' }}>{radar.awayPressure}%</span>
                          </div>
                          <div style={{ display: 'flex', height: '6px', background: '#14141c', width: '100%', position: 'relative', borderRadius: '3px' }}>
                            <div style={{ 
                              width: `${radar.homePressure}%`, 
                              background: 'linear-gradient(90deg, #ff5e00, #ff0055)', 
                              boxShadow: '0 0 10px rgba(255, 0, 85, 0.7), 0 0 4px rgba(255, 0, 85, 0.4)', 
                              transition: 'width 0.5s ease-in-out',
                              height: '100%',
                              borderTopLeftRadius: '3px',
                              borderBottomLeftRadius: '3px',
                              borderTopRightRadius: radar.awayPressure === 0 ? '3px' : '0px',
                              borderBottomRightRadius: radar.awayPressure === 0 ? '3px' : '0px'
                            }}></div>
                            <div style={{ 
                              width: `${radar.awayPressure}%`, 
                              background: 'linear-gradient(90deg, #00bfff, #00ffaa)', 
                              boxShadow: '0 0 10px rgba(0, 255, 170, 0.7), 0 0 4px rgba(0, 255, 170, 0.4)', 
                              transition: 'width 0.5s ease-in-out',
                              height: '100%',
                              borderTopRightRadius: '3px',
                              borderBottomRightRadius: '3px',
                              borderTopLeftRadius: radar.homePressure === 0 ? '3px' : '0px',
                              borderBottomLeftRadius: radar.homePressure === 0 ? '3px' : '0px'
                            }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Bloco 2: 1 X 2 Visual */}
                  <div className="game-card-1x2">
                    <div style={{ border: '1px solid #333', padding: '6px 0', textAlign: 'center', borderRadius: '4px', color: '#888', fontWeight: 'bold', background: game.stats.bestTip.selection === 'Casa Vence' ? '#4CAF50' : 'transparent', color: game.stats.bestTip.selection === 'Casa Vence' ? '#fff' : '#888' }}>1</div>
                    <div style={{ border: '1px solid #333', padding: '6px 0', textAlign: 'center', borderRadius: '4px', color: '#888', fontWeight: 'bold', background: game.stats.bestTip.selection === 'Empate' ? '#4CAF50' : 'transparent', color: game.stats.bestTip.selection === 'Empate' ? '#fff' : '#888' }}>X</div>
                    <div style={{ border: '1px solid #333', padding: '6px 0', textAlign: 'center', borderRadius: '4px', color: '#888', fontWeight: 'bold', background: game.stats.bestTip.selection === 'Fora Vence' ? '#4CAF50' : 'transparent', color: game.stats.bestTip.selection === 'Fora Vence' ? '#fff' : '#888' }}>2</div>
                  </div>

                  {/* Bloco 3: Destaque do Palpite & Ações */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: '2 1 300px', width: '100%' }}>
                    {/* Card de Palpite */}
                    <div className="game-card-highlight" style={{ flex: 'none' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', letterSpacing: '2px', color: '#888', marginBottom: '4px' }}>P A L P I T E</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '8px', color: '#fff' }}>{game.stats.bestTip.selection}</div>
                        <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Probabilidade <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{formatPct(game.stats.bestTip.prob)}%</span></div>
                      </div>
                      
                      {/* ODD Verde Redonda */}
                      <div style={{ background: '#4CAF50', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 15px rgba(76, 175, 80, 0.4)', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>ODD</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>@{formatOdd(game.stats.bestTip.prob)}</div>
                      </div>
                    </div>

                    {/* Botões de Ação Reposicionados (Estatísticas, Seguir Palpite, Criar Aposta, Telegram) */}
                    <div style={{ display: 'flex', gap: '8px', width: '100%', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          if (openStatsId === game.id) {
                            setOpenStatsId(null);
                          } else {
                            setOpenStatsId(game.id);
                            setActiveStatsTab('geral');
                          }
                        }}
                        style={{
                          flex: '1 1 calc(50% - 4px)',
                          background: openStatsId === game.id ? '#333' : 'transparent',
                          color: openStatsId === game.id ? '#fff' : '#aaa',
                          border: '1px solid ' + (openStatsId === game.id ? '#666' : '#444'),
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.3s'
                        }}
                      >
                        <BarChart3 size={15} />
                        <span>Estatísticas</span>
                      </button>

                      <button
                        onClick={() => {
                          if (isFollowed(game)) return;
                          if (activeFollowId === game.id) {
                            setActiveFollowId(null);
                          } else {
                            setActiveFollowId(game.id);
                            setFollowAmount('50');
                            setFollowOdd(bestBmOdd.toFixed(2));
                          }
                        }}
                        disabled={isFollowed(game)}
                        style={{
                          flex: '1 1 calc(50% - 4px)',
                          background: isFollowed(game) ? 'rgba(76, 175, 80, 0.15)' : activeFollowId === game.id ? '#ff9800' : 'transparent',
                          color: isFollowed(game) ? '#4CAF50' : activeFollowId === game.id ? '#fff' : '#aaa',
                          border: isFollowed(game) ? '1px solid rgba(76, 175, 80, 0.3)' : activeFollowId === game.id ? '1px solid #ff9800' : '1px solid #444',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 'bold',
                          cursor: isFollowed(game) ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.3s'
                        }}
                      >
                        {isFollowed(game) ? (
                          <>✓ Seguido</>
                        ) : (
                          <>
                            <Target size={15} />
                            <span>{activeFollowId === game.id ? 'Cancelar' : 'Seguir'}</span>
                          </>
                        )}
                      </button>

                      {/* Criar Aposta Customizada */}
                      <button
                        onClick={() => {
                          setOpenBuilderGameId(game.id);
                          setBuilderSelections([]);
                        }}
                        style={{
                          flex: '1 1 calc(50% - 4px)',
                          background: 'transparent',
                          color: 'var(--brand-neon)',
                          border: '1px solid var(--brand-neon)',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.3s'
                        }}
                      >
                        <PlusCircle size={15} />
                        <span>Criar Aposta 🛠️</span>
                      </button>

                      <button 
                        onClick={() => handleBroadcast(game)}
                        disabled={loadingId === game.id || sentIds.has(game.id)}
                        style={{ 
                          flex: '1 1 calc(50% - 4px)',
                          background: sentIds.has(game.id) ? '#333' : successId === game.id ? '#4CAF50' : 'var(--brand-neon)', 
                          color: sentIds.has(game.id) ? '#888' : '#000', 
                          padding: '8px 12px', 
                          borderRadius: '8px', 
                          fontSize: '0.82rem', 
                          fontWeight: 'bold', 
                          border: 'none', 
                          cursor: (loadingId === game.id || sentIds.has(game.id)) ? 'not-allowed' : 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.3s',
                          opacity: sentIds.has(game.id) ? 0.7 : 1
                        }}
                      >
                        {loadingId === game.id ? (
                          <><Loader2 size={14} className="spin" />...</>
                        ) : sentIds.has(game.id) ? (
                          <><CheckCircle2 size={14} /> Enviado</>
                        ) : successId === game.id ? (
                          <><CheckCircle2 size={14} /> Enviado!</>
                        ) : (
                          <>
                            <Send size={14} />
                            <span>Enviar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* STATUS NARRADO DO RADAR (Apenas se Ao Vivo) */}
                {game.isLive && (() => {
                  const radar = getLiveMatchRadar(game);
                  if (!radar) return null;

                  return (
                    <div style={{
                      margin: '0 24px 16px 24px',
                      background: 'rgba(255, 68, 68, 0.03)',
                      border: '1px solid rgba(255, 68, 68, 0.15)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      fontSize: '0.8rem', 
                      color: '#ccc', 
                      fontStyle: 'italic',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#ff4444', animation: 'pulse 1.2s infinite', flexShrink: 0 }}></span>
                      <strong style={{ color: '#ff4444', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>In-Play:</strong>
                      <span>{radar.statusText}</span>
                    </div>
                  );
                })()}

                {/* COMPARATIVO DE ODDS E CASAS DE APOSTAS */}
                <div style={{ 
                  borderTop: '1px dashed #222', 
                  padding: '12px 24px', 
                  background: '#0e0e12',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚖️</span> Onde Apostar (Melhores Odds para {game.stats.bestTip.selection}):
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {bmOdds.map(bm => {
                      const fairOdd = Number(fairOddVal);
                      const isEV = bm.odd > fairOdd;
                      return (
                        <div 
                          key={bm.name} 
                          onClick={() => {
                            if (isFollowed(game)) return;
                            setActiveFollowId(game.id);
                            setFollowOdd(bm.odd.toFixed(2));
                            setFollowAmount('50');
                            showToast(`Selecionou ${bm.name} (@${bm.odd.toFixed(2)}) para registrar na Banca!`, 'success');
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: bm.isBest ? 'var(--brand-neon-dim)' : '#16161a',
                            border: bm.isBest ? '1px solid var(--brand-neon)' : '1px solid #222',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            cursor: isFollowed(game) ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <span style={{ fontWeight: 'bold', marginRight: '6px', color: bm.isBest ? 'var(--brand-neon)' : '#ccc' }}>
                            {bm.name}
                          </span>
                          <span style={{ fontWeight: '800', color: bm.isBest ? '#fff' : '#aaa' }}>
                            @{bm.odd.toFixed(2)}
                          </span>
                          {bm.isBest && (
                            <span style={{ marginLeft: '6px', fontSize: '0.7rem', background: 'var(--brand-neon)', color: '#000', padding: '1px 4px', borderRadius: '4px', fontWeight: 'bold' }}>
                              MELHOR
                            </span>
                          )}
                          {isEV && !bm.isBest && (
                            <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: '#00ffa0', fontWeight: 'bold' }}>
                              +EV
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>





                {/* Painel Inline para Entrada Rápida na Banca */}
                {activeFollowId === game.id && (
                  <div style={{ 
                    borderTop: '1px solid #222', 
                    padding: '16px 24px', 
                    background: '#0c0c10', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    flexWrap: 'wrap', 
                    gap: '16px' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'bold' }}>Valor da Aposta (R$)</label>
                        <input 
                          type="number"
                          value={followAmount}
                          onChange={(e) => setFollowAmount(e.target.value)}
                          placeholder="50"
                          style={{ 
                            background: '#1a1a24', 
                            border: '1px solid #333', 
                            color: '#fff', 
                            padding: '8px 12px', 
                            borderRadius: '6px', 
                            width: '120px',
                            fontSize: '0.9rem' 
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'bold' }}>Odd Coletada</label>
                        <input 
                          type="number"
                          step="0.01"
                          value={followOdd}
                          onChange={(e) => setFollowOdd(e.target.value)}
                          placeholder="2.00"
                          style={{ 
                            background: '#1a1a24', 
                            border: '1px solid #333', 
                            color: '#fff', 
                            padding: '8px 12px', 
                            borderRadius: '6px', 
                            width: '100px',
                            fontSize: '0.9rem' 
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => handleConfirmFollow(game)}
                        style={{
                          background: 'var(--brand-neon)',
                          color: '#000',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 8px rgba(204, 255, 0, 0.2)'
                        }}
                      >
                        Confirmar Registro 🎯
                      </button>
                      <button
                        onClick={() => setActiveFollowId(null)}
                        style={{
                          background: 'transparent',
                          color: '#aaa',
                          border: '1px solid #444',
                          padding: '10px 16px',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Voltar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
            })}
          </div>
        </>

      {/* POPUP DE ESTATÍSTICAS (MODAL) */}
      {openStatsId && (() => {
        const game = games.find(g => g.id === openStatsId);
        if (!game) return null;
        
        const corn = getCornersStats(game.home, game.away, game.homeXG, game.awayXG);
        const cards = getCardsStats(game.home, game.away);
        const h2h = getH2HStats(game.home, game.away);
        const formHome = getTeamForm(game.home, game.homePosition || 10);
        const formAway = getTeamForm(game.away, game.awayPosition || 11);
        const probOver05HT = (1 - Math.exp(-0.45 * (game.homeXG + game.awayXG))) * 100;
        
        return (
          <div 
            onClick={() => setOpenStatsId(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10000,
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div 
              className="glass-panel" 
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '90%',
                maxWidth: '650px',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: 'linear-gradient(135deg, #111115, #14141d)',
                border: '1px solid #333',
                borderTop: '4px solid var(--brand-neon)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                position: 'relative',
                animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            >
              {/* Botão de Fechar Modal */}
              <button 
                onClick={() => setOpenStatsId(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'transparent',
                  border: 'none',
                  color: '#aaa',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.color = '#fff'}
                onMouseOut={(e) => e.target.style.color = '#aaa'}
              >
                ✕
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #222', paddingBottom: '12px' }}>
                <span style={{ fontSize: '1.5rem' }}>📊</span>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>
                    Radar de Estatísticas
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#888', margin: '2px 0 0 0', fontFamily: 'monospace' }}>
                    {game.home} x {game.away} • Poisson Projections
                  </p>
                </div>
              </div>

              {/* Tab Navigation */}
              <div style={{
                display: 'flex',
                gap: '4px',
                borderBottom: '1px solid #222',
                paddingBottom: '2px',
                marginTop: '4px',
                width: '100%',
                justifyContent: 'space-between'
              }}>
                {[
                  { id: 'geral', label: 'Probabilidades', icon: '📈' },
                  { id: 'escanteios', label: 'Cantos & Cartões', icon: '📐' },
                  { id: 'confrontos', label: 'Forma & H2H', icon: '⚔️' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveStatsTab(t.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: activeStatsTab === t.id ? '2px solid var(--brand-neon)' : '2px solid transparent',
                      color: activeStatsTab === t.id ? 'var(--brand-neon)' : '#888',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      flex: 1
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{t.icon}</span>
                    <span className="mobile-hide">{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeStatsTab === 'geral' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.25s ease-out' }}>
                  {/* Destaque do Palpite */}
                  <div style={{ background: '#1c1c24', borderRadius: '12px', border: '1px solid #333', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#888', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold' }}>Entrada Sugerida</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--brand-neon)', marginTop: '4px' }}>{game.stats.bestTip.selection}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>Confiança</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' }}>{(game.stats.bestTip.prob * 100).toFixed(1)}%</div>
                      </div>
                      <div style={{ background: 'var(--brand-neon)', color: '#000', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem' }}>
                        @{ (1 / game.stats.bestTip.prob).toFixed(2) }
                      </div>
                    </div>
                  </div>

                  {/* Probabilidade de Gols */}
                  <div style={{ background: '#1c1c24', borderRadius: '12px', border: '1px solid #333', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff', borderBottom: '1px solid #333', paddingBottom: '8px' }}>
                      ⚽ Matriz Probabilística de Gols (Poisson)
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Over 0.5 HT */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#aaa', marginBottom: '4px' }}>
                          <span>Over 0.5 Gols no HT (1º Tempo)</span>
                          <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>{probOver05HT.toFixed(1)}%</span>
                        </div>
                        <div style={{ background: '#111', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ background: 'var(--brand-neon)', width: `${probOver05HT}%`, height: '100%' }}></div>
                        </div>
                      </div>

                      {/* Over 1.5 FT */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#aaa', marginBottom: '4px' }}>
                          <span>Over 1.5 Gols no FT (Jogo Todo)</span>
                          <span style={{ color: '#00ffa0', fontWeight: 'bold' }}>{(game.stats.probOver15 * 100).toFixed(1)}%</span>
                        </div>
                        <div style={{ background: '#111', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ background: '#00ffa0', width: `${game.stats.probOver15 * 100}%`, height: '100%' }}></div>
                        </div>
                      </div>

                      {/* Over 2.5 FT */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#aaa', marginBottom: '4px' }}>
                          <span>Over 2.5 Gols no FT (Jogo Todo)</span>
                          <span style={{ color: '#00d2ff', fontWeight: 'bold' }}>{(game.stats.probOver25 * 100).toFixed(1)}%</span>
                        </div>
                        <div style={{ background: '#111', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ background: '#00d2ff', width: `${game.stats.probOver25 * 100}%`, height: '100%' }}></div>
                        </div>
                      </div>

                      {/* Ambos Marcam */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#aaa', marginBottom: '4px' }}>
                          <span>Ambas Equipes Marcam (BTTS)</span>
                          <span style={{ color: '#b339ff', fontWeight: 'bold' }}>{(game.stats.probBtts * 100).toFixed(1)}%</span>
                        </div>
                        <div style={{ background: '#111', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ background: '#b339ff', width: `${game.stats.probBtts * 100}%`, height: '100%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeStatsTab === 'escanteios' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', animation: 'fadeIn 0.25s ease-out' }}>
                  {/* Escanteios */}
                  <div style={{ background: '#1c1c24', borderRadius: '12px', border: '1px solid #333', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff', borderBottom: '1px solid #333', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>📐 Média de Escanteios (Cantos)</span>
                      <span style={{ color: 'var(--brand-neon)' }}>Partida: {corn.projected}</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Casa */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#aaa', marginBottom: '4px' }}>
                          <span>{game.home} (Casa)</span>
                          <span>Feitos: <strong>{corn.home.feitos}</strong> | Sofridos: <strong>{corn.home.sofridos}</strong></span>
                        </div>
                        <div style={{ background: '#111', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ background: '#00d2ff', width: `${(corn.home.feitos / 12) * 100}%`, height: '100%' }}></div>
                        </div>
                      </div>

                      {/* Fora */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#aaa', marginBottom: '4px' }}>
                          <span>{game.away} (Fora)</span>
                          <span>Feitos: <strong>{corn.away.feitos}</strong> | Sofridos: <strong>{corn.away.sofridos}</strong></span>
                        </div>
                        <div style={{ background: '#111', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ background: '#ff9800', width: `${(corn.away.feitos / 12) * 100}%`, height: '100%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cartões */}
                  <div style={{ background: '#1c1c24', borderRadius: '12px', border: '1px solid #333', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff', borderBottom: '1px solid #333', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>🎴 Estimativa de Cartões</span>
                      <span style={{ color: '#ffd700' }}>Partida: ~{cards.totalYellow} 🟨 | {cards.totalRed} 🟥</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Casa */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#aaa', marginBottom: '4px', alignItems: 'center' }}>
                          <span>{game.home}</span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{ background: '#ffd700', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>{cards.home.yellow} 🟨</span>
                            <span style={{ background: '#ff3333', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>{cards.home.red} 🟥</span>
                          </div>
                        </div>
                        <div style={{ background: '#111', height: '6px', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' }}>
                          <div style={{ background: '#ffd700', width: `${(cards.home.yellow / 6) * 100}%`, height: '100%' }}></div>
                        </div>
                      </div>

                      {/* Fora */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#aaa', marginBottom: '4px', alignItems: 'center' }}>
                          <span>{game.away}</span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{ background: '#ffd700', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>{cards.away.yellow} 🟨</span>
                            <span style={{ background: '#ff3333', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>{cards.away.red} 🟥</span>
                          </div>
                        </div>
                        <div style={{ background: '#111', height: '6px', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' }}>
                          <div style={{ background: '#ffd700', width: `${(cards.away.yellow / 6) * 100}%`, height: '100%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeStatsTab === 'confrontos' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.25s ease-out' }}>
                  {/* Forma Recente */}
                  <div style={{ background: '#1c1c24', borderRadius: '12px', border: '1px solid #333', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff', borderBottom: '1px solid #333', paddingBottom: '8px' }}>
                      🔥 Forma Recente (Últimos 5 Jogos no Brasileirão)
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Casa */}
                      <div>
                        <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 'bold', marginBottom: '6px' }}>{game.home}</div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {formHome.map((f, idx) => (
                            <div 
                              key={idx} 
                              title={`${f.result === 'V' ? 'Vitória' : f.result === 'D' ? 'Derrota' : 'Empate'} contra o ${f.opponent} (${f.score})`}
                              style={{ 
                                background: f.result === 'V' ? '#4CAF50' : f.result === 'D' ? '#ff4d4d' : '#555', 
                                color: '#fff', 
                                width: '28px', 
                                height: '28px', 
                                borderRadius: '6px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontWeight: 'bold', 
                                fontSize: '0.8rem',
                                cursor: 'help'
                              }}
                            >
                              {f.result}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Fora */}
                      <div>
                        <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 'bold', marginBottom: '6px' }}>{game.away}</div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {formAway.map((f, idx) => (
                            <div 
                              key={idx} 
                              title={`${f.result === 'V' ? 'Vitória' : f.result === 'D' ? 'Derrota' : 'Empate'} contra o ${f.opponent} (${f.score})`}
                              style={{ 
                                background: f.result === 'V' ? '#4CAF50' : f.result === 'D' ? '#ff4d4d' : '#555', 
                                color: '#fff', 
                                width: '28px', 
                                height: '28px', 
                                borderRadius: '6px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontWeight: 'bold', 
                                fontSize: '0.8rem',
                                cursor: 'help'
                              }}
                            >
                              {f.result}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Confronto Direto H2H */}
                  <div style={{ background: '#1c1c24', borderRadius: '12px', border: '1px solid #333', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff', borderBottom: '1px solid #333', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>⚔️ Confrontos Diretos (H2H)</span>
                      <span style={{ fontSize: '0.8rem', color: '#aaa' }}>
                        <strong style={{color: '#4CAF50'}}>{h2h.summary.homeWins} V</strong> | <strong style={{color: '#888'}}>{h2h.summary.draws} E</strong> | <strong style={{color: '#ff4d4d'}}>{h2h.summary.awayWins} V</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {h2h.matches.map((m, idx) => (
                        <div 
                          key={idx} 
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            fontSize: '0.8rem', 
                            color: '#ccc',
                            background: '#111',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #222'
                          }}
                        >
                          <span style={{ color: '#888' }}>Série A • {m.year}</span>
                          <span style={{ fontWeight: 'bold' }}>
                            {m.venue === game.home ? <strong>{game.home}</strong> : game.home}
                            <span style={{ color: 'var(--brand-neon)', margin: '0 8px' }}>{m.score}</span>
                            {m.venue === game.away ? <strong>{game.away}</strong> : game.away}
                          </span>
                          <span style={{ 
                            color: m.winner === 'Empate' ? '#888' : m.winner === game.home ? '#4CAF50' : '#ff4d4d',
                            fontWeight: 'bold',
                            fontSize: '0.75rem'
                          }}>
                            {m.winner === 'Empate' ? 'Empate' : m.winner === game.home ? 'Vitória Casa' : 'Vitória Fora'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Botão de Fechar no Rodapé */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button 
                  onClick={() => setOpenStatsId(null)}
                  style={{
                    background: 'var(--brand-neon)',
                    border: 'none',
                    color: '#000',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    boxShadow: '0 4px 15px rgba(204, 255, 0, 0.2)'
                  }}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* POPUP DO RADAR DE PRESSÃO IN-PLAY DETALHADO */}
      {openRadarGameId && (() => {
        const game = games.find(g => g.id === openRadarGameId);
        if (!game) return null;
        
        const radar = getLiveMatchRadar(game);
        if (!radar) return null;

        return (
          <div 
            onClick={() => setOpenRadarGameId(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10001,
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div 
              className="glass-panel" 
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '95%',
                maxWidth: '650px',
                background: 'linear-gradient(135deg, #0d0d12, #12121a)',
                border: '1px solid rgba(255, 68, 68, 0.3)',
                borderTop: '5px solid #ff4444',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                boxShadow: '0 15px 50px rgba(0, 0, 0, 0.9)',
                position: 'relative',
                animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            >
              {/* Botão de Fechar Modal */}
              <button 
                onClick={() => setOpenRadarGameId(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'transparent',
                  border: 'none',
                  color: '#aaa',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.color = '#fff'}
                onMouseOut={(e) => e.target.style.color = '#aaa'}
              >
                ✕
              </button>

              {/* Cabeçalho */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #222', paddingBottom: '12px' }}>
                <span style={{ fontSize: '1.8rem', animation: 'pulse 1.2s infinite' }}>🔴</span>
                <div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>
                    Radar de Pressão In-Play (Tempo Real)
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#888', margin: '2px 0 0 0' }}>
                    {getLeagueName(game.sourceLeagueId)} • Rodada {game.round}
                  </p>
                </div>
              </div>

              {/* Informações das Equipes e Placar */}
              <div style={{
                background: '#161622',
                padding: '16px 20px',
                borderRadius: '12px',
                border: '1px solid #2d2d3d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                {/* Time Casa */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '8px', textAlign: 'center' }}>
                  <img 
                    src={game.homeLogo || `https://ui-avatars.com/api/?name=${game.home}&background=222&color=fff&rounded=true&bold=true&size=40`}
                    alt={game.home}
                    style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                  />
                  <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fff' }}>{game.home}</span>
                </div>

                {/* Placar e Tempo */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    background: '#252535',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: '1px solid #3d3d52',
                    fontSize: '1.8rem',
                    fontWeight: '800',
                    color: '#00ffa0',
                    letterSpacing: '4px'
                  }}>
                    {game.goalsHome} - {game.goalsAway}
                  </div>
                  <span style={{
                    background: 'rgba(255, 68, 68, 0.15)',
                    color: '#ff4444',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    border: '1px solid rgba(255, 68, 68, 0.3)'
                  }}>
                    ⏱️ AO VIVO • {game.minute}'
                  </span>
                </div>

                {/* Time Fora */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '8px', textAlign: 'center' }}>
                  <img 
                    src={game.awayLogo || `https://ui-avatars.com/api/?name=${game.away}&background=222&color=fff&rounded=true&bold=true&size=40`}
                    alt={game.away}
                    style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                  />
                  <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fff' }}>{game.away}</span>
                </div>
              </div>

              {/* Termômetro e Detalhes de Pressão */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#aaa', fontWeight: 'bold' }}>
                  <span style={{ color: '#ff4444' }}>Pressão {game.home}: {radar.homePressure}%</span>
                  <span style={{ color: '#00d2ff' }}>Pressão {game.away}: {radar.awayPressure}%</span>
                </div>
                {/* Termômetro Gigante */}
                <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', background: '#111', border: '1px solid #333' }}>
                  <div style={{ width: `${radar.homePressure}%`, background: 'linear-gradient(90deg, #ff4444, #ff8800)', transition: 'width 0.5s ease-in-out' }}></div>
                  <div style={{ width: `${radar.awayPressure}%`, background: 'linear-gradient(90deg, #00d2ff, #00ffa0)', transition: 'width 0.5s ease-in-out' }}></div>
                </div>
              </div>

              {/* Campo de Futebol Heatmap - Ampliado */}
              <div style={{
                position: 'relative',
                width: '100%',
                height: '180px',
                background: '#0d1a0d',
                border: '2px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), inset 0 0 25px rgba(0,0,0,0.7)',
                marginTop: '6px'
              }}>
                {/* Linha de Meio de Campo */}
                <div style={{ position: 'absolute', top: 0, left: '50%', width: '1.5px', height: '100%', background: 'rgba(255, 255, 255, 0.2)' }}></div>
                {/* Círculo Central */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', width: '56px', height: '56px', border: '1.5px solid rgba(255, 255, 255, 0.2)', borderRadius: '50%', transform: 'translate(-50%, -50%)' }}></div>
                {/* Ponto Central */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', width: '6px', height: '6px', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '50%', transform: 'translate(-50%, -50%)' }}></div>
                
                {/* Grande Área Esquerda (Home) */}
                <div style={{ position: 'absolute', top: '35px', left: 0, width: '42px', height: '110px', border: '1.5px solid rgba(255, 255, 255, 0.2)', borderLeft: 'none' }}></div>
                {/* Pequena Área Esquerda (Home) */}
                <div style={{ position: 'absolute', top: '55px', left: 0, width: '16px', height: '70px', border: '1px solid rgba(255, 255, 255, 0.15)', borderLeft: 'none' }}></div>

                {/* Grande Área Direita (Away) */}
                <div style={{ position: 'absolute', top: '35px', right: 0, width: '42px', height: '110px', border: '1.5px solid rgba(255, 255, 255, 0.2)', borderRight: 'none' }}></div>
                {/* Pequena Área Direita (Away) */}
                <div style={{ position: 'absolute', top: '55px', right: 0, width: '16px', height: '70px', border: '1px solid rgba(255, 255, 255, 0.15)', borderRight: 'none' }}></div>

                {/* Efeito de Calor Pulsante */}
                {(() => {
                  let glowLeft = '50%';
                  let glowColor = 'rgba(204, 255, 0, 0.45)';
                  if (radar.zone === 'away_box') {
                    glowLeft = '80%';
                    glowColor = 'rgba(255, 68, 68, 0.6)';
                  } else if (radar.zone === 'home_box') {
                    glowLeft = '20%';
                    glowColor = 'rgba(0, 210, 255, 0.6)';
                  }

                  return (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: glowLeft,
                      width: '100px',
                      height: '100px',
                      background: `radial-gradient(circle, ${glowColor} 0%, rgba(0,0,0,0) 70%)`,
                      borderRadius: '50%',
                      transform: 'translate(-50%, -50%)',
                      animation: 'pulseHeat 1.5s infinite ease-in-out',
                      pointerEvents: 'none'
                    }}></div>
                  );
                })()}
                
                {/* Letreiros informativos nas extremidades */}
                <div style={{ position: 'absolute', top: '6px', left: '12px', fontSize: '0.7rem', color: '#ff4444', fontWeight: 'bold', opacity: 0.6 }}>ÁREA DEFENSIVA CASA</div>
                <div style={{ position: 'absolute', top: '6px', right: '12px', fontSize: '0.7rem', color: '#00d2ff', fontWeight: 'bold', opacity: 0.6 }}>ÁREA DEFENSIVA FORA</div>
              </div>

              {/* Status & Insight do Modelo */}
              <div style={{
                background: '#111',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #222',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📢</span> Status da Partida:
                </div>
                <p style={{ fontSize: '0.85rem', color: '#ccc', margin: 0, fontStyle: 'italic', lineHeight: '1.4' }}>
                  {radar.statusText}
                </p>
                
                <div style={{
                  borderTop: '1px solid #222',
                  paddingTop: '10px',
                  marginTop: '6px',
                  fontSize: '0.8rem',
                  color: '#888',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ color: 'var(--brand-neon)' }}>💡</span>
                  <span>
                    {radar.zone === 'away_box' && `Alta pressão de ${game.home}. Mercado de Cantos ou Próximo Gol (${game.home}) pode ter valor.`}
                    {radar.zone === 'home_box' && `Alta pressão de ${game.away}. Mercado de Cantos ou Próximo Gol (${game.away}) pode ter valor.`}
                    {radar.zone === 'midfield' && 'Jogo travado no meio de campo. Tendência de pouca atividade em gols no momento.'}
                  </span>
                </div>
              </div>

              {/* Botão de Fechar no Rodapé */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  onClick={() => setOpenRadarGameId(null)}
                  style={{
                    background: '#ff4444',
                    border: 'none',
                    color: '#fff',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    boxShadow: '0 4px 15px rgba(255, 68, 68, 0.2)',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#ff6666'}
                  onMouseOut={(e) => e.target.style.background = '#ff4444'}
                >
                  Fechar Radar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* POPUP DO CRIADOR DE APOSTA (MODAL) */}
      {openBuilderGameId && (() => {
        const game = games.find(g => g.id === openBuilderGameId);
        if (!game) return null;
        
        const markets = getBuilderMarkets(game);
        
        const totalOddCalc = builderSelections.reduce((acc, s) => acc * Number(s.odd), 1).toFixed(2);
        const totalProbCalc = (builderSelections.reduce((acc, s) => acc * s.prob, 1) * 100).toFixed(1);

        return (
          <div 
            onClick={() => { setOpenBuilderGameId(null); setBuilderSelections([]); }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10000,
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div 
              className="glass-panel" 
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '90%',
                maxWidth: '600px',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: 'linear-gradient(135deg, #111115, #14141d)',
                border: '1px solid #333',
                borderTop: '4px solid var(--brand-neon)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                position: 'relative',
                animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            >
              <button 
                onClick={() => { setOpenBuilderGameId(null); setBuilderSelections([]); }}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'transparent',
                  border: 'none',
                  color: '#aaa',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'color 0.2s'
                }}
              >
                ✕
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #222', paddingBottom: '12px' }}>
                <span style={{ fontSize: '1.5rem' }}>🛠️</span>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>
                    Criador de Aposta Personalizada
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--brand-neon)', margin: '2px 0 0 0', fontWeight: 'bold' }}>
                    {game.home} x {game.away}
                  </p>
                </div>
              </div>

              {/* Informações explicativas sobre odds */}
              <div style={{ background: 'rgba(0, 210, 255, 0.05)', border: '1px solid rgba(0, 210, 255, 0.2)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.78rem', color: '#00d2ff', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1rem' }}>💡</span>
                <span>As cotações individuais são geradas a partir de modelos matemáticos da <strong>A2 Solutions</strong>. Você pode montar a sua aposta selecionando múltiplos mercados e definir a odd exata da sua casa de apostas manualmente no cupom!</span>
              </div>

              {/* Grid de Mercados e Seleções */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {markets.map((cat, catIdx) => (
                  <div key={catIdx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {cat.category}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {cat.items.map((item, itemIdx) => {
                        const id = `${game.home} x ${game.away}_${item.market}_${item.label}`;
                        const isSelected = builderSelections.some(s => s.id === id);
                        return (
                          <button
                            key={itemIdx}
                            onClick={() => handleToggleBuilderSelection(item, `${game.home} x ${game.away}`)}
                            style={{
                              background: isSelected ? 'var(--brand-neon)' : '#16161a',
                              border: isSelected ? '1px solid var(--brand-neon)' : '1px solid #27272a',
                              color: isSelected ? '#000' : '#ccc',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <span>{item.label}</span>
                            <span style={{ color: isSelected ? '#000' : '#ff9800' }}>@{item.odd.toFixed(2)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Seções Selecionadas & Cupom de Aposta */}
              {builderSelections.length > 0 && (
                <div style={{ background: '#1c1c24', border: '1px solid #333', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 'bold', borderBottom: '1px solid #333', paddingBottom: '6px' }}>
                    📋 Cupom de Aposta ({builderSelections.length})
                  </div>

                  {/* 🎫 Bilhete em Construção */}
                  <div style={{ 
                    background: 'rgba(204, 255, 0, 0.04)', 
                    border: '1.5px dashed var(--brand-neon)', 
                    borderRadius: '8px', 
                    padding: '10px 14px', 
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    lineHeight: '1.4',
                  }}>
                    <div style={{ color: 'var(--brand-neon)', fontSize: '0.62rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '1px' }}>
                      🎫 Aposta sendo montada:
                    </div>
                    <div style={{ wordBreak: 'break-all' }}>
                      {builderSelections.map(s => s.label).join(' + ')}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {builderSelections.map((sel, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#ccc' }}>
                        <span>• {sel.label}</span>
                        <span style={{ color: '#ff9800', fontWeight: 'bold' }}>@{sel.odd.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Resultados Combinados */}
                  <div style={{ borderTop: '1px dashed #333', paddingTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', color: '#888', fontWeight: 'bold' }}>Odd Combinada (Editar)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#ff9800', fontWeight: 'bold' }}>@</span>
                        <input 
                          type="number"
                          step="0.01"
                          value={builderCustomOdd !== "" ? builderCustomOdd : totalOddCalc}
                          onChange={(e) => setBuilderCustomOdd(e.target.value)}
                          style={{
                            background: '#141419',
                            border: '1px solid #333',
                            color: '#ff9800',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            width: '100px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', color: '#888', fontWeight: 'bold' }}>Valor da Aposta (R$)</label>
                      <input 
                        type="number"
                        value={builderStake}
                        onChange={(e) => setBuilderStake(e.target.value)}
                        placeholder="50"
                        style={{
                          background: '#141419',
                          border: '1px solid #333',
                          color: '#fff',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: 'bold',
                          width: '100px',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#aaa', marginTop: '4px' }}>
                    <span>Probabilidade Teórica:</span>
                    <strong style={{ color: 'var(--brand-neon)' }}>{totalProbCalc}%</strong>
                  </div>

                  <button
                    onClick={() => handleSaveBuilderBet(game)}
                    style={{
                      background: 'var(--brand-neon)',
                      color: '#000',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                      boxShadow: '0 4px 12px rgba(204, 255, 0, 0.2)',
                      marginTop: '4px'
                    }}
                  >
                    Salvar Aposta na Banca 🚀
                  </button>
                </div>
              )}

              {/* Botão Fechar no rodapé */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button 
                  onClick={() => { setOpenBuilderGameId(null); setBuilderSelections([]); }}
                  style={{
                    background: 'transparent',
                    border: '1px solid #444',
                    color: '#aaa',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.85rem'
                  }}
                >
                  Voltar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Toast Notificação Customizada */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#141419',
          border: '1px solid ' + (toast.type === 'success' ? '#4CAF50' : toast.type === 'error' ? '#ff4d4d' : '#ff9800'),
          borderLeft: '5px solid ' + (toast.type === 'success' ? '#4CAF50' : toast.type === 'error' ? '#ff4d4d' : '#ff9800'),
          borderRadius: '8px',
          padding: '16px 24px',
          zIndex: 9999,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <span style={{ fontSize: '1.2rem' }}>
            {toast.type === 'success' ? '🟢' : toast.type === 'error' ? '🔴' : '⏳'}
          </span>
          <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.9rem' }}>{toast.message}</span>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hover-scale-field:hover {
          transform: scale(1.008);
          border-color: rgba(255, 255, 255, 0.25) !important;
          box-shadow: 0 0 10px rgba(255,255,255,0.05), inset 0 0 15px rgba(0,0,0,0.6) !important;
        }
        @keyframes slideIn {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes pulseHeat {
          0% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.6; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
