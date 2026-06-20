'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Send, CheckCircle2, Trophy, Loader2, Trash2, PiggyBank, AlertTriangle, BarChart3, Target, Calculator, PlusCircle } from 'lucide-react';

const factorial = (n) => {
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
};
import { calculatePoissonMatchStats, formatPct, formatOdd, calculateDynamicHandicapProb } from '../../utils/poisson';
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

const getSimulatedLiveStats = (game) => {
  if (!game) return null;
  const minute = game.minute || 0;
  const seedH = getTeamHash(game.home);
  const seedA = getTeamHash(game.away);
  
  // Escanteios simulados baseados no tempo e em um fator pseudo-aleatório
  const factorH = 0.05 + ((seedH % 5) / 100); 
  const factorA = 0.05 + ((seedA % 5) / 100);
  
  const cornersH = Math.floor(minute * factorH);
  const cornersA = Math.floor(minute * factorA);
  
  // Cartões baseados no tempo
  const yellowH = Math.min(5, Math.floor((minute * (0.02 + (seedH % 3) / 100))));
  const yellowA = Math.min(5, Math.floor((minute * (0.025 + (seedA % 3) / 100))));
  
  const redH = (seedH % 17 === 0 && minute > 70) ? 1 : 0;
  const redA = (seedA % 19 === 0 && minute > 75) ? 1 : 0;
  
  return {
    home: { corners: cornersH, yellowCards: yellowH, redCards: redH },
    away: { corners: cornersA, yellowCards: yellowA, redCards: redA },
    isReal: false
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
    '12': 'Copa Sulamericana',
    '39': 'Premier League',
    '140': 'La Liga',
    '135': 'Serie A (Itália)',
    '78': 'Bundesliga',
    '3': 'UEFA Europa League',
    '848': 'UEFA Conference League',
    '44': 'Liga Profesional Argentina'
  };
  return mapping[leagueId] || 'Futebol';
};

const getLeagueLogoUrl = (leagueIdOrName) => {
  if (!leagueIdOrName) return '';
  const val = String(leagueIdOrName).toLowerCase().trim();
  
  if (!isNaN(parseInt(val))) {
    if (val === '1') return '/copadomundo.png';
    if (val === '71') return '/brasileiraoc.png';
    if (val === '72') return '/brasileiraoc.png';
    if (val === '75') return '/brasileiraoc.png';
    if (val === '78') return '/bundesliga.png';
    if (val === '12') return '/sudamericana.png';
    if (val === '13') return '/libertadores.png';
    if (val === '39') return '/premierleague.png';
    if (val === '3') return '/europaleague.png';
    if (val === '44') return '/ligaargentina.png';
    return `https://media.api-sports.io/football/leagues/${val}.png`;
  }
  
  if (val.includes('copa do mundo')) return '/copadomundo.png';
  if (val.includes('libertadores')) return '/libertadores.png';
  if (val.includes('sudamericana') || val.includes('sulamericana') || val.includes('sul-americana')) return '/sudamericana.png';
  if (val.includes('série a') || val.includes('série-a') || val.includes('serie a')) {
    if (val.includes('itália') || val.includes('italia') || val.includes('italy')) return 'https://media.api-sports.io/football/leagues/135.png';
    return '/brasileiraoc.png';
  }
  if (val.includes('série b') || val.includes('série-b') || val.includes('serie b')) return '/brasileiraoc.png';
  if (val.includes('série c') || val.includes('série-c') || val.includes('serie c')) return '/brasileiraoc.png';
  if (val.includes('premier')) return '/premierleague.png';
  if (val.includes('la liga') || val.includes('espanha')) return 'https://media.api-sports.io/football/leagues/140.png';
  if (val.includes('bundesliga') || val.includes('alemanha')) return '/bundesliga.png';
  if (val.includes('europa league')) return '/europaleague.png';
  if (val.includes('conference league')) return 'https://media.api-sports.io/football/leagues/848.png';
  if (val.includes('argentina')) return '/ligaargentina.png';
  
  return '';
};

const evaluateSelection = (selection, gh, ga) => {
  if (!selection) return true;
  const cleanSel = selection.trim().toLowerCase();
  
  // Handicap Asiático (ex: "casa ah -1.0", "fora ah 0.0", "casa ah +1.5")
  if (cleanSel.includes('ah') || cleanSel.includes('handicap')) {
    const isHome = cleanSel.includes('casa');
    const isAway = cleanSel.includes('fora');
    const valueMatch = cleanSel.match(/[+-]?\d+(?:\.\d+)?/);
    if (valueMatch && (isHome || isAway)) {
      const hc = parseFloat(valueMatch[0]);
      const diff = isHome ? (gh - ga) : (ga - gh);
      const total = diff + hc;
      
      if (total > 0) return true;      // Venceu
      if (total < 0) return false;     // Perdeu
      return null;                     // Reembolso (Aposta nula/devolvida)
    }
  }

  // 1X2
  if (cleanSel === 'casa' || cleanSel === 'casa vence' || cleanSel === 'casa vencer') return gh > ga;
  if (cleanSel === 'fora' || cleanSel === 'fora vence' || cleanSel === 'fora vencer') return ga > gh;
  if (cleanSel === 'empate') return gh === ga;
  
  // Ambos marcam
  if (cleanSel.includes('ambos marcam') || cleanSel.includes('ambas marcam')) {
    if (cleanSel.includes('sim')) return gh > 0 && ga > 0;
    if (cleanSel.includes('nã') || cleanSel.includes('na')) return !(gh > 0 && ga > 0);
  }
  if (cleanSel === 'sim') return gh > 0 && ga > 0;
  if (cleanSel === 'não' || cleanSel === 'nao') return !(gh > 0 && ga > 0);
  
  // Placar Exato (e.g. Placar 1x0)
  const placarMatch = cleanSel.match(/placar\s+(\d+)\s*[x-]\s*(\d+)/);
  if (placarMatch) {
    const targetH = parseInt(placarMatch[1]);
    const targetA = parseInt(placarMatch[2]);
    return gh === targetH && ga === targetA;
  }
  
  const isGoalMarket = !cleanSel.includes('escanteio') && !cleanSel.includes('canto') && !cleanSel.includes('cartã') && !cleanSel.includes('cartao') && !cleanSel.includes('amarelo') && !cleanSel.includes('vermelho');

  if (isGoalMarket) {
    // Fora Acima/Abaixo
    const foraOverMatch = cleanSel.match(/fora\s+(?:acima|mais)\s*(?:de)?\s*(\d+(?:\.\d+)?)/);
    if (foraOverMatch) {
      const val = parseFloat(foraOverMatch[1]);
      return ga > val;
    }
    const foraUnderMatch = cleanSel.match(/fora\s+(?:abaixo|menos)\s*(?:de)?\s*(\d+(?:\.\d+)?)/);
    if (foraUnderMatch) {
      const val = parseFloat(foraUnderMatch[1]);
      return ga < val;
    }

    // Acima/Mais de Z Gols
    const overMatch = cleanSel.match(/(?:acima|mais)\s*(?:de)?\s*(\d+(?:\.\d+)?)/);
    if (overMatch) {
      const val = parseFloat(overMatch[1]);
      return (gh + ga) > val;
    }
    
    // Abaixo/Menos de Z Gols
    const underMatch = cleanSel.match(/(?:abaixo|menos)\s*(?:de)?\s*(\d+(?:\.\d+)?)/);
    if (underMatch) {
      const val = parseFloat(underMatch[1]);
      return (gh + ga) < val;
    }
  }

  // Outros (Marcadores, Cartões, etc.) fallback to true if the match finished
  return true;
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

const generateTeamInsights = (game, formHome, formAway) => {
  const insights = [];

  const getStreak = (formList, resultType) => {
    let count = 0;
    for (let i = 0; i < formList.length; i++) {
      if (formList[i].result === resultType) {
        count++;
      } else {
        break;
      }
    }
    return count;
  };

  // 1. Seqüências de Resultados
  const homeWinsStreak = getStreak(formHome, 'V');
  const homeLossesStreak = getStreak(formHome, 'D');
  const awayWinsStreak = getStreak(formAway, 'V');
  const awayLossesStreak = getStreak(formAway, 'D');

  if (homeWinsStreak >= 2) {
    insights.push(game.home === 'Colombia' || game.home === 'Colômbia' ? `A Colômbia vem de ${homeWinsStreak} vitórias consecutivas.` : `O ${game.home} vem de ${homeWinsStreak} vitórias consecutivas.`);
  } else if (homeLossesStreak >= 2) {
    insights.push(game.home === 'Uzbequistão' || game.home === 'Uzbekistan' ? `O Uzbequistão vem de ${homeLossesStreak} derrotas consecutivas.` : `O ${game.home} vem de ${homeLossesStreak} derrotas consecutivas.`);
  }

  if (awayWinsStreak >= 2) {
    insights.push(game.away === 'Colombia' || game.away === 'Colômbia' ? `A Colômbia vem de ${awayWinsStreak} vitórias consecutivas.` : `O ${game.away} vem de ${awayWinsStreak} vitórias consecutivas.`);
  } else if (awayLossesStreak >= 2) {
    insights.push(game.away === 'Uzbequistão' || game.away === 'Uzbekistan' ? `O Uzbequistão vem de ${awayLossesStreak} derrotas consecutivas.` : `O ${game.away} vem de ${awayLossesStreak} derrotas consecutivas.`);
  }

  // 2. Comparativo da Última Partida
  const homeLast = formHome[0]?.result;
  const awayLast = formAway[0]?.result;

  if (homeLast === 'V' && awayLast === 'D') {
    insights.push((game.home === 'Colômbia' || game.home === 'Colombia') && (game.away === 'Uzbequistão' || game.away === 'Uzbekistan') 
      ? `A Colômbia venceu sua última partida, enquanto o Uzbequistão perdeu a sua.` 
      : `${game.home} venceu sua última partida, enquanto o ${game.away} perdeu a sua.`);
  } else if (homeLast === 'D' && awayLast === 'V') {
    insights.push((game.away === 'Colômbia' || game.away === 'Colombia') && (game.home === 'Uzbequistão' || game.home === 'Uzbekistan') 
      ? `A Colômbia venceu sua última partida, enquanto o Uzbequistão perdeu a sua.` 
      : `${game.away} venceu sua última partida, enquanto o ${game.home} perdeu a sua.`);
  }

  // 3. Invencibilidade / Sem Vitórias
  const homeUnbeaten = !formHome.some(f => f.result === 'D');
  const awayUnbeaten = !formAway.some(f => f.result === 'D');
  if (homeUnbeaten) {
    insights.push(`${game.home} está invicto há 5 jogos.`);
  }
  if (awayUnbeaten) {
    insights.push(`${game.away} está invicto há 5 jogos.`);
  }

  // 4. Histórico de Confrontos (H2H)
  const h2h = getH2HStats(game.home, game.away);
  if (h2h && h2h.summary) {
    if (h2h.summary.homeWins >= 3) {
      insights.push(`Histórico favorável: ${game.home} venceu ${h2h.summary.homeWins} dos últimos 5 duelos contra o ${game.away}.`);
    } else if (h2h.summary.awayWins >= 3) {
      insights.push(`Histórico favorável: ${game.away} venceu ${h2h.summary.awayWins} dos últimos 5 duelos contra o ${game.home}.`);
    } else if (h2h.summary.draws >= 3) {
      insights.push(`Equilíbrio H2H: Houve ${h2h.summary.draws} empates nos últimos 5 confrontos diretos.`);
    }
  }

  // 5. Projeções de Escanteios
  const corn = getCornersStats(game.home, game.away, game.homeXG, game.awayXG);
  if (corn) {
    insights.push(`Projeção de cantos: Média de ${corn.projected.toFixed(1)} escanteios projetados para o jogo.`);
  }

  // 6. Projeções de Gols (BTTS e Over 2.5)
  if (game.stats) {
    if (game.stats.probBtts >= 0.50) {
      insights.push(`Mercado Gols: probabilidade de Ambos Marcam (BTTS) de ${(game.stats.probBtts * 100).toFixed(0)}%.`);
    }
    if (game.stats.probOver25 >= 0.45) {
      insights.push(`Expectativa ofensiva: ${(game.stats.probOver25 * 100).toFixed(0)}% de chance de mais de 2.5 gols.`);
    } else {
      insights.push(`Tendência defensiva: ${( (1 - game.stats.probOver25) * 100).toFixed(0)}% de chance de menos de 2.5 gols.`);
    }
  }

  // 7. Projeções de Cartões
  const cards = getCardsStats(game.home, game.away);
  if (cards) {
    insights.push(`Previsão de cartões: Média projetada de ${cards.totalYellow.toFixed(1)} cartões amarelos.`);
  }

  // 8. Diferença de Classificação
  if (game.homePosition && game.awayPosition) {
    const posHome = parseInt(game.homePosition);
    const posAway = parseInt(game.awayPosition);
    if (!isNaN(posHome) && !isNaN(posAway)) {
      if (posAway - posHome >= 4) {
        insights.push(`${game.home} está ${posAway - posHome} posições acima do ${game.away} na classificação.`);
      } else if (posHome - posAway >= 4) {
        insights.push(`${game.away} está ${posHome - posAway} posições acima do ${game.home} na classificação.`);
      }
    }
  }

  // Fallbacks para garantir que sempre haja dados
  if (insights.length === 0) {
    insights.push(`Expectativa de confronto dinâmico e equilibrado.`);
  }

  return insights;
};

const CardInsights = ({ game }) => {
  const formHome = useMemo(() => getTeamForm(game.home, game.homePosition || 10), [game.home, game.homePosition]);
  const formAway = useMemo(() => getTeamForm(game.away, game.awayPosition || 11), [game.away, game.awayPosition]);
  
  const insights = useMemo(() => generateTeamInsights(game, formHome, formAway), [game, formHome, formAway]);
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  // Carrossel com transição suave e ciclo automático de 4.5s
  useEffect(() => {
    if (insights.length <= 1) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % insights.length);
        setFade(true);
      }, 200);
    }, 4500);
    return () => clearInterval(interval);
  }, [insights.length]);

  if (insights.length === 0) return null;

  const handlePrev = (e) => {
    e.stopPropagation();
    setFade(false);
    setTimeout(() => {
      setIndex((prev) => (prev - 1 + insights.length) % insights.length);
      setFade(true);
    }, 200);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setFade(false);
    setTimeout(() => {
      setIndex((prev) => (prev + 1) % insights.length);
      setFade(true);
    }, 200);
  };

  const handleDotClick = (e, idx) => {
    e.stopPropagation();
    if (idx === index) return;
    setFade(false);
    setTimeout(() => {
      setIndex(idx);
      setFade(true);
    }, 200);
  };

  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '8px',
        padding: '6px 8px 4px 8px',
        width: '100%',
        marginTop: '6px',
        boxSizing: 'border-box',
        position: 'relative'
      }}
    >
      {/* Linha principal: Seta Esquerda, Conteúdo de Texto, Seta Direita */}
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', gap: '4px' }}>
        {insights.length > 1 && (
          <button 
            onClick={handlePrev}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: '0.85rem',
              padding: '0 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.color = 'var(--brand-neon)'}
            onMouseOut={(e) => e.target.style.color = '#888'}
            title="Insight anterior"
          >
            ‹
          </button>
        )}
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          minWidth: 0, 
          flex: 1,
          justifyContent: 'center',
          textAlign: 'center',
          transition: 'opacity 0.2s ease-in-out',
          opacity: fade ? 1 : 0
        }}>
          <span style={{ fontSize: '0.75rem', flexShrink: 0 }}>💡</span>
          <span style={{ 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap',
            fontSize: '0.68rem',
            fontWeight: '500',
            color: '#ddd',
            flex: 1
          }} title={insights[index]}>
            {insights[index]}
          </span>
        </div>

        {insights.length > 1 && (
          <button 
            onClick={handleNext}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: '0.85rem',
              padding: '0 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.color = 'var(--brand-neon)'}
            onMouseOut={(e) => e.target.style.color = '#888'}
            title="Próximo insight"
          >
            ›
          </button>
        )}
      </div>

      {/* Dots Indicadores do Carrossel */}
      {insights.length > 1 && (
        <div style={{ display: 'flex', gap: '4px', marginTop: '4px', justifyContent: 'center' }}>
          {insights.map((_, idx) => (
            <div 
              key={idx}
              onClick={(e) => handleDotClick(e, idx)}
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: idx === index ? 'var(--brand-neon)' : '#555',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title={`Ir para o slide ${idx + 1}`}
            ></div>
          ))}
        </div>
      )}
    </div>
  );
};

const getBookmakerLogo = (name) => {
  switch (name) {
    case 'Bet365':
      return (
        <span style={{ 
          background: '#003c26', 
          color: '#ffdf1b', 
          padding: '2px 5px', 
          borderRadius: '3px', 
          fontSize: '0.65rem', 
          fontWeight: '900', 
          fontFamily: 'sans-serif', 
          letterSpacing: '-0.3px',
          textTransform: 'lowercase'
        }}>
          bet365
        </span>
      );
    case 'Betano':
      return (
        <span style={{ 
          background: '#f27022', 
          color: '#fff', 
          padding: '2px 5px', 
          borderRadius: '3px', 
          fontSize: '0.65rem', 
          fontWeight: '900', 
          fontFamily: 'sans-serif',
          textTransform: 'lowercase'
        }}>
          betano
        </span>
      );
    case 'Pinnacle':
      return (
        <span style={{ 
          background: '#071d2b', 
          color: '#ff7300', 
          padding: '1px 5px', 
          borderRadius: '3px', 
          fontSize: '0.65rem', 
          fontWeight: '900', 
          fontFamily: 'sans-serif', 
          border: '1px solid #ff7300',
          textTransform: 'uppercase'
        }}>
          pinnacle
        </span>
      );
    case 'Betfair':
      return (
        <span style={{ 
          background: '#ffc500', 
          color: '#000', 
          padding: '2px 5px', 
          borderRadius: '3px', 
          fontSize: '0.65rem', 
          fontWeight: '900', 
          fontFamily: 'sans-serif',
          textTransform: 'lowercase'
        }}>
          betfair
        </span>
      );
    default:
      return <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.7rem' }}>{name}</span>;
  }
};

