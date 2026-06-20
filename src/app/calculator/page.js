'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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

const LiveFieldWidget = ({ match, matchState, liveStats }) => {
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
    home: { corners: 0, yellowCards: 0, redCards: 0 },
    away: { corners: 0, yellowCards: 0, redCards: 0 }
  };

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-color)',
      borderRadius: '16px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Scoreboard Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        background: '#ffffff',
        color: '#000000',
        borderBottom: '1px solid #e0e0e0'
      }}>
        {/* Home Team */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <ShirtIcon color={homeColor} sleeveColor={homeSleeve} />
          <span style={{ fontSize: '0.9rem', fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {translateTeamName(match.home)}
          </span>
        </div>

        {/* Center Score & Time */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '0 16px' }}>
          <div style={{
            fontSize: '0.7rem',
            fontWeight: 'bold',
            color: '#666',
            background: '#f0f0f0',
            padding: '2px 8px',
            borderRadius: '4px',
            textTransform: 'uppercase'
          }}>
            {matchState.period} | {matchState.time}
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', display: 'flex', gap: '12px', color: '#000' }}>
            <span>{match.goalsHome}</span>
            <span>:</span>
            <span>{match.goalsAway}</span>
          </div>
        </div>

        {/* Away Team */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
            {translateTeamName(match.away)}
          </span>
          <ShirtIcon color={awayColor} sleeveColor={awaySleeve} />
        </div>
      </div>

      {/* Field Area */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '240px',
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

      {/* Termômetro e Detalhes de Pressão */}
      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        background: 'var(--bg-surface-light)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 'bold' }}>
          <span style={{ color: '#ff4444' }}>Pressão {translateTeamName(match.home)}: {homePressure}%</span>
          <span style={{ color: '#00d2ff' }}>Pressão {translateTeamName(match.away)}: {awayPressure}%</span>
        </div>
        {/* Termômetro */}
        <div style={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', background: '#111', border: '1px solid var(--border-color)' }}>
          <div style={{ width: `${homePressure}%`, background: 'linear-gradient(90deg, #ff4444, #ff8800)', transition: 'width 0.8s ease-in-out' }}></div>
          <div style={{ width: `${awayPressure}%`, background: 'linear-gradient(90deg, #00d2ff, #00ffa0)', transition: 'width 0.8s ease-in-out' }}></div>
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

      {/* Live corners and cards statistics row */}
      <div style={{
        padding: '12px 20px',
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-surface)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px'
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
          padding: '8px 12px'
        }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
            🚩 Escanteios
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '1rem', fontWeight: '800', color: '#fff' }}>
            <span style={{ color: 'var(--brand-neon)' }}>{stats.home.corners}</span>
            <span style={{ opacity: 0.2 }}>vs</span>
            <span>{stats.away.corners}</span>
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
          padding: '8px 12px'
        }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
            🟨 Cartões
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
            {/* Home cards */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>
              <span>{stats.home.yellowCards}</span>
              <span style={{ width: '8px', height: '11px', background: '#ffd600', borderRadius: '1.5px', display: 'inline-block' }} />
              {stats.home.redCards > 0 && (
                <>
                  <span>{stats.home.redCards}</span>
                  <span style={{ width: '8px', height: '11px', background: '#d50000', borderRadius: '1.5px', display: 'inline-block' }} />
                </>
              )}
            </div>
            <span style={{ opacity: 0.2, fontSize: '0.8rem' }}>vs</span>
            {/* Away cards */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>
              <span>{stats.away.yellowCards}</span>
              <span style={{ width: '8px', height: '11px', background: '#ffd600', borderRadius: '1.5px', display: 'inline-block' }} />
              {stats.away.redCards > 0 && (
                <>
                  <span>{stats.away.redCards}</span>
                  <span style={{ width: '8px', height: '11px', background: '#d50000', borderRadius: '1.5px', display: 'inline-block' }} />
                </>
              )}
            </div>
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
        color: '#fff'
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

const getTeamHash = (name) => {
  if (!name) return 0;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
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
  
  return {
    home: { corners: cornersH, yellowCards: yellowH, redCards: redH },
    away: { corners: cornersA, yellowCards: yellowA, redCards: redA }
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

  const leagues = useMemo(() => {
    const uniqueLeagues = {};
    matches.forEach(m => {
      if (m.league && !uniqueLeagues[m.league]) {
        uniqueLeagues[m.league] = {
          name: m.league,
          logo: m.sourceLeagueId ? getLeagueLogoUrl(m.sourceLeagueId) : getLeagueLogoUrl(m.league)
        };
      }
    });
    return [
      { name: 'Todas', logo: null },
      ...Object.values(uniqueLeagues)
    ];
  }, [matches]);

  const filteredMatches = useMemo(() => {
    if (selectedLeague === 'Todas') return matches;
    return matches.filter(m => m.league === selectedLeague);
  }, [matches, selectedLeague]);

  // Fetch games of the selected date
  const fetchMatches = async (dateStr) => {
    setLoading(true);
    setSelectedMatch(null); // Reset selection when date changes
    try {
      const response = await fetch(`/api/football/fixtures?league=all&date=${dateStr}`);
      if (!response.ok) throw new Error('API respondente falhou');
      const data = await response.json();
      
      if (data.fixtures && data.fixtures.length > 0) {
        setMatches(data.fixtures);
        setIsDemoData(false);
      } else {
        // Fallback para mock se não houver jogos reais
        const mocks = getMockMatches(dateStr);
        setMatches(mocks);
        setIsDemoData(true);
      }
    } catch (err) {
      console.warn("Erro ao buscar fixtures reais, usando fallback demonstrativo:", err);
      const mocks = getMockMatches(dateStr);
      setMatches(mocks);
      setIsDemoData(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches(currentDate);
  }, [currentDate]);

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

  // Polling de estatísticas para todos os jogos ao vivo
  useEffect(() => {
    const liveGames = matches.filter(m => m.isLive);
    if (liveGames.length === 0) return;

    const fetchLiveStats = async () => {
      setLoadingLiveStats(true);
      for (const game of liveGames) {
        if (String(game.id).startsWith('mock')) {
          // Para jogos mock, gera estatísticas simuladas
          setLiveStatsMap(prev => ({
            ...prev,
            [game.id]: getSimulatedLiveStats(game)
          }));
          continue;
        }
        try {
          const res = await fetch(`/api/football/fixtures/stats?fixture=${game.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data && !data.error && !data.empty) {
              const parsedStats = {
                home: {
                  corners: data.home?.corners ?? 0,
                  yellowCards: data.home?.yellowCards ?? 0,
                  redCards: data.home?.redCards ?? 0,
                  shotsOnGoal: data.home?.shotsOnGoal ?? 0,
                  ballPossession: data.home?.ballPossession ?? 50
                },
                away: {
                  corners: data.away?.corners ?? 0,
                  yellowCards: data.away?.yellowCards ?? 0,
                  redCards: data.away?.redCards ?? 0,
                  shotsOnGoal: data.away?.shotsOnGoal ?? 0,
                  ballPossession: data.away?.ballPossession ?? 50
                }
              };
              setLiveStatsMap(prev => ({
                ...prev,
                [game.id]: parsedStats
              }));
            }
          }
        } catch (e) {
          console.warn(`Erro ao buscar estatísticas ao vivo para o fixture ${game.id}:`, e);
        }
      }
      setLoadingLiveStats(false);
    };

    fetchLiveStats();
    const interval = setInterval(fetchLiveStats, 60000); // a cada 60 segundos
    return () => clearInterval(interval);
  }, [matches]);

  // Atualizar liveStats para o jogo selecionado
  useEffect(() => {
    if (!selectedMatch) {
      setLiveStats(null);
      return;
    }
    if (selectedMatch.isLive) {
      const stats = liveStatsMap[selectedMatch.id] || getSimulatedLiveStats(selectedMatch);
      setLiveStats(stats);
    } else {
      setLiveStats(null);
    }
  }, [selectedMatch, liveStatsMap]);

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
      `}} />

      {/* B3 style infinite ticker */}
      {matches.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--brand-neon)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
            <Activity size={12} className="pulse" />
            <span>Painel de Cotações +EV (B3 Ticker)</span>
          </div>
          <div className="ticker-wrap" style={{
            overflow: 'hidden',
            width: '100%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '12px 0',
            position: 'relative'
          }}>
            <div className="ticker-content" style={{
              display: 'flex',
              gap: '8px',
              width: 'max-content',
              animation: `tickerAnimation ${Math.max(120, matches.length * 35)}s linear infinite`
            }}>
              {/* Render the matches list multiple times to allow infinite scrolling */}
              {[...matches, ...matches, ...matches].map((match, idx) => {
                const isSelected = selectedMatch && selectedMatch.id === match.id;
                const hasScore = match.isLive || match.isFinished;
                return (
                  <div 
                    key={`${match.id || 'match'}_ticker_${idx}`}
                    onClick={() => setSelectedMatch(match)}
                    style={{
                      flex: '0 0 196px',
                      background: isSelected ? 'rgba(204, 255, 0, 0.05)' : 'var(--bg-surface-light)',
                      border: isSelected ? '1px solid var(--brand-neon)' : '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '86px'
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--brand-neon)'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    {/* Header: League & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.55rem', borderBottom: '1px solid rgba(255, 255, 255, 0.03)', paddingBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>
                        {match.league}
                      </span>
                      <span style={{
                        color: match.isLive ? 'var(--alert-red)' : 'var(--text-secondary)',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        {match.isLive && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--alert-red)', display: 'inline-block' }} className="pulse" />}
                        {match.status}
                      </span>
                    </div>

                    {/* Team 1 Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#fff', marginTop: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <img 
                          src={match.homeLogo || getTeamLogoUrl(match.home)} 
                          alt={translateTeamName(match.home)} 
                          style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getTeamLogoUrl(match.home); }}
                        />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px', fontWeight: '700' }}>
                          {translateTeamName(match.home)}
                        </span>
                      </div>
                      {hasScore && (
                        <span style={{ fontWeight: '800', color: match.isLive ? 'var(--brand-neon)' : '#fff' }}>
                          {match.goalsHome}
                        </span>
                      )}
                    </div>

                    {/* Team 2 Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <img 
                          src={match.awayLogo || getTeamLogoUrl(match.away)} 
                          alt={translateTeamName(match.away)} 
                          style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getTeamLogoUrl(match.away); }}
                        />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px', fontWeight: '700' }}>
                          {translateTeamName(match.away)}
                        </span>
                      </div>
                      {hasScore && (
                        <span style={{ fontWeight: '800', color: match.isLive ? 'var(--brand-neon)' : '#fff' }}>
                          {match.goalsAway}
                        </span>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
            <Calculator size={28} color="var(--brand-neon)" />
            Central de Análise +EV
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Previsões táticas e probabilidades exatas calculadas via Distribuição Matemática de Poisson.
          </p>
        </div>

        {/* Date Selector Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '4px 8px'
        }}>
          <button 
            onClick={() => changeDate(-1)}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px' }}
          >
            <ChevronLeft size={18} />
          </button>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0 12px',
            fontSize: '0.85rem',
            fontWeight: '600',
            color: '#fff'
          }}>
            <Calendar size={14} color="var(--brand-neon)" />
            <span>
              {new Date(currentDate + 'T00:00:00-03:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>

          <button 
            onClick={() => changeDate(1)}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

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

      {/* Conditional Rendering: Main Games List (Initial Screen) vs Analysis Detail Screen */}
      {!selectedMatch ? (
        /* initial Screen: League selection & games grid */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* League Filter Pills */}
          {matches.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
              {leagues.map((league, idx) => (
                <button
                  key={`${league.name || 'league'}_${idx}`}
                  onClick={() => setSelectedLeague(league.name)}
                  title={league.name}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: selectedLeague === league.name ? 'var(--brand-neon-dim)' : 'var(--bg-surface)',
                    border: selectedLeague === league.name ? '2px solid var(--brand-neon)' : '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    boxShadow: selectedLeague === league.name ? '0 0 8px var(--brand-neon-dim)' : 'none'
                  }}
                  onMouseEnter={(e) => { 
                    if (selectedLeague !== league.name) {
                      e.currentTarget.style.borderColor = 'var(--brand-neon)';
                      e.currentTarget.style.transform = 'scale(1.08)';
                    }
                  }}
                  onMouseLeave={(e) => { 
                    if (selectedLeague !== league.name) {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
                >
                  {league.name === 'Todas' ? (
                    <Trophy size={18} color={selectedLeague === 'Todas' ? 'var(--brand-neon)' : 'var(--text-secondary)'} />
                  ) : (
                    <>
                      <img 
                        src={league.logo} 
                        alt={league.name} 
                        style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentNode;
                          if (parent) {
                            const fallback = parent.querySelector('.fallback-letter');
                            if (fallback) fallback.style.display = 'inline';
                          }
                        }}
                      />
                      <span 
                        className="fallback-letter" 
                        style={{ display: 'none', fontSize: '0.78rem', fontWeight: 'bold', color: selectedLeague === league.name ? 'var(--brand-neon)' : 'var(--text-secondary)' }}
                      >
                        {league.name.substring(0, 2).toUpperCase()}
                      </span>
                    </>
                  )}
                </button>
              ))}
            </div>
          )}

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
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px'
            }}>
              {filteredMatches.map((match, idx) => (
                <div 
                  key={`${match.id || 'match'}_grid_${idx}`}
                  onClick={() => setSelectedMatch(match)}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.borderColor = 'var(--brand-neon)'; 
                    e.currentTarget.style.transform = 'translateY(-2px)'; 
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.borderColor = 'var(--border-color)'; 
                    e.currentTarget.style.transform = 'none'; 
                  }}
                >
                  {/* Card header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                      {match.league}
                    </span>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      background: match.isLive ? 'var(--alert-red-dim)' : 'var(--bg-surface-light)',
                      color: match.isLive ? 'var(--alert-red)' : 'var(--text-secondary)',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      {match.status}
                    </span>
                  </div>

                  {/* Teams row and logo */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img 
                          src={match.homeLogo || getTeamLogoUrl(match.home)} 
                          alt={translateTeamName(match.home)} 
                          style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getTeamLogoUrl(match.home); }}
                        />
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>{translateTeamName(match.home)}</span>
                      </div>
                      {(match.isLive || match.isFinished) && (
                        <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#fff' }}>{match.goalsHome}</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img 
                          src={match.awayLogo || getTeamLogoUrl(match.away)} 
                          alt={translateTeamName(match.away)} 
                          style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getTeamLogoUrl(match.away); }}
                        />
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>{translateTeamName(match.away)}</span>
                      </div>
                      {(match.isLive || match.isFinished) && (
                        <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#fff' }}>{match.goalsAway}</span>
                      )}
                    </div>
                  </div>

                  {/* Tactical Pitch (Only rendered when live) */}
                  {match.isLive && (() => {
                    const radar = getLiveMatchRadar(match);
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
                    
                    const currentLiveStats = liveStatsMap[match.id] || getSimulatedLiveStats(match) || {
                      home: { corners: 0 },
                      away: { corners: 0 }
                    };
                    
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
                        
                        {/* Small Live indicator stats overlay */}
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
                          📐 {(currentLiveStats.home?.corners || 0) + (currentLiveStats.away?.corners || 0)}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Dashed Corners and Cards Indicator for Live games */}
                  {match.isLive && (() => {
                    const currentLiveStats = liveStatsMap[match.id] || getSimulatedLiveStats(match) || {
                      home: { corners: 0, yellowCards: 0, redCards: 0 },
                      away: { corners: 0, yellowCards: 0, redCards: 0 }
                    };
                    return (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '4px 8px',
                        border: '1px dashed var(--border-color)',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        color: 'var(--text-secondary)',
                        width: '100%',
                        boxSizing: 'border-box',
                        background: 'rgba(255, 255, 255, 0.01)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '0.75rem' }}>📐</span>
                          <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>
                            {currentLiveStats.home.corners}-{currentLiveStats.away.corners}
                          </span>
                        </div>
                        <div style={{ color: 'var(--border-color)' }}>|</div>
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
                  {match.isLive && (
                    <div style={{
                      fontSize: '0.72rem', 
                      color: 'var(--text-secondary)', 
                      fontStyle: 'italic',
                      lineHeight: '1.4'
                    }}>
                      <span style={{ color: 'var(--alert-red)', fontWeight: 'bold', marginRight: '6px' }}>• AO VIVO:</span>
                      {getLiveMatchRadar(match)?.statusText || 'Disputa intensa no meio de campo.'}
                    </div>
                  )}

                  {/* Card footer details & button */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                    paddingTop: '10px',
                    marginTop: '4px'
                  }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                      xG Projetado: {match.homeXG} - {match.awayXG}
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      color: 'var(--brand-neon)',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      Análise +EV <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      ) : (
        /* Analysis Screen: Back Button & the 2-column layout */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Back button */}
          <button
            onClick={() => setSelectedMatch(null)}
            style={{
              alignSelf: 'flex-start',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: '#fff',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
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
            <ChevronLeft size={16} /> Voltar para os Jogos do Dia
          </button>

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
            
            {/* Confrontation Card or Live Field Widget */}
            {selectedMatch.isLive ? (
              <LiveFieldWidget match={selectedMatch} matchState={matchState} liveStats={liveStats} />
            ) : (
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '24px',
                position: 'relative',
                overflow: 'hidden'
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

                {/* expected Goals (xG) preditivos */}
                <div style={{
                  marginTop: '24px',
                  padding: '12px 16px',
                  background: 'var(--bg-surface-light)',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
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
              </div>
            )}

            {/* Team Strengths and Forms */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                <BarChart2 size={18} color="var(--brand-neon)" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>Indicadores de Força Técnica</h3>
              </div>

              {/* Home Team Strengths */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff' }}>{translateTeamName(selectedMatch.home)}</span>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginRight: '4px' }}>Forma:</span>
                    {(selectedMatch.formHome || ["V", "V", "E", "D", "V"]).map((c, i) => renderFormBadge(c, i))}
                  </div>
                </div>

                {/* Attack strength bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>Força de Ataque</span>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>{statsStrengths.homeAttack}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-surface-light)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${statsStrengths.homeAttack}%`, height: '100%', background: 'linear-gradient(90deg, #b339ff, var(--brand-neon))', borderRadius: '3px' }}></div>
                  </div>
                </div>

                {/* Defense strength bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>Consistência Defensiva</span>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>{statsStrengths.homeDefense}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-surface-light)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${statsStrengths.homeDefense}%`, height: '100%', background: 'linear-gradient(90deg, #ff3d00, #ffea00)', borderRadius: '3px' }}></div>
                  </div>
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }}></div>

              {/* Away Team Strengths */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff' }}>{translateTeamName(selectedMatch.away)}</span>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginRight: '4px' }}>Forma:</span>
                    {(selectedMatch.formAway || ["V", "D", "V", "E", "D"]).map((c, i) => renderFormBadge(c, i))}
                  </div>
                </div>

                {/* Attack strength bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>Força de Ataque</span>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>{statsStrengths.awayAttack}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-surface-light)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${statsStrengths.awayAttack}%`, height: '100%', background: 'linear-gradient(90deg, #b339ff, var(--brand-neon))', borderRadius: '3px' }}></div>
                  </div>
                </div>

                {/* Defense strength bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>Consistência Defensiva</span>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>{statsStrengths.awayDefense}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-surface-light)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${statsStrengths.awayDefense}%`, height: '100%', background: 'linear-gradient(90deg, #ff3d00, #ffea00)', borderRadius: '3px' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Stats Tracker (if live) */}
            {selectedMatch.isLive && liveStats && (
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={18} color="var(--alert-red)" />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>Estatísticas Ao Vivo</h3>
                  </div>
                  {loadingLiveStats && <RefreshCw className="spin" size={14} color="#888" />}
                </div>

                {/* Possession row */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}>
                    <span>Posse de Bola</span>
                    <span>{liveStats.home.ballPossession}% - {liveStats.away.ballPossession}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-surface-light)', borderRadius: '3px', display: 'flex', overflow: 'hidden' }}>
                    <div style={{ width: `${liveStats.home.ballPossession}%`, background: 'var(--brand-neon)' }}></div>
                    <div style={{ width: `${liveStats.away.ballPossession}%`, background: '#ff3d00' }}></div>
                  </div>
                </div>

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                  <div style={{ background: 'var(--bg-surface-light)', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Chutes no Gol</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>
                      {liveStats.home.shotsOnGoal} <span style={{ color: '#555', fontSize: '0.8rem' }}>vs</span> {liveStats.away.shotsOnGoal}
                    </span>
                  </div>
                  <div style={{ background: 'var(--bg-surface-light)', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Escanteios Cobrados</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>
                      {liveStats.home.corners} <span style={{ color: '#555', fontSize: '0.8rem' }}>vs</span> {liveStats.away.corners}
                    </span>
                  </div>
                  <div style={{ background: 'var(--bg-surface-light)', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cartões Amarelos</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>
                      {liveStats.home.yellowCards} <span style={{ color: '#555', fontSize: '0.8rem' }}>vs</span> {liveStats.away.yellowCards}
                    </span>
                  </div>
                  <div style={{ background: 'var(--bg-surface-light)', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cartões Vermelhos</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>
                      {liveStats.home.redCards} <span style={{ color: '#555', fontSize: '0.8rem' }}>vs</span> {liveStats.away.redCards}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
          </div>

          {/* COLUMN 2: POISSON PROBABILITIES & INSIGHTS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Probability 1X2 Card */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
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
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand-neon)' }}></div>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>{translateTeamName(selectedMatch.home)} ({probabilities.homeWin}%)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#888' }}></div>
                    <span style={{ color: 'var(--text-secondary)' }}>Empate ({probabilities.draw}%)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#b339ff' }}></div>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>{translateTeamName(selectedMatch.away)} ({probabilities.awayWin}%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Goals Probabilities */}
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
                <Trophy size={18} color="var(--brand-neon)" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>Probabilidades de Gols (Over/Under/BTTS)</h3>
              </div>

              {/* Progress rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Over 0.5 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#fff', fontWeight: '500', marginBottom: '4px' }}>
                    <span>Mais de 0.5 Gols (Qualquer Gol)</span>
                    <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>{probabilities.over05}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-surface-light)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${probabilities.over05}%`, height: '100%', background: 'var(--brand-neon)' }}></div>
                  </div>
                </div>

                {/* Over 1.5 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#fff', fontWeight: '500', marginBottom: '4px' }}>
                    <span>Mais de 1.5 Gols</span>
                    <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>{probabilities.over15}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-surface-light)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${probabilities.over15}%`, height: '100%', background: 'var(--brand-neon)' }}></div>
                  </div>
                </div>

                {/* Over 2.5 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#fff', fontWeight: '500', marginBottom: '4px' }}>
                    <span>Mais de 2.5 Gols</span>
                    <span style={{ color: probabilities.over25 > 55 ? 'var(--brand-neon)' : '#fff', fontWeight: 'bold' }}>{probabilities.over25}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-surface-light)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${probabilities.over25}%`, height: '100%', background: probabilities.over25 > 55 ? 'var(--brand-neon)' : '#b339ff' }}></div>
                  </div>
                </div>

                {/* BTTS */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#fff', fontWeight: '500', marginBottom: '4px' }}>
                    <span>Ambos os Times Marcam (BTTS)</span>
                    <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>{probabilities.btts}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-surface-light)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${probabilities.btts}%`, height: '100%', background: 'var(--brand-neon)' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Corners and Cards Prediction */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              
              {/* Corners Card */}
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Escanteios
                </span>
                <div>
                  <span style={{ fontSize: '1.6rem', fontWeight: '900', color: '#fff' }}>{cornerData.average}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                    Média total projetada
                  </span>
                </div>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.72rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Over 8.5:</span>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>{cornerData.over85}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Over 9.5:</span>
                    <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>{cornerData.over95}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Over 10.5:</span>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>{cornerData.over105}%</span>
                  </div>
                </div>
              </div>

              {/* Cards Card */}
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Cartões Totais
                </span>
                <div>
                  <span style={{ fontSize: '1.6rem', fontWeight: '900', color: '#fff' }}>{cardData.average}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                    Média total projetada
                  </span>
                </div>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.72rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Over 3.5:</span>
                    <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>{cardData.over35}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Over 4.5:</span>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>{cardData.over45}%</span>
                  </div>
                </div>
              </div>

            </div>

            {/* AI Predictions / Insights */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(204, 255, 0, 0.04) 0%, rgba(179, 57, 255, 0.02) 100%)',
              border: '1px solid rgba(204, 255, 0, 0.15)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="var(--brand-neon)" />
                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--brand-neon)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Recomendação +EV Baseada em IA
                </span>
              </div>

              <div>
                <span style={{ fontSize: '1rem', fontWeight: '800', color: '#fff', display: 'block' }}>
                  {aiInsight.recommendation}
                </span>
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 'bold',
                  background: 'rgba(204, 255, 0, 0.12)',
                  color: 'var(--brand-neon)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  display: 'inline-block',
                  marginTop: '6px'
                }}>
                  Confiança: {aiInsight.confidence}
                </span>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                {aiInsight.rationale}
              </p>
            </div>

          </div>
        </div>
      )}
    </div>
  )}

    </div>
  );
}
