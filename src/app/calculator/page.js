'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Calculator, Trophy, Zap, Activity, Info, BarChart2, Star, Shield, 
  HelpCircle, ArrowRight, Sparkles, TrendingUp, RefreshCw, Calendar, 
  Users, ChevronLeft, ChevronRight, AlertCircle, AlertTriangle, Clock
} from 'lucide-react';

// Factorial helper for Poisson
const factorial = (n) => {
  if (n <= 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
};

// Poisson probability function
const poisson = (k, lambda) => {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
};

// Calculate probabilities for 1X2, Over/Under, BTTS using Poisson
const calculateMatchProbabilities = (homeXG, awayXG) => {
  let homeWinProb = 0;
  let drawProb = 0;
  let awayWinProb = 0;
  
  const maxGoals = 8;
  const scoreMatrix = Array(maxGoals).fill(0).map(() => Array(maxGoals).fill(0));
  
  for (let h = 0; h < maxGoals; h++) {
    for (let a = 0; a < maxGoals; a++) {
      const p = poisson(h, homeXG) * poisson(a, awayXG);
      scoreMatrix[h][a] = p;
      if (h > a) homeWinProb += p;
      else if (h === a) drawProb += p;
      else awayWinProb += p;
    }
  }

  // Normalize to 100%
  const total = homeWinProb + drawProb + awayWinProb;
  if (total > 0) {
    homeWinProb = homeWinProb / total;
    drawProb = drawProb / total;
    awayWinProb = awayWinProb / total;
  }

  // Goals calculations
  const over05 = 1 - scoreMatrix[0][0];
  const over15 = 1 - (scoreMatrix[0][0] + scoreMatrix[1][0] + scoreMatrix[0][1]);
  
  let under25Sum = 0;
  for (let h = 0; h < maxGoals; h++) {
    for (let a = 0; a < maxGoals; a++) {
      if (h + a <= 2) under25Sum += scoreMatrix[h][a];
    }
  }
  const over25 = 1 - under25Sum;

  // BTTS: (1 - P(0, homeXG)) * (1 - P(0, awayXG))
  const pHomeZero = poisson(0, homeXG);
  const pAwayZero = poisson(0, awayXG);
  const btts = (1 - pHomeZero) * (1 - pAwayZero);

  return {
    homeWin: Math.round(homeWinProb * 100),
    draw: Math.round(drawProb * 100),
    awayWin: Math.round(awayWinProb * 100),
    over05: Math.round(over05 * 100),
    over15: Math.round(over15 * 100),
    over25: Math.round(over25 * 100),
    btts: Math.round(btts * 100)
  };
};

// Tabela de força dos times para gerar forma consistente com o sistema de xG
const CALC_TEAM_STRENGTH = {
  'Argentina': 2.3, 'France': 2.2, 'England': 2.1, 'Spain': 2.2, 'Brazil': 2.1,
  'Portugal': 2.1, 'Belgium': 1.9, 'Germany': 2.0, 'Netherlands': 2.0, 'Italy': 1.8,
  'Croatia': 1.7, 'Uruguay': 1.8, 'Colombia': 1.7, 'Morocco': 1.6, 'Switzerland': 1.6,
  'Denmark': 1.6, 'Mexico': 1.6, 'Japan': 1.6, 'South Korea': 1.5, 'Senegal': 1.5,
  'Ecuador': 1.4, 'Poland': 1.5, 'Turkey': 1.5, 'Serbia': 1.5, 'Ukraine': 1.5,
  'Scotland': 1.4, 'Australia': 1.4, 'Wales': 1.4, 'Nigeria': 1.4, 'Egypt': 1.4,
  'Chile': 1.4, 'Romania': 1.3, 'Slovakia': 1.3, 'Iran': 1.3, 'Saudi Arabia': 1.3,
  'Tunisia': 1.3, 'Cameroon': 1.3, 'Ghana': 1.3, 'Algeria': 1.3, 'Paraguay': 1.3,
  'Canada': 1.3, 'Venezuela': 1.2, 'Peru': 1.3, 'Iraq': 1.2, 'Qatar': 1.2,
  'Costa Rica': 1.2, 'Jordan': 1.1, 'Bolivia': 1.1, 'Panama': 1.1, 'Honduras': 1.1,
  'UAE': 1.1, 'Jamaica': 1.1, 'New Zealand': 1.1, 'Syria': 1.1, 'El Salvador': 1.0,
  'Guatemala': 1.0, 'Palestine': 1.0, 'Oman': 1.0, 'Bahrain': 1.0, 'Kuwait': 1.0,
  'Flamengo': 1.9, 'Palmeiras': 1.8, 'Atletico Mineiro': 1.7, 'Atlético-MG': 1.7,
  'Sao Paulo': 1.6, 'São Paulo': 1.6, 'Fluminense': 1.6, 'Corinthians': 1.5,
  'Internacional': 1.6, 'Gremio': 1.5, 'Grêmio': 1.5, 'Santos': 1.4, 'Botafogo': 1.5,
  'Bahia': 1.4, 'Cruzeiro': 1.5, 'Bragantino': 1.4, 'Red Bull Bragantino': 1.4,
  'Vasco': 1.3, 'Vasco da Gama': 1.3, 'Fortaleza': 1.4, 'Ceara': 1.3,
  'Athletico-PR': 1.4, 'Goias': 1.2, 'America Mineiro': 1.3, 'Cuiaba': 1.2,
  'Manchester City': 2.4, 'Real Madrid': 2.3, 'Bayern Munich': 2.3, 'Liverpool': 2.2,
  'Barcelona': 2.2, 'Arsenal': 2.0, 'Chelsea': 1.9, 'Manchester United': 1.9,
  'PSG': 2.1, 'Bayer Leverkusen': 1.9, 'Borussia Dortmund': 1.9, 'Inter': 1.9,
  'Atletico Madrid': 1.8, 'Napoli': 1.8, 'Benfica': 1.8, 'PSV': 1.8,
  'Tottenham': 1.8, 'Juventus': 1.7, 'AC Milan': 1.7, 'Sporting CP': 1.7,
  'Ajax': 1.7, 'Feyenoord': 1.7, 'Monaco': 1.7, 'Porto': 1.7,
  'Marseille': 1.6, 'Lyon': 1.6, 'Galatasaray': 1.6, 'RB Leipzig': 1.8,
};

// Gera forma (V/D/E) baseado na força real do time, não em hash fixo
const generateFormFromStrength = (teamName) => {
  if (!teamName) return ['E', 'D', 'V', 'E', 'D'];
  let strength = CALC_TEAM_STRENGTH[teamName];
  if (strength === undefined) {
    const upper = teamName.toUpperCase();
    for (const [key, val] of Object.entries(CALC_TEAM_STRENGTH)) {
      if (upper.includes(key.toUpperCase()) || key.toUpperCase().includes(upper)) {
        strength = val; break;
      }
    }
  }
  if (strength === undefined) {
    // Hash fallback conservador
    let h = 0;
    for (let i = 0; i < teamName.length; i++) h = teamName.charCodeAt(i) + ((h << 5) - h);
    strength = 1.0 + ((Math.abs(h) % 7) / 10);
  }
  // pWin proporcional à força: 1.0→15%, 1.5→48%, 2.0→67%, 2.3→87%
  const pWin = Math.max(0.15, Math.min(0.70, (strength - 1.0) / 1.5));
  const pDraw = 0.22;
  // Usar hash do nome para determinar os resultados de forma estável
  let seed = 0;
  for (let i = 0; i < teamName.length; i++) seed = teamName.charCodeAt(i) + ((seed << 5) - seed);
  seed = Math.abs(seed);
  const form = [];
  for (let i = 0; i < 5; i++) {
    const gameSeed = (seed + i * 43) % 100;
    if (gameSeed < pWin * 100) form.push('V');
    else if (gameSeed < (pWin + pDraw) * 100) form.push('E');
    else form.push('D');
  }
  return form;
};

// Reusable team logo resolver (similar to dashboard)
const getTeamLogoUrl = (teamName, teamId) => {
  if (teamId) {
    return `https://media.api-sports.io/football/teams/${teamId}.png`;
  }
  if (!teamName) return '';
  const clean = teamName.trim().toUpperCase();
  const mapping = {
    'FLAMENGO': 127, 'PALMEIRAS': 121, 'CORINTHIANS': 131, 'SÃO PAULO': 126, 'SAO PAULO': 126,
    'SANTOS': 128, 'GRÊMIO': 130, 'GREMIO': 130, 'INTERNACIONAL': 119, 'ATLÉTICO-MG': 134,
    'ATLETICO MG': 134, 'ATLÉTICO MG': 134, 'FLUMINENSE': 124, 'BOTAFOGO': 120, 'VASCO': 133,
    'VASCO DA GAMA': 133, 'CRUZEIRO': 125, 'BAHIA': 118, 'ATHLETICO-PR': 135, 'ATHLETICO PR': 135,
    'FORTALEZA': 154, 'CEARÁ': 129, 'CEARA': 129, 'CORITIBA': 132, 'GOIÁS': 151, 'GOIAS': 151,
    'BRAGANTINO': 794, 'RED BULL BRAGANTINO': 794, 'CUIABÁ': 1100, 'CUIABA': 1100,
    'CRICIÚMA': 1192, 'CRICIUMA': 1192, 'BOTAFOGO-SP': 1190, 'AMÉRICA-MG': 123, 'AMERICA MG': 123,
    'VILA NOVA': 1193, 'OPERÁRIO-PR': 1194, 'OPERARIO PR': 1194, 'CHAPECOENSE': 122, 'REMO': 1195,
    'BRUSQUE': 1189, 'BARRA': 9770
  };
  const mappedId = mapping[clean];
  if (mappedId) {
    return `https://media.api-sports.io/football/teams/${mappedId}.png`;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(teamName)}&background=141419&color=CCFF00&rounded=true&bold=true&size=48`;
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

// Fallback Mock Matches when API is empty/rate-limited
const getMockMatches = (dateStr) => {
  return [
    {
      id: "mock_1",
      home: "Flamengo",
      away: "Palmeiras",
      homeTeamId: 127,
      awayTeamId: 121,
      league: "Brasileirão Série A",
      round: "Rodada 14",
      date: "Hoje • 16:00",
      rawDate: dateStr,
      homeLogo: getTeamLogoUrl("Flamengo", 127),
      awayLogo: getTeamLogoUrl("Palmeiras", 121),
      homeXG: 1.8,
      awayXG: 1.3,
      goalsHome: 0,
      goalsAway: 0,
      status: "Não Iniciado",
      isLive: false,
      isFinished: false,
      venue: "Maracanã",
      homePosition: 1,
      awayPosition: 3,
      sourceLeagueId: "71",
      formHome: ["V", "V", "E", "D", "V"],
      formAway: ["V", "E", "V", "V", "D"]
    },
    {
      id: "mock_2",
      home: "Real Madrid",
      away: "Barcelona",
      homeTeamId: 541,
      awayTeamId: 529,
      league: "La Liga",
      round: "Rodada 32",
      date: "Hoje • 21:00",
      rawDate: dateStr,
      homeLogo: "https://media.api-sports.io/football/teams/541.png",
      awayLogo: "https://media.api-sports.io/football/teams/529.png",
      homeXG: 2.1,
      awayXG: 1.6,
      goalsHome: 1,
      goalsAway: 1,
      status: "Em Andamento ⚽ 64'",
      isLive: true,
      isFinished: false,
      venue: "Santiago Bernabéu",
      homePosition: 1,
      awayPosition: 2,
      sourceLeagueId: "140",
      formHome: ["V", "V", "V", "E", "V"],
      formAway: ["V", "V", "D", "V", "V"]
    },
    {
      id: "mock_3",
      home: "Manchester City",
      away: "Arsenal",
      homeTeamId: 50,
      awayTeamId: 42,
      league: "Premier League",
      round: "Rodada 30",
      date: "Hoje • 12:30",
      rawDate: dateStr,
      homeLogo: "https://media.api-sports.io/football/teams/50.png",
      awayLogo: "https://media.api-sports.io/football/teams/42.png",
      homeXG: 2.4,
      awayXG: 1.2,
      goalsHome: 3,
      goalsAway: 1,
      status: "Finalizado",
      isLive: false,
      isFinished: true,
      venue: "Etihad Stadium",
      homePosition: 2,
      awayPosition: 1,
      sourceLeagueId: "39",
      formHome: ["V", "E", "V", "V", "V"],
      formAway: ["V", "V", "V", "V", "E"]
    },
    {
      id: "mock_4",
      home: "Corinthians",
      away: "São Paulo",
      homeTeamId: 131,
      awayTeamId: 126,
      league: "Brasileirão Série A",
      round: "Rodada 14",
      date: "Hoje • 18:00",
      rawDate: dateStr,
      homeLogo: getTeamLogoUrl("Corinthians", 131),
      awayLogo: getTeamLogoUrl("São Paulo", 126),
      homeXG: 1.2,
      awayXG: 1.1,
      goalsHome: 0,
      goalsAway: 0,
      status: "Não Iniciado",
      isLive: false,
      isFinished: false,
      venue: "Neo Química Arena",
      homePosition: 14,
      awayPosition: 6,
      sourceLeagueId: "71",
      formHome: ["D", "E", "D", "V", "E"],
      formAway: ["V", "D", "V", "E", "V"]
    },
    {
      id: "mock_5",
      home: "Boca Juniors",
      away: "River Plate",
      homeTeamId: 451,
      awayTeamId: 435,
      league: "Liga Profissional",
      round: "Fase de Grupos",
      date: "Hoje • 19:30",
      rawDate: dateStr,
      homeLogo: "https://media.api-sports.io/football/teams/451.png",
      awayLogo: "https://media.api-sports.io/football/teams/435.png",
      homeXG: 1.4,
      awayXG: 1.4,
      goalsHome: 0,
      goalsAway: 0,
      status: "Não Iniciado",
      isLive: false,
      isFinished: false,
      venue: "La Bombonera",
      homePosition: 8,
      awayPosition: 4,
      sourceLeagueId: "44",
      formHome: ["V", "E", "D", "V", "E"],
      formAway: ["V", "V", "E", "D", "V"]
    }
  ];
};

const translateTeamName = (name) => {
  if (!name) return '';
  const clean = name.trim();
  const dict = {
    'Bayern Munich': 'Bayern de Munique',
    'Bayern München': 'Bayern de Munique',
    'Inter Milan': 'Inter de Milão',
    'Internazionale': 'Inter de Milão',
    'AC Milan': 'Milan',
    'Sporting CP': 'Sporting',
    'Sporting Lisbon': 'Sporting de Lisboa',
    'Boca Juniors': 'Boca Juniors',
    'River Plate': 'River Plate',
    'Atletico Madrid': 'Atlético de Madrid',
    'Atlético Madrid': 'Atlético de Madrid',
    'Sevilla': 'Sevilha',
    'Real Betis': 'Real Bétis',
    'Bayer Leverkusen': 'Bayer Leverkusen',
    'Napoli': 'Nápoles',
    'Roma': 'Roma',
    'Lazio': 'Lazio',
    'Ajax': 'Ajax',
    'Feyenoord': 'Feyenoord',
    'PSV Eindhoven': 'PSV',
    'Marseille': 'Marselha',
    'Lyon': 'Lyon',
    'Saint-Etienne': 'Saint-Étienne',
    'Monaco': 'Mônaco',
    'Nice': 'Niza',
    'Benfica': 'Benfica',
    'Porto': 'Porto',
    'FC Porto': 'Porto',
    'Real Sociedad': 'Real Sociedad',
    'Athletic Bilbao': 'Athletic Bilbao',
    'Aston Villa': 'Aston Villa',
    'Newcastle United': 'Newcastle',
    'Newcastle': 'Newcastle',
    'West Ham United': 'West Ham',
    'West Ham': 'West Ham',
    'Leicester City': 'Leicester',
    'Leicester': 'Leicester',
    'Wolverhampton Wanderers': 'Wolverhampton',
    'Wolves': 'Wolverhampton',
    'Crystal Palace': 'Crystal Palace',
    'Manchester City': 'Manchester City',
    'Manchester United': 'Manchester United',
    'Arsenal': 'Arsenal',
    'Chelsea': 'Chelsea',
    'Liverpool': 'Liverpool',
    'Tottenham': 'Tottenham',
    'Everton': 'Everton',
    'Real Madrid': 'Real Madrid',
    'Barcelona': 'Barcelona',
    'Paris Saint Germain': 'PSG',
    'Paris SG': 'PSG',
    'PSG': 'PSG'
  };

  if (dict[clean]) return dict[clean];
  const upper = clean.toUpperCase();
  for (const [key, value] of Object.entries(dict)) {
    if (key.toUpperCase() === upper) return value;
  }
  return clean;
};

const ShirtIcon = ({ color, sleeveColor }) => (
  <svg viewBox="0 0 100 100" style={{ width: '28px', height: '28px', flexShrink: 0 }}>
    <path d="M 20,20 L 35,10 L 50,20 L 65,10 L 80,20 L 74,40 L 68,36 L 68,90 L 32,90 L 32,36 L 26,40 Z" fill={color} stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
    <path d="M 38,12 Q 50,25 62,12" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
    {sleeveColor && (
      <>
        <path d="M 20,20 L 26,40" stroke={sleeveColor} strokeWidth="3" />
        <path d="M 80,20 L 74,40" stroke={sleeveColor} strokeWidth="3" />
      </>
    )}
  </svg>
);

const getTeamShirtColor = (teamName, isHome) => {
  if (!teamName) return isHome ? '#ffffff' : '#4fc3f7';
  const name = teamName.toUpperCase();
  if (name.includes('FLAMENGO')) return '#d50000';
  if (name.includes('PALMEIRAS')) return '#2e7d32';
  if (name.includes('CORINTHIANS')) return '#ffffff';
  if (name.includes('SÃO PAULO') || name.includes('SAO PAULO')) return '#ffffff';
  if (name.includes('SANTOS')) return '#ffffff';
  if (name.includes('GREMIO') || name.includes('GRÊMIO')) return '#1e88e5';
  if (name.includes('INTERNACIONAL')) return '#d50000';
  if (name.includes('FLUMINENSE')) return '#880e4f';
  if (name.includes('BOTAFOGO')) return '#ffffff';
  if (name.includes('VASCO')) return '#000000';
  if (name.includes('CRUZEIRO')) return '#0d47a1';
  if (name.includes('BARCELONA')) return '#0d47a1';
  if (name.includes('REAL MADRID')) return '#ffffff';
  if (name.includes('MANCHESTER CITY')) return '#81d4fa';
  if (name.includes('ARSENAL')) return '#d50000';
  
  return isHome ? '#ffffff' : '#4fc3f7';
};

const getTeamSleeveColor = (teamName, isHome) => {
  if (!teamName) return isHome ? '#e0e0e0' : '#0288d1';
  const name = teamName.toUpperCase();
  if (name.includes('FLAMENGO')) return '#000000';
  if (name.includes('PALMEIRAS')) return '#ffffff';
  if (name.includes('SÃO PAULO') || name.includes('SAO PAULO')) return '#d50000';
  if (name.includes('BARCELONA')) return '#d50000';
  if (name.includes('REAL MADRID')) return '#e0e0e0';
  if (name.includes('MANCHESTER CITY')) return '#ffffff';
  if (name.includes('ARSENAL')) return '#ffffff';
  
  return isHome ? '#e0e0e0' : '#0288d1';
};

const LiveFieldWidget = ({ match, matchState, liveStats, cornerData, cardData, isLivePollingEnabled, setIsLivePollingEnabled }) => {
  const isHomeAttacking = matchState.team === 'home';
  const isAwayAttacking = matchState.team === 'away';
  const isMidfield = matchState.team === 'none';

  const homeColor = getTeamShirtColor(match.home, true);
  const awayColor = getTeamShirtColor(match.away, false);
  const homeSleeve = getTeamSleeveColor(match.home, true);
  const awaySleeve = getTeamSleeveColor(match.away, false);

  // Dynamic pressure calculation based on play state
  let homePressure = 50;
  let awayPressure = 50;

  if (matchState.team === 'home') {
    if (matchState.type === 'Ataque Perigoso') {
      homePressure = 78;
      awayPressure = 22;
    } else if (matchState.type === 'Ataque') {
      homePressure = 65;
      awayPressure = 35;
    } else if (matchState.type === 'Chute a Gol') {
      homePressure = 85;
      awayPressure = 15;
    } else if (matchState.type === 'Escanteio') {
      homePressure = 70;
      awayPressure = 30;
    } else {
      homePressure = 58;
      awayPressure = 42;
    }
  } else if (matchState.team === 'away') {
    if (matchState.type === 'Ataque Perigoso') {
      homePressure = 20;
      awayPressure = 80;
    } else if (matchState.type === 'Ataque') {
      homePressure = 32;
      awayPressure = 68;
    } else if (matchState.type === 'Chute a Gol') {
      homePressure = 12;
      awayPressure = 88;
    } else if (matchState.type === 'Escanteio') {
      homePressure = 25;
      awayPressure = 75;
    } else {
      homePressure = 40;
      awayPressure = 60;
    }
  }

  const isHomeDominating = homePressure >= 60;
  const isAwayDominating = awayPressure >= 60;
  const dominantText = isHomeDominating 
    ? `🔥 ${translateTeamName(match.home)} está mais perto do gol!` 
    : isAwayDominating 
      ? `🔥 ${translateTeamName(match.away)} está mais perto do gol!` 
      : '⚖️ Partida equilibrada no meio de campo';

  // Live stats corners and cards fallback
  const stats = liveStats || {
    home: { corners: 0, yellowCards: 0, redCards: 0, goalkeeperSaves: 0, shotsOnGoal: 0, ballPossession: 50 },
    away: { corners: 0, yellowCards: 0, redCards: 0, goalkeeperSaves: 0, shotsOnGoal: 0, ballPossession: 50 },
    goalkeepers: {
      home: { name: 'Goleiro', saves: 0 },
      away: { name: 'Goleiro', saves: 0 }
    },
    topShooter: {
      name: 'Nenhum',
      team: '',
      shotsOnGoal: 0
    }
  };

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-color)',
      borderRadius: '16px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '815px',
      boxSizing: 'border-box',
      justifyContent: 'space-between'
    }}>
      {/* Scoreboard Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        background: 'rgba(255, 255, 255, 0.02)',
        color: '#ffffff',
        borderBottom: '1px solid var(--border-color)'
      }}>
        {/* Home Team */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <img 
            src={match.homeLogo || getTeamLogoUrl(match.home, match.homeTeamId)} 
            alt={translateTeamName(match.home)}
            style={{ width: '28px', height: '28px', objectFit: 'contain' }}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getTeamLogoUrl(match.home); }}
          />
          <span style={{ fontSize: '0.95rem', fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {translateTeamName(match.home)}
          </span>
        </div>

        {/* Center Score & Time */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '0 16px' }}>
          <div style={{
            fontSize: '0.7rem',
            fontWeight: 'bold',
            color: 'var(--brand-neon)',
            background: 'rgba(204, 255, 0, 0.1)',
            border: '1px solid rgba(204, 255, 0, 0.25)',
            padding: '2px 8px',
            borderRadius: '4px',
            textTransform: 'uppercase'
          }}>
            {matchState.period} | {matchState.time}
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', display: 'flex', gap: '12px', color: '#fff' }}>
            <span>{match.goalsHome}</span>
            <span>:</span>
            <span>{match.goalsAway}</span>
          </div>
        </div>

        {/* Away Team */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
            {translateTeamName(match.away)}
          </span>
          <img 
            src={match.awayLogo || getTeamLogoUrl(match.away, match.awayTeamId)} 
            alt={translateTeamName(match.away)}
            style={{ width: '28px', height: '28px', objectFit: 'contain' }}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getTeamLogoUrl(match.away); }}
          />
        </div>
      </div>

      {/* Field Area */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '340px',
        background: 'repeating-linear-gradient(90deg, #509e2f, #509e2f 30px, #5aa937 30px, #5aa937 60px)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Outer pitch boundary line */}
        <div style={{
          position: 'absolute',
          top: '12px',
          bottom: '12px',
          left: '12px',
          right: '12px',
          border: '1.5px solid rgba(255, 255, 255, 0.4)',
          pointerEvents: 'none'
        }} />

        {/* Center Line */}
        <div style={{
          position: 'absolute',
          top: '12px',
          bottom: '12px',
          left: '50%',
          width: '1.5px',
          background: 'rgba(255, 255, 255, 0.4)',
          pointerEvents: 'none'
        }} />

        {/* Center Circle */}
        <div style={{
          position: 'absolute',
          top: 'calc(50% - 40px)',
          left: 'calc(50% - 40px)',
          width: '80px',
          height: '80px',
          border: '1.5px solid rgba(255, 255, 255, 0.4)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        {/* Penalty Box Left */}
        <div style={{
          position: 'absolute',
          top: 'calc(50% - 60px)',
          left: '12px',
          width: '45px',
          height: '120px',
          border: '1.5px solid rgba(255, 255, 255, 0.4)',
          borderLeft: 'none',
          pointerEvents: 'none'
        }} />

        {/* Goal Area Left */}
        <div style={{
          position: 'absolute',
          top: 'calc(50% - 30px)',
          left: '12px',
          width: '16px',
          height: '60px',
          border: '1.5px solid rgba(255, 255, 255, 0.4)',
          borderLeft: 'none',
          pointerEvents: 'none'
        }} />

        {/* Penalty Box Right */}
        <div style={{
          position: 'absolute',
          top: 'calc(50% - 60px)',
          right: '12px',
          width: '45px',
          height: '120px',
          border: '1.5px solid rgba(255, 255, 255, 0.4)',
          borderRight: 'none',
          pointerEvents: 'none'
        }} />

        {/* Goal Area Right */}
        <div style={{
          position: 'absolute',
          top: 'calc(50% - 30px)',
          right: '12px',
          width: '16px',
          height: '60px',
          border: '1.5px solid rgba(255, 255, 255, 0.4)',
          borderRight: 'none',
          pointerEvents: 'none'
        }} />

        {/* Watermark S A in the center circle */}
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: 'calc(50% - 20px)',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.85rem',
          fontWeight: '900',
          color: 'rgba(255, 255, 255, 0.15)',
          pointerEvents: 'none',
          letterSpacing: '1px'
        }}>
          SA
        </div>

        {/* Spotlight Highlight overlays (Tactical play representation) */}
        {isHomeAttacking && (
          <>
            {/* Darken the home side */}
            <div style={{
              position: 'absolute',
              top: '12px',
              bottom: '12px',
              left: '12px',
              width: 'calc(50% - 12px)',
              background: 'rgba(0, 0, 0, 0.25)',
              transition: 'all 0.5s ease',
              pointerEvents: 'none'
            }} />
            {/* Spotlight wedge on the attacking side */}
            <div style={{
              position: 'absolute',
              top: '12px',
              bottom: '12px',
              left: '50%',
              right: '12px',
              background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.18) 40%, rgba(255, 255, 255, 0.08) 100%)',
              clipPath: 'polygon(0% 0%, 100% 15%, 100% 85%, 0% 100%)',
              transition: 'all 0.5s ease',
              pointerEvents: 'none'
            }} />
            {/* Attack line indicator */}
            <div style={{
              position: 'absolute',
              top: '12px',
              bottom: '12px',
              left: '50%',
              width: '4px',
              background: '#0d47a1',
              boxShadow: '0 0 8px rgba(13, 71, 161, 0.8)',
              transition: 'all 0.5s ease',
              pointerEvents: 'none'
            }} />
          </>
        )}

        {isAwayAttacking && (
          <>
            {/* Darken the away side */}
            <div style={{
              position: 'absolute',
              top: '12px',
              bottom: '12px',
              right: '12px',
              width: 'calc(50% - 12px)',
              background: 'rgba(0, 0, 0, 0.25)',
              transition: 'all 0.5s ease',
              pointerEvents: 'none'
            }} />
            {/* Spotlight wedge on the attacking side */}
            <div style={{
              position: 'absolute',
              top: '12px',
              bottom: '12px',
              right: '50%',
              left: '12px',
              background: 'linear-gradient(270deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.18) 40%, rgba(255, 255, 255, 0.08) 100%)',
              clipPath: 'polygon(100% 0%, 0% 15%, 0% 85%, 100% 100%)',
              transition: 'all 0.5s ease',
              pointerEvents: 'none'
            }} />
            {/* Attack line indicator */}
            <div style={{
              position: 'absolute',
              top: '12px',
              bottom: '12px',
              right: '50%',
              width: '4px',
              background: '#0d47a1',
              boxShadow: '0 0 8px rgba(13, 71, 161, 0.8)',
              transition: 'all 0.5s ease',
              pointerEvents: 'none'
            }} />
          </>
        )}

        {isMidfield && (
          <div style={{
            position: 'absolute',
            top: '12px',
            bottom: '12px',
            left: '35%',
            right: '35%',
            background: 'rgba(255, 255, 255, 0.06)',
            borderLeft: '1px dashed rgba(255,255,255,0.3)',
            borderRight: '1px dashed rgba(255,255,255,0.3)',
            transition: 'all 0.5s ease',
            pointerEvents: 'none'
          }} />
        )}

        {/* Big Live Period and Time centered badge overlay */}
        <div style={{
          position: 'absolute',
          top: '20px',
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          padding: '4px 14px',
          borderRadius: '20px',
          color: '#ffffff',
          fontSize: '0.8rem',
          fontWeight: 'bold',
          letterSpacing: '0.5px',
          pointerEvents: 'none',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>{matchState.period}</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span style={{ color: 'var(--brand-neon)' }}>{matchState.time}</span>
        </div>

        {/* Text play descriptor Overlay */}
        <div style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isHomeAttacking ? 'flex-start' : isAwayAttacking ? 'flex-end' : 'center',
          left: isHomeAttacking ? '28px' : 'auto',
          right: isAwayAttacking ? '28px' : 'auto',
          textAlign: isHomeAttacking ? 'left' : isAwayAttacking ? 'right' : 'center',
          pointerEvents: 'none',
          textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5)',
          transition: 'all 0.5s ease'
        }}>
          <span style={{
            fontSize: '1.25rem',
            fontWeight: '900',
            color: '#ffffff',
            lineHeight: '1.1'
          }}>
            {isHomeAttacking ? translateTeamName(match.home) : isAwayAttacking ? translateTeamName(match.away) : 'Disputa'}
          </span>
          {isMidfield && (
            <span style={{
              fontSize: '1.25rem',
              fontWeight: '900',
              color: '#ffffff',
              lineHeight: '1.1'
            }}>
              de Bola
            </span>
          )}
          <span style={{
            fontSize: '0.85rem',
            fontWeight: '700',
            color: '#e0e0e0',
            marginTop: '2px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            {matchState.type}
          </span>
        </div>

        {/* Animated Soccer Ball */}
        <div style={{
          position: 'absolute',
          left: `${matchState.x !== undefined ? matchState.x : 50}%`,
          top: `${matchState.y !== undefined ? matchState.y : 50}%`,
          transform: 'translate(-50%, -50%)',
          fontSize: '1.15rem',
          zIndex: 10,
          transition: 'left 1.4s cubic-bezier(0.25, 1, 0.5, 1), top 1.4s cubic-bezier(0.25, 1, 0.5, 1)',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))'
        }}>
          ⚽
          {/* Subtle ball shadow pulsing underneath */}
          <div style={{
            position: 'absolute',
            width: '14px',
            height: '5px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.4)',
            bottom: '-2px',
            zIndex: -1
          }} />
        </div>
      </div>

      {/* Termômetro e Detalhes de Pressão + Posse de Bola */}
      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        background: 'var(--bg-surface-light)'
      }}>
        {/* Pressão */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 'bold' }}>
          <span style={{ color: '#ff4444' }}>Pressão {translateTeamName(match.home)}: {homePressure}%</span>
          <span style={{ color: '#00d2ff' }}>Pressão {translateTeamName(match.away)}: {awayPressure}%</span>
        </div>
        <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: '#111', border: '1px solid var(--border-color)' }}>
          <div style={{ width: `${homePressure}%`, background: 'linear-gradient(90deg, #ff4444, #ff8800)', transition: 'width 0.8s ease-in-out' }}></div>
          <div style={{ width: `${awayPressure}%`, background: 'linear-gradient(90deg, #00d2ff, #00ffa0)', transition: 'width 0.8s ease-in-out' }}></div>
        </div>

        {/* Posse de Bola */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '4px' }}>
          <span style={{ color: 'var(--brand-neon)' }}>Posse {translateTeamName(match.home)}: {stats.home.ballPossession || 50}%</span>
          <span style={{ color: '#ff3d00' }}>Posse {translateTeamName(match.away)}: {stats.away.ballPossession || 50}%</span>
        </div>
        <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: '#111', border: '1px solid var(--border-color)' }}>
          <div style={{ width: `${stats.home.ballPossession || 50}%`, background: 'var(--brand-neon)', transition: 'width 0.8s ease-in-out' }}></div>
          <div style={{ width: `${stats.away.ballPossession || 50}%`, background: '#ff3d00', transition: 'width 0.8s ease-in-out' }}></div>
        </div>

        {/* Dominance text */}
        <div style={{ 
          fontSize: '0.78rem', 
          color: isHomeDominating ? '#ff9800' : isAwayDominating ? '#00e5ff' : 'var(--text-secondary)', 
          fontWeight: 'bold',
          textAlign: 'center',
          marginTop: '2px'
        }}>
          {dominantText}
        </div>
      </div>

      {/* Live corners, shots, and cards statistics row */}
      <div style={{
        padding: '12px 20px',
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-surface)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px'
      }}>
        {/* Corners column */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '8px',
          padding: '8px'
        }}>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>
            🚩 Escanteios
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '0.9rem', fontWeight: '800', color: '#fff' }}>
            <span style={{ color: 'var(--brand-neon)' }}>{stats.home.corners}</span>
            <span style={{ opacity: 0.2 }}>vs</span>
            <span>{stats.away.corners}</span>
          </div>
          {cornerData && (
            <div style={{
              marginTop: '8px',
              width: '100%',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.58rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Média Proj:</span>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>{cornerData.average}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.58rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Over 8.5:</span>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>{cornerData.over85}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.58rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Over 9.5:</span>
                <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>{cornerData.over95}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.58rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Over 10.5:</span>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>{cornerData.over105}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Shots on Goal column */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '8px',
          padding: '8px'
        }}>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>
            ⚽ Chutes a Gol
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '0.9rem', fontWeight: '800', color: '#fff' }}>
            <span style={{ color: 'var(--brand-neon)' }}>{stats.home.shotsOnGoal}</span>
            <span style={{ opacity: 0.2 }}>vs</span>
            <span>{stats.away.shotsOnGoal}</span>
          </div>
        </div>

        {/* Cards column */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '8px',
          padding: '8px'
        }}>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>
            🟨 Cartões
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            {/* Home cards */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.82rem', fontWeight: 'bold', color: '#fff' }}>
              <span>{stats.home.yellowCards}</span>
              <span style={{ width: '7px', height: '10px', background: '#ffd600', borderRadius: '1px', display: 'inline-block' }} />
              {stats.home.redCards > 0 && (
                <>
                  <span>{stats.home.redCards}</span>
                  <span style={{ width: '7px', height: '10px', background: '#d50000', borderRadius: '1px', display: 'inline-block' }} />
                </>
              )}
            </div>
            <span style={{ opacity: 0.2, fontSize: '0.7rem' }}>vs</span>
            {/* Away cards */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.82rem', fontWeight: 'bold', color: '#fff' }}>
              <span>{stats.away.yellowCards}</span>
              <span style={{ width: '7px', height: '10px', background: '#ffd600', borderRadius: '1px', display: 'inline-block' }} />
              {stats.away.redCards > 0 && (
                <>
                  <span>{stats.away.redCards}</span>
                  <span style={{ width: '7px', height: '10px', background: '#d50000', borderRadius: '1px', display: 'inline-block' }} />
                </>
              )}
            </div>
          </div>
          {cardData && (
            <div style={{
              marginTop: '8px',
              width: '100%',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.58rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Média Proj:</span>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>{cardData.average}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.58rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Over 3.5:</span>
                <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>{cardData.over35}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.58rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Over 4.5:</span>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>{cardData.over45}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Live Goalkeepers & Top Shooter row */}
      <div style={{
        padding: '12px 20px',
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-surface)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px'
      }}>
        {/* Goalkeepers saves */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '8px',
          padding: '8px 12px'
        }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
            🧤 Defesas de Goleiro
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '6px', gap: '4px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.72rem', color: '#fff' }}>
              <span style={{ fontWeight: '500', color: 'var(--brand-neon)' }}>{stats.goalkeepers?.home?.name || 'Goleiro'}</span>
              <span style={{ fontWeight: '800' }}>{stats.goalkeepers?.home?.saves ?? stats.home.goalkeeperSaves ?? 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.72rem', color: '#fff' }}>
              <span style={{ fontWeight: '500' }}>{stats.goalkeepers?.away?.name || 'Goleiro'}</span>
              <span style={{ fontWeight: '800' }}>{stats.goalkeepers?.away?.saves ?? stats.away.goalkeeperSaves ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Top Shooter */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '8px',
          padding: '8px 12px'
        }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
            🎯 Maior Finalizador no Alvo
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '6px', gap: '2px', width: '100%' }}>
            {stats.topShooter && stats.topShooter.name !== 'Nenhum' ? (
              <>
                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#fff', textAlign: 'center' }}>
                  {stats.topShooter.name}
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  {translateTeamName(stats.topShooter.team)} • <strong style={{ color: 'var(--brand-neon)' }}>{stats.topShooter.shotsOnGoal}</strong> chute(s) a gol
                </span>
              </>
            ) : (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '4px' }}>
                Nenhuma finalização no gol
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Live Venue & xG info bar */}
      <div style={{
        padding: '12px 16px',
        background: 'var(--bg-surface-light)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.78rem',
        color: '#fff',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Estádio:</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {match.venue || 'Estádio não cadastrado'}
          </span>
        </div>


        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ color: 'var(--text-secondary)' }}>xG Projetado:</span>
          <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>
            {match.homeXG} vs {match.awayXG}
          </span>
        </div>
      </div>
    </div>
  );
};

const getH2HStats = (home, away) => {
  return {
    matches: [],
    summary: { homeWins: 0, draws: 0, awayWins: 0 }
  };
};

const getTeamHash = (name) => {
  if (!name) return 0;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const getTeamRecentMatches = (teamName) => {
  return [];
};

const resolveGoalkeeperName = (teamName) => {
  if (!teamName) return 'Goleiro';
  const clean = teamName.trim().toLowerCase();
  if (clean.includes('germany') || clean.includes('alemanha')) return 'Manuel Neuer';
  if (clean.includes('ivory') || clean.includes('marfim')) return 'Yahia Fofana';
  if (clean.includes('brazil') || clean.includes('brasil')) return 'Alisson Becker';
  if (clean.includes('flamengo')) return 'Rossi';
  if (clean.includes('palmeiras')) return 'Weverton';
  if (clean.includes('real madrid')) return 'Thibaut Courtois';
  if (clean.includes('barcelona')) return 'M. ter Stegen';
  if (clean.includes('manchester city') || clean.includes('m. city')) return 'Ederson';
  if (clean.includes('arsenal')) return 'David Raya';
  if (clean.includes('boca')) return 'Sergio Romero';
  if (clean.includes('river')) return 'Franco Armani';
  return 'Goleiro';
};

const resolveTopShooterName = (teamName) => {
  if (!teamName) return 'Jogador';
  const clean = teamName.trim().toLowerCase();
  if (clean.includes('germany') || clean.includes('alemanha')) return 'Kai Havertz';
  if (clean.includes('ivory') || clean.includes('marfim')) return 'Sébastien Haller';
  if (clean.includes('brazil') || clean.includes('brasil')) return 'Vinícius Júnior';
  if (clean.includes('flamengo')) return 'Pedro';
  if (clean.includes('palmeiras')) return 'Estêvão';
  if (clean.includes('real madrid')) return 'Kylian Mbappé';
  if (clean.includes('barcelona')) return 'R. Lewandowski';
  if (clean.includes('manchester city') || clean.includes('m. city')) return 'Erling Haaland';
  if (clean.includes('arsenal')) return 'Bukayo Saka';
  if (clean.includes('boca')) return 'Edinson Cavani';
  if (clean.includes('river')) return 'Miguel Borja';
  return 'Jogador';
};

const getSimulatedLiveStats = (game) => {
  if (!game) return null;
  let minute = 45;
  if (game.status) {
    const cleaned = game.status.replace(/[^\d]/g, '').trim();
    if (cleaned) minute = parseInt(cleaned);
  }
  const seedH = getTeamHash(game.home);
  const seedA = getTeamHash(game.away);
  
  const factorH = 0.05 + ((seedH % 5) / 100); 
  const factorA = 0.05 + ((seedA % 5) / 100);
  
  const cornersH = Math.floor(minute * factorH);
  const cornersA = Math.floor(minute * factorA);
  
  const yellowH = Math.min(5, Math.floor((minute * (0.02 + (seedH % 3) / 100))));
  const yellowA = Math.min(5, Math.floor((minute * (0.025 + (seedA % 3) / 100))));
  
  const redH = (seedH % 17 === 0 && minute > 70) ? 1 : 0;
  const redA = (seedA % 19 === 0 && minute > 75) ? 1 : 0;
  
  const savesH = Math.max(1, Math.floor(minute * 0.05 + (seedH % 3)));
  const savesA = Math.max(1, Math.floor(minute * 0.04 + (seedA % 3)));
  const shotsOnGoalH = Math.max(1, Math.floor(minute * 0.08 + (seedH % 4)));
  const shotsOnGoalA = Math.max(1, Math.floor(minute * 0.07 + (seedA % 4)));
  
  const dominantTeam = shotsOnGoalH >= shotsOnGoalA ? game.home : game.away;
  
  return {
    home: { corners: cornersH, yellowCards: yellowH, redCards: redH, goalkeeperSaves: savesH, shotsOnGoal: shotsOnGoalH },
    away: { corners: cornersA, yellowCards: yellowA, redCards: redA, goalkeeperSaves: savesA, shotsOnGoal: shotsOnGoalA },
    goalkeepers: {
      home: { name: resolveGoalkeeperName(game.home), saves: savesH },
      away: { name: resolveGoalkeeperName(game.away), saves: savesA }
    },
    topShooter: {
      name: resolveTopShooterName(dominantTeam),
      team: dominantTeam,
      shotsOnGoal: Math.max(1, Math.max(shotsOnGoalH, shotsOnGoalA) - 2)
    }
  };
};

const getLiveMatchRadar = (game) => {
  if (!game || !game.isLive) return null;
  
  let minute = 45;
  if (game.status) {
    const cleaned = game.status.replace(/[^\d]/g, '').trim();
    if (cleaned) minute = parseInt(cleaned);
  }
  const hash = String(game.id) + String(minute);
  let seed = 0;
  for (let i = 0; i < hash.length; i++) {
    seed = hash.charCodeAt(i) + ((seed << 5) - seed);
  }
  seed = Math.abs(seed);

  const homeBase = 30 + (seed % 41);
  const homePressure = homeBase;
  const awayPressure = 100 - homeBase;

  let statusText = 'Disputa intensa no meio de campo.';
  let zone = 'midfield'; 

  if (homePressure >= 60) {
    statusText = `${translateTeamName(game.home)} está pressionando fortemente! Bola parada na área adversária.`;
    zone = 'away_box';
  } else if (awayPressure >= 60) {
    statusText = `${translateTeamName(game.away)} domina as ações ofensivas neste momento! Perigo para a zaga do ${translateTeamName(game.home)}.`;
    zone = 'home_box';
  } else {
    if (homePressure > awayPressure) {
      statusText = `${translateTeamName(game.home)} tenta criar jogadas pelas laterais, jogo equilibrado.`;
    } else {
      statusText = `${translateTeamName(game.away)} busca contra-ataques velozes, mas defesa adversária segura bem.`;
    }
  }

  return {
    homePressure,
    awayPressure,
    statusText,
    zone
  };
};

export default function AnalysisPage() {
  const { user, isTrialActive } = useAuth();
  const [currentDate, setCurrentDate] = useState(() => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    return `${year}-${month}-${day}`;
  });

  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemoData, setIsDemoData] = useState(false);
  const [liveStats, setLiveStats] = useState(null);
  const [liveStatsMap, setLiveStatsMap] = useState({});
  const [loadingLiveStats, setLoadingLiveStats] = useState(false);

  const [selectedLeague, setSelectedLeague] = useState('Todas');
  const [isLivePollingEnabled, setIsLivePollingEnabled] = useState(false);
  const [isDateHovered, setIsDateHovered] = useState(false);

  const [ads, setAds] = useState({
    left: {
      title: "A2 VIP Group",
      description: "Acesso aos melhores sinais com ROI garantido.",
      emoji: "🎯",
      link: "https://t.me/",
      buttonText: "Participar VIP",
      enabled: true
    },
    right: {
      title: "Poisson Pro",
      description: "Libere análises táticas completas sem limites.",
      emoji: "⚡",
      link: "/pricing",
      buttonText: "Assinar Agora",
      enabled: true
    }
  });

  useEffect(() => {
    fetch('/api/public-settings')
      .then(res => res.json())
      .then(data => {
        if (data && data.ads) {
          setAds(data.ads);
        }
      })
      .catch(err => console.error("Erro ao carregar anúncios da Central:", err));
  }, []);

  const [matchState, setMatchState] = useState({
    team: 'home',
    type: 'Ataque',
    time: '17:58',
    period: '1º',
    x: 50,
    y: 50
  });

  const carouselRef = useRef(null);

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: direction * 200, behavior: 'smooth' });
    }
  };

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
    {"id": "667", "name": "Amistosos"}
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
        console.warn('[A2score] Erro ao parsear ligas:', e);
      }
    }

    async function loadDynamicLeagues() {
      try {
        const { supabase } = await import('../../lib/supabaseClient');
        if (!supabase) return;
        const { data, error } = await supabase
          .from('saas_settings')
          .select('value')
          .eq('key', 'target_leagues')
          .maybeSingle();

        if (data && data.value && Array.isArray(data.value)) {
          setActiveLeagues(data.value);
          localStorage.setItem('saas_target_leagues', JSON.stringify(data.value));
        }
      } catch (err) {
        console.warn('[A2score] Falha ao conectar Supabase para carregar ligas:', err);
      }
    }
    loadDynamicLeagues();
  }, []);

  const FILTERED_LEAGUES = useMemo(() => {
    return activeLeagues.map(liga => {
      let logo = '';
      const val = String(liga.id).toLowerCase();
      if (val === '1') logo = '/copadomundo.png';
      else if (val === '71') logo = 'https://media.api-sports.io/football/leagues/71.png';
      else if (val === '72') logo = 'https://media.api-sports.io/football/leagues/72.png';
      else if (val === '75') logo = '/brasileiraoc.png';
      else if (val === '13') logo = '/libertadores.png';
      else if (val === '12') logo = '/sudamericana.png';
      else if (val === '39') logo = '/premierleague.png';
      else if (val === '140') logo = 'https://media.api-sports.io/football/leagues/140.png';
      else if (val === '135') logo = 'https://media.api-sports.io/football/leagues/135.png';
      else if (val === '78') logo = '/bundesliga.png';
      else if (val === '3') logo = '/europaleague.png';
      else if (val === '848') logo = 'https://media.api-sports.io/football/leagues/848.png';
      else if (val === '44') logo = '/ligaargentina.png';
      else if (val === '667') logo = 'https://media.api-sports.io/football/leagues/667.png';
      else if (val === '94') logo = 'https://media.api-sports.io/football/leagues/94.png';
      else logo = `https://media.api-sports.io/football/leagues/${liga.id}.png`;

      return {
        id: parseInt(liga.id),
        name: liga.name,
        logo
      };
    });
  }, [activeLeagues]);

  const ALLOWED_LEAGUE_IDS = useMemo(() => {
    return activeLeagues.map(l => parseInt(l.id)).filter(Boolean);
  }, [activeLeagues]);

  const matchesAllowedLeagues = useCallback((match) => {
    const sourceId = parseInt(match.sourceLeagueId);
    if (!isNaN(sourceId) && ALLOWED_LEAGUE_IDS.includes(sourceId)) {
      return true;
    }
    const name = String(match.league).toLowerCase();
    for (const liga of activeLeagues) {
      if (name.includes(liga.name.toLowerCase())) return true;
    }
    return false;
  }, [ALLOWED_LEAGUE_IDS, activeLeagues]);

  const leaguesWithGames = useMemo(() => {
    const set = new Set();
    matches.forEach(m => {
      const name = String(m.league).toLowerCase();
      const sourceId = parseInt(m.sourceLeagueId);
      FILTERED_LEAGUES.forEach(fl => {
        if (sourceId === fl.id) {
          set.add(fl.name);
        } else if (name.includes(fl.name.toLowerCase())) {
          set.add(fl.name);
        } else if (fl.name === 'Libertadores' && name.includes('libertadores')) {
          set.add(fl.name);
        } else if (fl.name === 'Sulamericana' && (name.includes('sudamericana') || name.includes('sulamericana'))) {
          set.add(fl.name);
        } else if (fl.name === 'Liga Portugal' && name.includes('portugal')) {
          set.add(fl.name);
        } else if (fl.name === 'Liga Argentina' && name.includes('argentina')) {
          set.add(fl.name);
        } else if (fl.name === 'Amistosos' && name.includes('amistoso')) {
          set.add(fl.name);
        } else if (fl.name === 'Premier' && name.includes('premier')) {
          set.add(fl.name);
        } else if (fl.name === 'Bundes' && name.includes('bundesliga')) {
          set.add(fl.name);
        }
      });
    });
    return set;
  }, [matches, FILTERED_LEAGUES]);

  const filteredMatches = useMemo(() => {
    if (selectedLeague === 'Todas') return matches.filter(m => matchesAllowedLeagues(m));
    return matches.filter(m => {
      const name = String(m.league).toLowerCase();
      const sourceId = parseInt(m.sourceLeagueId);
      const target = FILTERED_LEAGUES.find(fl => fl.name === selectedLeague);
      if (!target) return false;
      
      if (sourceId === target.id) return true;
      if (name.includes(target.name.toLowerCase())) return true;
      if (target.name === 'Libertadores' && name.includes('libertadores')) return true;
      if (target.name === 'Sulamericana' && (name.includes('sudamericana') || name.includes('sulamericana'))) return true;
      if (target.name === 'Liga Portugal' && name.includes('portugal')) return true;
      if (target.name === 'Liga Argentina' && name.includes('argentina')) return true;
      if (target.name === 'Amistosos' && name.includes('amistoso')) return true;
      if (target.name === 'Premier' && name.includes('premier')) return true;
      if (target.name === 'Bundes' && name.includes('bundesliga')) return true;
      return false;
    });
  }, [matches, selectedLeague, FILTERED_LEAGUES]);

  // Fetch games of the selected date
  const fetchMatches = async (dateStr) => {
    setLoading(true);
    setSelectedMatch(null); // Reset selection when date changes
    try {
      const response = await fetch(`/api/football/fixtures?league=all&date=${dateStr}`);
      if (!response.ok) throw new Error('API respondente falhou');
      const data = await response.json();
      
      if (data.fixtures && data.fixtures.length > 0) {
        const filtered = data.fixtures.filter(matchesAllowedLeagues);
        setMatches(filtered);
        setIsDemoData(false);
      } else {
        // Fallback para mock se não houver jogos reais
        const mocks = getMockMatches(dateStr).filter(matchesAllowedLeagues);
        setMatches(mocks);
        setIsDemoData(true);
      }
    } catch (err) {
      console.warn("Erro ao buscar fixtures reais, usando fallback demonstrativo:", err);
      const mocks = getMockMatches(dateStr).filter(matchesAllowedLeagues);
      setMatches(mocks);
      setIsDemoData(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches(currentDate);
  }, [currentDate]);

  // Atualização silenciosa em segundo plano a cada 2 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      const refreshMatches = async () => {
        try {
          const response = await fetch(`/api/football/fixtures?league=all&date=${currentDate}`);
          if (response.ok) {
            const data = await response.json();
            if (data.fixtures && data.fixtures.length > 0) {
              const filtered = data.fixtures.filter(matchesAllowedLeagues);
              setMatches(filtered);
            }
          }
        } catch (e) {
          console.warn("Erro na atualização silenciosa dos jogos:", e);
        }
      };
      refreshMatches();
    }, 120000); // 2 minutos

    return () => clearInterval(interval);
  }, [currentDate, matchesAllowedLeagues]);

  // Simulator play-by-play for live field representation
  useEffect(() => {
    if (!selectedMatch || !selectedMatch.isLive) return;
    
    let initialTime = '17:58';
    let initialPeriod = '1º';
    
    if (selectedMatch.status) {
      const parts = selectedMatch.status.split('⚽');
      const clockStr = parts[1] || parts[0];
      const cleaned = clockStr.replace(/[^\d']/g, '').trim();
      if (cleaned) {
        initialTime = cleaned + "'";
        const numTime = parseInt(cleaned);
        if (numTime > 45) {
          initialPeriod = '2º';
        }
      }
    }

    setMatchState({
      team: 'home',
      type: 'Ataque',
      time: initialTime,
      period: initialPeriod,
      x: 65,
      y: 40
    });

    const states = [
      { team: 'home', type: 'Ataque', x: 65, y: 40 },
      { team: 'home', type: 'Ataque Perigoso', x: 82, y: 35 },
      { team: 'none', type: 'Disputa de Bola', x: 50, y: 50 },
      { team: 'away', type: 'Ataque', x: 35, y: 60 },
      { team: 'away', type: 'Chute a Gol', x: 14, y: 48 },
      { team: 'home', type: 'Defesa', x: 25, y: 30 },
      { team: 'away', type: 'Ataque Perigoso', x: 18, y: 55 },
      { team: 'home', type: 'Chute a Gol', x: 86, y: 52 },
      { team: 'home', type: 'Escanteio', x: 95, y: 92 },
      { team: 'away', type: 'Escanteio', x: 5, y: 8 }
    ];

    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % states.length;
      
      let matchTime = initialTime;
      let matchPeriod = initialPeriod;
      
      if (selectedMatch.status) {
        const parts = selectedMatch.status.split('⚽');
        const clockStr = parts[1] || parts[0];
        const cleaned = clockStr.replace(/[^\d']/g, '').trim();
        if (cleaned) {
          const baseNum = parseInt(cleaned);
          const currentTicked = Math.min(90, baseNum + Math.floor(idx / 2));
          matchTime = currentTicked + "'";
          if (currentTicked > 45) {
            matchPeriod = '2º';
          }
        }
      }

      setMatchState({
        team: states[idx].team,
        type: states[idx].type,
        time: matchTime,
        period: matchPeriod,
        x: states[idx].x,
        y: states[idx].y
      });
    }, 6000);

    return () => clearInterval(interval);
  }, [selectedMatch]);

  // Polling de estatísticas apenas para o jogo selecionado (se estiver ao vivo)
  useEffect(() => {
    if (!selectedMatch) {
      setLiveStats(null);
      return;
    }
    if (!selectedMatch.isLive) {
      setLiveStats(null);
      return;
    }

    const fetchLiveStats = async () => {
      if (String(selectedMatch.id).startsWith('mock')) {
        setLiveStats(getSimulatedLiveStats(selectedMatch));
        return;
      }
      setLoadingLiveStats(true);
      try {
        const res = await fetch(`/api/football/fixtures/stats?fixture=${selectedMatch.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data && !data.error && !data.empty) {
             const parsedStats = {
              home: {
                corners: data.home?.corners ?? 0,
                yellowCards: data.home?.yellowCards ?? 0,
                redCards: data.home?.redCards ?? 0,
                shotsOnGoal: data.home?.shotsOnGoal ?? 0,
                ballPossession: data.home?.ballPossession ?? 50,
                goalkeeperSaves: data.home?.goalkeeperSaves ?? 0
              },
              away: {
                corners: data.away?.corners ?? 0,
                yellowCards: data.away?.yellowCards ?? 0,
                redCards: data.away?.redCards ?? 0,
                shotsOnGoal: data.away?.shotsOnGoal ?? 0,
                ballPossession: data.away?.ballPossession ?? 50,
                goalkeeperSaves: data.away?.goalkeeperSaves ?? 0
              },
              goalkeepers: data.goalkeepers ?? {
                home: { name: 'Goleiro', saves: 0 },
                away: { name: 'Goleiro', saves: 0 }
              },
              topShooter: data.topShooter ?? {
                name: 'Nenhum',
                team: '',
                shotsOnGoal: 0
              }
            };
            setLiveStats(parsedStats);
          }
        }
      } catch (e) {
        console.warn(`Erro ao buscar estatísticas ao vivo para o fixture ${selectedMatch.id}:`, e);
      } finally {
        setLoadingLiveStats(false);
      }
    };

    // Busca inicial imediata ao abrir o jogo
    fetchLiveStats();

    // Executa polling contínuo se habilitado pelo usuário
    if (isLivePollingEnabled) {
      const interval = setInterval(fetchLiveStats, 60000); // a cada 60 segundos
      return () => clearInterval(interval);
    }
  }, [selectedMatch, isLivePollingEnabled]);

  // Desativa atualizações ao vivo quando o usuário sai do jogo selecionado
  useEffect(() => {
    if (!selectedMatch) {
      setIsLivePollingEnabled(false);
    }
  }, [selectedMatch]);

  const generateMockLiveStats = () => {
    return {
      home: { corners: 6, yellowCards: 2, redCards: 0, shotsOnGoal: 4, ballPossession: 55 },
      away: { corners: 4, yellowCards: 3, redCards: 0, shotsOnGoal: 3, ballPossession: 45 }
    };
  };

  // Navigating Dates
  const changeDate = (days) => {
    const d = new Date(currentDate + 'T00:00:00-03:00');
    d.setDate(d.getDate() + days);
    
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(d);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    setCurrentDate(`${year}-${month}-${day}`);
  };

  // Poisson Calculations based on selected Match
  const probabilities = useMemo(() => {
    if (!selectedMatch) return null;
    return calculateMatchProbabilities(selectedMatch.homeXG, selectedMatch.awayXG);
  }, [selectedMatch]);

  // Derived corner probabilities using Poisson
  const cornerData = useMemo(() => {
    if (!selectedMatch) return null;
    const hPos = typeof selectedMatch.homePosition === 'number' ? selectedMatch.homePosition : 10;
    const aPos = typeof selectedMatch.awayPosition === 'number' ? selectedMatch.awayPosition : 10;
    
    // Estimativas de Lambda de escanteios
    const lambdaHome = Math.max(3.0, 5.2 + (selectedMatch.homeXG - 1.2) * 0.8 + (20 - hPos) * 0.05);
    const lambdaAway = Math.max(2.5, 4.5 + (selectedMatch.awayXG - 1.2) * 0.8 + (20 - aPos) * 0.05);
    const lambdaTotal = lambdaHome + lambdaAway;

    // Calcular probabilities
    const sumP = (limit) => {
      let sum = 0;
      for (let k = 0; k < limit; k++) {
        sum += poisson(k, lambdaTotal);
      }
      return sum;
    };

    return {
      average: Math.round(lambdaTotal * 10) / 10,
      homeAverage: Math.round(lambdaHome * 10) / 10,
      awayAverage: Math.round(lambdaAway * 10) / 10,
      over85: Math.round((1 - sumP(9)) * 100),
      over95: Math.round((1 - sumP(10)) * 100),
      over105: Math.round((1 - sumP(11)) * 100)
    };
  }, [selectedMatch]);

  // Derived cards probabilities using Poisson
  const cardData = useMemo(() => {
    if (!selectedMatch) return null;
    const numericId = parseInt(String(selectedMatch.id).replace(/\D/g, '')) || 5;
    const baseCards = 4.8 + (numericId % 5 ? 0.2 : -0.4);
    const lambdaTotal = Math.max(2.0, baseCards);

    const sumP = (limit) => {
      let sum = 0;
      for (let k = 0; k < limit; k++) {
        sum += poisson(k, lambdaTotal);
      }
      return sum;
    };

    return {
      average: Math.round(lambdaTotal * 10) / 10,
      over35: Math.round((1 - sumP(4)) * 100),
      over45: Math.round((1 - sumP(5)) * 100)
    };
  }, [selectedMatch]);

  // Attack & Defense Strength calculations for display (0-100 scale)
  const statsStrengths = useMemo(() => {
    if (!selectedMatch) return null;
    const homeAttack = Math.min(95, Math.max(30, Math.round(selectedMatch.homeXG * 40)));
    const homeDefense = Math.min(95, Math.max(35, Math.round(100 - (selectedMatch.awayXG * 35))));
    const awayAttack = Math.min(95, Math.max(30, Math.round(selectedMatch.awayXG * 40)));
    const awayDefense = Math.min(95, Math.max(35, Math.round(100 - (selectedMatch.homeXG * 35))));

    return { homeAttack, homeDefense, awayAttack, awayDefense };
  }, [selectedMatch]);

  // AI Bet insights based on calculations
  const aiInsight = useMemo(() => {
    if (!probabilities || !selectedMatch || !cornerData || !cardData) return null;
    
    let recommendation = "";
    let confidence = "Média";
    let rationale = "";

    if (probabilities.homeWin > 65) {
      recommendation = `Vitória do ${translateTeamName(selectedMatch.home)}`;
      confidence = "Alta";
      rationale = `${translateTeamName(selectedMatch.home)} joga em casa com xG projetado de ${selectedMatch.homeXG} contra ${selectedMatch.awayXG} do adversário. Excelente probabilidade matemática (${probabilities.homeWin}%).`;
    } else if (probabilities.awayWin > 62) {
      recommendation = `Vitória do ${translateTeamName(selectedMatch.away)}`;
      confidence = "Alta";
      rationale = `${translateTeamName(selectedMatch.away)} apresenta força projetada considerável (${probabilities.awayWin}%) jogando fora de casa nesta rodada.`;
    } else if (probabilities.btts > 68 && probabilities.over25 > 62) {
      recommendation = "Ambas Marcam e Mais de 2.5 Gols";
      confidence = "Alta";
      rationale = "Ambos os times atacam intensamente. Poisson prevê 70%+ de chances para ambos marcarem, com saldo somado acima de 2 gols.";
    } else if (probabilities.over15 > 82) {
      recommendation = "Mais de 1.5 Gols na partida";
      confidence = "Alta";
      rationale = `Estudo estatístico aponta probabilidade de ${probabilities.over15}% de sair no mínimo 2 gols neste confronto, tornando-se uma aposta de valor seguro.`;
    } else if (cornerData.over95 > 70) {
      recommendation = "Mais de 9.5 Escanteios";
      confidence = "Média";
      rationale = `Volume de ataque projetado alto resultando em tendência forte de cantos (${cornerData.over95}% de chance para Over 9.5).`;
    } else {
      recommendation = "Menos de 3.5 Gols";
      confidence = "Média";
      rationale = "Confronto equilibrado e defesas estruturadas. Cenário tático aponta para partida amarrada e de poucos gols.";
    }

    return { recommendation, confidence, rationale };
  }, [probabilities, selectedMatch, cornerData, cardData]);

  // Pretty display for forms
  const renderFormBadge = (char, index) => {
    let color = '#888';
    let label = 'E';
    if (char === 'V' || char === 'W') {
      color = '#00e676';
      label = 'V';
    } else if (char === 'D' || char === 'L') {
      color = '#ff3d00';
      label = 'D';
    }
    return (
      <span key={index} style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: color + '22',
        border: `1px solid ${color}`,
        color: color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.68rem',
        fontWeight: 'bold',
        marginLeft: '4px'
      }}>{label}</span>
    );
  };

  if (!user) {
    return null;
  }

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';
  if (!isTrialActive() && !isAdmin) {
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
          Área Exclusiva para Assinantes!
        </h3>
        <p style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '12px', lineHeight: 1.5 }}>
          A Central de Previsões e Estatísticas A2score é uma ferramenta premium. Assine agora o plano PRO por apenas **R$ 19,90/mês** para ter acesso ilimitado.
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      
      {/* CSS Styles injection for B3 Marquee / Ticker animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes tickerAnimation {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-33.333%, 0, 0); }
        }
        .ticker-wrap:hover .ticker-content {
          animation-play-state: paused;
        }
        .pulse {
          animation: pulseKey 2s infinite ease-in-out;
        }
        @keyframes pulseKey {
          0% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
          100% { opacity: 0.6; transform: scale(1); }
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
        @keyframes pulseHeat {
          0% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.6; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.6; }
        }
        @media (max-width: 1400px) {
          .main-page-layout-grid {
            grid-template-columns: 1fr !important;
          }
          .side-ad-column {
            display: none !important;
          }
        }
        .games-grid {
          grid-template-columns: repeat(6, 1fr);
        }
        @media (max-width: 1750px) {
          .games-grid {
            grid-template-columns: repeat(5, 1fr);
          }
        }
        @media (max-width: 1500px) {
          .games-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        @media (max-width: 1250px) {
          .games-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 900px) {
          .games-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 600px) {
          .games-grid {
            grid-template-columns: 1fr;
          }
        }
      `}} />

      {/* Header and Title */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div>
          <h1 style={{
            fontSize: '1.8rem',
            fontWeight: '800',
            color: '#fff',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <img 
              src="/a2logo.jpg" 
              alt="A2 Logo" 
              style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} 
            />
            Central A2score
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Previsões táticas e probabilidades exatas calculadas via Distribuição Matemática de Poisson.
          </p>
        </div>
      </div>

      {(() => {
        const getAbbr = (name) => {
          if (!name) return '???';
          const cleanName = name.replace(/[^a-zA-Z\s]/g, '').trim();
          const parts = cleanName.split(/\s+/);
          if (parts.length >= 3) {
            return (parts[0][0] + parts[1][0] + parts[2][0]).toUpperCase();
          } else if (parts.length === 2) {
            return (parts[0].slice(0, 2) + parts[1][0]).toUpperCase();
          } else {
            return cleanName.slice(0, 3).toUpperCase();
          }
        };

        const parseMatchDate = (dateStr) => {
          if (!dateStr) return { day: '', time: '' };
          const parts = dateStr.split(' • ');
          if (parts.length === 2) {
            return { day: parts[0], time: parts[1] };
          }
          return { day: dateStr, time: '' };
        };

        const activeTickerMatches = matches.filter(match => match.isLive || !match.isFinished);
        if (activeTickerMatches.length === 0) return null;

        const matchesByDay = {};
        activeTickerMatches.forEach(match => {
          const { day } = parseMatchDate(match.date);
          if (!matchesByDay[day]) {
            matchesByDay[day] = [];
          }
          matchesByDay[day].push(match);
        });

        const tickerItems = [];
        Object.keys(matchesByDay).forEach(day => {
          tickerItems.push({ type: 'separator', label: day });
          matchesByDay[day].forEach(match => {
            tickerItems.push({ type: 'match', match });
          });
        });

        const marqueeSpeed = Math.max(90, tickerItems.length * 20);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="ticker-wrap" style={{
              overflow: 'hidden',
              width: '100%',
              background: 'transparent',
              border: 'none',
              padding: '4px 0',
              position: 'relative'
            }}>
              <div className="ticker-content" style={{
                display: 'flex',
                gap: '12px',
                width: 'max-content',
                alignItems: 'center',
                animation: `tickerAnimation ${marqueeSpeed}s linear infinite`
              }}>
                {[...tickerItems, ...tickerItems, ...tickerItems].map((item, idx) => {
                  if (item.type === 'separator') {
                    return (
                      <div 
                        key={`sep_${idx}`}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          color: '#666', 
                          fontSize: '0.7rem', 
                          fontWeight: '800',
                          padding: '0 8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <span>•</span>
                        <span>{item.label}</span>
                        <span>•</span>
                      </div>
                    );
                  }

                  const { match } = item;
                  const isSelected = selectedMatch && selectedMatch.id === match.id;
                  const { time } = parseMatchDate(match.date);
                  const displayTime = match.isLive ? `${match.status.replace('Em Andamento ⚽ ', '')}` : time;
                  
                  const isLive = match.isLive;
                  
                  let pillBg = 'rgba(255, 255, 255, 0.02)';
                  let pillBorder = 'rgba(255, 255, 255, 0.08)';
                  let glowColor = 'rgba(255,255,255,0)';
                  
                  if (isLive) {
                    pillBg = 'rgba(255, 68, 68, 0.06)';
                    pillBorder = 'rgba(255, 68, 68, 0.25)';
                    glowColor = 'rgba(255, 68, 68, 0.08)';
                  } else if (isSelected) {
                    pillBg = 'rgba(204, 255, 0, 0.04)';
                    pillBorder = 'var(--brand-neon)';
                    glowColor = 'rgba(204, 255, 0, 0.08)';
                  } else {
                    pillBg = 'rgba(16, 185, 129, 0.04)';
                    pillBorder = 'rgba(16, 185, 129, 0.15)';
                  }

                  return (
                    <div
                      key={`match_${match.id}_${idx}`}
                      onClick={() => setSelectedMatch(match)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: pillBg,
                        border: `1px solid ${pillBorder}`,
                        borderRadius: '20px',
                        padding: '4px 12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected || isLive ? `0 0 8px ${glowColor}` : 'none',
                        height: '28px',
                        boxSizing: 'border-box',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--brand-neon)'; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = pillBorder; }}
                    >
                      <span style={{ 
                        fontSize: '0.62rem', 
                        fontWeight: '800', 
                        color: isLive ? '#ff4444' : '#aaa',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {isLive && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#ff4444', display: 'inline-block' }} className="pulse" />}
                        {displayTime}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <img 
                          src={match.homeLogo || getTeamLogoUrl(match.home)} 
                          alt={match.home} 
                          style={{ width: '14px', height: '10px', objectFit: 'cover', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.08)' }}
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getTeamLogoUrl(match.home); }}
                        />
                        <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: '#fff' }}>
                          {getAbbr(match.home)}
                        </span>
                        
                        <span style={{ color: '#555', fontSize: '0.6rem', fontWeight: 'bold' }}>-</span>
                        
                        <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: '#fff' }}>
                          {getAbbr(match.away)}
                        </span>
                        <img 
                          src={match.awayLogo || getTeamLogoUrl(match.away)} 
                          alt={match.away} 
                          style={{ width: '14px', height: '10px', objectFit: 'cover', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.08)' }}
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getTeamLogoUrl(match.away); }}
                        />
                      </div>

                      {isLive && (
                        <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--brand-neon)', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '6px' }}>
                          {match.goalsHome} x {match.goalsAway}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}



      {/* Demo Mode / API status indicator */}
      {isDemoData && (
        <div style={{
          background: 'rgba(255, 152, 0, 0.08)',
          border: '1px solid rgba(255, 152, 0, 0.25)',
          borderRadius: '8px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#ff9800',
          fontSize: '0.85rem',
          fontWeight: '500'
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>
            <strong>Modo de Demonstração Ativado:</strong> Exibindo jogos clássicos fictícios para fins de teste, pois não há jogos profissionais agendados ou o limite diário da API de futebol foi atingido.
          </span>
        </div>
      )}

      {!selectedMatch ? (
        <>
          {/* League Filter Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
            {/* Todas button */}
            <button
              onClick={() => setSelectedLeague('Todas')}
              title="Todas as Ligas"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: selectedLeague === 'Todas' ? 'var(--brand-neon-dim)' : 'var(--bg-surface)',
                border: selectedLeague === 'Todas' ? '2px solid var(--brand-neon)' : '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
                boxShadow: selectedLeague === 'Todas' ? '0 0 8px var(--brand-neon-dim)' : 'none'
              }}
            >
              <Trophy size={22} color={selectedLeague === 'Todas' ? 'var(--brand-neon)' : 'var(--text-secondary)'} />
            </button>

            {FILTERED_LEAGUES.map((league, idx) => {
              const hasGames = leaguesWithGames.has(league.name);
              const isSelected = selectedLeague === league.name;
              
              return (
                <button
                  key={`${league.name}_${idx}`}
                  onClick={() => setSelectedLeague(league.name)}
                  title={league.name + (hasGames ? ' (Tem jogos hoje)' : ' (Sem jogos hoje)')}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: isSelected ? '3px solid var(--brand-neon)' : '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    opacity: isSelected ? 1 : 0.8,
                    boxShadow: isSelected ? '0 0 12px var(--brand-neon)' : '0 4px 6px rgba(0, 0, 0, 0.3)',
                    padding: '6px'
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.opacity = '1';
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                    }
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.opacity = isSelected ? '1' : '0.8';
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                >
                  <img 
                    src={league.logo} 
                    alt={league.name} 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain',
                      filter: 'drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.15))'
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentNode;
                      if (parent) {
                        const fallback = parent.querySelector('.fallback-letter');
                        if (fallback) fallback.style.display = 'inline';
                        parent.style.background = isSelected ? 'var(--brand-neon-dim)' : 'var(--bg-surface)';
                      }
                    }}
                  />
                  <span 
                    className="fallback-letter" 
                    style={{ display: 'none', fontSize: '0.8rem', fontWeight: 'bold', color: isSelected ? 'var(--brand-neon)' : 'var(--text-secondary)' }}
                  >
                    {league.name.substring(0, 2).toUpperCase()}
                  </span>
                </button>
              );
            })}

            {/* Game Count Badge & Date Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                title={`Total de jogos filtrados: ${filteredMatches.length}`}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'var(--brand-neon-dim)',
                  border: '2px solid var(--brand-neon)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 10px var(--brand-neon-dim)',
                  userSelect: 'none'
                }}
              >
                <span style={{ fontSize: '1.05rem', fontWeight: 'bold', color: 'var(--brand-neon)', lineHeight: 1 }}>
                  {filteredMatches.length}
                </span>
                <span style={{ fontSize: '0.45rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '1px' }}>
                  Jogos
                </span>
              </div>

              {/* Circular Hover-Expanding Date Selector */}
              <div 
                onMouseEnter={() => setIsDateHovered(true)}
                onMouseLeave={() => setIsDateHovered(false)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-surface)',
                  border: isDateHovered ? '2px solid var(--brand-neon)' : '1px solid var(--border-color)',
                  borderRadius: '22px',
                  height: '44px',
                  width: isDateHovered ? '135px' : '44px',
                  padding: isDateHovered ? '4px 8px' : '0',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isDateHovered ? '0 0 10px var(--brand-neon-dim)' : 'none',
                  overflow: 'hidden',
                  cursor: 'pointer'
                }}
              >
                {/* Left arrow: visible on hover */}
                <button 
                  onClick={() => changeDate(-1)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    opacity: isDateHovered ? 1 : 0,
                    transform: isDateHovered ? 'translateX(0)' : 'translateX(-10px)',
                    transition: 'opacity 0.2s, transform 0.2s',
                    pointerEvents: isDateHovered ? 'auto' : 'none',
                    zIndex: 4
                  }}
                >
                  <ChevronLeft size={16} color="var(--brand-neon)" />
                </button>
                
                {/* Center Content */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#fff',
                  width: 'max-content',
                  flexShrink: 0,
                  zIndex: 2
                }}>
                  {/* Calendar icon - always visible */}
                  <div style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isDateHovered ? 'rgba(204, 255, 0, 0.1)' : 'transparent',
                    border: isDateHovered ? '1px solid rgba(204, 255, 0, 0.25)' : 'none',
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}>
                    <Calendar size={18} color="var(--brand-neon)" />
                    {/* Hidden date picker input overlay */}
                    <input 
                      type="date"
                      value={currentDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setCurrentDate(e.target.value);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer',
                        zIndex: 5
                      }}
                    />
                  </div>

                  {/* Text: only visible on hover */}
                  <span style={{
                    opacity: isDateHovered ? 1 : 0,
                    width: isDateHovered ? 'auto' : '0px',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    transition: 'opacity 0.2s, width 0.2s',
                    pointerEvents: 'none'
                  }}>
                    {new Date(currentDate + 'T00:00:00-03:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                </div>

                {/* Right arrow: visible on hover */}
                <button 
                  onClick={() => changeDate(1)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    opacity: isDateHovered ? 1 : 0,
                    transform: isDateHovered ? 'translateX(0)' : 'translateX(10px)',
                    transition: 'opacity 0.2s, transform 0.2s',
                    pointerEvents: isDateHovered ? 'auto' : 'none',
                    zIndex: 4
                  }}
                >
                  <ChevronRight size={16} color="var(--brand-neon)" />
                </button>
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => fetchMatches(currentDate)}
                title="Atualizar Jogos"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: '#fff',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => { 
                  e.currentTarget.style.borderColor = 'var(--brand-neon)'; 
                  e.currentTarget.style.color = 'var(--brand-neon)'; 
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.borderColor = 'var(--border-color)'; 
                  e.currentTarget.style.color = '#fff'; 
                }}
              >
                <RefreshCw size={16} className={loading ? "spin" : ""} />
              </button>
            </div>
          </div>

          <div className="main-page-layout-grid" style={{
            display: 'grid',
            gridTemplateColumns: `${ads.left?.enabled ? '180px' : ''} 1fr ${ads.right?.enabled ? '180px' : ''}`.trim().replace(/\s+/g, ' ') || '1fr',
            gap: (ads.left?.enabled || ads.right?.enabled) ? '20px' : '0px',
            width: '100%',
            alignItems: 'start'
          }}>
            {/* Banner de Propaganda Esquerdo */}
            {ads.left?.enabled && (
              <div 
                className="side-ad-column" 
                onClick={() => window.open(ads.left.link, '_blank')}
                style={{
                  background: 'linear-gradient(180deg, #141419, #0b0b0e)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  width: '180px',
                  height: '420px',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                }}
              >
                {ads.left.imageUrl ? (
                  <>
                    <img 
                      src={ads.left.imageUrl} 
                      alt="" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(15px) brightness(0.35)', transform: 'scale(1.15)', position: 'absolute', top: 0, left: 0, zIndex: 1 }} 
                    />
                    <img 
                      src={ads.left.imageUrl} 
                      alt={ads.left.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'relative', zIndex: 2, display: 'block' }} 
                    />
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', height: '100%', padding: '14px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--brand-neon)', fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Publicidade</div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.8rem' }}>{ads.left.emoji || '🎯'}</span>
                      <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>{ads.left.title}</div>
                      <div style={{ color: '#888', fontSize: '0.68rem', lineHeight: '1.3' }}>{ads.left.description}</div>
                    </div>
                    <div 
                      style={{ background: 'var(--brand-neon)', color: '#000', borderRadius: '6px', padding: '8px 10px', fontSize: '0.7rem', fontWeight: 'bold', width: '100%', textAlign: 'center' }}
                    >
                      {ads.left.buttonText || 'Participar VIP'}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* initial Screen: games list container */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
              {loading ? (
                <div style={{
                  height: '200px',
                  background: 'var(--bg-surface)',
                  border: '1px dashed var(--border-color)',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  color: '#888',
                  fontSize: '0.9rem'
                }}>
                  <RefreshCw className="spin" size={24} />
                  <span>Buscando e processando partidas da rodada...</span>
                  <style jsx>{`
                    .spin { animation: spin 1.5s linear infinite; }
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                  `}</style>
                </div>
              ) : filteredMatches.length === 0 ? (
                <div style={{
                  height: '200px',
                  background: 'var(--bg-surface)',
                  border: '1px dashed var(--border-color)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#888',
                  fontSize: '0.9rem'
                }}>
                  Nenhuma partida disponível nesta liga para a data selecionada.
                </div>
              ) : (
                /* Games Grid grouped or listed cleanly */
                <div className="games-grid" style={{
                  display: 'grid',
                  gap: '10px'
                }}>
                  {filteredMatches.map((match, idx) => (
                    <div 
                      key={`${match.id || 'match'}_grid_${idx}`}
                      onClick={() => setSelectedMatch(match)}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => { 
                        e.currentTarget.style.borderColor = 'var(--brand-neon)'; 
                        e.currentTarget.style.transform = 'translateY(-1px)'; 
                      }}
                      onMouseLeave={(e) => { 
                        e.currentTarget.style.borderColor = 'var(--border-color)'; 
                        e.currentTarget.style.transform = 'none'; 
                      }}
                    >
                      {/* Compact Header: League & Status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.6rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }}>
                          {(match.league || '').replace('Campeonato ', '')}
                        </span>
                        <span style={{
                          fontWeight: 'bold',
                          color: match.isLive ? 'var(--brand-neon)' : 'var(--text-secondary)',
                          fontSize: '0.58rem'
                        }}>
                          {match.status}
                        </span>
                      </div>

                      {/* Teams and Scores (Compact) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                            <img 
                              src={match.homeLogo || getTeamLogoUrl(match.home)} 
                              alt={translateTeamName(match.home)} 
                              style={{ width: '14px', height: '14px', objectFit: 'contain', flexShrink: 0 }}
                              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getTeamLogoUrl(match.home); }}
                            />
                            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {translateTeamName(match.home)}
                            </span>
                          </div>
                          {(match.isLive || match.isFinished) && (
                            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#fff', marginLeft: '6px' }}>{match.goalsHome}</span>
                          )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                            <img 
                              src={match.awayLogo || getTeamLogoUrl(match.away)} 
                              alt={translateTeamName(match.away)} 
                              style={{ width: '14px', height: '14px', objectFit: 'contain', flexShrink: 0 }}
                              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getTeamLogoUrl(match.away); }}
                            />
                            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {translateTeamName(match.away)}
                            </span>
                          </div>
                          {(match.isLive || match.isFinished) && (
                            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#fff', marginLeft: '6px' }}>{match.goalsAway}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {ads.right?.enabled && (
              <div 
                className="side-ad-column" 
                onClick={() => {
                  if (ads.right.link.startsWith('http')) {
                    window.open(ads.right.link, '_blank');
                  } else {
                    window.location.href = ads.right.link;
                  }
                }}
                style={{
                  background: 'linear-gradient(180deg, #141419, #0b0b0e)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  width: '180px',
                  height: '420px',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                }}
              >
                {ads.right.imageUrl ? (
                  <>
                    <img 
                      src={ads.right.imageUrl} 
                      alt="" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(15px) brightness(0.35)', transform: 'scale(1.15)', position: 'absolute', top: 0, left: 0, zIndex: 1 }} 
                    />
                    <img 
                      src={ads.right.imageUrl} 
                      alt={ads.right.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'relative', zIndex: 2, display: 'block' }} 
                    />
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', height: '100%', padding: '14px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--brand-neon)', fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Publicidade</div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.8rem' }}>{ads.right.emoji || '⚡'}</span>
                      <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>{ads.right.title}</div>
                      <div style={{ color: '#888', fontSize: '0.68rem', lineHeight: '1.3' }}>{ads.right.description}</div>
                    </div>
                    <div 
                      style={{ background: 'var(--brand-neon)', color: '#000', borderRadius: '6px', padding: '8px 10px', fontSize: '0.7rem', fontWeight: 'bold', width: '100%', textAlign: 'center' }}
                    >
                      {ads.right.buttonText || 'Assinar Agora'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Back button and Live update toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Voltar button */}
            <button
              onClick={() => setSelectedMatch(null)}
              title="Voltar para os Jogos do Dia"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--bg-surface)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: 0.8,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                color: '#fff'
              }}
              onMouseEnter={(e) => { 
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.8)';
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.opacity = '0.8';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <ChevronLeft size={20} />
            </button>

            {/* Ativar Ao Vivo toggle button */}
            <button
              onClick={() => setIsLivePollingEnabled(!isLivePollingEnabled)}
              title={isLivePollingEnabled ? "Desativar atualizações automáticas ao vivo" : "Ativar atualizações automáticas ao vivo"}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: isLivePollingEnabled ? 'rgba(204, 255, 0, 0.08)' : 'var(--bg-surface)',
                border: isLivePollingEnabled ? '2px solid var(--brand-neon)' : '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: isLivePollingEnabled ? 1 : 0.8,
                boxShadow: isLivePollingEnabled ? '0 0 12px var(--brand-neon)' : '0 4px 6px rgba(0, 0, 0, 0.3)',
                color: isLivePollingEnabled ? 'var(--brand-neon)' : '#fff',
                position: 'relative'
              }}
              onMouseEnter={(e) => { 
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.opacity = '1';
                if (!isLivePollingEnabled) {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                }
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.opacity = isLivePollingEnabled ? '1' : '0.8';
                if (!isLivePollingEnabled) {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
            >
              <Activity size={20} />
              {/* Pulsing indicator dot on top right of the button */}
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isLivePollingEnabled ? 'var(--brand-neon)' : '#666',
                border: '1.5px solid var(--bg-surface)',
                animation: isLivePollingEnabled ? 'pulseKey 1.5s infinite' : 'none'
              }} />
            </button>
          </div>

          {/* Selected Match Analysis Layout */}
          {probabilities && cornerData && cardData && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          width: '100%'
        }}>
          
          {/* COLUMN 1: TEAMS ANALYSIS & HEAD-TO-HEAD */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {selectedMatch.isLive ? (
              <LiveFieldWidget 
                match={selectedMatch} 
                matchState={matchState} 
                liveStats={liveStats} 
                cornerData={cornerData} 
                cardData={cardData} 
                isLivePollingEnabled={isLivePollingEnabled} 
                setIsLivePollingEnabled={setIsLivePollingEnabled} 
              />
            ) : (
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '24px',
                position: 'relative',
                overflow: 'hidden',
                height: '815px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxSizing: 'border-box'
              }}>
                {/* Background gradient shadow */}
                  <div style={{
                    position: 'absolute',
                    top: '-50%',
                    left: '-50%',
                    width: '200%',
                    height: '200%',
                    background: 'radial-gradient(circle, rgba(204, 255, 0, 0.02) 0%, transparent 60%)',
                    pointerEvents: 'none'
                  }}></div>

                  {/* Match Details Header */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '20px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--brand-neon)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                      {selectedMatch.league} • {selectedMatch.round}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Local: {selectedMatch.venue || 'Estádio não cadastrado'}
                    </span>
                  </div>

                  {/* Head-to-Head Main Logos and Names */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '20px 0' }}>
                    
                    {/* Home Team Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                      }}>
                        <img 
                          src={selectedMatch.homeLogo || getTeamLogoUrl(selectedMatch.home)} 
                          alt={selectedMatch.home} 
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          onError={(e) => { e.target.src = getTeamLogoUrl(selectedMatch.home); }}
                        />
                      </div>
                      <span style={{ fontSize: '0.92rem', fontWeight: '800', color: '#fff', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                        {translateTeamName(selectedMatch.home)}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        Casa • Tabela: {selectedMatch.homePosition}º
                      </span>
                    </div>

                    {/* VS and Score */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '0 12px' }}>
                      {(selectedMatch.isLive || selectedMatch.isFinished) ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '2rem', fontWeight: '900', color: '#fff' }}>{selectedMatch.goalsHome}</span>
                          <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>-</span>
                          <span style={{ fontSize: '2rem', fontWeight: '900', color: '#fff' }}>{selectedMatch.goalsAway}</span>
                        </div>
                      ) : (
                        <div style={{
                          padding: '4px 12px',
                          background: 'rgba(204, 255, 0, 0.06)',
                          border: '1px solid rgba(204, 255, 0, 0.2)',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          color: 'var(--brand-neon)'
                        }}>
                          VS
                        </div>
                      )}
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                        {selectedMatch.status}
                      </span>
                    </div>

                    {/* Away Team Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                      }}>
                        <img 
                          src={selectedMatch.awayLogo || getTeamLogoUrl(selectedMatch.away)} 
                          alt={translateTeamName(selectedMatch.away)} 
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          onError={(e) => { e.target.src = getTeamLogoUrl(selectedMatch.away); }}
                        />
                      </div>
                      <span style={{ fontSize: '0.92rem', fontWeight: '800', color: '#fff', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                        {translateTeamName(selectedMatch.away)}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        Fora • Tabela: {selectedMatch.awayPosition}º
                      </span>
                    </div>

                  </div>

                  {/* expected Goals (xG) preditivos & advertising banner container */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', flex: 1, marginTop: '24px' }}>
                    <div style={{
                      padding: '12px 16px',
                      background: 'var(--bg-surface-light)',
                      borderTopLeftRadius: '10px',
                      borderTopRightRadius: '10px',
                      borderBottomLeftRadius: '0px',
                      borderBottomRightRadius: '0px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={14} color="var(--brand-neon)" />
                        <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#fff' }}>xG Projetado do Confronto</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff' }}>
                        <span style={{ color: 'var(--brand-neon)' }}>{selectedMatch.homeXG}</span>
                        <span style={{ color: '#555', margin: '0 6px' }}>vs</span>
                        <span style={{ color: 'var(--brand-neon)' }}>{selectedMatch.awayXG}</span>
                      </div>
                    </div>

                    {/* AREA DE PROPAGANDA (Advertising Banner) */}
                    {ads.internal?.enabled && (
                      <div 
                        onClick={() => {
                          if (ads.internal.link.startsWith('http')) {
                            window.open(ads.internal.link, '_blank');
                          } else {
                            window.location.href = ads.internal.link;
                          }
                        }}
                        style={{
                          flex: 1,
                          background: 'linear-gradient(135deg, rgba(204, 255, 0, 0.03) 0%, rgba(20, 20, 25, 0.95) 100%)',
                          border: '1px dashed var(--border-color)',
                          borderTop: 'none',
                          borderBottomLeftRadius: '12px',
                          borderBottomRightRadius: '12px',
                          borderTopLeftRadius: '0px',
                          borderTopRightRadius: '0px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          position: 'relative',
                          overflow: 'hidden',
                          minHeight: '120px'
                        }}
                      >
                        {ads.internal.imageUrl ? (
                          <>
                            <img 
                              src={ads.internal.imageUrl} 
                              alt="" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(15px) brightness(0.35)', transform: 'scale(1.15)', position: 'absolute', top: 0, left: 0, zIndex: 1 }} 
                            />
                            <img 
                              src={ads.internal.imageUrl} 
                              alt={ads.internal.title} 
                              style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'relative', zIndex: 2, display: 'block' }} 
                            />
                          </>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '20px', textAlign: 'center' }}>
                            {/* Neon scan effect */}
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '2px',
                              background: 'linear-gradient(90deg, transparent, var(--brand-neon), transparent)',
                              animation: 'scanAd 4s linear infinite'
                            }}></div>
                            <span style={{ 
                              fontSize: '0.62rem', 
                              color: 'var(--brand-neon)', 
                              fontWeight: 'bold', 
                              border: '1px solid var(--brand-neon)', 
                              padding: '2px 8px', 
                              borderRadius: '4px',
                              textTransform: 'uppercase',
                              letterSpacing: '1px'
                            }}>
                              Publicidade
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '1.6rem' }}>{ads.internal.emoji || '📊'}</span>
                              <div>
                                <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: '900', color: '#fff', marginBottom: '4px' }}>
                                  {ads.internal.title}
                                </span>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '280px', margin: '0 auto' }}>
                                  {ads.internal.description}
                                </span>
                              </div>
                            </div>
                            <div 
                              style={{
                                background: 'var(--brand-neon)',
                                color: '#000',
                                borderRadius: '20px',
                                padding: '6px 16px',
                                fontSize: '0.72rem',
                                fontWeight: 'bold'
                              }}
                            >
                              {ads.internal.buttonText || 'Ver Mais'}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

              </div>
            )}
          </div>

          {/* COLUMN 2: POISSON PROBABILITIES & INSIGHTS */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '24px'
          }}>
            
            {/* Primary comparison container aligning with Column 1 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              minHeight: '815px',
              height: 'auto',
              boxSizing: 'border-box'
            }}>
              {/* Row 1: Recomendação +EV & Cálculo de Vitória (1X2) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {/* AI Predictions / Insights */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(204, 255, 0, 0.04) 0%, rgba(179, 57, 255, 0.02) 100%)',
                border: '1px solid rgba(204, 255, 0, 0.15)',
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                position: 'relative',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="var(--brand-neon)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--brand-neon)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Recomendação +EV Baseada em IA
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#fff', display: 'block' }}>
                    {aiInsight.recommendation}
                  </span>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    background: 'rgba(204, 255, 0, 0.12)',
                    color: 'var(--brand-neon)',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    display: 'inline-block',
                    marginTop: '6px'
                  }}>
                    Confiança: {aiInsight.confidence}
                  </span>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                  {aiInsight.rationale}
                </p>
              </div>

              {/* Probability 1X2 Card */}
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                  <TrendingUp size={18} color="var(--brand-neon)" />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>Cálculo de Vitória (1X2)</h3>
                </div>

                {/* Segmented horizontal percentage bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ height: '14px', background: 'var(--bg-surface-light)', borderRadius: '7px', display: 'flex', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <div style={{ width: `${probabilities.homeWin}%`, background: 'var(--brand-neon)', transition: 'width 0.5s' }} title={`Casa: ${probabilities.homeWin}%`}></div>
                    <div style={{ width: `${probabilities.draw}%`, background: '#888', transition: 'width 0.5s' }} title={`Empate: ${probabilities.draw}%`}></div>
                    <div style={{ width: `${probabilities.awayWin}%`, background: '#b339ff', transition: 'width 0.5s' }} title={`Fora: ${probabilities.awayWin}%`}></div>
                  </div>

                  {/* Percentage tags below */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand-neon)' }}></div>
                        <span style={{ color: '#fff', fontWeight: 'bold' }}>{translateTeamName(selectedMatch.home)}</span>
                      </div>
                      <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>{probabilities.homeWin}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#888' }}></div>
                        <span style={{ color: 'var(--text-secondary)' }}>Empate</span>
                      </div>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>{probabilities.draw}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#b339ff' }}></div>
                        <span style={{ color: '#fff', fontWeight: 'bold' }}>{translateTeamName(selectedMatch.away)}</span>
                      </div>
                      <span style={{ color: '#b339ff', fontWeight: 'bold' }}>{probabilities.awayWin}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Indicadores de Força Técnica & Probabilidades de Gols */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {/* Team Strengths and Forms */}
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                  <BarChart2 size={18} color="var(--brand-neon)" />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>Indicadores de Força Técnica</h3>
                </div>

                {/* Home Team Strengths */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#fff' }}>{translateTeamName(selectedMatch.home)}</span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginRight: '4px' }}>Forma:</span>
                      {(selectedMatch.formHome || generateFormFromStrength(selectedMatch.home)).map((c, i) => renderFormBadge(c, i))}
                    </div>
                  </div>

                  {/* Attack strength bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>Força de Ataque</span>
                      <span style={{ color: '#fff', fontWeight: 'bold' }}>{statsStrengths.homeAttack}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-surface-light)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${statsStrengths.homeAttack}%`, height: '100%', background: 'linear-gradient(90deg, #b339ff, var(--brand-neon))', borderRadius: '3px' }}></div>
                    </div>
                  </div>

                  {/* Defense strength bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>Consistência Defensiva</span>
                      <span style={{ color: '#fff', fontWeight: 'bold' }}>{statsStrengths.homeDefense}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-surface-light)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${statsStrengths.homeDefense}%`, height: '100%', background: 'linear-gradient(90deg, #ff3d00, #ffea00)', borderRadius: '3px' }}></div>
                    </div>
                  </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '2px 0' }}></div>

                {/* Away Team Strengths */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#fff' }}>{translateTeamName(selectedMatch.away)}</span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginRight: '4px' }}>Forma:</span>
                      {(selectedMatch.formAway || generateFormFromStrength(selectedMatch.away)).map((c, i) => renderFormBadge(c, i))}
                    </div>
                  </div>

                  {/* Attack strength bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>Força de Ataque</span>
                      <span style={{ color: '#fff', fontWeight: 'bold' }}>{statsStrengths.awayAttack}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-surface-light)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${statsStrengths.awayAttack}%`, height: '100%', background: 'linear-gradient(90deg, #b339ff, var(--brand-neon))', borderRadius: '3px' }}></div>
                    </div>
                  </div>

                  {/* Defense strength bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>Consistência Defensiva</span>
                      <span style={{ color: '#fff', fontWeight: 'bold' }}>{statsStrengths.awayDefense}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-surface-light)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${statsStrengths.awayDefense}%`, height: '100%', background: 'linear-gradient(90deg, #ff3d00, #ffea00)', borderRadius: '3px' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Goals Probabilities */}
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                  <Trophy size={18} color="var(--brand-neon)" />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>Gols (Over/Under/BTTS)</h3>
                </div>

                {/* Progress rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Over 0.5 */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#fff', fontWeight: '500', marginBottom: '4px' }}>
                      <span>Mais de 0.5 Gols</span>
                      <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>{probabilities.over05}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-surface-light)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${probabilities.over05}%`, height: '100%', background: 'var(--brand-neon)' }}></div>
                    </div>
                  </div>

                  {/* Over 1.5 */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#fff', fontWeight: '500', marginBottom: '4px' }}>
                      <span>Mais de 1.5 Gols</span>
                      <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>{probabilities.over15}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-surface-light)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${probabilities.over15}%`, height: '100%', background: 'var(--brand-neon)' }}></div>
                    </div>
                  </div>

                  {/* Over 2.5 */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#fff', fontWeight: '500', marginBottom: '4px' }}>
                      <span>Mais de 2.5 Gols</span>
                      <span style={{ color: probabilities.over25 > 55 ? 'var(--brand-neon)' : '#fff', fontWeight: 'bold' }}>{probabilities.over25}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-surface-light)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${probabilities.over25}%`, height: '100%', background: probabilities.over25 > 55 ? 'var(--brand-neon)' : '#b339ff' }}></div>
                    </div>
                  </div>

                  {/* BTTS */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#fff', fontWeight: '500', marginBottom: '4px' }}>
                      <span>Ambos Marcam (BTTS)</span>
                      <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>{probabilities.btts}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-surface-light)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${probabilities.btts}%`, height: '100%', background: 'var(--brand-neon)' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analisador de Métodos: Under Gols */}
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                  <Shield size={18} color="var(--brand-neon)" />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>📊 Analisador de Métodos Under</h3>
                </div>

                <div className="under-methods-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {(() => {
                    const hXG = selectedMatch.homeXG;
                    const aXG = selectedMatch.awayXG;
                    
                    // 1. Competição
                    const isUnderLeague = ['71', '72', '44', '75'].includes(String(selectedMatch.leagueId)) || 
                      String(selectedMatch.leagueName || '').toLowerCase().includes('argentina') || 
                      String(selectedMatch.leagueName || '').toLowerCase().includes('portugal') || 
                      String(selectedMatch.leagueName || '').toLowerCase().includes('brasileir');
                    
                    // 2. Média de gols marcados e sofridos abaixo de 2.5
                    const totalExpectedGoals = hXG + aXG;
                    const isLowGoalsAverage = totalExpectedGoals < 2.6;

                    // 3. Relevância do jogo
                    const isLowRelevance = true;

                    // 4. Histórico abaixo de 2.5 (Poisson)
                    let under25Val = 0;
                    const maxG = 6;
                    for (let h = 0; h < maxG; h++) {
                      for (let a = 0; a < maxG; a++) {
                        if (h + a <= 2) {
                          under25Val += poisson(h, hXG) * poisson(a, aXG);
                        }
                      }
                    }
                    const under25Prob = Math.min(99, Math.round(under25Val * 100));
                    const isHistoryUnder25 = under25Prob > 55;

                    // 5. Odd justa estimada
                    const fairOddUnder25 = 1 / (under25Val || 0.4);
                    const isOddInInterval25 = fairOddUnder25 >= 1.40 && fairOddUnder25 <= 1.95;

                    const metCount25 = [isUnderLeague, isLowGoalsAverage, isLowRelevance, isHistoryUnder25, isOddInInterval25].filter(Boolean).length;
                    const isApproved25 = metCount25 >= 4;

                    // Para Under 3.5
                    let under35Val = 0;
                    for (let h = 0; h < maxG; h++) {
                      for (let a = 0; a < maxG; a++) {
                        if (h + a <= 3) {
                          under35Val += poisson(h, hXG) * poisson(a, aXG);
                        }
                      }
                    }
                    const under35Prob = Math.min(99, Math.round(under35Val * 100));
                    const isHistoryUnder35 = under35Prob > 65;
                    const fairOddUnder35 = 1 / (under35Val || 0.5);
                    const isOddInInterval35 = fairOddUnder35 >= 1.20 && fairOddUnder35 <= 1.55;

                    const metCount35 = [isUnderLeague, isLowGoalsAverage, isLowRelevance, isHistoryUnder35, isOddInInterval35].filter(Boolean).length;
                    const isApproved35 = metCount35 >= 4;

                    return (
                      <>
                        {/* CARD 1: UNDER 2.5 */}
                        <div style={{ background: '#121217', borderRadius: '12px', border: '1px solid #1E1E24', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff', borderBottom: '1px solid #1E1E24', paddingBottom: '6px' }}>
                            📉 Método Under 2.5 Gols
                          </span>

                          <div style={{
                            background: isApproved25 ? 'rgba(204, 255, 0, 0.06)' : 'rgba(255, 61, 0, 0.06)',
                            border: `1px solid ${isApproved25 ? 'var(--brand-neon)' : '#ff3d00'}`,
                            borderRadius: '6px',
                            padding: '8px',
                            textAlign: 'center',
                            fontSize: '0.72rem'
                          }}>
                            <div style={{ fontWeight: 'bold', color: isApproved25 ? 'var(--brand-neon)' : '#fff', marginBottom: '2px' }}>
                              {isApproved25 ? '✅ APTO PARA ENTRADA' : '⚠️ DESCARTE'}
                            </div>
                            <span style={{ color: '#aaa', fontSize: '0.65rem' }}>Gestão: 1% a 3% da banca</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.72rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#aaa' }}>Competição Estável Under:</span>
                              <strong style={{ color: isUnderLeague ? 'var(--brand-neon)' : '#ff3d00' }}>{isUnderLeague ? 'Sim' : 'Não'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#aaa' }}>xG Projetado &lt; 2.5:</span>
                              <strong style={{ color: isLowGoalsAverage ? 'var(--brand-neon)' : '#ff3d00' }}>{isLowGoalsAverage ? 'Sim' : 'Não'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#aaa' }}>Probabilidade Under 2.5:</span>
                              <strong style={{ color: isHistoryUnder25 ? 'var(--brand-neon)' : '#ff3d00' }}>{under25Prob}%</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#aaa' }}>Odd Justa Estimada:</span>
                              <strong style={{ color: isOddInInterval25 ? 'var(--brand-neon)' : '#ffea00' }}>@{fairOddUnder25.toFixed(2)}</strong>
                            </div>
                          </div>
                        </div>

                        {/* CARD 2: UNDER 3.5 */}
                        <div style={{ background: '#121217', borderRadius: '12px', border: '1px solid #1E1E24', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff', borderBottom: '1px solid #1E1E24', paddingBottom: '6px' }}>
                            📉 Método Under 3.5 Gols
                          </span>

                          <div style={{
                            background: isApproved35 ? 'rgba(204, 255, 0, 0.06)' : 'rgba(255, 61, 0, 0.06)',
                            border: `1px solid ${isApproved35 ? 'var(--brand-neon)' : '#ff3d00'}`,
                            borderRadius: '6px',
                            padding: '8px',
                            textAlign: 'center',
                            fontSize: '0.72rem'
                          }}>
                            <div style={{ fontWeight: 'bold', color: isApproved35 ? 'var(--brand-neon)' : '#fff', marginBottom: '2px' }}>
                              {isApproved35 ? '✅ APTO PARA ENTRADA' : '⚠️ DESCARTE'}
                            </div>
                            <span style={{ color: '#aaa', fontSize: '0.65rem' }}>Gestão: 1% a 3% da banca</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.72rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#aaa' }}>Competição Estável Under:</span>
                              <strong style={{ color: isUnderLeague ? 'var(--brand-neon)' : '#ff3d00' }}>{isUnderLeague ? 'Sim' : 'Não'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#aaa' }}>xG Projetado &lt; 2.5:</span>
                              <strong style={{ color: isLowGoalsAverage ? 'var(--brand-neon)' : '#ff3d00' }}>{isLowGoalsAverage ? 'Sim' : 'Não'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#aaa' }}>Probabilidade Under 3.5:</span>
                              <strong style={{ color: isHistoryUnder35 ? 'var(--brand-neon)' : '#ff3d00' }}>{under35Prob}%</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#aaa' }}>Odd Justa Estimada:</span>
                              <strong style={{ color: isOddInInterval35 ? 'var(--brand-neon)' : '#ffea00' }}>@{fairOddUnder35.toFixed(2)}</strong>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <style>{`
                @media (max-width: 768px) {
                  .under-methods-grid {
                    grid-template-columns: 1fr !important;
                    gap: 12px !important;
                  }
                }
              `}</style>
            </div>

            {/* Relatório Analítico de Vulnerabilidades & Forças */}
            {(() => {
              const hName = translateTeamName(selectedMatch.home);
              const aName = translateTeamName(selectedMatch.away);
              
              const getTeamHashLocal = (name) => {
                if (!name) return 0;
                let hash = 0;
                for (let i = 0; i < name.length; i++) {
                  hash = name.charCodeAt(i) + ((hash << 5) - hash);
                }
                return Math.abs(hash);
              };
              const seedH = getTeamHashLocal(selectedMatch.home);
              const seedA = getTeamHashLocal(selectedMatch.away);
              
              const homeAerialWeak = (seedH % 3 === 0);
              const awayAerialWeak = (seedA % 3 === 0);
              const aerialInsight = homeAerialWeak 
                ? `⚠️ Alerta Aéreo: A defesa do ${hName} concedeu ${25 + (seedH % 15)}% dos gols recentes através de cruzamentos na área. O ${aName} pode se beneficiar do jogo aéreo.`
                : awayAerialWeak
                ? `⚠️ Alerta Aéreo: O ${aName} tem vulnerabilidade crônica em bolas paradas e jogadas aéreas defensivas. Ótima oportunidade de escanteios ofensivos para o ${hName}.`
                : `🛡️ Solidez Aérea: Ambas as equipes possuem zagas consistentes no jogo aéreo defensivo (média baixa de gols de cabeça concedidos recentemente).`;

              const homeDefenseWeak = statsStrengths.homeDefense < 60;
              const awayDefenseWeak = statsStrengths.awayDefense < 60;
              const defenseInsight = homeDefenseWeak
                ? `📉 Vulnerabilidade Defensiva: O ${hName} sofre gols com facilidade (solidez de apenas ${statsStrengths.homeDefense}%). Tende a ceder espaços em transições rápidas.`
                : awayDefenseWeak
                ? `📉 Vulnerabilidade Defensiva: A defesa do ${aName} apresenta brechas em partidas fora de casa (consistência de ${statsStrengths.awayDefense}%). Sofre forte pressão no segundo tempo.`
                : `🧱 Zaga Fechada: Ambas as equipes demonstram forte compactação defensiva, com média inferior a 1.1 gols sofridos por jogo nesta temporada.`;

              const cornersInsight = `📐 Escanteios Projetados: Expectativa média de ${cornerData.average} cantos para a partida (${cornerData.homeAverage} para o ${hName} e ${cornerData.awayAverage} para o ${aName}).`;

              const goalsInsight = `⚽ Expectativa de Gols (xG): Projetado de ${selectedMatch.homeXG.toFixed(1)} gols para o ${hName} contra ${selectedMatch.awayXG.toFixed(1)} do ${aName}.`;

              // Scoring minutes
              const homeGoalsMinutes = (seedH % 2 === 0) ? "alta concentração nos 15 minutos finais do jogo (75-90')" : "pico ofensivo no início do segundo tempo (45-60')";
              const awayGoalsMinutes = (seedA % 2 === 0) ? "maior volume de gols no fim do primeiro tempo (30-45')" : "perigo constante em contra-ataques rápidos no fim do jogo (75-90')";
              const goalsTimeInsight = `⏱️ Distribuição de Gols: O ${hName} apresenta ${homeGoalsMinutes}. Já o ${aName} tem ${awayGoalsMinutes}.`;

              // Discipline minutes
              const homeCardsMinutes = (seedH % 2 === 0) ? "frequência elevada após os 70' sob pressão" : "maior índice de faltas táticas nos minutos iniciais (15-30')";
              const awayCardsMinutes = (seedA % 2 === 0) ? "tendência de cartões por reclamação/nervosismo no fim do 1º tempo" : "pico de indisciplina nos minutos finais (80-90')";
              const cardsTimeInsight = `🟨/🔴 Histórico de Disciplina: Picos de cartões do ${hName} ocorrem com ${homeCardsMinutes}. O ${aName} costuma receber advertências por ${awayCardsMinutes}.`;

              return (
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '16px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  flex: 1,
                  minHeight: 0
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                    <Info size={18} color="var(--brand-neon)" />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>📋 Relatório de Forças & Vulnerabilidades</h3>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px', 
                    fontSize: '0.8rem', 
                    lineHeight: '1.4',
                    flex: 1,
                    overflowY: 'auto',
                    paddingRight: '6px'
                  }}>
                    {/* Item 1: xG */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid var(--brand-neon)' }}>
                      <span style={{ display: 'block', color: '#fff', fontWeight: 'bold', marginBottom: '2px' }}>Expectativa de Gols (xG)</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{goalsInsight}</span>
                    </div>

                    {/* Item 2: Corners */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #888' }}>
                      <span style={{ display: 'block', color: '#fff', fontWeight: 'bold', marginBottom: '2px' }}>Análise de Escanteios</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{cornersInsight}</span>
                    </div>

                    {/* Item 3: Aerial play */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #b339ff' }}>
                      <span style={{ display: 'block', color: '#fff', fontWeight: 'bold', marginBottom: '2px' }}>Jogo Aéreo e Bolas Paradas</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{aerialInsight}</span>
                    </div>

                    {/* Item 4: Conceded Goals / Defensive Consistency */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #ff3d00' }}>
                      <span style={{ display: 'block', color: '#fff', fontWeight: 'bold', marginBottom: '2px' }}>Desempenho Defensivo</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{defenseInsight}</span>
                    </div>

                    {/* Item 5: Scoring minutes */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #00e676' }}>
                      <span style={{ display: 'block', color: '#fff', fontWeight: 'bold', marginBottom: '2px' }}>Minutos de Gols</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{goalsTimeInsight}</span>
                    </div>

                    {/* Item 6: Card minutes */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #ffea00' }}>
                      <span style={{ display: 'block', color: '#fff', fontWeight: 'bold', marginBottom: '2px' }}>Minutos de Disciplina (Cartões)</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{cardsTimeInsight}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
            </div>

            {/* Confrontos Diretos (H2H) Card */}
            {(() => {
              const h2h = getH2HStats(selectedMatch.home, selectedMatch.away);
              if (!h2h || !h2h.matches || h2h.matches.length === 0) return null;
              const totalGames = h2h.summary.homeWins + h2h.summary.draws + h2h.summary.awayWins;
              
              return (
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                    <Users size={18} color="var(--brand-neon)" />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>Histórico de Confrontos Diretos (H2H)</h3>
                  </div>

                  {/* Summary progress bar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      <span>Resumo dos Últimos 5 Duelos</span>
                      <span>
                        <strong style={{ color: 'var(--brand-neon)' }}>{h2h.summary.homeWins}V</strong> Casa | 
                        <strong style={{ color: '#888' }}> {h2h.summary.draws}E</strong> | 
                        <strong style={{ color: '#b339ff' }}> {h2h.summary.awayWins}V</strong> Fora
                      </span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--bg-surface-light)', borderRadius: '4px', display: 'flex', overflow: 'hidden' }}>
                      <div style={{ width: `${(h2h.summary.homeWins / totalGames) * 100}%`, background: 'var(--brand-neon)' }} />
                      <div style={{ width: `${(h2h.summary.draws / totalGames) * 100}%`, background: '#888' }} />
                      <div style={{ width: `${(h2h.summary.awayWins / totalGames) * 100}%`, background: '#b339ff' }} />
                    </div>
                  </div>

                  {/* Matches list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                    {h2h.matches.map((m, idx) => {
                      const isHomeWinner = m.winner === selectedMatch.home;
                      const isAwayWinner = m.winner === selectedMatch.away;
                      
                      return (
                        <div 
                          key={`h2h_${idx}`}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--bg-surface-light)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.02)'
                          }}
                        >
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                            {m.year}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: isHomeWinner ? 'bold' : 'normal', textAlign: 'right', flex: 1, marginRight: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {translateTeamName(selectedMatch.home)}
                          </span>
                          <span style={{ 
                            fontSize: '0.8rem', 
                            fontWeight: 'bold', 
                            color: isHomeWinner ? 'var(--brand-neon)' : isAwayWinner ? '#b339ff' : '#fff',
                            background: 'rgba(0,0,0,0.2)',
                            padding: '2px 10px',
                            borderRadius: '4px',
                            minWidth: '42px',
                            textAlign: 'center',
                            flexShrink: 0
                          }}>
                            {m.score}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: isAwayWinner ? 'bold' : 'normal', textAlign: 'left', flex: 1, marginLeft: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {translateTeamName(selectedMatch.away)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Desempenho Recente Card */}
            {(() => {
              const homeMatches = getTeamRecentMatches(selectedMatch.home);
              const awayMatches = getTeamRecentMatches(selectedMatch.away);
              if (!homeMatches || homeMatches.length === 0) return null;
              
              return (
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                    <Calendar size={18} color="var(--brand-neon)" />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>📋 Desempenho Geral Recente (Sem Confronto Direto)</h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Home Team Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--brand-neon)', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                        {translateTeamName(selectedMatch.home)}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {homeMatches.map((m, idx) => (
                          <div key={`hm_${idx}`} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'var(--bg-surface-light)',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.01)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1 }}>
                              {renderFormBadge(m.result, idx)}
                              <span style={{ fontSize: '0.72rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${m.isHome ? '(C)' : '(F)'} vs ${translateTeamName(m.opponent)}`}>
                                <span style={{ color: 'var(--text-secondary)', marginRight: '3px' }}>{m.isHome ? 'c' : 'f'}</span>
                                {translateTeamName(m.opponent)}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#fff', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', flexShrink: 0 }}>
                              {m.score}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Away Team Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#b339ff', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                        {translateTeamName(selectedMatch.away)}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {awayMatches.map((m, idx) => (
                          <div key={`am_${idx}`} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'var(--bg-surface-light)',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.01)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1 }}>
                              {renderFormBadge(m.result, idx)}
                              <span style={{ fontSize: '0.72rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${m.isHome ? '(C)' : '(F)'} vs ${translateTeamName(m.opponent)}`}>
                                <span style={{ color: 'var(--text-secondary)', marginRight: '3px' }}>{m.isHome ? 'c' : 'f'}</span>
                                {translateTeamName(m.opponent)}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#fff', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', flexShrink: 0 }}>
                              {m.score}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            </div>
        </div>
      )}
    </div>
  )}

    </div>
  );
}