const normalizeMarketName = (marketName) => {
  if (!marketName) return 'Outros';
  const name = marketName.toLowerCase().trim();
  if (name.includes('vitória do') || name.includes('vitoria do') || name === 'empate' || name.includes('dupla chance') || name.includes('vencedor')) {
    return 'Resultado Final';
  }
  if (name.includes('ambos marcam') || name.includes('ambas marcam')) {
    return 'Ambos Marcam';
  }
  if (name.includes('mais de') || name.includes('menos de') || name.includes('gols') || name.includes('gol')) {
    return 'Total de Gols';
  }
  if (name.includes('escanteio') || name.includes('canto')) {
    return 'Escanteios';
  }
  if (name.includes('cartão') || name.includes('cartao') || name.includes('cartões') || name.includes('cartoe')) {
    return 'Cartões';
  }
  if (name.includes('handicap')) {
    return 'Handicap Asiático';
  }
  return marketName; // Fallback
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
  const [liveStats, setLiveStats] = useState({});

  // Polling de estatísticas para jogos ao vivo
  useEffect(() => {
    const liveGames = games.filter(g => g.isLive);
    if (liveGames.length === 0) return;

    const fetchLiveStats = async () => {
      for (const game of liveGames) {
        try {
          const res = await fetch(`/api/football/fixtures/stats?fixture=${game.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data && !data.error) {
              setLiveStats(prev => ({
                ...prev,
                [game.id]: {
                  home: {
                    corners: data.home?.corners ?? 0,
                    yellowCards: data.home?.yellowCards ?? 0,
                    redCards: data.home?.redCards ?? 0
                  },
                  away: {
                    corners: data.away?.corners ?? 0,
                    yellowCards: data.away?.yellowCards ?? 0,
                    redCards: data.away?.redCards ?? 0
                  },
                  isReal: true
                }
              }));
            }
          }
        } catch (e) {
          console.warn(`Erro ao buscar estatísticas ao vivo para o fixture ${game.id}:`, e);
        }
      }
    };

    fetchLiveStats();
    const interval = setInterval(fetchLiveStats, 60000); // a cada 60 segundos
    return () => clearInterval(interval);
  }, [games]);

  // Gestão de Banca & Risco
  const [banca, setBanca] = useState(1000);
  const [riskPct, setRiskPct] = useState(0.05); // default 5%
  const [initialValue, setInitialValue] = useState(1000);

  // Bet Builder states
  const [openBuilderGameId, setOpenBuilderGameId] = useState(null);
  const [builderSelections, setBuilderSelections] = useState([]);
  const [builderStake, setBuilderStake] = useState('50');
  const [builderCustomOdd, setBuilderCustomOdd] = useState('');
  const [builderActiveTab, setBuilderActiveTab] = useState('handicap');

  // Estados do Simulador de Handicap para o Criador de Aposta
  const [builderHandicapTeam, setBuilderHandicapTeam] = useState('home'); // 'home' ou 'away'
  const [builderHandicapLine, setBuilderHandicapLine] = useState(-0.5);
  const [builderHandicapOdd, setBuilderHandicapOdd] = useState('1.90');
  const [simHandicapStake, setSimHandicapStake] = useState('100');
  const [simHomeScore, setSimHomeScore] = useState(0);
  const [simAwayScore, setSimAwayScore] = useState(0);
  
  // Cache de estatísticas reais para o Criador de Apostas
  const [teamsStats, setTeamsStats] = useState(null);

  useEffect(() => {
    fetch('/teams_stats_cache.json')
      .then(res => res.json())
      .then(data => setTeamsStats(data))
      .catch(err => console.warn('Não foi possível carregar cache de estatísticas reais:', err));
  }, []);

  useEffect(() => {
    if (openBuilderGameId) {
      const selectedGame = games.find(g => g.id === openBuilderGameId);
      if (selectedGame && selectedGame.stats?.scoreMatrix) {
        const p = calculateDynamicHandicapProb(selectedGame.stats.scoreMatrix, builderHandicapTeam === 'home', builderHandicapLine);
        const fOdd = p > 0 ? (1 / p).toFixed(2) : '1.01';
        setBuilderHandicapOdd(fOdd);
      }
    }
  }, [builderHandicapTeam, builderHandicapLine, openBuilderGameId, games]);

  // Novos estados para Filtro de Ligas e Data
  const [activeLeagues, setActiveLeagues] = useState([
    {"id": "1", "name": "Copa do Mundo"},
    {"id": "71", "name": "Série A"},
    {"id": "72", "name": "Série B"},
    {"id": "75", "name": "Série C"},
    {"id": "13", "name": "Libertadores"},
    {"id": "12", "name": "Sulamericana"},
    {"id": "39", "name": "Premier"},
    {"id": "140", "name": "La Liga"},
    {"id": "135", "name": "Serie A"},
    {"id": "78", "name": "Bundes"},
    {"id": "3", "name": "Europa League"},
    {"id": "848", "name": "Conference"},
    {"id": "44", "name": "Liga Argentina"},
    {"id": "10", "name": "Amistosos"}
  ]);

  useEffect(() => {
    const cached = typeof window !== 'undefined' ? localStorage.getItem('saas_target_leagues') : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setActiveLeagues(parsed);
        }
      } catch (e) {
        console.warn('[Palpites] Erro ao fazer parse das ligas cacheadas:', e);
      }
    }

    async function loadDynamicLeagues() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('saas_settings')
          .select('value')
          .eq('key', 'target_leagues')
          .maybeSingle();

        if (error) {
          console.error('[Palpites] Erro ao carregar ligas do banco:', error);
          return;
        }

        if (data && data.value && Array.isArray(data.value)) {
          setActiveLeagues(data.value);
          localStorage.setItem('saas_target_leagues', JSON.stringify(data.value));
        }
      } catch (err) {
        console.error('[Palpites] Falha de conexão ao carregar ligas:', err);
      }
    }
    loadDynamicLeagues();
  }, []);

  const getLeagueNameDynamic = (leagueId) => {
    const found = activeLeagues.find(l => String(l.id) === String(leagueId));
    if (found) return found.name;
    return getLeagueName(leagueId);
  };

  const [selectedLeague, setSelectedLeague] = useState('all'); // default to load all games
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateString());
  const [showMathExplanation, setShowMathExplanation] = useState(false);

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

  const [squadsCache, setSquadsCache] = useState({});
  const [loadingSquads, setLoadingSquads] = useState({});

  useEffect(() => {
    if (!openStatsId) return;
    const game = games.find(g => g.id === openStatsId);
    if (!game) return;

    const gameId = game.id;
    if (squadsCache[gameId] || loadingSquads[gameId]) return;

    const fetchSquads = async () => {
      setLoadingSquads(prev => ({ ...prev, [gameId]: true }));
      try {
        const homeId = game.homeTeamId;
        const awayId = game.awayTeamId;

        if (!homeId || !awayId) {
          throw new Error('Team IDs not available for live fetch');
        }

        const [homeRes, awayRes] = await Promise.all([
          fetch(`/api/football/squads?teamId=${homeId}`),
          fetch(`/api/football/squads?teamId=${awayId}`)
        ]);

        if (!homeRes.ok || !awayRes.ok) {
          throw new Error('Failed to fetch one of the squads');
        }

        const [homeData, awayData] = await Promise.all([
          homeRes.json(),
          awayRes.json()
        ]);

        const parseSquad = (players) => {
          if (!players || players.length === 0) return null;

          const gks = players.filter(p => p.position === 'Goalkeeper');
          const gk = gks.length > 0 ? gks[0].name : null;

          const fieldPlayers = players.filter(p => p.position === 'Attacker' || p.position === 'Midfielder');

          // Lista de palavras-chave para priorizar estrelas e artilheiros consagrados
          const starPlayers = [
            'messi', 'ronaldo', 'neymar', 'suárez', 'suarez', 'benzema', 'lewandowski', 'mbappé', 'mbappe', 'haaland', 
            'vinícius', 'vinicius', 'bellingham', 'rodrygo', 'kane', 'salah', 'de bruyne', 'griezmann', 'lautaro', 
            'álvarez', 'alvarez', 'di maría', 'di maria', 'dybala', 'hulk', 'pedro', 'gabigol', 'calleri', 'lucas moura', 
            'tiquinho', 'yuri alberto', 'depay', 'memphis', 'braithwaite', 'borré', 'borre', 'lucero', 'bolasie', 
            'pitta', 'vegetti', 'veiga', 'estêvão', 'estevao', 'de arrascaeta', 'arrascaeta', 'coutinho', 'payet'
          ];

          const getPlayerScore = (p) => {
            const nameLower = p.name.toLowerCase();
            const isStar = starPlayers.some(star => nameLower.includes(star));
            if (isStar) return 100; // Estrelas ganham prioridade absoluta
            if (p.position === 'Attacker') return 10; // Atacantes vêm depois
            if (p.position === 'Midfielder') return 5; // Meio-campistas depois
            return 0;
          };

          // Ordena decrescente pelo score e pega os 3 primeiros
          const sortedField = [...fieldPlayers].sort((a, b) => getPlayerScore(b) - getPlayerScore(a));
          const scorers = sortedField.slice(0, 3).map(p => p.name);

          return { gk, scorers };
        };

        const homeParsed = parseSquad(homeData.players);
        const awayParsed = parseSquad(awayData.players);

        if (homeParsed || awayParsed) {
          setSquadsCache(prev => ({
            ...prev,
            [gameId]: {
              home: homeParsed,
              away: awayParsed
            }
          }));
        }
      } catch (err) {
        console.warn('[SquadsFetch] Erro ao buscar escalações reais do API-Sports:', err);
      } finally {
        setLoadingSquads(prev => ({ ...prev, [gameId]: false }));
      }
    };

    fetchSquads();
  }, [openStatsId, games]);



  // Carregar Valor Inicial e Risco do LocalStorage
  useEffect(() => {
    if (!user) return;
    const userBancaKey = `ev_tracker_banca_initial_value_${user.id}`;
    const savedInitial = localStorage.getItem(userBancaKey);
    if (savedInitial) {
      setInitialValue(parseFloat(savedInitial));
    } else {
      setInitialValue(1000);
    }

    const userRiskKey = `ev_tracker_max_risk_pct_${user.id}`;
    const savedRisk = localStorage.getItem(userRiskKey);
    if (savedRisk) {
      setRiskPct(parseFloat(savedRisk));
    } else {
      setRiskPct(0.05);
    }
  }, [user?.id]);

  // Recalcular saldo da banca sempre que transactions ou initialValue mudar
  useEffect(() => {
    let currentBanca = initialValue;
    let pendingStakes = 0;
    transactions.forEach(t => {
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
    setBanca(currentBanca - pendingStakes);
  }, [transactions, initialValue]);

  useEffect(() => {
    const combinedOdd = builderSelections.reduce((acc, s) => acc * Number(s.odd), 1);
    setBuilderCustomOdd(combinedOdd.toFixed(2));

    // Calcular Stake Recomendada via Critério de Kelly se houver seleções
    if (builderSelections.length > 0 && combinedOdd > 1) {
      const combinedProb = builderSelections.reduce((acc, s) => acc * (Number(s.prob) || 0.5), 1);
      
      const b = combinedOdd - 1;
      const p = combinedProb;
      const q = 1 - p;
      const kellyFraction = (b * p - q) / b;
      
      let suggestedPct = kellyFraction * (riskPct || 0.05);
      const maxRisk = riskPct || 0.05;
      if (suggestedPct > maxRisk) suggestedPct = maxRisk;
      if (suggestedPct < 0.005) suggestedPct = 0.005; // min 0.5%
      
      const calculatedStake = banca * suggestedPct;
      setBuilderStake(calculatedStake.toFixed(2));
    } else {
      setBuilderStake('50'); // Valor padrão se nenhuma seleção
    }
  }, [builderSelections, banca, riskPct]);

  // Novo estado para as estatísticas reais do robô carregadas do banco de dados
  const [dbStats, setDbStats] = useState({
    hitRate: '--',
    roi: '--',
    greens: 0,
    reds: 0,
    mostProfitableMarket: 'Nenhum',
    marketHitRate: '--',
    subtextRate: 'Base: 0 palpites',
    subtextRoi: 'Volume: 0.0 u',
    subtextResult: 'Carregando dados...'
  });

  useEffect(() => {
    async function fetchDatabaseStats() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('ev_opportunities')
          .select('resultado, mercado, odd_oferecida')
          .neq('resultado', 'pending');

        if (error) {
          console.error('[Palpites] Erro ao buscar estatísticas do banco:', error);
          return;
        }

        if (data && data.length > 0) {
          const greens = data.filter(d => d.resultado === 'green').length;
          const reds = data.filter(d => d.resultado === 'red').length;
          const total = greens + reds;
          const hitRate = total > 0 ? (greens / total) * 100 : 0;

          // Calcular ROI teórico (Volume teórico de 1 unidade por aposta)
          let netTheoreticalProfit = 0;
          data.forEach(d => {
            const odd = parseFloat(d.odd_oferecida || 1);
            if (d.resultado === 'green') {
              netTheoreticalProfit += (odd - 1);
            } else if (d.resultado === 'red') {
              netTheoreticalProfit -= 1;
            }
          });
          const roi = total > 0 ? (netTheoreticalProfit / total) * 100 : 0;

          // Agrupar mercados para encontrar o mais lucrativo
          const marketsMap = {};
          data.forEach(d => {
            if (!d.mercado) return;
            const normMarket = normalizeMarketName(d.mercado);
            if (!marketsMap[normMarket]) {
              marketsMap[normMarket] = { total: 0, wins: 0, netProfit: 0 };
            }
            marketsMap[normMarket].total += 1;
            const odd = parseFloat(d.odd_oferecida || 1);
            if (d.resultado === 'green') {
              marketsMap[normMarket].wins += 1;
              marketsMap[normMarket].netProfit += (odd - 1);
            } else if (d.resultado === 'red') {
              marketsMap[normMarket].netProfit -= 1;
            }
          });

          let bestMarket = 'Nenhum';
          let bestMarketHitRate = 0;
          let maxNetProfit = -999999;

          Object.keys(marketsMap).forEach(mName => {
            const mData = marketsMap[mName];
            if (mData.netProfit > maxNetProfit && mData.total >= 5) {
              maxNetProfit = mData.netProfit;
              bestMarket = mName;
              bestMarketHitRate = mData.total > 0 ? (mData.wins / mData.total) * 100 : 0;
            }
          });

          // Se nenhum mercado gerou lucro positivo com o mínimo de 5 apostas, busca apenas por taxa de acerto com pelo menos 2 apostas
          if (bestMarket === 'Nenhum') {
            let maxRate = 0;
            Object.keys(marketsMap).forEach(mName => {
              const mData = marketsMap[mName];
              const rate = mData.total > 0 ? (mData.wins / mData.total) * 100 : 0;
              if (rate > maxRate && mData.total >= 2) {
                maxRate = rate;
                bestMarket = mName;
                bestMarketHitRate = rate;
              }
            });
          }

          setDbStats({
            hitRate: `${hitRate.toFixed(1)}%`,
            roi: `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`,
            greens,
            reds,
            mostProfitableMarket: bestMarket !== 'Nenhum' ? bestMarket : 'Indefinido',
            marketHitRate: bestMarket !== 'Nenhum' ? `${bestMarketHitRate.toFixed(1)}%` : '--',
            subtextRate: `Base: ${total} palpites enviados`,
            subtextRoi: `Volume: ${total} u líquidas`,
            subtextResult: `Últimas rodadas resolvidas`
          });
        } else {
          setDbStats({
            hitRate: '0.0%',
            roi: '0.0%',
            greens: 0,
            reds: 0,
            mostProfitableMarket: 'Nenhum',
            marketHitRate: '0.0%',
            subtextRate: 'Base: 0 palpites',
            subtextRoi: 'Volume: 0.0 u',
            subtextResult: 'Aguardando primeiros jogos finalizados'
          });
        }
      } catch (err) {
        console.warn('Erro ao carregar estatísticas do banco de dados:', err);
      }
    }
    fetchDatabaseStats();
  }, []);

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
      const updated = [savedTx, ...transactions];
      setTransactions(updated);
      localStorage.setItem(userTxsKey, JSON.stringify(updated));
      showToast('Aposta salva com sucesso na sua Banca! 🚀', 'success');
    }

    setOpenBuilderGameId(null);
    setBuilderSelections([]);
  };

  const getBuilderMarkets = (game) => {
    if (!game) return [];
    
    const stats = game.stats;
    
    // Obter dados de escanteios reais ou calculados
    let projectedCorners = 9.5;
    let totalYellow = 4.5;
    let totalRed = 0.22;
    
    const statsHome = teamsStats && teamsStats[game.home];
    const statsAway = teamsStats && teamsStats[game.away];
    
    if (statsHome && statsAway) {
      // Cálculo baseado em médias reais do cache
      const cornHome = statsHome.corners_avg || 5.0;
      const cornAgainstAway = statsAway.corners_against_avg || 4.5;
      const cornAway = statsAway.corners_avg || 4.5;
      const cornAgainstHome = statsHome.corners_against_avg || 4.2;
      
      projectedCorners = parseFloat((cornHome + cornAway).toFixed(1));
      totalYellow = parseFloat((statsHome.yellow_cards_avg + statsAway.yellow_cards_avg).toFixed(1));
      totalRed = parseFloat((statsHome.red_cards_avg + statsAway.red_cards_avg).toFixed(2));
    } else {
      // Fallback para os geradores de hash locais
      const corn = getCornersStats(game.home, game.away, game.homeXG, game.awayXG);
      const cards = getCardsStats(game.home, game.away);
      projectedCorners = corn.projected;
      totalYellow = cards.totalYellow;
      totalRed = cards.totalRed;
    }
    
    // Capped odds between @1.01 and @200.00 for bookmaker realism
    const getOdd = (p) => p > 0 ? Math.max(1.01, Math.min(200.0, parseFloat((1 / p).toFixed(2)))) : 1.01;
    
    const pCorn = (k) => (Math.exp(-projectedCorners) * Math.pow(projectedCorners, k)) / factorial(k);
    const probCornOver = (k) => {
      let sum = 0;
      for (let i = 0; i <= k; i++) {
        sum += pCorn(i);
      }
      return Math.max(0, Math.min(1, 1 - sum));
    };

    const pCards = (k) => (Math.exp(-totalYellow) * Math.pow(totalYellow, k)) / factorial(k);
    const probCardsOver = (k) => {
      let sum = 0;
      for (let i = 0; i <= k; i++) {
        sum += pCards(i);
      }
      return Math.max(0, Math.min(1, 1 - sum));
    };

    const redCardProb = 1 - Math.exp(-totalRed);
    
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
        category: 'Dupla Chance',
        items: [
          { label: 'Casa ou Empate (1X)', prob: stats.probHome + stats.probDraw, odd: getOdd(stats.probHome + stats.probDraw), market: 'Dupla Chance' },
          { label: 'Fora ou Empate (X2)', prob: stats.probAway + stats.probDraw, odd: getOdd(stats.probAway + stats.probDraw), market: 'Dupla Chance' },
          { label: 'Casa ou Fora (12)', prob: stats.probHome + stats.probAway, odd: getOdd(stats.probHome + stats.probAway), market: 'Dupla Chance' }
        ]
      },
      {
        category: 'Total de Gols (FT)',
        items: [
          { label: 'Mais de 0.5 Gols', prob: stats.probOver05, odd: getOdd(stats.probOver05), market: 'Gols' },
          { label: 'Mais de 1.5 Gols', prob: stats.probOver15, odd: getOdd(stats.probOver15), market: 'Gols' },
          { label: 'Mais de 2.5 Gols', prob: stats.probOver25, odd: getOdd(stats.probOver25), market: 'Gols' },
          { label: 'Mais de 3.5 Gols', prob: stats.probOver35, odd: getOdd(stats.probOver35), market: 'Gols' },
          { label: 'Ambos Marcam (Sim)', prob: stats.probBtts, odd: getOdd(stats.probBtts), market: 'Gols' },
          { label: 'Ambos Marcam (Não)', prob: Math.max(0, 1 - stats.probBtts), odd: getOdd(Math.max(0, 1 - stats.probBtts)), market: 'Gols' }
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
          { label: 'Amarelos Acima de 1.5', prob: probCardsOver(1), odd: getOdd(probCardsOver(1)), market: 'Cartões' },
          { label: 'Amarelos Acima de 2.5', prob: probCardsOver(2), odd: getOdd(probCardsOver(2)), market: 'Cartões' },
          { label: 'Amarelos Acima de 3.5', prob: probCardsOver(3), odd: getOdd(probCardsOver(3)), market: 'Cartões' },
          { label: 'Amarelos Acima de 4.5', prob: probCardsOver(4), odd: getOdd(probCardsOver(4)), market: 'Cartões' },
          { label: 'Amarelos Abaixo de 3.5', prob: Math.max(0, 1 - probCardsOver(3)), odd: getOdd(Math.max(0, 1 - probCardsOver(3))), market: 'Cartões' },
          { label: 'Amarelos Abaixo de 4.5', prob: Math.max(0, 1 - probCardsOver(4)), odd: getOdd(Math.max(0, 1 - probCardsOver(4))), market: 'Cartões' },
          { label: 'Amarelos Abaixo de 5.5', prob: Math.max(0, 1 - probCardsOver(5)), odd: getOdd(Math.max(0, 1 - probCardsOver(5))), market: 'Cartões' },
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
      if (!t.description) return false;
      const isPalpite = t.description.startsWith('[Palpite] ');
      const isApostaCriada = t.description.startsWith('[Aposta Criada] ');
      if (!isPalpite && !isApostaCriada) return false;
      
      const prefix = isPalpite ? '[Palpite] ' : '[Aposta Criada] ';
      const matchName = t.description.replace(prefix, '').split(' (')[0];
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
      const isPalpite = t.description.startsWith('[Palpite] ');
      const prefix = isPalpite ? '[Palpite] ' : '[Aposta Criada] ';
      const matchName = t.description.replace(prefix, '').split(' (')[0];
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
    let refunded = 0;
    let pending = 0;

    currentRoundBets.forEach(t => {
      totalInvested += t.amount;
      if (t.type === 'ganho') {
        if (t.odd === 1.0 && t.description && t.description.includes('[DEVOLVIDA]')) {
          refunded += 1;
        } else {
          netProfit += t.odd ? t.amount * (t.odd - 1) : t.amount;
          greens += 1;
        }
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
        refunded,
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
          const isPalpite = t.description.startsWith('[Palpite] ');
          const prefix = isPalpite ? '[Palpite] ' : '[Aposta Criada] ';
          const matchName = t.description.replace(prefix, '').split(' (')[0];
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
        let refunded = 0;
        let pending = 0;

        currentRoundBets.forEach(t => {
          totalInvested += t.amount;
          if (t.type === 'ganho') {
            if (t.odd === 1.0 && t.description && t.description.includes('[DEVOLVIDA]')) {
              refunded += 1;
            } else {
              netProfit += t.odd ? t.amount * (t.odd - 1) : t.amount;
              greens += 1;
            }
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
            refunded,
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
        const uniqueDates = [...new Set(pendingTxs.map(t => t.date).filter(Boolean))];
        if (uniqueDates.length === 0) return txList;

        const fetchPromises = uniqueDates.map(async (dateStr) => {
          try {
            const res = await fetch(`/api/football/fixtures?league=all&date=${dateStr}`);
            if (res.ok) {
              const data = await res.json();
              return data.fixtures || [];
            }
          } catch (e) {
            console.warn(`[AutoResolve] Falha ao buscar fixtures da data ${dateStr}:`, e);
          }
          return [];
        });

        const results = await Promise.all(fetchPromises);
        let allFixtures = [];
        results.forEach(fixtures => {
          allFixtures = [...allFixtures, ...fixtures];
        });

        if (allFixtures.length === 0) return txList;

        let updatedList = [...txList];
        let didUpdate = false;

        for (const t of pendingTxs) {
          if (!t.description) continue;
          
          let isPalpite = t.description.startsWith('[Palpite] ');
          let isApostaCriada = t.description.startsWith('[Aposta Criada] ');
          if (!isPalpite && !isApostaCriada) continue;

          const prefix = isPalpite ? '[Palpite] ' : '[Aposta Criada] ';
          const matchName = t.description.replace(prefix, '').split(' (')[0];
          const selectionsStr = t.description.split(' (')[1]?.replace(')', '') || '';
          
          const game = allFixtures.find(f => {
            const gameName = `${f.home.trim()} x ${f.away.trim()}`.toLowerCase();
            return gameName === matchName.trim().toLowerCase();
          });

          if (game && game.isFinished) {
            const gh = game.goalsHome;
            const ga = game.goalsAway;
            let isHit = true; // true = ganho, false = perda, null = reembolso (devolvida)

            const selections = selectionsStr.split(',').map(s => s.trim()).filter(Boolean);
            if (selections.length === 0) {
              isHit = false;
            } else {
              let hasRefund = false;
              for (const sel of selections) {
                const res = evaluateSelection(sel, gh, ga);
                if (res === false) {
                  isHit = false;
                  hasRefund = false;
                  break;
                } else if (res === null) {
                  hasRefund = true;
                }
              }
              if (isHit !== false && hasRefund) {
                isHit = null; // Aposta devolvida (anulada)
              }
            }

            const resolvedType = isHit === false ? 'perda' : 'ganho';
            const finalOdd = isHit === null ? 1.0 : t.odd;

            t.type = resolvedType;
            t.odd = finalOdd;
            if (isHit === null && !t.description.includes('[DEVOLVIDA]')) {
              t.description = t.description + ' [DEVOLVIDA]';
            }
            didUpdate = true;

            // Atualizar no Supabase
            if (supabase) {
              await supabase
                .from('banca_transactions')
                .update({ 
                  type: resolvedType, 
                  odd: finalOdd,
                  description: t.description
                })
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
  }, [user, selectedDate, selectedLeague]);

  const myStats = useMemo(() => {
    // Filtrar apenas transações associadas a palpites da página (iniciam com [Palpite] ou [Aposta Criada])
    const followedBets = transactions.filter(t => t.description && (t.description.startsWith('[Palpite]') || t.description.startsWith('[Aposta Criada]')));
    
    // Excluir apostas devolvidas (odd = 1.0 e descrição contendo [DEVOLVIDA]) da taxa de acerto para não distorcer a estatística de vitórias
    const resolvedBets = followedBets.filter(t => 
      (t.type === 'ganho' || t.type === 'perda') && 
      !(t.odd === 1.0 && t.description && t.description.includes('[DEVOLVIDA]'))
    );
    
    const totalBets = resolvedBets.length;
    const wins = resolvedBets.filter(t => t.type === 'ganho').length;
    const losses = resolvedBets.filter(t => t.type === 'perda').length;
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
    
    // Contar devolvidas separadamente para exibir como informação extra
    const refunds = followedBets.filter(t => t.type === 'ganho' && t.odd === 1.0 && t.description && t.description.includes('[DEVOLVIDA]')).length;
    
    return {
      totalBets,
      wins,
      losses,
      refunds,
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

  const getBetsForGame = (home, away) => {
    if (!transactions || transactions.length === 0) return [];
    const cleanHome = home.trim().toLowerCase();
    const cleanAway = away.trim().toLowerCase();
    return transactions.filter(t => {
      if (!t.description) return false;
      const desc = t.description.toLowerCase();
      const isPalpite = desc.startsWith('[palpite]');
      const isApostaCriada = desc.startsWith('[aposta criada]');
      if (!isPalpite && !isApostaCriada) return false;
      return desc.includes(cleanHome) && desc.includes(cleanAway);
    });
  };

  const handleConfirmFollow = async (game) => {
    if (!followAmount || Number(followAmount) <= 0) return;
    
    const amount = Number(followAmount);
    const odd = followOdd ? Number(followOdd) : (game.stats.bestTip.prob ? Number((1 / game.stats.bestTip.prob).toFixed(2)) : 2.0);
    const bestTip = game.stats.bestTip.selection;
    const desc = `[Palpite] ${game.home} x ${game.away} (${bestTip})`;
    
    let type = 'pendente';
    let followOddVal = odd;
    let followDesc = desc;
    if (game.isFinished) {
      const gh = game.goalsHome;
      const ga = game.goalsAway;
      const isHit = evaluateSelection(bestTip, gh, ga); // true = ganho, false = perda, null = reembolso (devolvida)

      type = isHit === false ? 'perda' : 'ganho';
      if (isHit === null) {
        followOddVal = 1.0;
        followDesc = desc + ' [DEVOLVIDA]';
      }
    }

    const newTx = {
      date: getLocalDateString(),
      type,
      amount,
      description: followDesc,
      odd: followOddVal
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
      const updated = [savedTx, ...transactions];
      setTransactions(updated);
      localStorage.setItem(userTxsKey, JSON.stringify(updated));
      showToast('Palpite registrado com sucesso no seu Controle de Banca!', 'success');
    }

    setActiveFollowId(null);
  };


  useEffect(() => {
    const fetchFixtures = async () => {
      setPageLoading(true);
      setApiError(null);
      try {
        let allFixtures = [];
        let primaryRound = 'Várias';

        if (selectedLeague === 'all') {
          const response = await fetch(`/api/football/fixtures?league=all&date=${selectedDate}`);
          if (!response.ok) throw new Error('API response not ok');
          const data = await response.json();
          const activeLeagueIds = new Set(activeLeagues.map(l => String(l.id)));
          allFixtures = (data.fixtures || []).filter(f => activeLeagueIds.has(String(f.sourceLeagueId)));
          primaryRound = data.round || 'Várias';
        } else {
          const response = await fetch(`/api/football/fixtures?league=${selectedLeague}&date=${selectedDate}&all=true`);
          if (!response.ok) throw new Error('API response not ok');
          const data = await response.json();
          allFixtures = (data.fixtures || []).map(f => ({ ...f, sourceLeagueId: selectedLeague }));
          primaryRound = data.round || '?';
        }

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
        setRoundInfo({ round: primaryRound, season: '2026' });
      } catch (err) {
        console.error('Erro ao buscar jogos:', err);
        setApiError('Falha ao conectar com a API de futebol.');
      } finally {
        setPageLoading(false);
      }
    };

    fetchFixtures();
  }, [selectedLeague, selectedDate, activeLeagues]);

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
          Fazer Upgrade Agora ⚡
        </button>
      </div>
    );
  }

  return (
    <div className="palpites-container">
      
      <header style={{ marginBottom: '20px', paddingTop: '16px' }}>
        <div className="palpites-title-container" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Trophy color="#FFD700" size={28} style={{ flexShrink: 0 }} />
          <h1 className="page-title" style={{ fontSize: '1.8rem', margin: 0 }}>Central de Palpites</h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          <p style={{ color: '#888', margin: 0, fontSize: '0.95rem', lineHeight: '1.4' }}>
            Gerencie e acompanhe prognósticos automáticos e suas próprias apostas criadas via Poisson.
          </p>
        </div>
      </header>

      <>
          {/* Seletores de Liga e Data (Layout Organizado e Responsivo) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div className="league-buttons-container">
              {[
                { id: 'all', name: 'Todas', iconType: 'emoji', icon: '⚽' },
                ...activeLeagues.map(liga => ({
                  id: liga.id,
                  name: liga.name,
                  iconType: 'image',
                  icon: getLeagueLogoUrl(liga.id)
                }))
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
                      border: isActive ? '1px solid #ff8c00' : '1px solid #CCFF00',
                      background: isActive ? '#ff8c00' : '#CCFF00',
                      color: '#000',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 0 10px rgba(255, 140, 0, 0.35)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = '#000';
                        e.currentTarget.style.borderColor = '#b3e600';
                        e.currentTarget.style.background = '#b3e600';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = '#000';
                        e.currentTarget.style.borderColor = '#CCFF00';
                        e.currentTarget.style.background = '#CCFF00';
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
              
              {(() => {
                const formatDateBR = (dateStr) => {
                  if (!dateStr) return '';
                  const parts = dateStr.split('-');
                  if (parts.length !== 3) return dateStr;
                  const [year, month, day] = parts;
                  return `${day}/${month}/${year}`;
                };
                return (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <button style={{
                      padding: '8px 12px',
                      background: '#161622',
                      border: '1px solid #27272a',
                      color: '#fff',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      outline: 'none'
                    }}>
                      <span style={{ color: 'var(--brand-neon)' }}>{formatDateBR(selectedDate)}</span>
                      <span>🗓️</span>
                    </button>
                    <input 
                      type="date" 
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                );
              })()}

              {currentRoundBets.length > 0 && (
                <button
                  onClick={handleSendRoundSummary}
                  disabled={sendingSummary}
                  style={{
                    background: 'transparent',
                    color: 'var(--brand-neon)',
                    border: '1px solid var(--brand-neon)',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    fontSize: '0.75rem',
                    cursor: sendingSummary ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  title={`Você seguiu ${currentRoundBets.length} palpites nesta rodada. Clique para enviar o balanço parcial/final no Telegram.`}
                >
                  {sendingSummary ? (
                    <>Enviando...</>
                  ) : (
                    <>Enviar Balanço ({currentRoundBets.length}) 🤖</>
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
                  refunds: myStats.refunds || 0,
                  subtextRate: `Base: ${myStats.totalBets} resolvidos${(myStats.refunds || 0) > 0 ? ` (+${myStats.refunds} devolvidos)` : ''}`,
                  subtextRoi: `Volume: R$ ${myStats.totalAmountBet.toFixed(2)}`,
                  subtextResult: `Últimas rodadas ativas`
                }
              : {
                  hitRate: dbStats.hitRate,
                  roi: dbStats.roi,
                  greens: dbStats.greens,
                  reds: dbStats.reds,
                  subtextRate: dbStats.subtextRate,
                  subtextRoi: dbStats.subtextRoi,
                  subtextResult: dbStats.subtextResult
                };

            return (
              <div className="palpites-kpi-grid">
                <div className="palpites-kpi-card" style={{ borderRadius: '8px' }}>
                  <div className="kpi-title">Taxa de Acerto Geral</div>
                  <div className="kpi-value">{currentStats.hitRate}</div>
                  <div className="kpi-subtext">{currentStats.subtextRate}</div>
                </div>

                <div className="palpites-kpi-card" style={{ borderRadius: '8px' }}>
                  <div className="kpi-title">ROI (Retorno do Mês)</div>
                  <div className="kpi-value" style={{ color: 'var(--brand-neon)' }}>{currentStats.roi}</div>
                  <div className="kpi-subtext">{currentStats.subtextRoi}</div>
                </div>

                <div className="palpites-kpi-card" style={{ borderRadius: '8px' }}>
                  <div className="kpi-title">Palpites Verdes / Vermelhos</div>
                  <div className="kpi-value" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ color: '#4CAF50' }}>{currentStats.greens} 🟢</span>
                    <span style={{ fontSize: '1.1rem', color: '#444' }}>/</span>
                    <span style={{ color: '#ff4d4d' }}>{currentStats.reds} 🔴</span>
                  </div>
                  <div className="kpi-subtext">{currentStats.subtextResult}</div>
                </div>

                <div className="palpites-kpi-card" style={{ borderRadius: '8px' }}>
                  <div className="kpi-title">Mercado mais Lucrativo</div>
                  <div className="kpi-value" style={{ fontSize: statsMode === 'minhas' ? '1.25rem' : '1.1rem', wordBreak: 'break-word' }}>
                    {statsMode === 'minhas' ? 'Mais de 2.5 Gols' : dbStats.mostProfitableMarket}
                  </div>
                  <div className="kpi-subtext" style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>
                    Taxa de Acerto: {statsMode === 'minhas' ? '84.1%' : dbStats.marketHitRate}
                  </div>
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

          <div className="palpites-scroll-container no-scrollbar" style={{ paddingBottom: '60px' }}>
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

              const gameBets = getBetsForGame(game.home, game.away);
              const cornStatsObj = getCornersStats(game.home, game.away, game.homeXG, game.awayXG);
              const cardsStatsObj = getCardsStats(game.home, game.away);

              return (
                <div key={game.id} className="game-card-wrapper" style={{ 
                  background: '#111116', 
                  borderRadius: '12px', 
                  border: game.isLive ? '1px solid #4CAF50' : game.isFinished ? '1px solid #ff4d4d' : hasGameEV ? '1px solid var(--brand-neon)' : '1px solid #222', 
                  borderLeft: game.isLive ? '6px solid #4CAF50' : game.isFinished ? '6px solid #ff4d4d' : hasGameEV ? '6px solid var(--brand-neon)' : '6px solid #4CAF50',
                  boxShadow: hasGameEV ? '0 0 15px rgba(204, 255, 0, 0.08)' : 'none',
                  overflow: 'hidden',
                  opacity: game.isFinished ? 0.75 : 1,
                  flexShrink: 0,
                  height: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  padding: '16px',
                  boxSizing: 'border-box'
                }}>
                  {/* Card Main content: Left and Right Columns */}
                  <div className="game-card-inner-grid">
                    
                    {/* Left Column: Match header, League, Pitch, Score, Narrative */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      
                      {/* Match Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#888', fontWeight: 'bold', fontSize: '0.8rem' }}>{game.date}</span>
                        {game.isLive && (
                          <span style={{ background: '#ff4444', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 'bold', animation: 'pulse 1.5s infinite' }}>
                            🔴 AO VIVO • {game.minute}'
                          </span>
                        )}
                        {game.isFinished && (
                          <span style={{ background: '#444', color: '#aaa', padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 'bold' }}>
                            ENCERRADO
                          </span>
                        )}
                        {hasGameEV && <span className="badge-neon" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>🔥 +EV</span>}
                      </div>

                      {/* Sport & League */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#666', fontSize: '0.72rem', fontWeight: 'bold', textTransform: 'uppercase' }}>FUTEBOL</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.02)', padding: '2px 6px', borderRadius: '4px', border: '1px solid #222' }}>
                          {(() => {
                            const logoUrl = getLeagueLogoUrl(game.sourceLeagueId || selectedLeague);
                            if (logoUrl) {
                              const isLocal = logoUrl.startsWith('/');
                              return (
                                <img 
                                  src={logoUrl} 
                                  alt="Campeonato Logo" 
                                  style={isLocal ? { width: '14px', height: '14px', objectFit: 'contain' } : { width: '14px', height: '10px', objectFit: 'cover', borderRadius: '2px' }}
                                />
                              );
                            }
                            return <Trophy size={12} color="var(--brand-neon)" />;
                          })()}
                          <span style={{ fontSize: '0.72rem', color: '#fff', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                            {getLeagueNameDynamic(game.sourceLeagueId || selectedLeague)}
                          </span>
                        </div>
                        <span style={{ background: '#222', padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', color: '#aaa', fontWeight: 'bold' }}>R.{game.round}</span>
                      </div>

                      {/* Tactical Pitch (Only rendered when live) */}
                      {game.isLive && (() => {
                        const radar = getLiveMatchRadar(game);
                        let glowLeft = '50%';
                        let glowColor = 'rgba(204, 255, 0, 0.3)';
                        if (radar) {
                          if (radar.zone === 'away_box') {
                            glowLeft = '80%';
                            glowColor = 'rgba(255, 68, 68, 0.4)';
                          } else if (radar.zone === 'home_box') {
                            glowLeft = '20%';
                            glowColor = 'rgba(0, 210, 255, 0.4)';
                          }
                        }
                        
                        return (
                          <div className="tactical-pitch">
                            {/* Halfway line */}
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: '1px', background: 'rgba(255, 255, 255, 0.12)' }}></div>
                            {/* Center circle */}
                            <div style={{ position: 'absolute', top: '50%', left: '50%', width: '28px', height: '28px', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '50%', transform: 'translate(-50%, -50%)' }}></div>
                            {/* Left penalty box */}
                            <div style={{ position: 'absolute', left: 0, top: '20px', bottom: '20px', width: '22px', border: '1px solid rgba(255, 255, 255, 0.12)', borderLeft: 'none' }}></div>
                            {/* Right penalty box */}
                            <div style={{ position: 'absolute', right: 0, top: '20px', bottom: '20px', width: '22px', border: '1px solid rgba(255, 255, 255, 0.12)', borderRight: 'none' }}></div>
                            {/* Goal area left */}
                            <div style={{ position: 'absolute', left: 0, top: '34px', bottom: '34px', width: '8px', border: '1px solid rgba(255, 255, 255, 0.12)', borderLeft: 'none' }}></div>
                            {/* Goal area right */}
                            <div style={{ position: 'absolute', right: 0, top: '34px', bottom: '34px', width: '8px', border: '1px solid rgba(255, 255, 255, 0.12)', borderRight: 'none' }}></div>
                            {/* Attack/Glow Area */}
                            <div style={{
                              position: 'absolute',
                              top: '50%',
                              left: glowLeft,
                              width: '36px',
                              height: '36px',
                              background: `radial-gradient(circle, ${glowColor} 0%, rgba(0,0,0,0) 70%)`,
                              borderRadius: '50%',
                              transform: 'translate(-50%, -50%)',
                              pointerEvents: 'none',
                              animation: 'pulseHeat 2s infinite'
                            }}></div>
                            
                            {/* Small Live indicator stats overlay if live */}
                            {game.isLive && (
                              <div style={{
                                position: 'absolute',
                                bottom: '4px',
                                right: '4px',
                                background: 'rgba(0, 0, 0, 0.75)',
                                padding: '2px 4px',
                                borderRadius: '3px',
                                fontSize: '0.58rem',
                                color: 'var(--brand-neon)',
                                fontWeight: 'bold',
                                border: '1px solid rgba(255,255,255,0.1)'
                              }}>
                                📐 {liveStats[game.id]?.home?.corners + liveStats[game.id]?.away?.corners || 0}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Centered Score / VS */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '6px 0', width: '100%', boxSizing: 'border-box' }}>
                        <span className="team-name" style={{ textAlign: 'right', flex: 1 }}>
                          {game.home}
                        </span>
                        <img 
                          src={game.homeLogo || `https://ui-avatars.com/api/?name=${game.home}&background=222&color=fff&bold=true&size=32`} 
                          alt={game.home} 
                          style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}
                          onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${game.home}&background=222&color=fff&bold=true&size=32`; }}
                        />
                        {game.isLive || game.isFinished ? (
                          <span style={{ 
                            fontSize: '0.9rem', 
                            fontWeight: 'bold', 
                            color: '#fff', 
                            flexShrink: 0,
                            padding: '0 4px'
                          }}>
                            {game.goalsHome} x {game.goalsAway}
                          </span>
                        ) : (
                          <span style={{ 
                            fontSize: '0.85rem', 
                            fontWeight: 'bold', 
                            color: 'var(--brand-neon)', 
                            flexShrink: 0,
                            padding: '0 4px'
                          }}>
                            X
                          </span>
                        )}
                        <img 
                          src={game.awayLogo || `https://ui-avatars.com/api/?name=${game.away}&background=222&color=fff&bold=true&size=32`} 
                          alt={game.away} 
                          style={{ width: '20px', height: '14px', objectFit: 'cover', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}
                          onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${game.away}&background=222&color=fff&bold=true&size=32`; }}
                        />
                        <span className="team-name" style={{ textAlign: 'left', flex: 1 }}>
                          {game.away}
                        </span>
                      </div>

                      {/* Dashed Corners and Cards Indicator for Live games */}
                      {game.isLive && (() => {
                        const currentLiveStats = liveStats[game.id] || getSimulatedLiveStats(game) || {
                          home: { corners: 1, yellowCards: 1, redCards: 0 },
                          away: { corners: 6, yellowCards: 1, redCards: 0 }
                        };
                        return (
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '4px 8px',
                            border: '1px dashed #2d2d38',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            color: '#aaa',
                            width: '100%',
                            boxSizing: 'border-box',
                            marginTop: '2px',
                            background: 'rgba(255, 255, 255, 0.01)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '0.75rem' }}>📐</span>
                              <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>
                                {currentLiveStats.home.corners}-{currentLiveStats.away.corners}
                              </span>
                              <span style={{ color: '#666', fontSize: '0.62rem' }}>
                                ({Math.max(0, currentLiveStats.home.corners - 1)})
                              </span>
                            </div>
                            <div style={{ color: '#2d2d38' }}>|</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>🟨</span>
                              <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>
                                {currentLiveStats.home.yellowCards}-{currentLiveStats.away.yellowCards}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Live narrative if live */}
                      {game.isLive && (
                        <div style={{
                          fontSize: '0.72rem', 
                          color: '#bbb', 
                          fontStyle: 'italic',
                          lineHeight: '1.4',
                          marginTop: '4px',
                          padding: '0 4px'
                        }}>
                          <span style={{ color: '#ff4444', fontWeight: 'bold', marginRight: '6px' }}>• LIVE:</span>
                          {getLiveMatchRadar(game)?.statusText || 'Disputa intensa no meio de campo.'}
                        </div>
                      )}
                    </div>

                    {/* Right Column: Projections Sub-column and Suggestions/Bookmaker Sub-column */}
                    <div className="right-section-grid">
                      
                      {/* Projections Sub-column */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Mercado de Gols */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ fontSize: '0.68rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2px' }}>⚽ Mercado de Gols</div>
                          <div style={{ fontSize: '0.72rem', color: '#fff', display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                            <span style={{ color: '#aaa' }}>xG:</span>
                            <span style={{ fontWeight: 'bold' }}>{game.homeXG.toFixed(1)} v {game.awayXG.toFixed(1)}</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#fff', display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                            <span style={{ color: '#aaa' }}>Ambos Marcam:</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--brand-neon)' }}>{(game.stats.probBtts * 100).toFixed(0)}%</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#fff', display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                            <span style={{ color: '#aaa' }}>Mais de 2.5:</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--brand-neon)' }}>{(game.stats.probOver25 * 100).toFixed(0)}%</span>
                          </div>
                        </div>

                        {/* Projeção de Cantos */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px dashed #222', paddingTop: '6px' }}>
                          <div style={{ fontSize: '0.68rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2px' }}>📐 Projeção de Cantos</div>
                          <div style={{ fontSize: '0.72rem', color: '#fff', display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                            <span style={{ color: '#aaa' }}>Projetado:</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--brand-neon)' }}>{cornStatsObj.projected}</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#fff', display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                            <span style={{ color: '#aaa' }}>Casa (F/S):</span>
                            <span style={{ fontWeight: 'bold' }}>{cornStatsObj.home.feitos}/{cornStatsObj.home.sofridos}</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#fff', display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                            <span style={{ color: '#aaa' }}>Fora (F/S):</span>
                            <span style={{ fontWeight: 'bold' }}>{cornStatsObj.away.feitos}/{cornStatsObj.away.sofridos}</span>
                          </div>
                        </div>

                        {/* Projeção de Cartões */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px dashed #222', paddingTop: '6px' }}>
                          <div style={{ fontSize: '0.68rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2px' }}>🟨 Projeção de Cartões</div>
                          <div style={{ fontSize: '0.72rem', color: '#fff', display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                            <span style={{ color: '#aaa' }}>Total Amarelos:</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--brand-neon)' }}>{cardsStatsObj.totalYellow}</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#fff', display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                            <span style={{ color: '#aaa' }}>Casa (A/V):</span>
                            <span style={{ fontWeight: 'bold' }}>{cardsStatsObj.home.yellow}/{cardsStatsObj.home.red.toFixed(1)}</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#fff', display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                            <span style={{ color: '#aaa' }}>Fora (A/V):</span>
                            <span style={{ fontWeight: 'bold' }}>{cardsStatsObj.away.yellow}/{cardsStatsObj.away.red.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Suggestions & Action Sub-column */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'flex-start' }}>
                        
                        {/* SUGERIDO */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ fontSize: '0.62rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>Sugerido</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }} title={game.stats.bestTip.selection}>
                              {game.stats.bestTip.selection}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--brand-neon)', fontWeight: 'bold' }}>{(game.stats.bestTip.prob * 100).toFixed(0)}%</span>
                            <span style={{ background: '#4CAF50', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold', fontSize: '0.65rem' }}>
                              @{formatOdd(game.stats.bestTip.prob)}
                            </span>
                          </div>
                        </div>

                        {/* PROTEÇÃO */}
                        {game.stats.bestHandicapTip && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ fontSize: '0.62rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>Proteção</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span className="protection-text" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--brand-neon)' }} title={game.stats.bestHandicapTip.selection}>
                                {game.stats.bestHandicapTip.selection}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Action buttons row (📊, ⏱️, ⚙️, ⚡) */}
                        <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                          {/* 📊 Stats */}
                          <button
                            onClick={() => {
                              if (openStatsId === game.id) {
                                setOpenStatsId(null);
                              } else {
                                setOpenStatsId(game.id);
                                setActiveStatsTab('geral');
                              }
                            }}
                            title="Estatísticas e Projeções"
                            style={{
                              flex: 1,
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '4px',
                              background: openStatsId === game.id ? '#ff8c00' : '#222',
                              border: 'none',
                              color: '#fff',
                              cursor: 'pointer',
                              fontSize: '0.78rem'
                            }}
                          >
                            📊
                          </button>

                          {/* ⏱️ Follow */}
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
                            title="Seguir na Banca"
                            style={{
                              flex: 1,
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '4px',
                              background: isFollowed(game) ? '#4CAF50' : activeFollowId === game.id ? '#ff8c00' : '#222',
                              border: 'none',
                              color: '#fff',
                              cursor: isFollowed(game) ? 'not-allowed' : 'pointer',
                              fontSize: '0.78rem'
                            }}
                          >
                            ⏱️
                          </button>

                          {/* ⚙️ Builder */}
                          <button
                            onClick={() => {
                              setOpenBuilderGameId(game.id);
                              setBuilderSelections([]);
                            }}
                            title="Criar Aposta"
                            style={{
                              flex: 1,
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '4px',
                              background: '#222',
                              border: 'none',
                              color: '#fff',
                              cursor: 'pointer',
                              fontSize: '0.78rem'
                            }}
                          >
                            ⚙️
                          </button>

                          {/* ⚡ Send */}
                          <button 
                            onClick={() => handleBroadcast(game)}
                            disabled={loadingId === game.id || sentIds.has(game.id)}
                            title="Enviar Telegram"
                            style={{ 
                              flex: 1,
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '4px',
                              background: sentIds.has(game.id) ? '#333' : 'var(--brand-neon)', 
                              color: '#000', 
                              border: 'none', 
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              fontSize: '0.78rem'
                            }}
                          >
                            {loadingId === game.id ? (
                              <Loader2 size={10} className="spin" />
                            ) : (
                              '⚡'
                            )}
                          </button>
                        </div>

                        {/* Seguir Button */}
                        <button
                          onClick={() => {
                            if (isFollowed(game)) return;
                            setActiveFollowId(game.id);
                            setFollowOdd(bestBmOdd.toFixed(2));
                            setFollowAmount('50');
                          }}
                          disabled={isFollowed(game)}
                          style={{
                            width: '100%',
                            height: '28px',
                            borderRadius: '6px',
                            background: isFollowed(game) ? '#4CAF50' : 'var(--brand-neon)',
                            color: '#000',
                            fontWeight: 'bold',
                            fontSize: '0.75rem',
                            border: 'none',
                            cursor: isFollowed(game) ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            marginTop: '2px'
                          }}
                        >
                          {isFollowed(game) ? 'Seguido' : 'Seguir'}
                        </button>

                        {/* Bookmakers Grid */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '4px',
                          marginTop: '4px'
                        }}>
                          {bmOdds.map(bm => {
                            const getBookmakerStyles = (name, isBest) => {
                              const brandColors = {
                                'Bet365': { border: '#00a676', text: '#ffdf1b' },
                                'Betano': { border: '#f27022', text: '#f27022' },
                                'Pinnacle': { border: '#ff7300', text: '#ff7300' },
                                'Betfair': { border: '#ffc500', text: '#ffc500' }
                              };
                              const colors = brandColors[name] || { border: '#222', text: '#ccc' };
                              return {
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#111116',
                                border: isBest ? `1px solid var(--brand-neon)` : `1px solid ${colors.border}`,
                                padding: '4px 6px',
                                borderRadius: '4px',
                                cursor: isFollowed(game) ? 'not-allowed' : 'pointer',
                                fontSize: '0.62rem',
                                boxSizing: 'border-box',
                                boxShadow: isBest ? `0 0 6px ${colors.border}44` : 'none',
                                textCol: colors.text
                              };
                            };

                            const bmStyle = getBookmakerStyles(bm.name, bm.isBest);

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
                                  justifyContent: 'space-between',
                                  background: bmStyle.background,
                                  border: bmStyle.border,
                                  padding: bmStyle.padding,
                                  borderRadius: bmStyle.borderRadius,
                                  cursor: bmStyle.cursor,
                                  fontSize: bmStyle.fontSize,
                                  boxSizing: bmStyle.boxSizing,
                                  boxShadow: bmStyle.boxShadow
                                }}
                              >
                                {getBookmakerLogo(bm.name)}
                                <span style={{ fontWeight: 'bold', color: bm.isBest ? 'var(--brand-neon)' : bmStyle.textCol }}>
                                  @{bm.odd.toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Minhas Apostas (Registered Bets list, if any) */}
                  {gameBets.length > 0 && (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '4px', 
                      borderTop: '1px dashed #222', 
                      paddingTop: '6px', 
                      marginTop: '4px',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ fontSize: '0.62rem', color: 'var(--brand-neon)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2px' }}>🎯 Apostas Registradas</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
                        {gameBets.map(bet => {
                          const isWin = bet.type === 'ganho';
                          const isLoss = bet.type === 'perda';
                          const isRefund = bet.odd === 1.0 && bet.description && bet.description.includes('[DEVOLVIDA]');
                          let statusColor = '#ff9800';
                          if (isRefund) statusColor = '#2196f3';
                          else if (isWin) statusColor = '#4CAF50';
                          else if (isLoss) statusColor = '#f44336';
                          
                          let selectionText = bet.description;
                          const matchSel = bet.description.match(/\((.*?)\)/);
                          if (matchSel && matchSel[1]) selectionText = matchSel[1];

                          return (
                            <div key={bet.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', background: '#16161c', padding: '4px 8px', borderRadius: '4px', border: '1px solid #222' }}>
                              <span style={{ fontWeight: 'bold', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }} title={selectionText}>
                                {selectionText}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>R${bet.amount}</span>
                                <span style={{ color: statusColor, fontWeight: 'bold', fontSize: '0.62rem' }}>
                                  {isRefund ? 'DEV' : isWin ? 'WIN' : isLoss ? 'RED' : 'PEND'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Carousel Insights & Trends at the bottom */}
                  <div style={{ 
                    borderTop: '1px solid #222', 
                    paddingTop: '6px', 
                    marginTop: '4px',
                    width: '100%'
                  }}>
                    <CardInsights game={game} />
                  </div>

                  {/* inline Follow bankroll Panel */}
                  {activeFollowId === game.id && (
                    <div className="follow-panel" style={{
                      marginTop: '6px',
                      borderTop: '1px solid #222',
                      padding: '8px',
                      background: '#0d0d12',
                      borderRadius: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                          <label style={{ fontSize: '0.65rem', color: '#888', fontWeight: 'bold' }}>Valor da Aposta (R$)</label>
                          <input 
                            type="number"
                            value={followAmount}
                            onChange={(e) => setFollowAmount(e.target.value)}
                            placeholder="50"
                            style={{ 
                              background: '#161622', 
                              border: '1px solid #333', 
                              color: '#fff', 
                              padding: '6px 8px', 
                              borderRadius: '4px', 
                              width: '100%',
                              fontSize: '0.8rem',
                              outline: 'none'
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                          <label style={{ fontSize: '0.65rem', color: '#888', fontWeight: 'bold' }}>Odd Coletada</label>
                          <input 
                            type="number"
                            step="0.01"
                            value={followOdd}
                            onChange={(e) => setFollowOdd(e.target.value)}
                            placeholder="2.00"
                            style={{ 
                              background: '#161622', 
                              border: '1px solid #333', 
                              color: '#fff', 
                              padding: '6px 8px', 
                              borderRadius: '4px', 
                              width: '100%',
                              fontSize: '0.8rem',
                              outline: 'none'
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                        <button
                          onClick={() => handleConfirmFollow(game)}
                          style={{
                            flex: 2,
                            background: 'var(--brand-neon)',
                            color: '#000',
                            border: 'none',
                            padding: '8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          Confirmar Registro 🎯
                        </button>
                        <button
                          onClick={() => setActiveFollowId(null)}
                          style={{
                            flex: 1,
                            background: 'transparent',
                            color: '#aaa',
                            border: '1px solid #444',
                            padding: '8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          Cancelar
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
        
        const getTeamPlayersAndGoalkeeper = (teamName, isHome) => {
          const cachedGameSquad = squadsCache[game.id];
          if (cachedGameSquad) {
            const squad = isHome ? cachedGameSquad.home : cachedGameSquad.away;
            if (squad) {
              const gkName = squad.gk || (isHome ? 'Goleiro' : 'Goleiro');
              const baseScorers = squad.scorers && squad.scorers.length > 0 ? squad.scorers : ['Atacante 1', 'Atacante 2', 'Meio-Campo'];
              return {
                goalkeeper: { name: gkName + ' (Goleiro)', savesAvg: 3.2, saveRate: '75%' },
                scorers: [
                  { name: baseScorers[0] || 'Atacante 1', prob: 0.35, odd: 2.85 },
                  { name: baseScorers[1] || 'Atacante 2', prob: 0.28, odd: 3.50 },
                  { name: baseScorers[2] || 'Meio-Campo', prob: 0.22, odd: 4.50 }
                ]
              };
            }
          }

          const norm = teamName.toLowerCase();
          
          if (norm.includes('palmeiras')) {
            return {
              goalkeeper: { name: 'Weverton', savesAvg: 3.1, saveRate: '76%' },
              scorers: [
                { name: 'Flaco López', prob: 0.38, odd: 2.60 },
                { name: 'Raphael Veiga', prob: 0.35, odd: 2.85 },
                { name: 'Estêvão', prob: 0.32, odd: 3.10 }
              ]
            };
          }
          if (norm.includes('flamengo')) {
            return {
              goalkeeper: { name: 'Rossi', savesAvg: 2.8, saveRate: '78%' },
              scorers: [
                { name: 'Pedro', prob: 0.45, odd: 2.20 },
                { name: 'Gabigol', prob: 0.35, odd: 2.85 },
                { name: 'Arrascaeta', prob: 0.28, odd: 3.50 }
              ]
            };
          }
          if (norm.includes('são paulo') || norm.includes('sao paulo')) {
            return {
              goalkeeper: { name: 'Rafael', savesAvg: 3.3, saveRate: '75%' },
              scorers: [
                { name: 'Jonathan Calleri', prob: 0.38, odd: 2.60 },
                { name: 'Lucas Moura', prob: 0.30, odd: 3.30 },
                { name: 'Luciano', prob: 0.28, odd: 3.50 }
              ]
            };
          }
          if (norm.includes('botafogo')) {
            return {
              goalkeeper: { name: 'John Victor', savesAvg: 3.2, saveRate: '77%' },
              scorers: [
                { name: 'Tiquinho Soares', prob: 0.36, odd: 2.75 },
                { name: 'Luiz Henrique', prob: 0.32, odd: 3.10 },
                { name: 'Igor Jesus', prob: 0.34, odd: 2.94 }
              ]
            };
          }
          if (norm.includes('atlético-mg') || norm.includes('atletico mg') || norm.includes('atlético mineiro') || norm.includes('atletico mineiro') || (norm.includes('atletico') && norm.includes('mg'))) {
            return {
              goalkeeper: { name: 'Everson', savesAvg: 3.4, saveRate: '74%' },
              scorers: [
                { name: 'Hulk', prob: 0.40, odd: 2.50 },
                { name: 'Paulinho', prob: 0.35, odd: 2.85 },
                { name: 'Gustavo Scarpa', prob: 0.22, odd: 4.50 }
              ]
            };
          }
          if (norm.includes('vasco')) {
            return {
              goalkeeper: { name: 'Léo Jardim', savesAvg: 4.2, saveRate: '73%' },
              scorers: [
                { name: 'Pablo Vegetti', prob: 0.42, odd: 2.38 },
                { name: 'Philippe Coutinho', prob: 0.24, odd: 4.10 },
                { name: 'Dimitri Payet', prob: 0.22, odd: 4.50 }
              ]
            };
          }
          if (norm.includes('fluminense')) {
            return {
              goalkeeper: { name: 'Fábio', savesAvg: 3.8, saveRate: '72%' },
              scorers: [
                { name: 'Germán Cano', prob: 0.38, odd: 2.60 },
                { name: 'Jhon Arias', prob: 0.28, odd: 3.50 },
                { name: 'Kauã Elias', prob: 0.26, odd: 3.80 }
              ]
            };
          }
          if (norm.includes('corinthians')) {
            return {
              goalkeeper: { name: 'Hugo Souza', savesAvg: 3.6, saveRate: '73%' },
              scorers: [
                { name: 'Yuri Alberto', prob: 0.36, odd: 2.75 },
                { name: 'Memphis Depay', prob: 0.34, odd: 2.90 },
                { name: 'Rodrigo Garro', prob: 0.22, odd: 4.50 }
              ]
            };
          }
          if (norm.includes('gremio') || norm.includes('grêmio')) {
            return {
              goalkeeper: { name: 'Marchesín', savesAvg: 3.3, saveRate: '74%' },
              scorers: [
                { name: 'Martin Braithwaite', prob: 0.35, odd: 2.85 },
                { name: 'Franco Cristaldo', prob: 0.26, odd: 3.80 },
                { name: 'Diego Costa', prob: 0.28, odd: 3.50 }
              ]
            };
          }
          if (norm.includes('internacional')) {
            return {
              goalkeeper: { name: 'Sergio Rochet', savesAvg: 3.0, saveRate: '78%' },
              scorers: [
                { name: 'Rafael Borré', prob: 0.38, odd: 2.60 },
                { name: 'Enner Valencia', prob: 0.34, odd: 2.95 },
                { name: 'Alan Patrick', prob: 0.26, odd: 3.80 }
              ]
            };
          }
          if (norm.includes('bahia')) {
            return {
              goalkeeper: { name: 'Marcos Felipe', savesAvg: 3.2, saveRate: '74%' },
              scorers: [
                { name: 'Everaldo', prob: 0.34, odd: 2.90 },
                { name: 'Thaciano', prob: 0.28, odd: 3.50 },
                { name: 'Lucho Rodríguez', prob: 0.24, odd: 4.10 }
              ]
            };
          }
          if (norm.includes('fortaleza')) {
            return {
              goalkeeper: { name: 'João Ricardo', savesAvg: 3.5, saveRate: '76%' },
              scorers: [
                { name: 'Juan Lucero', prob: 0.40, odd: 2.50 },
                { name: 'Yago Pikachu', prob: 0.26, odd: 3.80 },
                { name: 'Breno Lopes', prob: 0.24, odd: 4.10 }
              ]
            };
          }
          if (norm.includes('cruzeiro')) {
            return {
              goalkeeper: { name: 'Cássio', savesAvg: 3.4, saveRate: '75%' },
              scorers: [
                { name: 'Kaio Jorge', prob: 0.32, odd: 3.10 },
                { name: 'Matheus Pereira', prob: 0.26, odd: 3.80 },
                { name: 'Juan Dinenno', prob: 0.28, odd: 3.50 }
              ]
            };
          }
          if (norm.includes('athletico') || norm.includes('atlético pr') || norm.includes('paranaense')) {
            return {
              goalkeeper: { name: 'Mycael', savesAvg: 3.5, saveRate: '75%' },
              scorers: [
                { name: 'Gonzalo Mastriani', prob: 0.36, odd: 2.75 },
                { name: 'Pablo', prob: 0.30, odd: 3.30 },
                { name: 'Bruno Zapelli', prob: 0.20, odd: 5.00 }
              ]
            };
          }
          if (norm.includes('bragantino') || norm.includes('red bull')) {
            return {
              goalkeeper: { name: 'Cleiton', savesAvg: 3.3, saveRate: '74%' },
              scorers: [
                { name: 'Eduardo Sasha', prob: 0.32, odd: 3.10 },
                { name: 'Thiago Borbas', prob: 0.28, odd: 3.50 },
                { name: 'Lincoln', prob: 0.20, odd: 5.00 }
              ]
            };
          }
          if (norm.includes('juventude')) {
            return {
              goalkeeper: { name: 'Gabriel Vasconcelos', savesAvg: 3.6, saveRate: '72%' },
              scorers: [
                { name: 'Gilberto', prob: 0.34, odd: 2.90 },
                { name: 'Jean Carlos', prob: 0.24, odd: 4.10 },
                { name: 'Erick Farias', prob: 0.22, odd: 4.50 }
              ]
            };
          }
          if (norm.includes('vitória') || norm.includes('vitoria')) {
            return {
              goalkeeper: { name: 'Lucas Arcanjo', savesAvg: 3.5, saveRate: '73%' },
              scorers: [
                { name: 'Alerrandro', prob: 0.35, odd: 2.85 },
                { name: 'Matheuzinho', prob: 0.24, odd: 4.10 },
                { name: 'Osvaldo', prob: 0.22, odd: 4.50 }
              ]
            };
          }
          if (norm.includes('criciúma') || norm.includes('criciuma')) {
            return {
              goalkeeper: { name: 'Gustavo Silva', savesAvg: 3.7, saveRate: '73%' },
              scorers: [
                { name: 'Yannick Bolasie', prob: 0.32, odd: 3.10 },
                { name: 'Matheusinho', prob: 0.24, odd: 4.10 },
                { name: 'Felipe Vizeu', prob: 0.26, odd: 3.80 }
              ]
            };
          }
          if (norm.includes('atlético-go') || norm.includes('atletico go') || norm.includes('goianiense')) {
            return {
              goalkeeper: { name: 'Ronaldo', savesAvg: 3.8, saveRate: '71%' },
              scorers: [
                { name: 'Luiz Fernando', prob: 0.30, odd: 3.30 },
                { name: 'Derek', prob: 0.24, odd: 4.10 },
                { name: 'Shaylon', prob: 0.20, odd: 5.00 }
              ]
            };
          }
          if (norm.includes('cuiabá') || norm.includes('cuiaba')) {
            return {
              goalkeeper: { name: 'Walter', savesAvg: 3.6, saveRate: '75%' },
              scorers: [
                { name: 'Isidro Pitta', prob: 0.36, odd: 2.75 },
                { name: 'Clayson', prob: 0.24, odd: 4.10 },
                { name: 'Derik Lacerda', prob: 0.20, odd: 5.00 }
              ]
            };
          }

          const hashString = (str) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
              hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            return Math.abs(hash);
          };

          const detectNationality = (name) => {
            const norm = name.toLowerCase();
            // Padrões de times da Argélia e países árabes/francófonos
            if (
              norm.startsWith('al ') || norm.startsWith('el ') || 
              norm.includes('belouizdad') || norm.includes('mouloudia') || norm.includes('constantine') ||
              norm.includes('setif') || norm.includes('kabylie') || norm.includes('alger') ||
              norm.includes('oran') || norm.includes('saoura') || norm.includes('chlef') ||
              norm.includes('khenchela') || norm.includes('magra') || norm.includes('souf') ||
              norm.includes('ben aknoun') || norm.includes('paradou') || norm.includes('usm ') ||
              norm.includes('mca ') || norm.includes('crb ') || norm.includes('jsa ') ||
              norm.includes('ess ') || norm.includes('aso ') || norm.includes('csc ') ||
              norm.includes('js kabylie') || norm.includes('mc alger') || norm.includes('cr belouizdad') ||
              norm.includes('usm alger') || norm.includes('es sétif') || norm.includes('cs constantine') ||
              norm.includes('js saoura') || norm.includes('mc oran')
            ) {
              return 'algerian';
            }
            // Padrões de times da Argentina e países hispânicos
            if (
              norm.includes('boca') || norm.includes('river') || norm.includes('racing') ||
              norm.includes('independiente') || norm.includes('san lorenzo') || norm.includes('estudiantes') ||
              norm.includes('velez') || norm.includes('lanus') || norm.includes('talleres') ||
              norm.includes('colon') || norm.includes('rosario') || norm.includes('newell') ||
              norm.includes('huracan') || norm.includes('banfield') || norm.includes('gimnasia') ||
              norm.includes('belgrano') || norm.includes('tucuman') || norm.includes('platense') ||
              norm.includes('defensa') || norm.includes('tigre') || norm.includes('sarmiento') ||
              norm.includes('barracas') || norm.includes('instituto') || norm.includes('riestra') ||
              norm.includes('godoy') || norm.includes('argentinos') || norm.includes('juniors') ||
              norm.includes('ind. rivadavia')
            ) {
              return 'argentine';
            }
            // Caso contenha termos comuns em espanhol mas não brasileiros
            if (
              norm.includes('deportivo') || norm.includes('atlético') || norm.includes('atletico') ||
              norm.includes('club atlético') || norm.includes('social y deportivo')
            ) {
              const brKeywords = ['goiás', 'goias', 'paranaense', 'mineiro', 'fluminense', 'paulista', 'carioca', 'bahia', 'fortaleza', 'ceará', 'ceara'];
              const isBr = brKeywords.some(kw => norm.includes(kw));
              if (!isBr) return 'argentine';
            }
            return 'brazilian';
          };

          const nation = detectNationality(teamName);
          let firstNames = [];
          let lastNames = [];

          if (nation === 'algerian') {
            firstNames = ['Yassine', 'Youcef', 'Sofiane', 'Amine', 'Riyad', 'Zakaria', 'Abdelkader', 'Karim', 'Slimane', 'Hichem', 'Oussama', 'Rami', 'Mehdi', 'Farid', 'Ishak', 'Houssem'];
            lastNames = ['Belaïli', 'Bounedjah', 'Mahrez', 'Slimani', 'Feghouli', 'Chaïbi', 'Atal', 'Aouar', 'Benzia', 'Gouiri', 'Bensebaini', 'Mandi', 'Hassan', 'Saidi', 'Khelifi', 'Brahimi', 'Saad'];
          } else if (nation === 'argentine') {
            firstNames = ['Santiago', 'Mateo', 'Lautaro', 'Enzo', 'Franco', 'Nicolas', 'Rodrigo', 'Gonzalo', 'Lucas', 'Federico', 'Bautista', 'Facundo', 'Tomas', 'Valentin', 'Julian', 'Sebastian'];
            lastNames = ['Fernandez', 'Rodriguez', 'Gonzalez', 'Garcia', 'Lopez', 'Martinez', 'Perez', 'Gomez', 'Sanchez', 'Diaz', 'Romero', 'Alvarez', 'Torres', 'Ruiz', 'Gimenez', 'Medina'];
          } else {
            firstNames = ['Lucas', 'Gabriel', 'Mateus', 'Felipe', 'Rodrigo', 'Bruno', 'Thiago', 'Diego', 'Rafael', 'Gustavo', 'Eduardo', 'Vinícius', 'Marcos', 'Arthur', 'Léo', 'Henrique'];
            lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Almeida', 'Nascimento', 'Costa', 'Pereira', 'Gomes', 'Martins', 'Araújo', 'Ribeiro', 'Barbosa'];
          }

          const hashVal = hashString(teamName);
          const getPlayerName = (index) => {
            const firstIdx = (hashVal + index * 7) % firstNames.length;
            const lastIdx = (hashVal + index * 13) % lastNames.length;
            return `${firstNames[firstIdx]} ${lastNames[lastIdx]}`;
          };

          const gkName = getPlayerName(0);
          const scorer1 = getPlayerName(1);
          const scorer2 = getPlayerName(2);
          const scorer3 = getPlayerName(3);

          return {
            goalkeeper: { name: gkName + ' (Goleiro)', savesAvg: 3.2, saveRate: '74%' },
            scorers: [
              { name: scorer1, prob: 0.32, odd: 3.10 },
              { name: scorer2, prob: 0.24, odd: 4.10 },
              { name: scorer3, prob: 0.18, odd: 5.50 }
            ]
          };
        };

        const homeSquad = getTeamPlayersAndGoalkeeper(game.home, true);
        const awaySquad = getTeamPlayersAndGoalkeeper(game.away, false);

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
                maxWidth: '820px',
                height: '90vh',
                maxHeight: '90vh',
                background: 'linear-gradient(135deg, #111115, #14141d)',
                border: '1px solid #333',
                borderTop: '4px solid var(--brand-neon)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                position: 'relative',
                animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                overflow: 'hidden'
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
                  transition: 'color 0.2s',
                  zIndex: 10
                }}
                onMouseOver={(e) => e.target.style.color = '#fff'}
                onMouseOut={(e) => e.target.style.color = '#aaa'}
              >
                ✕
              </button>

              {/* Cabeçalho Fixo */}
              <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #222', paddingBottom: '8px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.5rem' }}>📊</span>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>
                      Radar de Estatísticas
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#888', margin: '2px 0 0 0', fontFamily: 'monospace' }}>
                      Poisson & Historical Performance Projections
                    </p>
                  </div>
                </div>

                {/* Sub-cabeçalho de times em cima de suas respectivas colunas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed #333' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img 
                      src={game.homeLogo || `https://ui-avatars.com/api/?name=${game.home}&background=222&color=fff&rounded=true&bold=true&size=32`} 
                      alt={game.home} 
                      style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                    />
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--brand-neon)' }}>
                      {game.home} (Casa)
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img 
                      src={game.awayLogo || `https://ui-avatars.com/api/?name=${game.away}&background=222&color=fff&rounded=true&bold=true&size=32`} 
                      alt={game.away} 
                      style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                    />
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--brand-neon)' }}>
                      {game.away} (Fora)
                    </span>
                  </div>
                </div>
              </div>

              {/* 1. Entrada Recomendada (Também Fixo no Topo) */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                background: 'rgba(204, 255, 0, 0.04)',
                border: '1px solid rgba(204, 255, 0, 0.15)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.85rem',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold', fontSize: '0.95rem' }}>🎯 Entrada Recomendada:</span>
                  <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.9rem' }}>{game.stats.bestTip.selection}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#aaa' }}>Confiança: <strong style={{ color: '#4CAF50' }}>{(game.stats.bestTip.prob * 100).toFixed(0)}%</strong></span>
                  <span style={{ background: 'var(--brand-neon)', color: '#000', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.78rem' }}>
                    @{ (1 / game.stats.bestTip.prob).toFixed(2) }
                  </span>
                </div>
              </div>

              {/* Corpo Rolável (Rolagem começa aqui) */}
              {(() => {
                const detailedProjections = getBuilderMarkets(game);
                
                // Filtrar somente Oportunidades de Gols & Resultado Final (FT), excluindo cantos/cartões
                const opportunities = [];
                detailedProjections.forEach(cat => {
                  if (cat.category.includes('Cartões') || cat.category.includes('Escanteios')) return;
                  cat.items.forEach(item => {
                    if (item.prob >= 0.60) {
                      opportunities.push(item);
                    }
                  });
                });
                opportunities.sort((a, b) => b.prob - a.prob);

                // Helper para cálculo dinâmico de Handicaps até 2.0
                const scoreMatrix = game.stats.scoreMatrix;
                const calculateAH = (isHome, line) => {
                  if (scoreMatrix) {
                    return calculateDynamicHandicapProb(scoreMatrix, isHome, line);
                  }
                  // Fallbacks
                  if (line === 0.0) return isHome ? game.stats.probCasaAH00 : game.stats.probForaAH00;
                  if (line === -0.5) return isHome ? game.stats.probHome : game.stats.probAway;
                  if (line === 0.5) return isHome ? (game.stats.probHome + game.stats.probDraw) : (game.stats.probAway + game.stats.probDraw);
                  if (line === -1.0) return isHome ? game.stats.probCasaAH10 : game.stats.probForaAH10;
                  if (line === 1.0) return isHome ? game.stats.probCasaAH10Pos : game.stats.probForaAH10Pos;
                  if (line === -1.5) return isHome ? game.stats.probCasaAH15 : game.stats.probForaAH15;
                  if (line === 1.5) return isHome ? game.stats.probAH15Pos_home : game.stats.probAH15Pos_away;
                  if (line === -2.0) return isHome ? (game.stats.probCasaAH15 * 0.7) : (game.stats.probForaAH15 * 0.7);
                  if (line === 2.0) return isHome ? (game.stats.probAH15Pos_home + 0.05) : (game.stats.probAH15Pos_away + 0.05);
                  return 0.5;
                };

                const homeHandicaps = [
                  { label: `AH 0.0`, prob: calculateAH(true, 0.0) },
                  { label: `AH -0.5`, prob: calculateAH(true, -0.5) },
                  { label: `AH +0.5`, prob: calculateAH(true, 0.5) },
                  { label: `AH -1.0`, prob: calculateAH(true, -1.0) },
                  { label: `AH +1.0`, prob: calculateAH(true, 1.0) },
                  { label: `AH -1.5`, prob: calculateAH(true, -1.5) },
                  { label: `AH +1.5`, prob: calculateAH(true, 1.5) },
                  { label: `AH -2.0`, prob: calculateAH(true, -2.0) },
                  { label: `AH +2.0`, prob: calculateAH(true, 2.0) }
                ];

                const awayHandicaps = [
                  { label: `AH 0.0`, prob: calculateAH(false, 0.0) },
                  { label: `AH -0.5`, prob: calculateAH(false, -0.5) },
                  { label: `AH +0.5`, prob: calculateAH(false, 0.5) },
                  { label: `AH -1.0`, prob: calculateAH(false, -1.0) },
                  { label: `AH +1.0`, prob: calculateAH(false, 1.0) },
                  { label: `AH -1.5`, prob: calculateAH(false, -1.5) },
                  { label: `AH +1.5`, prob: calculateAH(false, 1.5) },
                  { label: `AH -2.0`, prob: calculateAH(false, -2.0) },
                  { label: `AH +2.0`, prob: calculateAH(false, 2.0) }
                ];

                return (
                  <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', paddingRight: '6px' }}>
                    
                    {/* 2. PROBABILIDADES DE RESULTADO E GOLS */}
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 'bold', color: 'var(--brand-neon)', borderBottom: '1px solid #333', paddingBottom: '6px', marginBottom: '12px' }}>
                        📈 Probabilidades de Resultado & Gols (Poisson)
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        {/* Mandante */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', paddingBottom: '4px', borderBottom: '1px solid #1a1a24' }}>
                            <span>Vitória (Poisson):</span>
                            <span style={{ fontWeight: 'bold', color: game.stats.probHome >= 0.4 ? 'var(--brand-neon)' : '#fff' }}>{(game.stats.probHome * 100).toFixed(0)}%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', paddingBottom: '4px', borderBottom: '1px solid #1a1a24' }}>
                            <span>xG Projetado:</span>
                            <span style={{ fontWeight: 'bold', color: '#fff' }}>{game.homeXG.toFixed(1)} Gols</span>
                          </div>
                        </div>

                        {/* Visitante */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', paddingBottom: '4px', borderBottom: '1px solid #1a1a24' }}>
                            <span>Vitória (Poisson):</span>
                            <span style={{ fontWeight: 'bold', color: game.stats.probAway >= 0.4 ? 'var(--brand-neon)' : '#fff' }}>{(game.stats.probAway * 100).toFixed(0)}%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', paddingBottom: '4px', borderBottom: '1px solid #1a1a24' }}>
                            <span>xG Projetado:</span>
                            <span style={{ fontWeight: 'bold', color: '#fff' }}>{game.awayXG.toFixed(1)} Gols</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. PROJEÇÕES DE HANDICAP ASIÁTICO (ATÉ 2.0) */}
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 'bold', color: 'var(--brand-neon)', borderBottom: '1px solid #333', paddingBottom: '6px', marginBottom: '12px' }}>
                        ⚖️ Projeções de Handicap Asiático
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        
                        {/* Handicap Casa */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ color: '#888', borderBottom: '1px solid #222' }}>
                                <th style={{ padding: '4px' }}>Linha</th>
                                <th style={{ padding: '4px' }}>Probabilidade</th>
                                <th style={{ padding: '4px', textAlign: 'right' }}>Odd Justa</th>
                              </tr>
                            </thead>
                            <tbody>
                              {homeHandicaps.map((item, idx) => {
                                const odd = item.prob > 0 ? (1 / item.prob) : 99.0;
                                const fairOdd = Math.min(99.0, odd).toFixed(2);
                                return (
                                  <tr key={idx} style={{ borderBottom: '1px solid #1a1a24' }}>
                                    <td style={{ padding: '6px 4px', fontWeight: 'bold', color: '#fff' }}>{item.label}</td>
                                    <td style={{ padding: '6px 4px', color: '#4CAF50', fontWeight: 'bold' }}>{(item.prob * 100).toFixed(0)}%</td>
                                    <td style={{ padding: '6px 4px', color: 'var(--brand-neon)', fontWeight: 'bold', textAlign: 'right' }}>@{fairOdd}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Handicap Fora */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ color: '#888', borderBottom: '1px solid #222' }}>
                                <th style={{ padding: '4px' }}>Linha</th>
                                <th style={{ padding: '4px' }}>Probabilidade</th>
                                <th style={{ padding: '4px', textAlign: 'right' }}>Odd Justa</th>
                              </tr>
                            </thead>
                            <tbody>
                              {awayHandicaps.map((item, idx) => {
                                const odd = item.prob > 0 ? (1 / item.prob) : 99.0;
                                const fairOdd = Math.min(99.0, odd).toFixed(2);
                                return (
                                  <tr key={idx} style={{ borderBottom: '1px solid #1a1a24' }}>
                                    <td style={{ padding: '6px 4px', fontWeight: 'bold', color: '#fff' }}>{item.label}</td>
                                    <td style={{ padding: '6px 4px', color: '#4CAF50', fontWeight: 'bold' }}>{(item.prob * 100).toFixed(0)}%</td>
                                    <td style={{ padding: '6px 4px', color: 'var(--brand-neon)', fontWeight: 'bold', textAlign: 'right' }}>@{fairOdd}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                      </div>
                    </div>

                    {/* 4. PROJEÇÃO DE ESCANTEIOS */}
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 'bold', color: 'var(--brand-neon)', borderBottom: '1px solid #333', paddingBottom: '6px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>📐 Projeção de Escanteios (Cantos)</span>
                        <span style={{ fontSize: '0.75rem', color: '#aaa' }}>
                          Total Confronto: <strong style={{ color: 'var(--brand-neon)' }}>{corn.projected} Cantos</strong>
                        </span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        {/* Mandante */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', borderBottom: '1px solid #1a1a24', paddingBottom: '4px' }}>
                            <span>Cantos Feitos:</span>
                            <span style={{ fontWeight: 'bold', color: '#fff' }}>{corn.home.feitos}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', borderBottom: '1px solid #1a1a24', paddingBottom: '4px' }}>
                            <span>Cantos Sofridos:</span>
                            <span style={{ fontWeight: 'bold', color: '#fff' }}>{corn.home.sofridos}</span>
                          </div>
                        </div>

                        {/* Visitante */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', borderBottom: '1px solid #1a1a24', paddingBottom: '4px' }}>
                            <span>Cantos Feitos:</span>
                            <span style={{ fontWeight: 'bold', color: '#fff' }}>{corn.away.feitos}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', borderBottom: '1px solid #1a1a24', paddingBottom: '4px' }}>
                            <span>Cantos Sofridos:</span>
                            <span style={{ fontWeight: 'bold', color: '#fff' }}>{corn.away.sofridos}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 5. PROJEÇÃO DE CARTÕES */}
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 'bold', color: 'var(--brand-neon)', borderBottom: '1px solid #333', paddingBottom: '6px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>🎴 Estimativa de Cartões</span>
                        <span style={{ fontSize: '0.75rem', color: '#aaa' }}>
                          Total Projetado: <strong style={{ color: '#ffd700' }}>~{cards.totalYellow} 🟨</strong> <strong style={{ color: '#ff3333' }}>{cards.totalRed} 🟥</strong>
                        </span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        {/* Mandante */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', alignItems: 'center', borderBottom: '1px solid #1a1a24', paddingBottom: '4px' }}>
                            <span>Média de Cartões:</span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <span style={{ background: '#ffd700', color: '#000', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold', fontSize: '0.7rem' }}>{cards.home.yellow} 🟨</span>
                              <span style={{ background: '#ff3333', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold', fontSize: '0.7rem' }}>{cards.home.red} 🟥</span>
                            </div>
                          </div>
                        </div>

                        {/* Visitante */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', alignItems: 'center', borderBottom: '1px solid #1a1a24', paddingBottom: '4px' }}>
                            <span>Média de Cartões:</span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <span style={{ background: '#ffd700', color: '#000', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold', fontSize: '0.7rem' }}>{cards.away.yellow} 🟨</span>
                              <span style={{ background: '#ff3333', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold', fontSize: '0.7rem' }}>{cards.away.red} 🟥</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 6. PROJEÇÃO DE DEFESAS DOS GOLEIROS */}
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 'bold', color: 'var(--brand-neon)', borderBottom: '1px solid #333', paddingBottom: '6px', marginBottom: '12px' }}>
                        🥅 Projeção de Defesas dos Goleiros
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        {/* Mandante */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', borderBottom: '1px solid #1a1a24', paddingBottom: '4px' }}>
                            <span>Goleiro:</span>
                            <span style={{ fontWeight: 'bold', color: '#fff' }}>{homeSquad.goalkeeper.name}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', borderBottom: '1px solid #1a1a24', paddingBottom: '4px' }}>
                            <span>Taxa de Defesas:</span>
                            <span style={{ fontWeight: 'bold', color: '#fff' }}>{homeSquad.goalkeeper.saveRate}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', borderBottom: '1px solid #1a1a24', paddingBottom: '4px' }}>
                            <span>Defesas Projetadas:</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--brand-neon)' }}>
                              {(homeSquad.goalkeeper.savesAvg * (game.awayXG / 1.25)).toFixed(1)} defesas
                            </span>
                          </div>
                        </div>

                        {/* Visitante */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', borderBottom: '1px solid #1a1a24', paddingBottom: '4px' }}>
                            <span>Goleiro:</span>
                            <span style={{ fontWeight: 'bold', color: '#fff' }}>{awaySquad.goalkeeper.name}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', borderBottom: '1px solid #1a1a24', paddingBottom: '4px' }}>
                            <span>Taxa de Defesas:</span>
                            <span style={{ fontWeight: 'bold', color: '#fff' }}>{awaySquad.goalkeeper.saveRate}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', borderBottom: '1px solid #1a1a24', paddingBottom: '4px' }}>
                            <span>Defesas Projetadas:</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--brand-neon)' }}>
                              {(awaySquad.goalkeeper.savesAvg * (game.homeXG / 1.25)).toFixed(1)} defesas
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 7. PROJEÇÃO DE MARCADORES DE GOLS */}
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 'bold', color: 'var(--brand-neon)', borderBottom: '1px solid #333', paddingBottom: '6px', marginBottom: '12px' }}>
                        ⚽ Marcadores de Gols Projetados (Qualquer Momento)
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        {/* Mandante */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {homeSquad.scorers.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#ccc', borderBottom: '1px solid #1a1a24', paddingBottom: '4px' }}>
                              <span>{item.name}</span>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{(item.prob * 100).toFixed(0)}%</span>
                                <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>@{item.odd.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Visitante */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {awaySquad.scorers.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#ccc', borderBottom: '1px solid #1a1a24', paddingBottom: '4px' }}>
                              <span>{item.name}</span>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{(item.prob * 100).toFixed(0)}%</span>
                                <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>@{item.odd.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 8. FORMA RECENTE E CONFRONTOS H2H */}
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 'bold', color: 'var(--brand-neon)', borderBottom: '1px solid #333', paddingBottom: '6px', marginBottom: '12px' }}>
                        ⚔️ Forma Recente & H2H (Histórico do Confronto)
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        {/* Forma Recente */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
                          <span style={{ color: '#fff', fontWeight: 'bold', borderBottom: '1px solid #222', paddingBottom: '2px' }}>Últimos 5 Resultados</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: '#aaa' }}>Casa:</span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {formHome.map((f, idx) => (
                                  <span key={idx} style={{ 
                                    background: f.result === 'V' ? '#4CAF50' : f.result === 'D' ? '#ff4d4d' : '#555', 
                                    color: '#fff', fontSize: '0.65rem', fontWeight: 'bold', padding: '1px 5px', borderRadius: '3px'
                                  }}>{f.result}</span>
                                ))}
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: '#aaa' }}>Fora:</span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {formAway.map((f, idx) => (
                                  <span key={idx} style={{ 
                                    background: f.result === 'V' ? '#4CAF50' : f.result === 'D' ? '#ff4d4d' : '#555', 
                                    color: '#fff', fontSize: '0.65rem', fontWeight: 'bold', padding: '1px 5px', borderRadius: '3px'
                                  }}>{f.result}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Confrontos Diretos H2H */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222', paddingBottom: '2px', color: '#fff', fontWeight: 'bold' }}>
                            <span>Confronto Direto (H2H)</span>
                            <span style={{ fontSize: '0.7rem', color: '#aaa' }}>{h2h.summary.homeWins} V | {h2h.summary.draws} E | {h2h.summary.awayWins} V</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '90px', overflowY: 'auto', paddingRight: '2px' }}>
                            {h2h.matches.slice(0, 3).map((m, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#ccc' }}>
                                <span style={{ color: '#888' }}>{m.year}</span>
                                <span>{m.score}</span>
                                <span style={{ color: m.winner === 'Empate' ? '#888' : m.winner === game.home ? '#4CAF50' : '#ff4d4d', fontWeight: 'bold' }}>
                                  {m.winner === 'Empate' ? 'E' : m.winner === game.home ? 'Casa' : 'Fora'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 9. OPORTUNIDADES IDENTIFICADAS (MOVIDAS PARA O FINAL DA PÁGINA) */}
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 'bold', color: 'var(--brand-neon)', borderBottom: '1px solid #333', paddingBottom: '6px', marginBottom: '12px' }}>
                        🎯 Oportunidades de Gols & Resultado Recomendadas (Mais de 60% Confiança)
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '6px'
                      }}>
                        {opportunities.length === 0 ? (
                          <div style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>Nenhuma oportunidade de alta probabilidade identificada para esta partida.</div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {opportunities.slice(0, 10).map((item, idx) => {
                              const pct = (item.prob * 100).toFixed(0);
                              return (
                                <div 
                                  key={idx} 
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    fontSize: '0.74rem',
                                    padding: '6px 8px',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid #222',
                                    borderRadius: '6px'
                                  }}
                                >
                                  <span style={{ color: '#fff', fontWeight: '500' }}>{item.label}</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{pct}%</span>
                                    <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>@{item.odd.toFixed(2)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })()}
              
              {/* Botão de Fechar no Rodapé */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid #222', paddingTop: '12px', flexShrink: 0 }}>
                <button 
                  onClick={() => setOpenStatsId(null)}
                  style={{
                    background: 'var(--brand-neon)',
                    border: 'none',
                    color: '#000',
                    padding: '8px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
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
                    {getLeagueNameDynamic(game.sourceLeagueId)} • Rodada {game.round}
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

                {/* Insights de Forma e Histórico */}
                {(() => {
                  const fHome = getTeamForm(game.home, game.homePosition || 10);
                  const fAway = getTeamForm(game.away, game.awayPosition || 11);
                  const list = generateTeamInsights(game, fHome, fAway);
                  return (
                    <div style={{ 
                      borderTop: '1px dashed #333', 
                      paddingTop: '10px', 
                      marginTop: '4px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '6px' 
                    }}>
                      <div style={{ fontSize: '0.78rem', color: '#aaa', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>📊</span> insights dos times:
                      </div>
                      {list.map((ins, idx) => (
                        <div key={idx} style={{ fontSize: '0.75rem', color: '#ccc', display: 'flex', alignItems: 'flex-start', gap: '6px', lineHeight: '1.3' }}>
                          <span style={{ color: 'var(--brand-neon)', flexShrink: 0 }}>•</span>
                          <span>{ins}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
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
                width: '95%',
                maxWidth: '560px',
                maxHeight: '96vh',
                overflowY: 'auto',
                background: 'linear-gradient(135deg, #111115, #14141d)',
                border: '1px solid #333',
                borderTop: '4px solid var(--brand-neon)',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
                position: 'relative',
                animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            >
              <button 
                onClick={() => { setOpenBuilderGameId(null); setBuilderSelections([]); }}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#aaa',
                  fontSize: '1.3rem',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  transition: 'color 0.2s'
                }}
              >
                ✕
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #222', paddingBottom: '6px' }}>
                <span style={{ fontSize: '1.2rem' }}>🛠️</span>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>
                    Criador de Aposta Personalizada
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--brand-neon)', margin: '1px 0 0 0', fontWeight: 'bold' }}>
                    {game.home} x {game.away}
                  </p>
                </div>
              </div>

              {/* Navegação por Abas de Mercados */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #222',
                paddingBottom: '6px',
                marginBottom: '2px'
              }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { id: 'handicap', icon: '⚖️', label: 'Simulador de Handicap' },
                    { id: 'resultado', icon: '🎯', label: 'Resultado Final e Dupla Chance' },
                    { id: 'gols', icon: '⚽', label: 'Total de Gols' },
                    { id: 'escanteios', icon: '📐', label: 'Escanteios' },
                    { id: 'cartoes', icon: '🟨', label: 'Cartões' }
                  ].map(tab => {
                    const isActive = builderActiveTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setBuilderActiveTab(tab.id)}
                        title={tab.label}
                        style={{
                          background: isActive ? 'var(--brand-neon)' : '#111118',
                          border: isActive ? '1px solid var(--brand-neon)' : '1px solid #222',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: isActive ? '0 0 8px rgba(204, 255, 0, 0.3)' : 'none'
                        }}
                      >
                        {tab.icon}
                      </button>
                    );
                  })}
                </div>

                {builderActiveTab === 'handicap' && ((() => {
                  const scoreMatrix = game.stats?.scoreMatrix;
                  const isHome = builderHandicapTeam === 'home';
                  const prob = calculateDynamicHandicapProb(scoreMatrix, isHome, builderHandicapLine);
                  const formatLineVal = (v) => v === 0 ? '0.0' : v > 0 ? `+${v}` : `${v}`;
                  const backedClubName = isHome ? game.home : game.away;
                  const handicapLabel = `${backedClubName} AH ${formatLineVal(builderHandicapLine)}`;
                  const id = `${game.home} x ${game.away}_Handicap_${handicapLabel}`;
                  const isAlreadySelected = builderSelections.some(s => s.id === id);

                  return (
                    <button
                      onClick={() => {
                        const selection = {
                          label: handicapLabel,
                          prob,
                          odd: parseFloat(builderHandicapOdd) || (prob > 0 ? Number((1/prob).toFixed(2)) : 1.90),
                          market: 'Handicap',
                          id
                        };
                        if (isAlreadySelected) {
                          setBuilderSelections(prev => prev.filter(s => s.id !== id));
                        } else {
                          setBuilderSelections(prev => [...prev, selection]);
                        }
                      }}
                      style={{
                        background: isAlreadySelected ? '#ff4d4d' : 'var(--brand-neon)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#000',
                        padding: '4px 10px',
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        height: '28px'
                      }}
                    >
                      {isAlreadySelected ? '🗑️ Remover' : '➕ Handicap'}
                    </button>
                  );
                })())}
              </div>

              {/* Calculadora de Handicap Asiático (AH) Interativa */}
              {builderActiveTab === 'handicap' && (
                <div style={{
                  background: '#111118',
                  border: '1px solid rgba(204, 255, 0, 0.12)',
                  borderRadius: '8px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderBottom: '1px solid #222', paddingBottom: '2px' }}>
                    <span style={{ fontSize: '0.9rem' }}>⚖️</span>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#fff', margin: 0 }}>
                      Simulador e Construtor de Handicap (AH)
                    </h4>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1.3fr', gap: '6px', alignItems: 'end' }}>
                    {/* Seleção do Time */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '4px' }}>
                        Time
                      </label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => setBuilderHandicapTeam('home')}
                          style={{
                            flex: 1,
                            background: builderHandicapTeam === 'home' ? 'rgba(204, 255, 0, 0.08)' : '#0d0d12',
                            border: builderHandicapTeam === 'home' ? '1px solid var(--brand-neon)' : '1px solid #222',
                            borderRadius: '4px',
                            padding: '4px 2px',
                            color: builderHandicapTeam === 'home' ? 'var(--brand-neon)' : '#aaa',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            cursor: 'pointer'
                          }}
                        >
                          Casa
                        </button>
                        <button
                          onClick={() => setBuilderHandicapTeam('away')}
                          style={{
                            flex: 1,
                            background: builderHandicapTeam === 'away' ? 'rgba(204, 255, 0, 0.08)' : '#0d0d12',
                            border: builderHandicapTeam === 'away' ? '1px solid var(--brand-neon)' : '1px solid #222',
                            borderRadius: '4px',
                            padding: '4px 2px',
                            color: builderHandicapTeam === 'away' ? 'var(--brand-neon)' : '#aaa',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            cursor: 'pointer'
                          }}
                        >
                          Fora
                        </button>
                      </div>
                    </div>

                    {/* Seleção da Linha */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '4px' }}>
                        Linha
                      </label>
                      <input
                        type="text"
                        placeholder="-0.5"
                        list="handicap-options"
                        value={builderHandicapLine}
                        onChange={(e) => setBuilderHandicapLine(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#0d0d12',
                          border: '1px solid #222',
                          borderRadius: '4px',
                          padding: '4px 6px',
                          color: '#fff',
                          fontSize: '0.75rem',
                          outline: 'none',
                          fontFamily: 'inherit',
                          height: '26px'
                        }}
                      />
                      <datalist id="handicap-options">
                        <option value="-2.0" />
                        <option value="-1.75" />
                        <option value="-1.5" />
                        <option value="-1.25" />
                        <option value="-1.0" />
                        <option value="-0.75" />
                        <option value="-0.5" />
                        <option value="-0.25" />
                        <option value="0.0" />
                        <option value="+0.25" />
                        <option value="+0.5" />
                        <option value="+0.75" />
                        <option value="+1.0" />
                        <option value="+1.25" />
                        <option value="+1.5" />
                        <option value="+1.75" />
                        <option value="+2.0" />
                      </datalist>
                    </div>

                    {/* Odd da Casa */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '4px' }}>
                        Odd Casa
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        value={builderHandicapOdd}
                        onChange={(e) => setBuilderHandicapOdd(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#0d0d12',
                          border: '1px solid #222',
                          borderRadius: '4px',
                          padding: '4px 6px',
                          color: '#fff',
                          fontSize: '0.75rem',
                          outline: 'none',
                          fontFamily: 'inherit',
                          height: '26px'
                        }}
                      />
                    </div>

                    {/* Valor da Aposta */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '4px' }}>
                        Aposta (R$)
                      </label>
                      <input
                        type="number"
                        value={simHandicapStake}
                        onChange={(e) => setSimHandicapStake(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#0d0d12',
                          border: '1px solid #222',
                          borderRadius: '4px',
                          padding: '4px 6px',
                          color: '#fff',
                          fontSize: '0.75rem',
                          outline: 'none',
                          fontFamily: 'inherit',
                          height: '26px'
                        }}
                      />
                    </div>

                    {/* Placar Simulado */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '4px' }}>
                        Placar Simulado
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: '#0d0d12', padding: '4px', borderRadius: '4px', border: '1px solid #222', justifyContent: 'center', height: '26px' }}>
                        <button onClick={() => setSimHomeScore(Math.max(0, simHomeScore - 1))} style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#222', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none' }}>-</button>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', minWidth: '10px', textAlign: 'center' }}>{simHomeScore}</span>
                        <button onClick={() => setSimHomeScore(simHomeScore + 1)} style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#222', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none' }}>+</button>
                        
                        <span style={{ color: '#444', fontWeight: 'bold', fontSize: '0.7rem' }}>x</span>
                        
                        <button onClick={() => setSimAwayScore(Math.max(0, simAwayScore - 1))} style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#222', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none' }}>-</button>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', minWidth: '10px', textAlign: 'center' }}>{simAwayScore}</span>
                        <button onClick={() => setSimAwayScore(simAwayScore + 1)} style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#222', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none' }}>+</button>
                      </div>
                    </div>
                  </div>

                  {/* Linha de Dados Compacta: Probabilidade | Odd Justa | Lucro Líquido | Retorno */}
                  {(() => {
                    const scoreMatrix = game.stats?.scoreMatrix;
                    const isHome = builderHandicapTeam === 'home';
                    const parsedLineNum = parseFloat(builderHandicapLine) || 0.0;
                    const prob = calculateDynamicHandicapProb(scoreMatrix, isHome, parsedLineNum);
                    
                    const scoreDiff = simHomeScore - simAwayScore;
                    const backingDiff = isHome ? scoreDiff : -scoreDiff;
                    const lineVal = parsedLineNum;
                    const isQuarter = Math.abs(Math.round(lineVal * 100)) % 50 !== 0;
                    
                    let line1, line2;
                    if (isQuarter) {
                      line1 = lineVal - 0.25;
                      line2 = lineVal + 0.25;
                    } else {
                      line1 = lineVal;
                      line2 = lineVal;
                    }

                    const evaluateLine = (line) => {
                      const simDiff = backingDiff + line;
                      if (simDiff > 0) return 'WIN';
                      if (simDiff === 0) return 'VOID';
                      return 'LOSS';
                    };

                    const res1 = evaluateLine(line1);
                    const res2 = evaluateLine(line2);

                    let outcome = '';
                    let returnMultiplier = 0;

                    const parsedOdd = parseFloat(builderHandicapOdd) || 1.90;
                    const mockStake = parseFloat(simHandicapStake) || 100;

                    if (res1 === 'WIN' && res2 === 'WIN') {
                      outcome = 'WIN';
                      returnMultiplier = parsedOdd;
                    } else if (res1 === 'LOSS' && res2 === 'LOSS') {
                      outcome = 'LOSS';
                      returnMultiplier = 0;
                    } else if (res1 === 'VOID' && res2 === 'VOID') {
                      outcome = 'VOID';
                      returnMultiplier = 1.0;
                    } else if ((res1 === 'WIN' && res2 === 'VOID') || (res1 === 'VOID' && res2 === 'WIN')) {
                      outcome = 'HALF_WIN';
                      returnMultiplier = 0.5 + 0.5 * parsedOdd;
                    } else if ((res1 === 'LOSS' && res2 === 'VOID') || (res1 === 'VOID' && res2 === 'LOSS')) {
                      outcome = 'HALF_LOSS';
                      returnMultiplier = 0.5;
                    }

                    const totalReturn = mockStake * returnMultiplier;
                    const netProfit = totalReturn - mockStake;

                    const getOutcomeStyle = (outc) => {
                      switch (outc) {
                        case 'WIN':
                          return { badgeBg: 'rgba(78,205,196,0.15)', badgeText: '#4ecdc4', label: 'GANHA' };
                        case 'HALF_WIN':
                          return { badgeBg: 'rgba(78,205,196,0.1)', badgeText: '#a4ecd4', label: 'MEIO GANHO' };
                        case 'VOID':
                          return { badgeBg: 'rgba(255,217,61,0.15)', badgeText: '#ffd93d', label: 'REEMBOLSADA (VOID)' };
                        case 'HALF_LOSS':
                          return { badgeBg: 'rgba(255,107,107,0.1)', badgeText: '#ff9b9b', label: 'MEIA PERDA' };
                        case 'LOSS':
                          return { badgeBg: 'rgba(255,107,107,0.15)', badgeText: '#ff6b6b', label: 'PERDIDA' };
                        default:
                          return { badgeBg: '#222', badgeText: '#aaa', label: 'N/A' };
                      }
                    };

                    const getSubResultEmoji = (res) => {
                      if (res === 'WIN') return '🟩 Ganha';
                      if (res === 'VOID') return '🟨 Devolvida';
                      return '🟥 Perdida';
                    };

                    const outcomeDetails = getOutcomeStyle(outcome);

                    return (
                      <>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: '4px',
                          background: '#0d0d12',
                          padding: '4px 6px',
                          borderRadius: '6px',
                          border: '1px solid #1a1a24',
                          textAlign: 'center',
                          marginTop: '2px'
                        }}>
                          <div>
                            <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: '#666', fontWeight: 'bold' }}>Probabilidade</div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--brand-neon)' }}>
                              {Math.round(prob * 100)}%
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: '#666', fontWeight: 'bold' }}>Odd Justa</div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#aaa' }}>
                              @{prob > 0 ? (1 / prob).toFixed(2) : '1.01'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: '#666', fontWeight: 'bold' }}>Lucro Líquido</div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 900, color: netProfit > 0 ? '#4ecdc4' : netProfit < 0 ? '#ff6b6b' : '#aaa' }}>
                              {netProfit > 0 ? '+' : ''}R$ {netProfit.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: '#666', fontWeight: 'bold' }}>Retorno / Status</div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                              <span>R$ {totalReturn.toFixed(2)}</span>
                              <span style={{
                                background: outcomeDetails.badgeBg,
                                color: outcomeDetails.badgeText,
                                padding: '1px 2px',
                                borderRadius: '2px',
                                fontSize: '0.5rem',
                                fontWeight: 800,
                              }}>
                                {outcomeDetails.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Passo a Passo da Conta Colapsável */}
                        <details style={{ marginTop: '3px', cursor: 'pointer' }}>
                          <summary style={{ fontSize: '0.65rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', outline: 'none' }}>
                            Ver Passo a Passo da Conta (Odd @{parsedOdd.toFixed(2)})
                          </summary>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px dashed #222', paddingTop: '6px', marginTop: '4px' }}>
                            
                            {/* Como a Matemática Vê o Jogo */}
                            <div style={{ background: '#111118', padding: '6px', borderRadius: '4px', border: '1px solid #1a1a24', fontSize: '0.7rem' }}>
                              <div style={{ color: '#888', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                                Como a Matemática Vê o Jogo:
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                <span style={{ color: '#666' }}>Placar Real:</span>
                                <span style={{ fontWeight: 'bold' }}>{game.home} {simHomeScore} × {simAwayScore} {game.away}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#666' }}>Placar HA Aplicado:</span>
                                <span style={{ fontWeight: 'bold', color: 'var(--brand-neon)' }}>
                                  {builderHandicapTeam === 'home' ? (
                                    `${game.home} (${lineVal > 0 ? '+' : ''}${lineVal}) ${(simHomeScore + lineVal).toFixed(2)} × ${simAwayScore} ${game.away}`
                                  ) : (
                                    `${game.home} ${simHomeScore} × ${(simAwayScore + lineVal).toFixed(2)} (${lineVal > 0 ? '+' : ''}${lineVal}) ${game.away}`
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Explicação da Conta Realizada */}
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '4px', border: '1px solid #1a1a24', fontSize: '0.7rem' }}>
                              <div style={{ fontWeight: 'bold', color: 'var(--brand-neon)', marginBottom: '4px', fontSize: '0.65rem', textTransform: 'uppercase' }}>
                                Passo a Passo da Conta (Odd @{parsedOdd.toFixed(2)} | Aposta R$ {mockStake.toFixed(2)})
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#ccc', fontSize: '0.68rem', lineHeight: '1.3' }}>
                                {outcome === 'WIN' && (
                                  <>
                                    <div>1. Aposta de R$ {mockStake.toFixed(2)} com Odd @{parsedOdd.toFixed(2)} venceu por completo.</div>
                                    <div>2. Retorno Total: <span style={{ color: '#4ecdc4' }}>R$ {mockStake.toFixed(2)} × {parsedOdd.toFixed(2)} = R$ {totalReturn.toFixed(2)}</span></div>
                                    <div>3. Lucro Líquido (Retorno - Aposta): <span>R$ {totalReturn.toFixed(2)} - R$ {mockStake.toFixed(2)} = </span><strong style={{ color: '#4ecdc4' }}>+R$ {netProfit.toFixed(2)}</strong></div>
                                  </>
                                )}
                                {outcome === 'LOSS' && (
                                  <>
                                    <div>1. Aposta de R$ {mockStake.toFixed(2)} foi totalmente perdida.</div>
                                    <div>2. Retorno Total: <span>R$ 0.00</span></div>
                                    <div>3. Prejuízo Líquido (Perda total do valor investido): <strong style={{ color: '#ff6b6b' }}>-R$ {mockStake.toFixed(2)}</strong></div>
                                  </>
                                )}
                                {outcome === 'VOID' && (
                                  <>
                                    <div>1. O Placar Empatou com o Handicap aplicado. A aposta foi devolvida.</div>
                                    <div>2. Retorno Total (Devolução de 100%): <span>R$ {mockStake.toFixed(2)}</span></div>
                                    <div>3. Resultado (Sem lucro ou prejuízo): <strong>R$ 0.00</strong></div>
                                  </>
                                )}
                                {outcome === 'HALF_WIN' && (
                                  <>
                                    <div>1. Linha de Quarto divide o valor em duas apostas de R$ {(mockStake/2).toFixed(2)}:</div>
                                    <div style={{ paddingLeft: '6px', color: '#aaa' }}>• Metade 1 (HA {line1 > 0 ? '+' : ''}{line1}): {getSubResultEmoji(res1)} → Retorno: R$ {(mockStake/2).toFixed(2)} × {parsedOdd.toFixed(2)} = R$ {(mockStake/2*parsedOdd).toFixed(2)}</div>
                                    <div style={{ paddingLeft: '6px', color: '#aaa' }}>• Metade 2 (HA {line2 > 0 ? '+' : ''}{line2}): {getSubResultEmoji(res2)} → Retorno: R$ {(mockStake/2).toFixed(2)} × 1.0 (devolvido) = R$ {(mockStake/2).toFixed(2)}</div>
                                    <div>2. Retorno Total: <span>R$ {(mockStake/2*parsedOdd).toFixed(2)} + R$ {(mockStake/2).toFixed(2)} = R$ {totalReturn.toFixed(2)}</span></div>
                                    <div>3. Lucro Líquido (Retorno - Aposta): <span>R$ {totalReturn.toFixed(2)} - R$ {mockStake.toFixed(2)} = </span><strong style={{ color: '#4ecdc4' }}>+R$ {netProfit.toFixed(2)}</strong></div>
                                  </>
                                )}
                                {outcome === 'HALF_LOSS' && (
                                  <>
                                    <div>1. Linha de Quarto divide o valor em duas apostas de R$ {(mockStake/2).toFixed(2)}:</div>
                                    <div style={{ paddingLeft: '6px', color: '#aaa' }}>• Metade 1 (HA {line1 > 0 ? '+' : ''}{line1}): {getSubResultEmoji(res1)} → Retorno: R$ 0.00 (perdido)</div>
                                    <div style={{ paddingLeft: '6px', color: '#aaa' }}>• Metade 2 (HA {line2 > 0 ? '+' : ''}{line2}): {getSubResultEmoji(res2)} → Retorno: R$ {(mockStake/2).toFixed(2)} × 1.0 (devolvido) = R$ {(mockStake/2).toFixed(2)}</div>
                                    <div>2. Retorno Total: <span>R$ 0.00 + R$ {(mockStake/2).toFixed(2)} = R$ {totalReturn.toFixed(2)}</span></div>
                                    <div>3. Prejuízo Líquido (Retorno - Aposta): <span>R$ {totalReturn.toFixed(2)} - R$ {mockStake.toFixed(2)} = </span><strong style={{ color: '#ff6b6b' }}>-R$ {Math.abs(netProfit).toFixed(2)}</strong></div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Divisão da Aposta */}
                            <div style={{ background: 'rgba(255,255,255,0.01)', padding: '6px', borderRadius: '4px', border: '1px solid #1a1a24', fontSize: '0.7rem' }}>
                              <div style={{ fontWeight: 'bold', color: '#888', marginBottom: '2px', textTransform: 'uppercase', fontSize: '0.62rem' }}>
                                Divisão da Aposta ({isQuarter ? 'Linha de Quarto' : 'Linha Cheia/Meia'})
                              </div>
                              {isQuarter ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#bbb' }}>
                                    <span>50% no HA {line1 > 0 ? '+' : ''}{line1}:</span>
                                    <strong style={{ color: res1 === 'WIN' ? '#4ecdc4' : res1 === 'VOID' ? '#ffd93d' : '#ff6b6b' }}>
                                      {getSubResultEmoji(res1)}
                                    </strong>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#bbb' }}>
                                    <span>50% no HA {line2 > 0 ? '+' : ''}{line2}:</span>
                                    <strong style={{ color: res2 === 'WIN' ? '#4ecdc4' : res2 === 'VOID' ? '#ffd93d' : '#ff6b6b' }}>
                                      {getSubResultEmoji(res2)}
                                    </strong>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ color: '#bbb' }}>
                                  100% da aposta alocada no HA {lineVal > 0 ? '+' : ''}{lineVal}: <strong style={{ color: res1 === 'WIN' ? '#4ecdc4' : res1 === 'VOID' ? '#ffd93d' : '#ff6b6b' }}>
                                    {getSubResultEmoji(res1)}
                                  </strong>
                                </div>
                              )}
                            </div>

                            <div style={{ fontSize: '0.65rem', color: '#666', lineHeight: '1.3', padding: '2px 4px', borderTop: '1px dashed #222' }}>
                              💡 <strong>Funcionamento da Simulação:</strong> O lucro líquido mostra o ganho extra além do valor apostado.
                            </div>
                          </div>
                        </details>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Grid de Mercados e Seleções */}
              {builderActiveTab !== 'handicap' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(() => {
                    const filteredMarkets = markets.filter(cat => {
                      const catName = cat.category.toLowerCase();
                      if (builderActiveTab === 'resultado') {
                        return catName.includes('resultado final') || catName.includes('dupla chance');
                      }
                      if (builderActiveTab === 'gols') {
                        return catName.includes('gols') || catName.includes('ambos marcam');
                      }
                      if (builderActiveTab === 'escanteios') {
                        return catName.includes('escanteio') || catName.includes('canto');
                      }
                      if (builderActiveTab === 'cartoes') {
                        return catName.includes('cartão') || catName.includes('cartao') || catName.includes('cartõe') || catName.includes('cartoe') || catName.includes('amarelo');
                      }
                      return true;
                    });

                    if (filteredMarkets.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '12px', color: '#666', fontSize: '0.8rem' }}>
                          Nenhum mercado disponível nesta categoria.
                        </div>
                      );
                    }

                    return filteredMarkets.map((cat, catIdx) => (
                      <div key={catIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {cat.category}
                        </div>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
                          gap: '6px' 
                        }}>
                          {cat.items.map((item, itemIdx) => {
                            const id = `${game.home} x ${game.away}_${item.market}_${item.label}`;
                            const isSelected = builderSelections.some(s => s.id === id);
                            return (
                              <button
                                key={itemIdx}
                                onClick={() => handleToggleBuilderSelection(item, `${game.home} x ${game.away}`)}
                                style={{
                                  background: isSelected ? 'var(--brand-neon)' : '#161622',
                                  border: isSelected ? '1px solid var(--brand-neon)' : '1px solid #27273a',
                                  color: isSelected ? '#000' : '#fff',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  width: '100%',
                                  gap: '6px',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                                }}
                              >
                                <span style={{ textAlign: 'left', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                  {/* Badge de Porcentagem */}
                                  <span style={{
                                    background: isSelected 
                                      ? 'rgba(0,0,0,0.15)' 
                                      : item.prob >= 0.70 
                                        ? 'rgba(76, 175, 80, 0.15)' 
                                        : item.prob >= 0.50 
                                          ? 'rgba(255, 152, 0, 0.15)' 
                                          : 'rgba(255, 68, 68, 0.15)',
                                    color: isSelected 
                                      ? '#000' 
                                      : item.prob >= 0.70 
                                        ? '#4CAF50' 
                                        : item.prob >= 0.50 
                                          ? '#ff9800' 
                                          : '#ff4d4d',
                                    padding: '1px 6px',
                                    borderRadius: '10px',
                                    fontSize: '0.65rem',
                                    fontWeight: 'bold'
                                  }}>
                                    {Math.round(item.prob * 100)}%
                                  </span>

                                  {/* Odd */}
                                  <span style={{ 
                                    color: isSelected ? '#000' : 'var(--brand-neon)',
                                    fontWeight: 'bold',
                                    minWidth: '40px',
                                    textAlign: 'right'
                                  }}>
                                    @{item.odd.toFixed(2)}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {/* Seções Selecionadas & Cupom de Aposta */}
              {builderSelections.length > 0 && (
                <div style={{ background: '#1c1c24', border: '1px solid #333', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 'bold', borderBottom: '1px solid #333', paddingBottom: '4px' }}>
                    📋 Cupom de Aposta ({builderSelections.length})
                  </div>

                  {/* 🎫 Bilhete em Construção */}
                  <div style={{ 
                    background: 'rgba(204, 255, 0, 0.04)', 
                    border: '1.2px dashed var(--brand-neon)', 
                    borderRadius: '6px', 
                    padding: '6px 10px', 
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    lineHeight: '1.3',
                  }}>
                    <div style={{ color: 'var(--brand-neon)', fontSize: '0.58rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.5px' }}>
                      🎫 Aposta sendo montada:
                    </div>
                    <div style={{ wordBreak: 'break-all' }}>
                      {builderSelections.map(s => s.label).join(' + ')}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {builderSelections.map((sel, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#ccc' }}>
                        <span>• {sel.label}</span>
                        <span style={{ color: '#ff9800', fontWeight: 'bold' }}>@{sel.odd.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Resultados Combinados */}
                  <div style={{ borderTop: '1px dashed #333', paddingTop: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.65rem', color: '#888', fontWeight: 'bold' }}>Odd Combinada</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <span style={{ color: '#ff9800', fontWeight: 'bold', fontSize: '0.8rem' }}>@</span>
                        <input 
                          type="number"
                          step="0.01"
                          value={builderCustomOdd !== "" ? builderCustomOdd : totalOddCalc}
                          onChange={(e) => setBuilderCustomOdd(e.target.value)}
                          style={{
                            background: '#141419',
                            border: '1px solid #333',
                            color: '#ff9800',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            width: '80px',
                            outline: 'none',
                            height: '24px'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.65rem', color: '#888', fontWeight: 'bold' }}>Aposta (R$)</label>
                      <input 
                        type="number"
                        value={builderStake}
                        onChange={(e) => setBuilderStake(e.target.value)}
                        placeholder="50"
                        style={{
                          background: '#141419',
                          border: '1px solid #333',
                          color: '#fff',
                          padding: '4px 6px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          width: '80px',
                          outline: 'none',
                          height: '24px'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#aaa', marginTop: '2px' }}>
                    <span>Probabilidade Teórica:</span>
                    <strong style={{ color: 'var(--brand-neon)' }}>{totalProbCalc}%</strong>
                  </div>

                  <button
                    onClick={() => handleSaveBuilderBet(game)}
                    style={{
                      background: 'var(--brand-neon)',
                      color: '#000',
                      border: 'none',
                      padding: '8px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                      boxShadow: '0 4px 12px rgba(204, 255, 0, 0.2)',
                      marginTop: '2px'
                    }}
                  >
                    Salvar Aposta na Banca 🚀
                  </button>
                </div>
              )}

              {/* Botão Fechar no rodapé */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
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
        
        /* Container de Jogos: 2 colunas no desktop largo */
        .palpites-scroll-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .game-card-wrapper {
          height: 300px !important;
          min-height: 300px !important;
          max-height: 300px !important;
          overflow-y: auto !important;
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        
        .game-card-wrapper::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        
        @media (min-width: 1200px) {
          .palpites-scroll-container {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            grid-auto-rows: 300px !important;
            align-items: start !important;
            gap: 16px !important;
          }
        }
        
        /* Grid responsivo do card de palpites (Novo layout premium) */
        .game-card-inner-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        @media (min-width: 768px) {
          .game-card-inner-grid {
            display: grid !important;
            grid-template-columns: 1fr 1.25fr !important;
            gap: 16px !important;
            align-items: start !important;
          }
        }
        .right-section-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        @media (min-width: 480px) {
          .right-section-grid {
            display: grid !important;
            grid-template-columns: 1.15fr 1fr !important;
            gap: 12px !important;
          }
        }
        
        .tactical-pitch {
          position: relative;
          width: 100%;
          height: 105px;
          background: linear-gradient(135deg, #071f0a 0%, #030d04 100%);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 6px;
          overflow: hidden;
          box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.9);
          margin-top: 4px;
        }

        .team-name {
          font-weight: bold;
          font-size: 0.78rem;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .protection-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        @keyframes blinkFlame {
          0% { transform: scale(1); opacity: 0.75; filter: drop-shadow(0 0 1px #ff3c00); }
          50% { transform: scale(1.25); opacity: 1; filter: drop-shadow(0 0 5px #ffcc00); }
          100% { transform: scale(1); opacity: 0.75; filter: drop-shadow(0 0 1px #ff3c00); }
        }
      `}</style>
    </div>
  );
}
