'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, 
  Target, 
  Info, 
  Activity, 
  ShieldAlert, 
  Award, 
  User, 
  Star, 
  AlertTriangle, 
  TrendingUp,
  CheckCircle2,
  Trophy,
  Clock,
  Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const factorial = (n) => {
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
};

const getPoissonProbability = (lam, k) => {
  return (Math.exp(-lam) * Math.pow(lam, k)) / factorial(k);
};

// Gerador estável e determinístico de odds para bookmakers baseando-se na odd justa e chave única
const getBookmakerOdds = (fairOddStr, seedString) => {
  const fairOdd = Number(fairOddStr);
  if (isNaN(fairOdd) || fairOdd <= 1) return { all: [], best: null };
  
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }
  
  const getRand = (offset) => {
    const val = Math.sin(hash + offset) * 10000;
    return val - Math.floor(val);
  };

  const bookmakers = [
    { name: 'Bet365', margin: 0.92, color: '#4caf50', logo: '🟢' },
    { name: 'Betano', margin: 0.94, color: '#ff9800', logo: '🟠' },
    { name: 'Betfair', margin: 0.93, color: '#ffb300', logo: '🟡' },
    { name: '1xBet', margin: 0.95, color: '#00d2ff', logo: '🔵' },
    { name: 'KTO', margin: 0.91, color: '#ff4d4d', logo: '🔴' }
  ];

  const all = bookmakers.map((book, idx) => {
    const variance = (getRand(idx) * 0.03) - 0.015;
    const finalOdd = Math.max(1.01, fairOdd * (book.margin + variance));
    return {
      name: book.name,
      odd: Number(finalOdd.toFixed(2)),
      color: book.color,
      logo: book.logo
    };
  });

  const best = [...all].sort((a, b) => b.odd - a.odd)[0];

  return { all, best };
};

// Base de dados estática dos árbitros e suas estatísticas
const REFEREES = [
  { 
    name: 'Raphael Claus', 
    yellows: 5.60, 
    reds: 0.32, 
    penalties: 0.35, 
    strictness: 'Muito Alto', 
    insight: 'Rígido com reclamações. Excelente para Over de cartões em jogos pegados.' 
  },
  { 
    name: 'Wilton Pereira Sampaio', 
    yellows: 5.20, 
    reds: 0.25, 
    penalties: 0.28, 
    strictness: 'Alto', 
    insight: 'Aplica cartões de controle cedo. Bom para apostar em cartão no primeiro tempo.' 
  },
  { 
    name: 'Anderson Daronco', 
    yellows: 4.30, 
    reds: 0.14, 
    penalties: 0.20, 
    strictness: 'Baixo', 
    insight: 'Tende a deixar o jogo correr. Excelente para Under cartões e apostas de ritmo físico.' 
  },
  { 
    name: 'Ramon Abatti Abel', 
    yellows: 4.80, 
    reds: 0.22, 
    penalties: 0.25, 
    strictness: 'Médio', 
    insight: 'Arbitragem equilibrada. Mantém o controle sem abuso de cartões.' 
  },
  { 
    name: 'Bruno Arleu de Araújo', 
    yellows: 5.90, 
    reds: 0.38, 
    penalties: 0.44, 
    strictness: 'Muito Alto', 
    insight: 'Média de cartões vermelhos e pênaltis acima da curva nacional. Risco alto de penalidades.' 
  },
  { 
    name: 'Edina Alves Batista', 
    yellows: 4.10, 
    reds: 0.16, 
    penalties: 0.18, 
    strictness: 'Médio-Baixo', 
    insight: 'Usa a conversa para conter ânimos. Costuma demorar a puxar o primeiro amarelo.' 
  },
  { 
    name: 'Rodrigo José Pereira de Lima', 
    yellows: 5.40, 
    reds: 0.28, 
    penalties: 0.30, 
    strictness: 'Alto', 
    insight: 'Apita muitas infrações de contato simples. Aumenta a contagem de faltas do jogo.' 
  }
];

const TEAM_PLAYERS = {
  'Flamengo': [
    { name: 'Pedro', weight: 0.46, role: 'Atacante' },
    { name: 'Bruno Henrique', weight: 0.32, role: 'Atacante' },
    { name: 'Luiz Araújo', weight: 0.26, role: 'Atacante' },
    { name: 'De Arrascaeta', weight: 0.24, role: 'Meio-Campo' },
    { name: 'Gerson', weight: 0.14, role: 'Meio-Campo' }
  ],
  'Palmeiras': [
    { name: 'Flaco López', weight: 0.44, role: 'Atacante' },
    { name: 'Estêvão', weight: 0.38, role: 'Atacante' },
    { name: 'Raphael Veiga', weight: 0.36, role: 'Meio-Campo' },
    { name: 'Felipe Anderson', weight: 0.28, role: 'Atacante' },
    { name: 'Rony', weight: 0.24, role: 'Atacante' }
  ],
  'Corinthians': [
    { name: 'Yuri Alberto', weight: 0.45, role: 'Atacante' },
    { name: 'Memphis Depay', weight: 0.42, role: 'Atacante' },
    { name: 'Rodrigo Garro', weight: 0.28, role: 'Meio-Campo' },
    { name: 'Ángel Romero', weight: 0.26, role: 'Atacante' },
    { name: 'Talles Magno', weight: 0.24, role: 'Atacante' }
  ],
  'Atlético-MG': [
    { name: 'Hulk', weight: 0.45, role: 'Atacante' },
    { name: 'Paulinho', weight: 0.40, role: 'Atacante' },
    { name: 'Deyverson', weight: 0.30, role: 'Atacante' },
    { name: 'Gustavo Scarpa', weight: 0.25, role: 'Meio-Campo' },
    { name: 'Bernard', weight: 0.18, role: 'Meio-Campo' }
  ],
  'São Paulo': [
    { name: 'Jonathan Calleri', weight: 0.42, role: 'Atacante' },
    { name: 'Luciano', weight: 0.35, role: 'Atacante' },
    { name: 'Lucas Moura', weight: 0.32, role: 'Atacante' },
    { name: 'Ferreira', weight: 0.22, role: 'Atacante' },
    { name: 'André Silva', weight: 0.20, role: 'Atacante' }
  ],
  'Botafogo': [
    { name: 'Igor Jesus', weight: 0.38, role: 'Atacante' },
    { name: 'Luiz Henrique', weight: 0.35, role: 'Atacante' },
    { name: 'Thiago Almada', weight: 0.30, role: 'Meio-Campo' },
    { name: 'Júnior Santos', weight: 0.28, role: 'Atacante' },
    { name: 'Jefferson Savarino', weight: 0.26, role: 'Meio-Campo' }
  ],
  'Fluminense': [
    { name: 'Germán Cano', weight: 0.45, role: 'Atacante' },
    { name: 'Kauã Elias', weight: 0.32, role: 'Atacante' },
    { name: 'Jhon Arias', weight: 0.30, role: 'Atacante' },
    { name: 'Keno', weight: 0.22, role: 'Atacante' },
    { name: 'Ganso', weight: 0.14, role: 'Meio-Campo' }
  ],
  'Grêmio': [
    { name: 'Martin Braithwaite', weight: 0.40, role: 'Atacante' },
    { name: 'Diego Costa', weight: 0.35, role: 'Atacante' },
    { name: 'Franco Cristaldo', weight: 0.28, role: 'Meio-Campo' },
    { name: 'Cristian Pavón', weight: 0.24, role: 'Atacante' },
    { name: 'Miguel Monsalve', weight: 0.20, role: 'Meio-Campo' }
  ],
  'Internacional': [
    { name: 'Rafael Borré', weight: 0.40, role: 'Atacante' },
    { name: 'Enner Valencia', weight: 0.38, role: 'Atacante' },
    { name: 'Alan Patrick', weight: 0.32, role: 'Meio-Campo' },
    { name: 'Wesley', weight: 0.25, role: 'Atacante' },
    { name: 'Gabriel Carvalho', weight: 0.15, role: 'Meio-Campo' }
  ],
  'Cruzeiro': [
    { name: 'Gabigol', weight: 0.38, role: 'Atacante' },
    { name: 'Kaio Jorge', weight: 0.36, role: 'Atacante' },
    { name: 'Matheus Pereira', weight: 0.32, role: 'Meio-Campo' },
    { name: 'Lautaro Díaz', weight: 0.26, role: 'Atacante' },
    { name: 'Gabriel Veron', weight: 0.24, role: 'Atacante' }
  ],
  'Vasco': [
    { name: 'David', weight: 0.38, role: 'Atacante' },
    { name: 'Adson', weight: 0.32, role: 'Atacante' },
    { name: 'Brenner', weight: 0.30, role: 'Atacante' },
    { name: 'Johan Rojas', weight: 0.22, role: 'Atacante' },
    { name: 'Hugo Moura', weight: 0.12, role: 'Meio-Campo' }
  ],
  'Bahia': [
    { name: 'Everaldo', weight: 0.36, role: 'Atacante' },
    { name: 'Luciano Rodriguez', weight: 0.32, role: 'Atacante' },
    { name: 'Thaciano', weight: 0.28, role: 'Atacante' },
    { name: 'Cauly', weight: 0.26, role: 'Meio-Campo' },
    { name: 'Everton Ribeiro', weight: 0.20, role: 'Meio-Campo' }
  ],
  'Fortaleza': [
    { name: 'Juan Martín Lucero', weight: 0.42, role: 'Atacante' },
    { name: 'Yago Pikachu', weight: 0.30, role: 'Meio-Campo' },
    { name: 'Moisés', weight: 0.28, role: 'Atacante' },
    { name: 'Breno Lopes', weight: 0.24, role: 'Atacante' },
    { name: 'Pochettino', weight: 0.22, role: 'Meio-Campo' }
  ],
  'Athletico-PR': [
    { name: 'Gonzalo Mastriani', weight: 0.40, role: 'Atacante' },
    { name: 'Pablo', weight: 0.32, role: 'Atacante' },
    { name: 'Nikão', weight: 0.26, role: 'Meio-Campo' },
    { name: 'Tomás Cuello', weight: 0.20, role: 'Meio-Campo' },
    { name: 'Fernandinho', weight: 0.18, role: 'Meio-Campo' }
  ],
  'Bragantino': [
    { name: 'Isidro Pitta', weight: 0.40, role: 'Atacante' },
    { name: 'Eduardo Sasha', weight: 0.36, role: 'Atacante' },
    { name: 'Lucas Barbosa', weight: 0.32, role: 'Atacante' },
    { name: 'Henry Mosquera', weight: 0.26, role: 'Atacante' },
    { name: 'Juninho Capixaba', weight: 0.14, role: 'Defensor' }
  ]
};

const COMMON_FIRST_NAMES = [
  "Gabriel", "Lucas", "Matheus", "Felipe", "Bruno", "Rodrigo", "Thiago", "Diego", "Gustavo", "Vinícius",
  "Marcos", "André", "Rafael", "Daniel", "Léo", "Guilherme", "João", "Pedro", "Arthur", "Kaio",
  "Victor", "Eduardo", "Ruan", "Dudu", "Luiz", "Marcelo", "Renato", "Vitor", "Douglas", "Igor"
];

const COMMON_LAST_NAMES = [
  "Silva", "Santos", "Souza", "Oliveira", "Pereira", "Lima", "Carvalho", "Ferreira", "Rodrigues", "Almeida",
  "Costa", "Gomes", "Martins", "Araújo", "Ribeiro", "Barbosa", "Nascimento", "Cardoso", "Teixeira", "Melo"
];

const getPlayersForTeam = (teamName, isHome) => {
  let hash = 0;
  const seed = String(teamName || "") + (isHome ? "home" : "away");
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  const getRand = (offset) => {
    const val = Math.sin(hash + offset) * 10000;
    return val - Math.floor(val);
  };

  const roles = [
    { role: 'Atacante', weight: 0.38 },
    { role: 'Atacante', weight: 0.32 },
    { role: 'Meio-Campo', weight: 0.24 },
    { role: 'Meio-Campo', weight: 0.20 },
    { role: 'Defensor', weight: 0.12 },
    { role: 'Defensor', weight: 0.08 }
  ];

  return roles.map((r, idx) => {
    const firstIdx = Math.floor(getRand(idx * 2) * COMMON_FIRST_NAMES.length);
    const lastIdx = Math.floor(getRand(idx * 2 + 1) * COMMON_LAST_NAMES.length);
    const name = `${COMMON_FIRST_NAMES[firstIdx]} ${COMMON_LAST_NAMES[lastIdx]}`;
    return {
      name,
      weight: r.weight,
      role: r.role
    };
  });
};

const getLeagueIdFromName = (campeonatoName) => {
  if (!campeonatoName) return "71";
  const name = campeonatoName.toLowerCase();
  
  if (name.includes("série a") || name.includes("brasileirão série a") || name.includes("serie a") || name.includes("s\u00e9rie a")) {
    if (name.includes("itália") || name.includes("italia") || name.includes("italy") || name.includes("it\u00e1lia")) return "135";
    return "71";
  }
  if (name.includes("série b") || name.includes("brasileirão série b") || name.includes("serie b") || name.includes("s\u00e9rie b")) return "72";
  if (name.includes("série c") || name.includes("brasileirão série c") || name.includes("serie c") || name.includes("s\u00e9rie c")) return "75";
  if (name.includes("libertadores")) return "13";
  if (name.includes("sudamericana")) return "12";
  if (name.includes("premier")) return "39";
  if (name.includes("la liga") || name.includes("espanha")) return "140";
  if (name.includes("bundesliga") || name.includes("alemanha")) return "78";
  if (name.includes("europa league")) return "3";
  if (name.includes("conference league")) return "848";
  if (name.includes("argentina")) return "44";
  if (name.includes("copa do mundo")) return "1";
  if (name.includes("copa do brasil")) return "73";
  const match = name.match(/liga\s+(\d+)/);
  if (match) return match[1];
  
  return "71";
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

const getCornersStatsLive = (home, away, homeXG, awayXG) => {
  const seedH = getTeamHash(home);
  const seedA = getTeamHash(away);
  
  const noiseFeitosH = ((seedH % 7) - 3) / 10;
  const noiseSofridosH = ((seedH % 5) - 2) / 10;
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

const getCardsStatsLive = (home, away) => {
  const seedH = getTeamHash(home);
  const seedA = getTeamHash(away);
  
  const noiseH = ((seedH % 7) - 3) / 10;
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
    away: { corners: cornersA, yellowCards: yellowA, redCards: redA },
    isReal: false
  };
};

const getLiveOverProbability = (expectedTotal, currentCount, line, elapsedMinute) => {
  const remainingMinutes = Math.max(0, 90 - elapsedMinute);
  if (remainingMinutes <= 0) {
    return currentCount > line ? 100 : 0;
  }
  const lambda = (expectedTotal * remainingMinutes) / 90;
  const needed = Math.max(0, Math.ceil(line - currentCount));
  
  let sum = 0;
  for (let i = 0; i < needed; i++) {
    sum += getPoissonProbability(lambda, i);
  }
  return Math.max(0, Math.min(100, (1 - sum) * 100));
};

export default function CalculatorPage() {
  const { user } = useAuth();
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [homeTeamId, setHomeTeamId] = useState(null);
  const [awayTeamId, setAwayTeamId] = useState(null);
  const [matchDate, setMatchDate] = useState("");
  const [selectedGameId, setSelectedGameId] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("all");
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateString());
  const [activeLeagues, setActiveLeagues] = useState([
    {"id": "71", "name": "Série A"},
    {"id": "72", "name": "Série B"},
    {"id": "13", "name": "Libertadores"},
    {"id": "39", "name": "Premier League"},
    {"id": "140", "name": "La Liga"},
    {"id": "135", "name": "Serie A"},
    {"id": "78", "name": "Bundesliga"}
  ]);

  const getLeagueNameDynamic = (leagueId) => {
    const found = activeLeagues.find(l => String(l.id) === String(leagueId));
    if (found) return found.name;
    return getLeagueName(leagueId);
  };

  useEffect(() => {
    const cached = typeof window !== 'undefined' ? localStorage.getItem('saas_target_leagues') : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setActiveLeagues(parsed);
          const hasDefault = parsed.some(l => String(l.id) === "71");
          if (!hasDefault) {
            setSelectedLeague(String(parsed[0].id));
          }
        }
      } catch (e) {
        console.warn('[Calculator] Erro ao fazer parse das ligas cacheadas:', e);
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
          console.error('[Calculator] Erro ao carregar ligas do banco:', error);
          return;
        }

        if (data && data.value && Array.isArray(data.value)) {
          setActiveLeagues(data.value);
          localStorage.setItem('saas_target_leagues', JSON.stringify(data.value));
          const hasDefault = data.value.some(l => String(l.id) === "71");
          if (!hasDefault && selectedLeague === "71") {
            setSelectedLeague(String(data.value[0].id));
          }
        }
      } catch (err) {
        console.error('[Calculator] Falha de conexão ao carregar ligas:', err);
      }
    }
    loadDynamicLeagues();
  }, []);
  
  const [homeXG, setHomeXG] = useState("");
  const [awayXG, setAwayXG] = useState("");

  const [selectedSelections, setSelectedSelections] = useState([]);
  const [betStake, setBetStake] = useState("100");
  const [globalBookmaker, setGlobalBookmaker] = useState("Best");
  const [marcadoresTab, setMarcadoresTab] = useState('home');
  const [selectedPlayerDropdownValue, setSelectedPlayerDropdownValue] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [customOdd, setCustomOdd] = useState("");
  const [generalOpportunities, setGeneralOpportunities] = useState([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);

  useEffect(() => {
    async function loadOpportunities() {
      if (homeTeam && awayTeam) return;
      setLoadingOpportunities(true);
      try {
        if (supabase) {
          const { data, error } = await supabase
            .from('ev_opportunities')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
          if (error) {
            console.error("Erro ao carregar oportunidades do banco:", error);
            setGeneralOpportunities([]);
          } else if (data) {
            setGeneralOpportunities(data);
          }
        }
      } catch (err) {
        console.error("Falha ao buscar oportunidades:", err);
      } finally {
        setLoadingOpportunities(false);
      }
    }
    loadOpportunities();
  }, [homeTeam, awayTeam]);

  const handleSelectOpportunity = async (opp) => {
    const leagueId = getLeagueIdFromName(opp.campeonato);
    setSelectedLeague(leagueId);
    
    let home = "";
    let away = "";
    if (opp.confronto.includes(" x ")) {
      const parts = opp.confronto.split(" x ");
      home = parts[0].trim();
      away = parts[1].trim();
    } else if (opp.confronto.includes(" vs ")) {
      const parts = opp.confronto.split(" vs ");
      home = parts[0].trim();
      away = parts[1].trim();
    } else {
      home = opp.confronto;
    }

    setLoadingGames(true);
    try {
      const res = await fetch(`/api/football/fixtures?league=${leagueId}&all=true`);
      const data = await res.json();
      let fixtures = [];
      if (data && data.fixtures) {
        fixtures = data.fixtures;
        setGames(fixtures);
      } else {
        setGames([]);
      }
      setLoadingGames(false);

      const found = fixtures.find(g => 
        (g.home.toLowerCase() === home.toLowerCase() && g.away.toLowerCase() === away.toLowerCase()) ||
        (g.home.toLowerCase().includes(home.toLowerCase()) && g.away.toLowerCase().includes(away.toLowerCase())) ||
        (home.toLowerCase().includes(g.home.toLowerCase()) && away.toLowerCase().includes(g.away.toLowerCase()))
      );

      if (found) {
        handleSelectGame(found);
        triggerToast(`Partida ${found.home} x ${found.away} carregada com sucesso!`);
      } else {
        setHomeTeam(home);
        setAwayTeam(away);
        setHomeXG(1.5);
        setAwayXG(1.2);
        setSelectedGameId("");
        triggerToast(`Dados manuais carregados para ${home} x ${away}`);
      }
    } catch (err) {
      console.error("Erro ao selecionar partida da oportunidade:", err);
      setLoadingGames(false);
      setHomeTeam(home);
      setAwayTeam(away);
      setHomeXG(1.5);
      setAwayXG(1.2);
      setSelectedGameId("");
    }
  };

  // Estados para arrastar (Drag) o Cupom de Apostas
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  useEffect(() => {
    const calcOdd = selectedSelections.reduce((acc, s) => acc * Number(s.odd), 1).toFixed(2);
    setCustomOdd(calcOdd);
  }, [selectedSelections]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const handleGlobalBookmakerChange = (bookmakerName) => {
    setGlobalBookmaker(bookmakerName);
    setSelectedSelections(prev => prev.map(sel => {
      let newOdd = sel.odd;
      if (bookmakerName === 'Best') {
        const sorted = [...sel.bookmakers].sort((a, b) => b.odd - a.odd);
        newOdd = sorted[0] ? sorted[0].odd.toFixed(2) : sel.odd;
      } else {
        const found = sel.bookmakers.find(b => b.name === bookmakerName);
        newOdd = found ? found.odd.toFixed(2) : sel.odd;
      }
      return {
        ...sel,
        bookmaker: bookmakerName === 'Best' ? (sel.bookmakers.sort((a,b) => b.odd-a.odd)[0]?.name || null) : bookmakerName,
        odd: newOdd
      };
    }));
  };

  const handleToggleSelection = (market, label, prob, fairOdd, seedString) => {
    const matchName = `${homeTeam || "Casa"} x ${awayTeam || "Visitante"}`;
    const id = `${matchName}_${market}_${label}`;
    
    // Calcula as odds de todas as casas dinamicamente
    const bookInfo = getBookmakerOdds(fairOdd, seedString);
    const bookmakers = bookInfo.all;
    const bestBook = bookInfo.best;

    setSelectedSelections(prev => {
      const exists = prev.some(s => s.id === id);
      if (exists) {
        return prev.filter(s => s.id !== id);
      } else {
        let initialBookmaker = bestBook ? bestBook.name : null;
        let initialOdd = bestBook ? bestBook.odd.toFixed(2) : fairOdd;

        if (globalBookmaker !== 'Best') {
          const found = bookmakers.find(b => b.name === globalBookmaker);
          if (found) {
            initialBookmaker = found.name;
            initialOdd = found.odd.toFixed(2);
          }
        }

        return [...prev, { 
          id, 
          match: matchName, 
          market, 
          label, 
          prob, 
          bookmakers, 
          bookmaker: initialBookmaker, 
          odd: initialOdd 
        }];
      }
    });
  };

  const handleSaveCustomBet = async (totalOdd, totalProb) => {
    if (selectedSelections.length === 0) return;
    const stakeVal = betStake === "" ? 100 : Number(betStake);

    // Agrupar seleções por partida para formatar a descrição como múltiplas combinadas
    const matchGroups = {};
    selectedSelections.forEach(s => {
      const match = s.match || `${homeTeam || "Casa"} x ${awayTeam || "Visitante"}`;
      if (!matchGroups[match]) matchGroups[match] = [];
      matchGroups[match].push(s.label);
    });

    const descParts = Object.entries(matchGroups).map(([match, labels]) => `${match} (${labels.join(', ')})`);
    const desc = `[Aposta Criada] ${descParts.join(' + ')}`;

    const newTx = {
      date: new Date().toISOString().slice(0, 10),
      type: 'pendente',
      amount: stakeVal,
      description: desc,
      odd: Number(totalOdd)
    };

    let success = false;
    let savedTx = null;

    const userTxIdsKey = `ev_tracker_user_tx_ids_${user?.id || 'guest'}`;
    const userTxsKey = `ev_tracker_banca_txs_${user?.id || 'guest'}`;

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

          // Adicionar o ID gerado na lista local do usuário
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

      // Adicionar o ID gerado na lista local do usuário
      const userTxIds = JSON.parse(localStorage.getItem(userTxIdsKey) || '[]');
      userTxIds.push(savedTx.id);
      localStorage.setItem(userTxIdsKey, JSON.stringify(userTxIds));

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

    setSelectedSelections([]);
    setGlobalBookmaker("Best");
    setPosition({ x: 0, y: 0 });
    triggerToast("Aposta registrada diretamente em Resultados e Banca!");
  };

  const [selectedRefIndex, setSelectedRefIndex] = useState(0);
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);

  const [homePlayersList, setHomePlayersList] = useState([]);
  const [awayPlayersList, setAwayPlayersList] = useState([]);

  const [homeSquad, setHomeSquad] = useState([]);
  const [awaySquad, setAwaySquad] = useState([]);
  const [loadingHomeSquad, setLoadingHomeSquad] = useState(false);
  const [loadingAwaySquad, setLoadingAwaySquad] = useState(false);

  useEffect(() => {
    if (homeTeam) {
      setLoadingHomeSquad(true);
      const url = homeTeamId 
        ? `/api/football/squads?teamId=${homeTeamId}`
        : `/api/football/squads?team=${encodeURIComponent(homeTeam)}`;
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.players && data.players.length > 0) {
            setHomeSquad(data.players);
            const defaultPlayers = data.players.slice(0, 4).map(p => ({
              name: p.name,
              weight: p.position === 'Attacker' ? 0.35 : p.position === 'Midfielder' ? 0.22 : p.position === 'Defender' ? 0.08 : 0.15,
              role: p.position
            }));
            setHomePlayersList(defaultPlayers);
          } else {
            const staticPlayers = TEAM_PLAYERS[homeTeam] || getPlayersForTeam(homeTeam, true);
            const squad = staticPlayers.map((p, i) => ({ id: `static-h-${i}`, name: p.name, position: p.role === 'Atacante' ? 'Attacker' : p.role === 'Meio-Campo' ? 'Midfielder' : 'Defender' }));
            setHomeSquad(squad);
            setHomePlayersList(staticPlayers.map(p => ({ name: p.name, weight: p.weight, role: p.role === 'Atacante' ? 'Attacker' : p.role === 'Meio-Campo' ? 'Midfielder' : 'Defender' })));
          }
          setLoadingHomeSquad(false);
        }).catch(() => {
          const staticPlayers = TEAM_PLAYERS[homeTeam] || getPlayersForTeam(homeTeam, true);
          const squad = staticPlayers.map((p, i) => ({ id: `static-h-${i}`, name: p.name, position: p.role === 'Atacante' ? 'Attacker' : p.role === 'Meio-Campo' ? 'Midfielder' : 'Defender' }));
          setHomeSquad(squad);
          setHomePlayersList(staticPlayers.map(p => ({ name: p.name, weight: p.weight, role: p.role === 'Atacante' ? 'Attacker' : p.role === 'Meio-Campo' ? 'Midfielder' : 'Defender' })));
          setLoadingHomeSquad(false);
        });
    } else {
      setHomeSquad([]);
      setHomePlayersList([]);
    }
  }, [homeTeam]);

  useEffect(() => {
    if (awayTeam) {
      setLoadingAwaySquad(true);
      const url = awayTeamId 
        ? `/api/football/squads?teamId=${awayTeamId}`
        : `/api/football/squads?team=${encodeURIComponent(awayTeam)}`;
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.players && data.players.length > 0) {
            setAwaySquad(data.players);
            const defaultPlayers = data.players.slice(0, 4).map(p => ({
              name: p.name,
              weight: p.position === 'Attacker' ? 0.35 : p.position === 'Midfielder' ? 0.22 : p.position === 'Defender' ? 0.08 : 0.15,
              role: p.position
            }));
            setAwayPlayersList(defaultPlayers);
          } else {
            const staticPlayers = TEAM_PLAYERS[awayTeam] || getPlayersForTeam(awayTeam, false);
            const squad = staticPlayers.map((p, i) => ({ id: `static-a-${i}`, name: p.name, position: p.role === 'Atacante' ? 'Attacker' : p.role === 'Meio-Campo' ? 'Midfielder' : 'Defender' }));
            setAwaySquad(squad);
            setAwayPlayersList(staticPlayers.map(p => ({ name: p.name, weight: p.weight, role: p.role === 'Atacante' ? 'Attacker' : p.role === 'Meio-Campo' ? 'Midfielder' : 'Defender' })));
          }
          setLoadingAwaySquad(false);
        }).catch(() => {
          const staticPlayers = TEAM_PLAYERS[awayTeam] || getPlayersForTeam(awayTeam, false);
          const squad = staticPlayers.map((p, i) => ({ id: `static-a-${i}`, name: p.name, position: p.role === 'Atacante' ? 'Attacker' : p.role === 'Meio-Campo' ? 'Midfielder' : 'Defender' }));
          setAwaySquad(squad);
          setAwayPlayersList(staticPlayers.map(p => ({ name: p.name, weight: p.weight, role: p.role === 'Atacante' ? 'Attacker' : p.role === 'Meio-Campo' ? 'Midfielder' : 'Defender' })));
          setLoadingAwaySquad(false);
        });
    } else {
      setAwaySquad([]);
      setAwayPlayersList([]);
    }
  }, [awayTeam]);

  const [liveStats, setLiveStats] = useState({});

  useEffect(() => {
    setLoadingGames(true);
    let url = "";
    if (selectedLeague === 'all') {
      url = `/api/football/fixtures?league=all&date=${selectedDate}`;
    } else {
      url = `/api/football/fixtures?league=${selectedLeague}&date=${selectedDate}&all=true`;
    }

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data && data.fixtures) {
          let activeFixtures = data.fixtures;
          if (selectedLeague === 'all') {
            const activeLeagueIds = new Set(activeLeagues.map(l => String(l.id)));
            activeFixtures = data.fixtures.filter(f => activeLeagueIds.has(String(f.sourceLeagueId)));
          } else {
            activeFixtures = data.fixtures.map(f => ({ ...f, sourceLeagueId: selectedLeague }));
          }

          activeFixtures.sort((a, b) => {
            const priority = (g) => g.isLive ? 0 : g.isFinished ? 2 : 1;
            return priority(a) - priority(b);
          });

          setGames(activeFixtures);
        } else {
          setGames([]);
        }
        setLoadingGames(false);
      })
      .catch(err => {
        console.error("Erro ao buscar jogos da rodada:", err);
        setGames([]);
        setLoadingGames(false);
      });
  }, [selectedLeague, selectedDate, activeLeagues]);

  useEffect(() => {
    const liveGames = games.filter(g => g.isLive);
    if (liveGames.length === 0) return;

    const fetchLiveStats = async () => {
      try {
        const promises = liveGames.map(async (g) => {
          const res = await fetch(`/api/football/fixtures/stats?fixture=${g.id}`);
          if (!res.ok) return null;
          const data = await res.json();
          return { id: g.id, stats: data };
        });

        const results = await Promise.all(promises);
        const newStats = {};
        results.forEach((r) => {
          if (r && r.stats && !r.stats.error) {
            newStats[r.id] = {
              home: {
                corners: r.stats.home?.corners ?? 0,
                yellowCards: r.stats.home?.yellowCards ?? 0,
                redCards: r.stats.home?.redCards ?? 0
              },
              away: {
                corners: r.stats.away?.corners ?? 0,
                yellowCards: r.stats.away?.yellowCards ?? 0,
                redCards: r.stats.away?.redCards ?? 0
              },
              isReal: true
            };
          }
        });

        setLiveStats((prev) => ({ ...prev, ...newStats }));
      } catch (err) {
        console.warn('[Calculator] Erro ao buscar estatísticas ao vivo:', err);
      }
    };

    fetchLiveStats();
    const interval = setInterval(fetchLiveStats, 30000);
    return () => clearInterval(interval);
  }, [games]);

  const handleSelectGame = (game) => {
    setHomeTeam(game.home);
    setAwayTeam(game.away);
    setHomeTeamId(game.homeTeamId);
    setAwayTeamId(game.awayTeamId);
    setHomeXG(game.homeXG);
    setAwayXG(game.awayXG);
    setSelectedGameId(game.id);
    if (game.rawDate) setMatchDate(game.rawDate);
    
    // Sortear um árbitro para o confronto
    const randomRefIndex = Math.abs(game.id || 0) % REFEREES.length;
    setSelectedRefIndex(randomRefIndex);
  };

  const stats = useMemo(() => {
    let probHome = 0;
    let probDraw = 0;
    let probAway = 0;
    let probOver05 = 0;
    let probOver15 = 0;
    let probOver25 = 0;
    let probOver35 = 0;
    let probOver45 = 0;
    let probBtts = 0;

    let probHomeOver05 = 0;
    let probHomeOver15 = 0;
    let probHomeOver25 = 0;
    let probAwayOver05 = 0;
    let probAwayOver15 = 0;
    let probAwayOver25 = 0;

    const scoreMatrix = [];
    const homeVal = homeXG === "" ? 0 : Number(homeXG);
    const awayVal = awayXG === "" ? 0 : Number(awayXG);

    for (let h = 0; h <= 6; h++) {
      scoreMatrix[h] = [];
      for (let a = 0; a <= 6; a++) {
        const prob = getPoissonProbability(homeVal, h) * getPoissonProbability(awayVal, a);
        scoreMatrix[h][a] = prob;

        if (h > a) probHome += prob;
        else if (h === a) probDraw += prob;
        else probAway += prob;

        const totalGoals = h + a;
        if (totalGoals > 0.5) probOver05 += prob;
        if (totalGoals > 1.5) probOver15 += prob;
        if (totalGoals > 2.5) probOver25 += prob;
        if (totalGoals > 3.5) probOver35 += prob;
        if (totalGoals > 4.5) probOver45 += prob;
        if (h > 0 && a > 0) probBtts += prob;

        if (h > 0.5) probHomeOver05 += prob;
        if (h > 1.5) probHomeOver15 += prob;
        if (h > 2.5) probHomeOver25 += prob;

        if (a > 0.5) probAwayOver05 += prob;
        if (a > 1.5) probAwayOver15 += prob;
        if (a > 2.5) probAwayOver25 += prob;
      }
    }

    return {
      probHome, probDraw, probAway,
      probOver05, probOver15, probOver25, probOver35, probOver45,
      probBtts,
      probHomeOver05, probHomeOver15, probHomeOver25,
      probAwayOver05, probAwayOver15, probAwayOver25,
      scoreMatrix
    };
  }, [homeXG, awayXG]);

  const cornersStats = useMemo(() => {
    if (!homeTeam || !awayTeam) {
      return { 
        home: { feitos: 0, sofridos: 0, total: 0 }, 
        away: { feitos: 0, sofridos: 0, total: 0 }, 
        projected: 0, 
        probs: { over5_5: 0, over7_5: 0, over8_5: 0, over9_5: 0, over10_5: 0 } 
      };
    }
    
    const getHash = (name) => {
      if (!name) return 0;
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return Math.abs(hash);
    };
    
    const seedH = getHash(homeTeam);
    const seedA = getHash(awayTeam);
    const homeVal = homeXG === "" ? 0 : Number(homeXG);
    const awayVal = awayXG === "" ? 0 : Number(awayXG);
    
    const noiseFeitosH = ((seedH % 7) - 3) / 10;
    const noiseSofridosH = ((seedH % 5) - 2) / 10;
    const noiseFeitosA = ((seedA % 7) - 3) / 10;
    const noiseSofridosA = ((seedA % 5) - 2) / 10;

    const feitosH = parseFloat((4.2 + (homeVal * 0.9) + noiseFeitosH).toFixed(1));
    const sofridosH = parseFloat((3.8 + (awayVal * 0.7) + noiseSofridosH).toFixed(1));
    const feitosA = parseFloat((3.6 + (awayVal * 0.8) + noiseFeitosA).toFixed(1));
    const sofridosA = parseFloat((4.4 + (homeVal * 0.8) + noiseSofridosA).toFixed(1));

    const projected = parseFloat((feitosH + feitosA).toFixed(1));
    
    const p = (k) => {
      return (Math.exp(-projected) * Math.pow(projected, k)) / factorial(k);
    };
    const probOver = (k) => {
      let sum = 0;
      for (let i = 0; i <= k; i++) {
        sum += p(i);
      }
      return Math.max(0, Math.min(1, 1 - sum));
    };

    return {
      home: { feitos: feitosH, sofridos: sofridosH, total: parseFloat((feitosH + sofridosH).toFixed(1)) },
      away: { feitos: feitosA, sofridos: sofridosA, total: parseFloat((feitosA + sofridosA).toFixed(1)) },
      projected,
      probs: {
        over5_5: probOver(5),
        over7_5: probOver(7),
        over8_5: probOver(8),
        over9_5: probOver(9),
        over10_5: probOver(10),
      }
    };
  }, [homeTeam, awayTeam, homeXG, awayXG]);

  const handicapsStats = useMemo(() => {
    const scoreMatrix = stats.scoreMatrix;
    if (!scoreMatrix || scoreMatrix.length === 0) {
      return {
        home: { "-1.5": 0, "-1.0": 0, "-0.5": 0, "0.0": 0, "+0.5": 0, "+1.0": 0, "+1.5": 0 },
        away: { "-1.5": 0, "-1.0": 0, "-0.5": 0, "0.0": 0, "+0.5": 0, "+1.0": 0, "+1.5": 0 }
      };
    }

    const getProbForDiff = (conditionFn) => {
      let sum = 0;
      for (let h = 0; h <= 6; h++) {
        for (let a = 0; a <= 6; a++) {
          const prob = scoreMatrix[h]?.[a] || 0;
          if (conditionFn(h - a)) {
            sum += prob;
          }
        }
      }
      return sum;
    };

    // Home Handicaps
    const homeAHMinus15 = getProbForDiff(d => d >= 2);
    const pHomeWin2 = getProbForDiff(d => d >= 2);
    const pHomeLoseOrDraw = getProbForDiff(d => d <= 0);
    const homeAHMinus10 = (pHomeWin2 + pHomeLoseOrDraw) > 0 ? pHomeWin2 / (pHomeWin2 + pHomeLoseOrDraw) : 0;
    const homeAHMinus05 = stats.probHome;
    const pHomeWin = stats.probHome;
    const pAwayWin = stats.probAway;
    const homeAHZero = (pHomeWin + pAwayWin) > 0 ? pHomeWin / (pHomeWin + pAwayWin) : 0;
    const homeAHPlus05 = stats.probHome + stats.probDraw;
    const pHomeWinOrDraw = getProbForDiff(d => d >= 0);
    const pHomeLose2 = getProbForDiff(d => d <= -2);
    const homeAHPlus10 = (pHomeWinOrDraw + pHomeLose2) > 0 ? pHomeWinOrDraw / (pHomeWinOrDraw + pHomeLose2) : 0;
    const homeAHPlus15 = getProbForDiff(d => d >= -1);

    // Away Handicaps
    const awayAHMinus15 = getProbForDiff(d => d <= -2);
    const pAwayWin2 = getProbForDiff(d => d <= -2);
    const pAwayLoseOrDraw = getProbForDiff(d => d >= 0);
    const awayAHMinus10 = (pAwayWin2 + pAwayLoseOrDraw) > 0 ? pAwayWin2 / (pAwayWin2 + pAwayLoseOrDraw) : 0;
    const awayAHMinus05 = stats.probAway;
    const awayAHZero = (pHomeWin + pAwayWin) > 0 ? pAwayWin / (pHomeWin + pAwayWin) : 0;
    const awayAHPlus05 = stats.probAway + stats.probDraw;
    const pAwayWinOrDraw = getProbForDiff(d => d <= 0);
    const pAwayLose2 = getProbForDiff(d => d >= 2);
    const awayAHPlus10 = (pAwayWinOrDraw + pAwayLose2) > 0 ? pAwayWinOrDraw / (pAwayWinOrDraw + pAwayLose2) : 0;
    const awayAHPlus15 = getProbForDiff(d => d <= 1);

    return {
      home: {
        "-1.5": homeAHMinus15,
        "-1.0": homeAHMinus10,
        "-0.5": homeAHMinus05,
        "0.0": homeAHZero,
        "+0.5": homeAHPlus05,
        "+1.0": homeAHPlus10,
        "+1.5": homeAHPlus15,
      },
      away: {
        "-1.5": awayAHMinus15,
        "-1.0": awayAHMinus10,
        "-0.5": awayAHMinus05,
        "0.0": awayAHZero,
        "+0.5": awayAHPlus05,
        "+1.0": awayAHPlus10,
        "+1.5": awayAHPlus15,
      }
    };
  }, [stats]);

  const getOdd = (prob) => (prob > 0 ? (1 / prob).toFixed(2) : "0.00");
  const getPct = (prob) => (prob * 100).toFixed(1);

  const hottest1X2 = useMemo(() => {
    const probs = [
      { key: 'Casa', prob: stats.probHome },
      { key: 'Empate', prob: stats.probDraw },
      { key: 'Visitante', prob: stats.probAway }
    ];
    probs.sort((a, b) => b.prob - a.prob);
    return probs[0].key;
  }, [stats.probHome, stats.probDraw, stats.probAway]);

  const hottestGoal = useMemo(() => {
    const markets = [
      { label: 'Acima 0.5', prob: stats.probOver05 },
      { label: 'Abaixo 0.5', prob: 1 - stats.probOver05 },
      { label: 'Casa Acima 0.5', prob: stats.probHomeOver05 },
      { label: 'Casa Abaixo 0.5', prob: 1 - stats.probHomeOver05 },
      { label: 'Acima 1.5', prob: stats.probOver15 },
      { label: 'Abaixo 1.5', prob: 1 - stats.probOver15 },
      { label: 'Casa Acima 1.5', prob: stats.probHomeOver15 },
      { label: 'Casa Abaixo 1.5', prob: 1 - stats.probHomeOver15 },
      { label: 'Acima 2.5', prob: stats.probOver25 },
      { label: 'Abaixo 2.5', prob: 1 - stats.probOver25 },
      { label: 'Casa Acima 2.5', prob: stats.probHomeOver25 },
      { label: 'Casa Abaixo 2.5', prob: 1 - stats.probHomeOver25 },
      { label: 'Acima 3.5', prob: stats.probOver35 },
      { label: 'Abaixo 3.5', prob: 1 - stats.probOver35 },
      { label: 'Fora Acima 0.5', prob: stats.probAwayOver05 },
      { label: 'Fora Abaixo 0.5', prob: 1 - stats.probAwayOver05 },
      { label: 'Acima 4.5', prob: stats.probOver45 },
      { label: 'Abaixo 4.5', prob: 1 - stats.probOver45 },
      { label: 'Fora Acima 1.5', prob: stats.probAwayOver15 },
      { label: 'Fora Abaixo 1.5', prob: 1 - stats.probAwayOver15 },
      { label: 'Ambos Marcam (Sim)', prob: stats.probBtts },
      { label: 'Ambos Marcam (Não)', prob: 1 - stats.probBtts },
      { label: 'Fora Acima 2.5', prob: stats.probAwayOver25 },
      { label: 'Fora Abaixo 2.5', prob: 1 - stats.probAwayOver25 }
    ];
    markets.sort((a, b) => b.prob - a.prob);
    return markets[0].label;
  }, [stats]);

  const hottestCorner = useMemo(() => {
    const list = [
      { label: 'Escanteios Acima 5.5', prob: cornersStats.probs.over5_5 },
      { label: 'Escanteios Acima 7.5', prob: cornersStats.probs.over7_5 },
      { label: 'Escanteios Acima 8.5', prob: cornersStats.probs.over8_5 },
      { label: 'Escanteios Acima 9.5', prob: cornersStats.probs.over9_5 },
      { label: 'Escanteios Acima 10.5', prob: cornersStats.probs.over10_5 }
    ];
    const filtered = list.filter(item => {
      const odd = 1 / (item.prob || 0.01);
      return odd >= 1.35 && item.prob >= 0.35;
    });
    if (filtered.length === 0) return 'Escanteios Acima 8.5';
    filtered.sort((a, b) => {
      const scoreA = a.prob * Math.log(1 / a.prob);
      const scoreB = b.prob * Math.log(1 / b.prob);
      return scoreB - scoreA;
    });
    return filtered[0].label;
  }, [cornersStats]);

  const hottestHandicap = useMemo(() => {
    const list = [];
    ["-1.5", "-1.0", "-0.5", "0.0", "+0.5", "+1.0", "+1.5"].forEach(line => {
      const probHome = handicapsStats.home[line] || 0;
      const probAway = handicapsStats.away[line] || 0;
      list.push({ label: `${homeTeam || 'Casa'} AH ${line}`, prob: probHome });
      list.push({ label: `${awayTeam || 'Visitante'} AH ${line}`, prob: probAway });
    });
    const filtered = list.filter(item => item.prob >= 0.35 && item.prob <= 0.75);
    if (filtered.length === 0) return `${homeTeam || 'Casa'} AH 0.0`;
    filtered.sort((a, b) => {
      const scoreA = a.prob * Math.log(1 / a.prob);
      const scoreB = b.prob * Math.log(1 / b.prob);
      return scoreB - scoreA;
    });
    return filtered[0].label;
  }, [handicapsStats, homeTeam, awayTeam]);

  const hottestPlayerGoal = useMemo(() => {
    let highest = null;
    let maxProb = -1;

    homePlayersList.forEach(p => {
      const anytime = 1 - Math.exp(-(homeXG === "" ? 0 : Number(homeXG)) * p.weight);
      if (anytime > maxProb) {
        maxProb = anytime;
        highest = { name: p.name, type: 'anytime', team: 'home' };
      }
    });

    awayPlayersList.forEach(p => {
      const anytime = 1 - Math.exp(-(awayXG === "" ? 0 : Number(awayXG)) * p.weight);
      if (anytime > maxProb) {
        maxProb = anytime;
        highest = { name: p.name, type: 'anytime', team: 'away' };
      }
    });

    return highest;
  }, [homePlayersList, awayPlayersList, homeXG, awayXG]);

  // === ANÁLISE DETALHADA E PROFISSIONAL ===

  const selectedRef = REFEREES[selectedRefIndex];

  // Marcadores de Gols (Home/Away) referenciando os estados editáveis
  const homePlayers = homePlayersList;
  const awayPlayers = awayPlayersList;

  // Estimar Probabilidade dos Marcadores
  const calculatePlayerGoalProb = (xg, weight) => {
    const xgVal = xg === "" ? 0 : Number(xg);
    // P(Golo do jogador a qualquer momento) = 1 - e^(-xg * weight)
    const anytime = 1 - Math.exp(-xgVal * weight);
    const first = anytime * 0.38; // Primeiro golo estimado
    return {
      anytime: getPct(anytime),
      anytimeOdd: getOdd(anytime),
      first: getPct(first),
      firstOdd: getOdd(first)
    };
  };

  // Previsões de Cartões
  const cardsPrediction = useMemo(() => {
    const seed = (homeTeam.length || 5) + (awayTeam.length || 7);
    const homeAggression = 1.9 + (seed % 7) * 0.1; // Coeficiente de faltas/agressividade do mandante
    const awayAggression = 2.1 + (seed % 9) * 0.1; // Coeficiente do visitante

    const refFactor = selectedRef.yellows / 5.0; // Padrão base árbitro

    const expectedHomeYellows = Number((homeAggression * refFactor).toFixed(1));
    const expectedAwayYellows = Number((awayAggression * refFactor).toFixed(1));
    const expectedTotalYellows = Number((expectedHomeYellows + expectedAwayYellows).toFixed(1));

    // P(Expulsão) estimada com base nos vermelhos históricos do árbitro e agressão dos times
    const redCardProb = 1 - Math.exp(-selectedRef.reds * (homeAggression + awayAggression) / 3.8);

    // Projeções Poisson para cartões amarelos totais
    const yellowLambda = expectedTotalYellows;
    const p0 = getPoissonProbability(yellowLambda, 0);
    const p1 = getPoissonProbability(yellowLambda, 1);
    const p2 = getPoissonProbability(yellowLambda, 2);
    const p3 = getPoissonProbability(yellowLambda, 3);
    const p4 = getPoissonProbability(yellowLambda, 4);
    const p5 = getPoissonProbability(yellowLambda, 5);

    const probYellowOver35 = 1 - p0 - p1 - p2 - p3;
    const probYellowOver45 = 1 - p0 - p1 - p2 - p3 - p4;
    const probYellowOver55 = 1 - p0 - p1 - p2 - p3 - p4 - p5;

    return {
      homeYellows: expectedHomeYellows,
      awayYellows: expectedAwayYellows,
      totalYellows: expectedTotalYellows,
      redCardProb: getPct(redCardProb),
      redCardOdd: getOdd(redCardProb),
      probYellowOver35,
      probYellowOver45,
      probYellowOver55
    };
  }, [homeTeam, awayTeam, selectedRef]);

  // Top 3 Melhores Apostas (maior probabilidade com odds atrativas)
  const bestBets = useMemo(() => {
    const allBets = [];
    const hXG = homeXG === '' ? 0 : Number(homeXG);
    const aXG = awayXG === '' ? 0 : Number(awayXG);
    if (hXG === 0 && aXG === 0) return [];

    // 1X2
    [{ l: `${homeTeam || 'Casa'} Vence`, p: stats.probHome, m: '1X2' },
     { l: 'Empate', p: stats.probDraw, m: '1X2' },
     { l: `${awayTeam || 'Visitante'} Vence`, p: stats.probAway, m: '1X2' }
    ].forEach(b => { if (b.p > 0.01) allBets.push({ label: b.l, prob: b.p, odd: getOdd(b.p), market: b.m }); });

    // Gols
    [
      { l: 'Acima 0.5 Gols', p: stats.probOver05 }, { l: 'Abaixo 0.5 Gols', p: 1 - stats.probOver05 },
      { l: 'Acima 1.5 Gols', p: stats.probOver15 }, { l: 'Abaixo 1.5 Gols', p: 1 - stats.probOver15 },
      { l: 'Acima 2.5 Gols', p: stats.probOver25 }, { l: 'Abaixo 2.5 Gols', p: 1 - stats.probOver25 },
      { l: 'Acima 3.5 Gols', p: stats.probOver35 }, { l: 'Abaixo 3.5 Gols', p: 1 - stats.probOver35 },
      { l: 'Ambos Marcam (Sim)', p: stats.probBtts }, { l: 'Ambos Marcam (Não)', p: 1 - stats.probBtts },
    ].forEach(b => { if (b.p > 0.01 && b.p < 0.99) allBets.push({ label: b.l, prob: b.p, odd: getOdd(b.p), market: 'Gols' }); });

    // Resultados Exatos (top 5)
    let flatScores = [];
    for (let h = 0; h <= 5; h++) {
      for (let a = 0; a <= 5; a++) {
        flatScores.push({ score: `${h}x${a}`, prob: stats.scoreMatrix[h]?.[a] || 0 });
      }
    }
    flatScores.sort((x, y) => y.prob - x.prob);
    flatScores.slice(0, 5).forEach(s => {
      if (s.prob > 0.01) allBets.push({ label: `Placar ${s.score}`, prob: s.prob, odd: getOdd(s.prob), market: 'Exato' });
    });

    // Cartões
    [
      { l: 'Amarelos Acima 3.5', p: cardsPrediction.probYellowOver35 },
      { l: 'Amarelos Acima 4.5', p: cardsPrediction.probYellowOver45 },
      { l: 'Cartão Vermelho (Sim)', p: Number(cardsPrediction.redCardProb) / 100 },
    ].forEach(b => { if (b.p > 0.01 && b.p < 0.99) allBets.push({ label: b.l, prob: b.p, odd: getOdd(b.p), market: 'Cartões' }); });

    // Escanteios
    [
      { l: 'Escanteios Acima 5.5', p: cornersStats.probs.over5_5 },
      { l: 'Escanteios Acima 7.5', p: cornersStats.probs.over7_5 },
      { l: 'Escanteios Acima 8.5', p: cornersStats.probs.over8_5 },
      { l: 'Escanteios Acima 9.5', p: cornersStats.probs.over9_5 },
      { l: 'Escanteios Acima 10.5', p: cornersStats.probs.over10_5 }
    ].forEach(b => { if (b.p > 0.01 && b.p < 0.99) allBets.push({ label: b.l, prob: b.p, odd: getOdd(b.p), market: 'Escanteios' }); });

    // Marcadores
    homePlayersList.forEach(p => {
      const prob = 1 - Math.exp(-hXG * p.weight);
      if (prob > 0.05) allBets.push({ label: `${p.name} Marca`, prob, odd: getOdd(prob), market: 'Marcador' });
    });
    awayPlayersList.forEach(p => {
      const prob = 1 - Math.exp(-aXG * p.weight);
      if (prob > 0.05) allBets.push({ label: `${p.name} Marca`, prob, odd: getOdd(prob), market: 'Marcador' });
    });

    // Ordenar por melhor valor: probabilidade alta com odd > 1.20 (não trivial)
    const filtered = allBets.filter(b => Number(b.odd) >= 1.15 && Number(b.odd) <= 15);
    filtered.sort((a, b) => {
      // Score = prob * ln(odd) → valoriza probabilidade alta com odds decentes
      const scoreA = a.prob * Math.log(Number(a.odd));
      const scoreB = b.prob * Math.log(Number(b.odd));
      return scoreB - scoreA;
    });
    return filtered.slice(0, 3);
  }, [stats, cardsPrediction, cornersStats, homePlayersList, awayPlayersList, homeXG, awayXG, homeTeam, awayTeam]);

  return (
    <div className="calculator-container">
      
      {/* PAINEL FIXO NO TOPO */}
      <div style={{ flex: '0 0 auto', paddingBottom: '12px', zIndex: 10 }}>
        
        <header style={{ marginBottom: '12px', paddingTop: '12px' }}>
          <h1 className="page-title">
            <Calculator color="var(--brand-neon)" size={28} />
            Análise Profissional
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
            <p style={{ color: '#888', margin: 0, fontSize: '0.9rem' }}>
              Simule dados de gols, marcadores, cartões e arbitragem para obter prognósticos avançados e estatísticas de EV+.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0, 210, 255, 0.05)', border: '1px solid rgba(0, 210, 255, 0.2)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', color: '#00d2ff' }}>
              <Info size={14} style={{ flexShrink: 0 }} />
              <span>Cotações simuladas pelo modelo Poisson da <strong>A2 Solutions</strong>. Diferenças de valor comparadas às casas reais (ex: Betano @1.42 vs App @1.49) não representam atraso ou delay, e sim projeções matemáticas exclusivas de valor!</span>
            </div>
          </div>
        </header>

        {/* 4 COLUNAS: CONFIG, 1X2, GOLS, HEATMAP */}
        {/* 4 COLUNAS: CONFIG, 1X2, GOLS, HEATMAP */}
        {!homeTeam || !awayTeam ? (
          /* layout clean quando nenhuma partida foi selecionada */
          <div className="calculator-initial-layout">
            
            {/* Setup do Jogo (Filtros e Manual) */}
            <div className="glass-panel" style={{ borderTop: '4px solid #00d2ff', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: 'fit-content' }}>
              <h2 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 'bold' }}>
                <Target size={16} color="#00d2ff" /> Filtros e Simulação
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#888', margin: 0 }}>
                Selecione data e liga para visualizar as partidas e suas projeções, ou faça uma simulação manual rápida.
              </p>
              
              {/* Filtros */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selecionar Data:</label>
                  <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => { setSelectedDate(e.target.value); setSelectedGameId(""); setHomeTeam(""); setAwayTeam(""); }}
                    style={{ width: '100%', background: '#1c1c24', border: '1px solid #333', color: 'var(--brand-neon)', padding: '8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer', outline: 'none', colorScheme: 'dark' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selecionar Liga:</label>
                  <select
                    value={selectedLeague}
                    onChange={(e) => { setSelectedLeague(e.target.value); setSelectedGameId(""); setHomeTeam(""); setAwayTeam(""); }}
                    style={{ width: '100%', background: '#1c1c24', border: '1px solid #333', color: '#fff', padding: '8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer', appearance: 'auto' }}
                  >
                    <option value="all">Todas as Ligas</option>
                    {activeLeagues.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Inserção manual opcional */}
              <div style={{ borderTop: '1px solid #333', paddingTop: '10px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>Simulação Manual Rápida:</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input type="text" placeholder="Time Casa" value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} 
                    style={{ flex: 1, background: '#1c1c24', border: '1px solid #333', color: '#fff', padding: '6px 8px', borderRadius: '6px', fontSize: '0.75rem', outline: 'none' }} />
                  <input type="text" placeholder="Time Visitante" value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} 
                    style={{ flex: 1, background: '#1c1c24', border: '1px solid #333', color: '#fff', padding: '6px 8px', borderRadius: '6px', fontSize: '0.75rem', outline: 'none' }} />
                </div>
                {(homeTeam || awayTeam) && (
                  <button 
                    onClick={() => {
                      if (!homeTeam) setHomeTeam("Casa");
                      if (!awayTeam) setAwayTeam("Visitante");
                      setHomeXG(1.5);
                      setAwayXG(1.2);
                    }}
                    style={{ background: 'var(--brand-neon)', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Iniciar Simulador 🚀
                  </button>
                )}
              </div>
            </div>

            {/* Painel de Partidas (Jogos da Rodada com Projeções em Cards) */}
            <div className="glass-panel" style={{ borderTop: '4px solid #ff9800', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 'bold', color: '#ff9800' }}>
                🔥 Partidas da Rodada & Projeções
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#888', margin: 0 }}>
                Visualize o mapa de pressão, previsões de gols, escanteios e cartões. Clique em "Simular & Analisar" em qualquer card para abrir o painel detalhado de Poisson.
              </p>

              {loadingGames ? (
                <div style={{ textAlign: 'center', color: 'var(--brand-neon)', padding: '40px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  Buscando dados das partidas da rodada...
                </div>
              ) : games.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', padding: '40px', fontStyle: 'italic', fontSize: '0.85rem' }}>
                  Nenhuma partida encontrada para esta data ou liga. Selecione outra combinação no painel ao lado.
                </div>
              ) : (
                <div className="palpites-scroll-container no-scrollbar" style={{ overflowY: 'auto', maxHeight: '680px', paddingRight: '4px' }}>
                  {games.map(game => {
                    const fairOddVal = game.stats?.bestTip?.prob ? (1 / game.stats.bestTip.prob).toFixed(2) : '2.00';
                    const { all: bmOdds, best: bestBm } = getBookmakerOdds(game.home + game.away, (game.stats?.bestTip?.selection || 'Resultado') + '_' + fairOddVal);
                    const bestBmOdd = bestBm?.odd || Number(fairOddVal);
                    const hasGameEV = bestBmOdd > Number(fairOddVal) && !game.isFinished;

                    const cornStatsObj = getCornersStatsLive(game.home, game.away, game.homeXG, game.awayXG);
                    const cardsStatsObj = getCardsStatsLive(game.home, game.away);

                    return (
                      <div key={game.id} style={{ 
                        background: '#111', 
                        borderRadius: '12px', 
                        border: game.isLive ? '1px solid #4CAF50' : game.isFinished ? '1px solid #ff4d4d' : hasGameEV ? '1px solid var(--brand-neon)' : '1px solid #333', 
                        borderLeft: game.isLive ? '6px solid #4CAF50' : game.isFinished ? '6px solid #ff4d4d' : hasGameEV ? '6px solid var(--brand-neon)' : '6px solid #4CAF50',
                        boxShadow: hasGameEV ? '0 0 15px rgba(204, 255, 0, 0.08)' : 'none',
                        overflow: 'hidden',
                        opacity: game.isFinished ? 0.7 : 1,
                        flexShrink: 0,
                        height: 'auto'
                      }}>
                        {/* Grid de 4 Colunas do Card */}
                        <div className="game-card-grid">
                          {/* Coluna 1: Placar, Radar e Informações ao Vivo */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                            {/* Cabeçalho do Card */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
                              <span style={{ color: game.isLive ? '#ff4444' : '#4CAF50', fontWeight: 'bold', fontSize: '0.75rem' }}>{game.date}</span>
                              {game.isLive && <span style={{ background: '#ff4444', color: '#fff', padding: '1px 5px', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 'bold', animation: 'pulse 1.5s infinite' }}>🔴 AO VIVO • {game.minute}'</span>}
                              {game.isFinished && <span style={{ background: '#444', color: '#aaa', padding: '1px 5px', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 'bold' }}>FIM</span>}
                              {hasGameEV && <span className="badge-neon" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>🔥 +EV</span>}
                            </div>

                            {/* Campeonato com Logo */}
                            <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#ccc', marginBottom: '2px' }}>
                              {(() => {
                                const logoUrl = getLeagueLogoUrl(game.sourceLeagueId || selectedLeague);
                                if (logoUrl) {
                                  const isLocal = logoUrl.startsWith('/');
                                  return (
                                    <img 
                                      src={logoUrl} 
                                      alt="League Logo" 
                                      style={isLocal ? { width: '14px', height: '14px', objectFit: 'contain' } : { width: '14px', height: '10px', objectFit: 'cover', borderRadius: '1px' }}
                                    />
                                  );
                                }
                                return null;
                              })()}
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                                {getLeagueNameDynamic(game.sourceLeagueId || selectedLeague)}
                              </span>
                              <span style={{ background: '#222', padding: '1px 4px', borderRadius: '3px', fontSize: '0.6rem', color: '#888' }}>R.{game.round}</span>
                            </div>

                            {/* Radar Campo Solo (Mini Pitch) */}
                            {(() => {
                              const radar = game.isLive ? getLiveMatchRadar(game) : null;
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
                                <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '2px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', flexShrink: 0 }}>
                                    <div 
                                      style={{ 
                                        position: 'relative', 
                                        width: '80px', 
                                        height: '42px', 
                                        background: '#0d1a0d', 
                                        border: '1px solid rgba(255, 255, 255, 0.1)', 
                                        borderRadius: '3px', 
                                        overflow: 'hidden',
                                        boxShadow: 'inset 0 0 6px rgba(0,0,0,0.6)',
                                        transition: 'all 0.2s ease-in-out',
                                      }}
                                      className="hover-scale-field"
                                    >
                                      <div style={{ position: 'absolute', top: 0, left: '50%', width: '1px', height: '100%', background: 'rgba(255, 255, 255, 0.15)' }}></div>
                                      <div style={{ position: 'absolute', top: '50%', left: '50%', width: '12px', height: '12px', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '50%', transform: 'translate(-50%, -50%)' }}></div>
                                      <div style={{ position: 'absolute', top: '8px', left: 0, width: '8px', height: '26px', border: '1px solid rgba(255, 255, 255, 0.15)', borderLeft: 'none' }}></div>
                                      <div style={{ position: 'absolute', top: '8px', right: 0, width: '8px', height: '26px', border: '1px solid rgba(255, 255, 255, 0.15)', borderRight: 'none' }}></div>
                                      <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: glowLeft,
                                        width: '24px',
                                        height: '24px',
                                        background: `radial-gradient(circle, ${glowColor} 0%, rgba(0,0,0,0) 70%)`,
                                        borderRadius: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        pointerEvents: 'none'
                                      }}></div>
                                    </div>
                                    <div style={{ display: 'flex', height: '2px', background: '#14141c', width: '80px', position: 'relative', borderRadius: '1px', overflow: 'hidden' }}>
                                      <div style={{ width: `${radar.homePressure}%`, background: 'linear-gradient(90deg, #ff5e00, #ff0055)', height: '100%' }}></div>
                                      <div style={{ width: `${radar.awayPressure}%`, background: 'linear-gradient(90deg, #00bfff, #00ffaa)', height: '100%' }}></div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Placar horizontal com nomes do lado do placar e mais perto da margem */}
                            {(() => {
                              const radar = game.isLive ? getLiveMatchRadar(game) : null;
                              return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px', width: '100%', justifyContent: 'space-between' }}>
                                  {/* Home Team */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end', minWidth: 0, flex: 1 }}>
                                    {radar && radar.zone === 'away_box' && (
                                      <span style={{ color: '#ff4400', animation: 'blinkFlame 1s infinite ease-in-out', fontSize: '0.7rem', fontWeight: 'bold' }}>🔥</span>
                                    )}
                                    <span className="team-name" title={game.home} style={{ fontSize: '0.72rem', maxWidth: '65px', textAlign: 'right' }}>
                                      {game.home}
                                    </span>
                                    <img 
                                      src={game.homeLogo || `https://ui-avatars.com/api/?name=${game.home}&background=222&color=fff&rounded=true&bold=true&size=32`} 
                                      alt={game.home} 
                                      style={{ width: '14px', height: '14px', objectFit: 'contain', flexShrink: 0 }}
                                      onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${game.home}&background=222&color=fff&rounded=true&bold=true&size=32`; }} 
                                    />
                                  </div>

                                  {/* Placar */}
                                  <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '2px', 
                                    color: (game.isLive || game.isFinished) ? '#4CAF50' : '#555', 
                                    fontSize: '0.85rem', 
                                    fontWeight: 'bold',
                                    background: (game.isLive || game.isFinished) ? '#1a1a1a' : 'transparent',
                                    padding: (game.isLive || game.isFinished) ? '1px 4px' : '0',
                                    borderRadius: '3px',
                                    border: (game.isLive || game.isFinished) ? '1px solid #222' : 'none',
                                    flexShrink: 0
                                  }}>
                                    {(game.isLive || game.isFinished) ? (
                                      <>
                                        <span style={{ color: '#fff' }}>{game.goalsHome}</span>
                                        <span style={{ fontSize: '0.65rem', color: '#555' }}>-</span>
                                        <span style={{ color: '#fff' }}>{game.goalsAway}</span>
                                      </>
                                    ) : (
                                      <span>vs</span>
                                    )}
                                  </div>

                                  {/* Away Team */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-start', minWidth: 0, flex: 1 }}>
                                    <img 
                                      src={game.awayLogo || `https://ui-avatars.com/api/?name=${game.away}&background=222&color=fff&rounded=true&bold=true&size=32`} 
                                      alt={game.away} 
                                      style={{ width: '14px', height: '14px', objectFit: 'contain', flexShrink: 0 }}
                                      onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${game.away}&background=222&color=fff&rounded=true&bold=true&size=32`; }} 
                                    />
                                    <span className="team-name" title={game.away} style={{ fontSize: '0.72rem', maxWidth: '65px', textAlign: 'left' }}>
                                      {game.away}
                                    </span>
                                    {radar && radar.zone === 'home_box' && (
                                      <span style={{ color: '#ff4400', animation: 'blinkFlame 1s infinite ease-in-out', fontSize: '0.7rem', fontWeight: 'bold' }}>🔥</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Informações ao Vivo (Escanteios e Cartões) */}
                            {game.isLive && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', marginTop: '2px' }}>
                                {(() => {
                                  const stats = liveStats[game.id] || getSimulatedLiveStats(game);
                                  if (!stats) return null;
                                  return (
                                    <div style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      gap: '4px',
                                      background: 'rgba(0,0,0,0.2)',
                                      padding: '1px 4px',
                                      borderRadius: '3px',
                                      border: '1px dashed rgba(204, 255, 0, 0.15)',
                                      width: '100%',
                                      boxSizing: 'border-box'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.6rem', color: '#fff' }} title="Escanteios (Cantos)">
                                        <span>📐</span>
                                        <span style={{ fontWeight: 'bold', color: 'var(--brand-neon)' }}>{(stats?.home?.corners ?? 0)}-{(stats?.away?.corners ?? 0)}</span>
                                      </div>
                                      <div style={{ width: '1px', height: '6px', background: '#333' }}></div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.6rem', color: '#fff' }} title="Cartões Amarelos">
                                        <span style={{ display: 'inline-block', width: '4px', height: '6px', background: '#ffd600', borderRadius: '1px' }}></span>
                                        <span style={{ fontWeight: 'bold' }}>{(stats?.home?.yellowCards ?? 0)}-{(stats?.away?.yellowCards ?? 0)}</span>
                                      </div>
                                      {((stats?.home?.redCards ?? 0) > 0 || (stats?.away?.redCards ?? 0) > 0) && (
                                        <>
                                          <div style={{ width: '1px', height: '6px', background: '#333' }}></div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.6rem', color: '#fff' }} title="Cartões Vermelhos">
                                            <span style={{ display: 'inline-block', width: '4px', height: '6px', background: '#ff1744', borderRadius: '1px' }}></span>
                                            <span style={{ fontWeight: 'bold', color: '#ff1744' }}>{(stats?.home?.redCards ?? 0)}-{(stats?.away?.redCards ?? 0)}</span>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>

                          {/* Coluna 2: Projeções - Gols e Cantos */}
                          <div className="projections-column" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {/* Mercado de Gols */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ fontSize: '0.62rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>⚽ Gols</div>
                              <div style={{ fontSize: '0.72rem', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#aaa' }}>xG:</span>
                                <span style={{ fontWeight: '500' }}>{game.homeXG.toFixed(1)} v {game.awayXG.toFixed(1)}</span>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#aaa' }}>BTTS / +2.5:</span>
                                <span style={{ fontWeight: '500', color: 'var(--brand-neon)' }}>{((game.stats?.probBtts || 0.5) * 100).toFixed(0)}% / {((game.stats?.probOver25 || 0.5) * 100).toFixed(0)}%</span>
                              </div>
                            </div>

                            {/* Projeção de Cantos */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px dashed #222', paddingTop: '4px' }}>
                              <div style={{ fontSize: '0.62rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>📐 Cantos</div>
                              <div style={{ fontSize: '0.72rem', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#aaa' }}>Projetado:</span>
                                <span style={{ fontWeight: 'bold', color: 'var(--brand-neon)' }}>{cornStatsObj.projected}</span>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#aaa' }}>C / F:</span>
                                <span style={{ fontWeight: '500' }}>{cornStatsObj.home.feitos} / {cornStatsObj.away.feitos}</span>
                              </div>
                            </div>
                          </div>

                          {/* Coluna 3: Projeções - Cartões */}
                          <div className="projections-column" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ fontSize: '0.62rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>🟨 Cartões</div>
                              <div style={{ fontSize: '0.72rem', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#aaa' }}>Total:</span>
                                <span style={{ fontWeight: 'bold', color: 'var(--brand-neon)' }}>{cardsStatsObj.totalYellow}</span>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#aaa' }}>Casa (A/V):</span>
                                <span style={{ fontWeight: '500' }}>{cardsStatsObj.home.yellow} / {cardsStatsObj.home.red.toFixed(1)}</span>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#aaa' }}>Fora (A/V):</span>
                                <span style={{ fontWeight: '500' }}>{cardsStatsObj.away.yellow} / {cardsStatsObj.away.red.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Coluna 4: Palpite Sugerido e Ação */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: 'rgba(255,255,255,0.02)', padding: '4px 6px', borderRadius: '4px', border: '1px solid #222' }}>
                              <div style={{ fontSize: '0.55rem', color: '#888', fontWeight: 'bold' }}>PALPITE SUGERIDO</div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2px' }}>
                                <span className="protection-text" title={game.stats?.bestTip?.selection || 'Resultado'} style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--brand-neon)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {game.stats?.bestTip?.selection || 'Casa ou Fora'}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: '#fff', fontWeight: 'bold', flexShrink: 0 }}>
                                  @{bestBmOdd.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {game.stats?.bestHandicapTip?.selection && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: 'rgba(255,255,255,0.02)', padding: '4px 6px', borderRadius: '4px', border: '1px solid #222', borderLeft: '3px solid var(--brand-neon)' }}>
                                <div style={{ fontSize: '0.55rem', color: '#888', fontWeight: 'bold' }}>PROTEÇÃO</div>
                                <span className="protection-text" title={game.stats.bestHandicapTip.selection} style={{ fontSize: '0.68rem', fontWeight: 'bold', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {game.stats.bestHandicapTip.selection}
                                </span>
                              </div>
                            )}

                            {/* Botão de Ação: Iniciar Simulação / Analisar */}
                            <button
                              onClick={() => handleSelectGame(game)}
                              style={{
                                background: 'var(--brand-neon)',
                                color: '#000',
                                border: 'none',
                                padding: '6px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                marginTop: 'auto',
                                width: '100%',
                                textAlign: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                boxShadow: '0 2px 8px rgba(204, 255, 0, 0.15)',
                                transition: 'all 0.2s'
                              }}
                            >
                              <Calculator size={12} />
                              Simular & Analisar 📊
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        ) : (
          /* layout normal completo com a partida selecionada */
          <div className="calculator-layout-v2">
            
            {/* ROW 1: Setup do Jogo + Melhores Apostas */}
            <div className="calculator-row-1">
              
              {/* Card 1: Setup do Jogo */}
              <div className="glass-panel" style={{ borderTop: '4px solid #00d2ff', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <h2 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 'bold' }}>
                    <Target size={16} color="#00d2ff" /> Setup do Jogo
                  </h2>
                  <button
                    onClick={() => { setHomeTeam(""); setAwayTeam(""); setSelectedGameId(""); }}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #333', color: '#ccc', fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                    className="hover-scale-field"
                  >
                    ⬅️ Voltar
                  </button>
                </div>
                
                {/* Seletor de Liga e Partida - Lado a Lado */}
                <div className="setup-row-responsive">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                    <label style={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selecionar Liga:</label>
                    <select
                      value={selectedLeague}
                      onChange={(e) => { setSelectedLeague(e.target.value); setSelectedGameId(""); setHomeTeam(""); setAwayTeam(""); }}
                      style={{ width: '100%', background: '#1c1c24', border: '1px solid #333', color: '#fff', padding: '7px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', appearance: 'auto' }}
                    >
                      {activeLeagues.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                    <label style={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selecionar Partida:</label>
                    {loadingGames ? (
                      <div style={{ fontSize: '0.75rem', color: '#555', fontStyle: 'italic', padding: '7px' }}>Buscando...</div>
                    ) : games.length === 0 ? (
                      <div style={{ fontSize: '0.75rem', color: '#888', fontStyle: 'italic', padding: '7px' }}>Nenhum jogo.</div>
                    ) : (
                      <select 
                        onChange={(e) => { const selectedId = Number(e.target.value); const game = games.find(g => g.id === selectedId); if (game) handleSelectGame(game); }}
                        value={selectedGameId}
                        style={{ width: '100%', background: '#1c1c24', border: '1px solid #333', color: 'var(--brand-neon)', padding: '7px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', appearance: 'auto' }}
                      >
                        <option value="" disabled>-- Selecione --</option>
                        {games.map(g => (<option key={g.id} value={g.id}>{g.home} x {g.away}</option>))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Times lado a lado abaixo */}
                <div className="setup-row-responsive" style={{ gap: '6px' }}>
                  <div style={{ flex: 1, display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input type="text" placeholder="Time Casa" value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} 
                      style={{ flex: 1, background: '#1c1c24', border: '1px solid #333', color: '#fff', padding: '6px 8px', borderRadius: '6px', fontSize: '0.78rem', outline: 'none', minWidth: 0 }} />
                    <input type="number" step="0.1" min="0" value={homeXG} onChange={(e) => setHomeXG(Number(e.target.value))} 
                      style={{ width: '48px', background: '#1c1c24', border: '1px solid #333', color: '#fff', padding: '6px', borderRadius: '6px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 'bold', outline: 'none' }} title="xG Casa" />
                  </div>
                  <div style={{ flex: 1, display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input type="text" placeholder="Time Visitante" value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} 
                      style={{ flex: 1, background: '#1c1c24', border: '1px solid #333', color: '#fff', padding: '6px 8px', borderRadius: '6px', fontSize: '0.78rem', outline: 'none', minWidth: 0 }} />
                    <input type="number" step="0.1" min="0" value={awayXG} onChange={(e) => setAwayXG(Number(e.target.value))} 
                      style={{ width: '48px', background: '#1c1c24', border: '1px solid #333', color: '#fff', padding: '6px', borderRadius: '6px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 'bold', outline: 'none' }} title="xG Visitante" />
                  </div>
                </div>
              </div>

              {/* Card 2: 🔥 Melhores Apostas */}
              <div className="glass-panel" style={{ borderTop: '4px solid #ff9800', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h3 style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 4px 0', fontWeight: 'bold', color: '#ff9800' }}>
                  🔥 Melhores Apostas (Maior EV+)
                </h3>
                {!homeTeam || !awayTeam ? (
                  <div style={{ textAlign: 'center', color: '#666', padding: '20px', fontStyle: 'italic', fontSize: '0.75rem' }}>
                    Aguardando seleção de partida...
                  </div>
                ) : bestBets.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {bestBets.map((bet, idx) => {
                      const bookInfo = getBookmakerOdds(bet.odd, `${homeTeam || 'Casa'}_${awayTeam || 'Visitante'}_BestBets_${bet.label}`);
                      const bestBook = bookInfo.best;
                      const finalOdd = bestBook ? bestBook.odd.toFixed(2) : bet.odd;
                      const bestBookName = bestBook ? bestBook.name : '';
                      const bestBookColor = bestBook ? bestBook.color : '#ff9800';
                      const isSelected = selectedSelections.some(s => s.market === bet.market && s.label === bet.label);

                      return (
                        <div 
                          key={idx}
                          onClick={() => handleToggleSelection(bet.market, bet.label, bet.prob, bet.odd, `${homeTeam || 'Casa'}_${awayTeam || 'Visitante'}_BestBets_${bet.label}`)}
                          style={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            justifyContent: 'space-between', 
                            padding: '6px 8px', 
                            background: isSelected ? 'rgba(204, 255, 0, 0.15)' : idx === 0 ? 'rgba(255, 152, 0, 0.08)' : 'transparent',
                            border: isSelected 
                              ? '1.5px solid var(--brand-neon)' 
                              : idx === 0 
                                ? '1.5px solid #ff9800' 
                                : '1px solid #333', 
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: idx === 0 && !isSelected ? '0 0 8px rgba(255, 152, 0, 0.2)' : 'none',
                            minWidth: 0
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '2px' }}>
                              {idx === 0 && <span style={{ fontSize: '0.62rem' }}>🏆</span>}
                              {idx === 1 && <span style={{ fontSize: '0.62rem' }}>🥈</span>}
                              {idx === 2 && <span style={{ fontSize: '0.62rem' }}>🥉</span>}
                              <span style={{ fontSize: '0.68rem', fontWeight: 'bold', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={bet.label}>{bet.label}</span>
                            </div>
                            <div style={{ fontSize: '0.55rem', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {bet.market}
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px', flexWrap: 'wrap', gap: '2px' }}>
                            <span style={{ fontSize: '0.58rem', color: '#aaa', fontWeight: 'bold' }}>
                              {getPct(bet.prob)}%
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1' }}>
                              <span style={{ color: '#ff9800', fontSize: '0.72rem', fontWeight: 'bold' }}>@{finalOdd}</span>
                              {bestBookName && (
                                <span style={{ color: bestBookColor, fontSize: '0.52rem', fontWeight: 'bold', marginTop: '1px' }}>
                                  {bestBookName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#666', padding: '20px', fontStyle: 'italic', fontSize: '0.75rem' }}>
                    Nenhuma aposta de valor encontrada.
                  </div>
                )}
              </div>
            </div>

            {/* ROW 2: Marcadores + Mercado de Escanteios */}
            <div className="calculator-row-2">
              
              {/* Card 3: Marcadores */}
              <div className="glass-panel" style={{ borderTop: '4px solid #ffeb3b', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h3 style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', margin: 0, fontWeight: 'bold', color: '#ffeb3b' }}>
                  <User size={14} color="#ffeb3b" /> Marcadores
                </h3>
                {!homeTeam || !awayTeam ? (
                  <div style={{ textAlign: 'center', color: '#666', padding: '20px', fontStyle: 'italic', fontSize: '0.75rem' }}>
                    Aguardando seleção de partida...
                  </div>
                ) : (
                  <>
                    {/* TABS */}
                    <div style={{ display: 'flex', gap: '0', borderRadius: '6px', overflow: 'hidden', border: '1px solid #333' }}>
                      <button onClick={() => setMarcadoresTab('home')} style={{ flex: 1, padding: '5px 8px', background: marcadoresTab === 'home' ? 'var(--brand-neon)' : 'transparent', color: marcadoresTab === 'home' ? '#000' : '#aaa', border: 'none', fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', borderRight: '1px solid #333' }}>
                        🏠 {homeTeam || 'Casa'}
                      </button>
                      <button onClick={() => setMarcadoresTab('away')} style={{ flex: 1, padding: '5px 8px', background: marcadoresTab === 'away' ? '#ff4b4b' : 'transparent', color: marcadoresTab === 'away' ? '#fff' : '#aaa', border: 'none', fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                        ✈️ {awayTeam || 'Visitante'}
                      </button>
                    </div>
                    <select
                      value={selectedPlayerDropdownValue}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        if (!selectedId) return;
                        if (marcadoresTab === 'home') {
                          const playerInfo = homeSquad.find(sq => String(sq.id) === String(selectedId));
                          if (playerInfo && !homePlayersList.some(p => p.name.trim() === playerInfo.name.trim())) {
                            let w = playerInfo.position === 'Attacker' ? 0.35 : playerInfo.position === 'Midfielder' ? 0.22 : playerInfo.position === 'Defender' ? 0.08 : 0.15;
                            setHomePlayersList([...homePlayersList, { name: playerInfo.name, weight: w, role: playerInfo.position }]);
                          }
                        } else {
                          const playerInfo = awaySquad.find(sq => String(sq.id) === String(selectedId));
                          if (playerInfo && !awayPlayersList.some(p => p.name.trim() === playerInfo.name.trim())) {
                            let w = playerInfo.position === 'Attacker' ? 0.35 : playerInfo.position === 'Midfielder' ? 0.22 : playerInfo.position === 'Defender' ? 0.08 : 0.15;
                            setAwayPlayersList([...awayPlayersList, { name: playerInfo.name, weight: w, role: playerInfo.position }]);
                          }
                        }
                        setSelectedPlayerDropdownValue("");
                      }}
                      style={{ background: '#1c1c24', border: '1px solid #333', color: '#fff', padding: '6px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', width: '100%', outline: 'none', appearance: 'auto', cursor: 'pointer' }}
                    >
                      <option value="">+ Selecionar Jogador</option>
                      {(marcadoresTab === 'home' ? homeSquad : awaySquad).map(sq => (
                        <option key={sq.id} value={sq.id}>{sq.name} ({sq.position === 'Attacker' ? 'ATA' : sq.position === 'Midfielder' ? 'MEI' : sq.position === 'Defender' ? 'DEF' : 'GOL'})</option>
                      ))}
                    </select>
                    <div className="no-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', maxHeight: '200px', paddingRight: '2px' }}>
                      {(() => {
                        const playersList = marcadoresTab === 'home' ? homePlayersList : awayPlayersList;
                        const xgVal = marcadoresTab === 'home' ? homeXG : awayXG;
                        const teamLabel = marcadoresTab === 'home' ? (homeTeam || 'Casa') : (awayTeam || 'Visitante');
                        const teamKey = marcadoresTab === 'home' ? 'home' : 'away';
                        const setPlayersList = marcadoresTab === 'home' ? setHomePlayersList : setAwayPlayersList;
                        if (playersList.length === 0) return <div style={{ textAlign: 'center', color: '#555', padding: '10px', fontStyle: 'italic', fontSize: '0.7rem' }}>Nenhum jogador do {teamLabel} selecionado.</div>;
                        return playersList.map((p, idx) => {
                          const prob = calculatePlayerGoalProb(xgVal, p.weight);
                          const isAnytimeSelected = selectedSelections.some(s => s.market === 'Marcadores' && s.label === `${p.name} (Qualquer Momento)`);
                          const isFirstSelected = selectedSelections.some(s => s.market === 'Marcadores' && s.label === `${p.name} (Primeiro Gol)`);
                          const isHottestAnytime = hottestPlayerGoal && hottestPlayerGoal.name === p.name && hottestPlayerGoal.type === 'anytime' && hottestPlayerGoal.team === teamKey;
                          return (
                            <div key={`${teamKey}-${idx}`} style={{ background: '#141419', padding: '6px 10px', borderRadius: '6px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                              <div style={{ minWidth: 0, flex: '1 1 80px' }}>
                                <div style={{ color: '#fff', fontSize: '0.78rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                <span style={{ fontSize: '0.6rem', background: '#222', padding: '1px 4px', borderRadius: '3px', color: '#aaa' }}>{p.role === 'Attacker' ? 'ATA' : p.role === 'Midfielder' ? 'MEI' : p.role === 'Defender' ? 'DEF' : 'GOL'}</span>
                              </div>
                              {(() => {
                                const anyOdd = prob.anytimeOdd;
                                const anyBookInfo = getBookmakerOdds(anyOdd, `${homeTeam || 'Casa'}_${awayTeam || 'Visitante'}_Scorer_Anytime_${p.name}`);
                                const displayAnyOdd = anyBookInfo.best ? anyBookInfo.best.odd.toFixed(2) : anyOdd;

                                const firstOdd = prob.firstOdd;
                                const firstBookInfo = getBookmakerOdds(firstOdd, `${homeTeam || 'Casa'}_${awayTeam || 'Visitante'}_Scorer_First_${p.name}`);
                                const displayFirstOdd = firstBookInfo.best ? firstBookInfo.best.odd.toFixed(2) : firstOdd;

                                return (
                                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                                    <div onClick={() => handleToggleSelection('Marcadores', `${p.name} (Qualquer Momento)`, Number(prob.anytime)/100, anyOdd, `${homeTeam || 'Casa'}_${awayTeam || 'Visitante'}_Scorer_Anytime_${p.name}`)}
                                      style={{ padding: '3px 5px', borderRadius: '5px', cursor: 'pointer', background: isAnytimeSelected ? 'rgba(204, 255, 0, 0.15)' : 'transparent', border: isAnytimeSelected ? '1.5px solid var(--brand-neon)' : isHottestAnytime ? '1.5px solid #00ffaa' : '1px solid transparent', transition: 'all 0.2s', boxShadow: isHottestAnytime ? '0 0 6px rgba(0, 255, 170, 0.3)' : 'none', textAlign: 'center' }}>
                                      <div style={{ fontSize: '0.58rem', color: '#888' }}>Qualquer</div>
                                      <strong style={{ color: '#fff', fontSize: '0.72rem' }}>{prob.anytime}%</strong>
                                      <div style={{ color: '#ff9800', fontSize: '0.6rem', fontWeight: 'bold' }}>@{displayAnyOdd}</div>
                                    </div>
                                    <div onClick={() => handleToggleSelection('Marcadores', `${p.name} (Primeiro Gol)`, Number(prob.first)/100, firstOdd, `${homeTeam || 'Casa'}_${awayTeam || 'Visitante'}_Scorer_First_${p.name}`)}
                                      style={{ padding: '3px 5px', borderRadius: '5px', cursor: 'pointer', background: isFirstSelected ? 'rgba(204, 255, 0, 0.15)' : 'transparent', border: isFirstSelected ? '1.5px solid var(--brand-neon)' : '1px solid transparent', transition: 'all 0.2s', textAlign: 'center' }}>
                                      <div style={{ fontSize: '0.58rem', color: '#888' }}>1º Gol</div>
                                      <strong style={{ color: '#aaa', fontSize: '0.72rem' }}>{prob.first}%</strong>
                                      <div style={{ color: '#ff9800', fontSize: '0.6rem', fontWeight: 'bold' }}>@{displayFirstOdd}</div>
                                    </div>
                                  </div>
                                );
                              })()}
                              <button onClick={() => setPlayersList(playersList.filter((_, i) => i !== idx))} style={{ background: 'transparent', border: 'none', color: '#ff4b4b', cursor: 'pointer', padding: '2px', fontSize: '0.85rem' }} title="Remover">✕</button>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </>
                )}
              </div>

              {/* Card 4: Mercado de Escanteios */}
              <div className="glass-panel" style={{ borderTop: '4px solid #00d2ff', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                  <Target size={16} color="#00d2ff" /> Mercado de Escanteios
                </h2>
                <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '10px' }}>
                  Projeção total do confronto: <strong style={{ color: '#00d2ff' }}>{cornersStats.projected} cantos</strong>
                </div>
                <div className="gols-grid-responsive">
                  {[
                    { label: 'Escanteios Acima 5.5', prob: cornersStats.probs.over5_5 },
                    { label: 'Escanteios Acima 7.5', prob: cornersStats.probs.over7_5 },
                    { label: 'Escanteios Acima 8.5', prob: cornersStats.probs.over8_5 },
                    { label: 'Escanteios Acima 9.5', prob: cornersStats.probs.over9_5 },
                    { label: 'Escanteios Acima 10.5', prob: cornersStats.probs.over10_5 }
                  ].map((item, idx) => {
                    const oddVal = getOdd(item.prob);
                    const bookInfo = getBookmakerOdds(oddVal, `${homeTeam || 'Casa'}_${awayTeam || 'Visitante'}_Corners_${item.label}`);
                    const finalOdd = bookInfo.best ? bookInfo.best.odd.toFixed(2) : oddVal;

                    const isSelected = selectedSelections.some(s => s.market === 'Escanteios' && s.label === item.label);
                    const isHottest = hottestCorner === item.label;
                    return (
                      <div 
                        key={idx} 
                        onClick={() => handleToggleSelection('Escanteios', item.label, item.prob, oddVal, `${homeTeam || 'Casa'}_${awayTeam || 'Visitante'}_Corners_${item.label}`)}
                        style={{ 
                          background: isSelected ? 'rgba(204, 255, 0, 0.15)' : 'transparent', 
                          border: isSelected 
                            ? '1.5px solid var(--brand-neon)' 
                            : isHottest 
                              ? '1.5px solid #00ffaa' 
                              : '1px solid #333', 
                          padding: '6px 2px', 
                          borderRadius: '6px', 
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: isHottest ? '0 0 6px rgba(0, 255, 170, 0.3)' : 'none'
                        }}
                      >
                        <div style={{ color: '#aaa', fontSize: '0.66rem', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.label}>
                          {item.label}
                        </div>
                        <strong style={{ fontSize: '0.82rem', display: 'block' }}>{getPct(item.prob)}%</strong>
                        <div style={{ fontSize: '0.66rem', color: '#ff9800', fontWeight: 'bold' }}>@{finalOdd}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ROW 3: Os 5 outros cards lado a lado */}
            <div className="calculator-row-3">
              
              {/* Card 1: Mercado 1X2 & Handicap */}
              <div className="glass-panel" style={{ borderTop: '4px solid var(--brand-neon)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '0', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                  <Activity size={16} color="var(--brand-neon)" /> Mercado 1X2 & Handicap
                </h2>
                {!homeTeam || !awayTeam ? (
                  <div style={{ textAlign: 'center', color: '#666', padding: '30px', fontStyle: 'italic', fontSize: '0.8rem' }}>
                    Aguardando seleção de partida...
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { label: 'Casa Vence', key: 'Casa', prob: stats.probHome, odd: getOdd(stats.probHome), name: homeTeam || "Casa", color: 'var(--brand-neon)' },
                        { label: 'Empate', key: 'Empate', prob: stats.probDraw, odd: getOdd(stats.probDraw), name: 'Empate', color: '#ffeb3b' },
                        { label: 'Fora Vence', key: 'Visitante', prob: stats.probAway, odd: getOdd(stats.probAway), name: awayTeam || "Visitante", color: '#ff4b4b' }
                      ].map((item, idx) => {
                        const bookInfo = getBookmakerOdds(item.odd, `${homeTeam || 'Casa'}_${awayTeam || 'Visitante'}_1X2_${item.label}`);
                        const finalOdd = bookInfo.best ? bookInfo.best.odd.toFixed(2) : item.odd;
                        const isSelected = selectedSelections.some(s => s.market === '1X2' && s.label === item.label);
                        const isHottest = hottest1X2 === item.key;

                        return (
                          <div 
                            key={idx}
                            onClick={() => handleToggleSelection('1X2', item.label, item.prob, item.odd, `${homeTeam || 'Casa'}_${awayTeam || 'Visitante'}_1X2_${item.label}`)}
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              padding: '8px 10px', 
                              background: isSelected ? 'rgba(204, 255, 0, 0.15)' : 'transparent', 
                              border: isSelected 
                                ? '1.5px solid var(--brand-neon)' 
                                : isHottest 
                                  ? '1.5px solid #00ffaa' 
                                  : '1px solid #333', 
                              borderRadius: '8px', 
                              gap: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              boxShadow: isHottest ? '0 0 8px rgba(0, 255, 170, 0.3)' : 'none'
                            }}
                          >
                            <span style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={item.name}>{item.name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                              <strong style={{ color: item.color, fontSize: '0.85rem' }}>{getPct(item.prob)}%</strong>
                              <span style={{ color: '#ff9800', fontSize: '0.85rem', fontWeight: 'bold' }}>@{finalOdd}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Handicaps Asiáticos */}
                    <div style={{ borderTop: '1px solid #333', paddingTop: '12px', marginTop: '4px' }}>
                      <h3 style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 8px 0', fontWeight: 'bold', color: 'var(--brand-neon)' }}>
                        <TrendingUp size={14} color="var(--brand-neon)" /> Handicap Asiático
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1.2fr', gap: '6px', textAlign: 'center', fontSize: '0.65rem', color: '#888', fontWeight: 'bold' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{homeTeam || 'Casa'}</span>
                          <span>Linha</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{awayTeam || 'Visitante'}</span>
                        </div>
                        {["-1.5", "-1.0", "-0.5", "0.0", "+0.5", "+1.0", "+1.5"].map((line) => {
                          const probHome = handicapsStats.home[line] || 0;
                          const probAway = handicapsStats.away[line] || 0;

                          const oddHomeRaw = getOdd(probHome);
                          const oddAwayRaw = getOdd(probAway);

                          const bookInfoHome = getBookmakerOdds(oddHomeRaw, `${homeTeam || 'Casa'}_${awayTeam || 'Visitante'}_AH_Home_${line}`);
                          const bookInfoAway = getBookmakerOdds(oddAwayRaw, `${homeTeam || 'Casa'}_${awayTeam || 'Visitante'}_AH_Away_${line}`);

                          const finalOddHome = bookInfoHome.best ? bookInfoHome.best.odd.toFixed(2) : oddHomeRaw;
                          const finalOddAway = bookInfoAway.best ? bookInfoAway.best.odd.toFixed(2) : oddAwayRaw;

                          const isHomeSelected = selectedSelections.some(s => s.market === 'Handicap' && s.label === `${homeTeam || 'Casa'} AH ${line}`);
                          const isAwaySelected = selectedSelections.some(s => s.market === 'Handicap' && s.label === `${awayTeam || 'Visitante'} AH ${line}`);

                          const isHomeHottest = hottestHandicap === `${homeTeam || 'Casa'} AH ${line}`;
                          const isAwayHottest = hottestHandicap === `${awayTeam || 'Visitante'} AH ${line}`;

                          return (
                            <div key={line} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1.2fr', gap: '6px', alignItems: 'center' }}>
                              <div 
                                onClick={() => handleToggleSelection('Handicap', `${homeTeam || 'Casa'} AH ${line}`, probHome, oddHomeRaw, `${homeTeam || 'Casa'}_${awayTeam || 'Visitante'}_AH_Home_${line}`)}
                                style={{
                                  background: isHomeSelected ? 'rgba(204, 255, 0, 0.15)' : 'transparent',
                                  border: isHomeSelected 
                                    ? '1.5px solid var(--brand-neon)' 
                                    : isHomeHottest 
                                      ? '1.5px solid #00ffaa' 
                                      : '1px solid #333',
                                  borderRadius: '6px',
                                  padding: '4px',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  fontSize: '0.72rem',
                                  boxShadow: isHomeHottest ? '0 0 6px rgba(0, 255, 170, 0.3)' : 'none'
                                }}
                              >
                                <strong style={{ color: '#fff' }}>{getPct(probHome)}%</strong>
                                <div style={{ color: '#ff9800', fontSize: '0.62rem', fontWeight: 'bold' }}>@{finalOddHome}</div>
                              </div>
                              <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#aaa', fontWeight: 'bold', background: '#141419', padding: '4px 2px', borderRadius: '4px', border: '1px solid #222' }}>
                                {line}
                              </div>
                              <div 
                                onClick={() => handleToggleSelection('Handicap', `${awayTeam || 'Visitante'} AH ${line}`, probAway, oddAwayRaw, `${homeTeam || 'Casa'}_${awayTeam || 'Visitante'}_AH_Away_${line}`)}
                                style={{
                                  background: isAwaySelected ? 'rgba(204, 255, 0, 0.15)' : 'transparent',
                                  border: isAwaySelected 
                                    ? '1.5px solid var(--brand-neon)' 
                                    : isAwayHottest 
                                      ? '1.5px solid #00ffaa' 
                                      : '1px solid #333',
                                  borderRadius: '6px',
                                  padding: '4px',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  fontSize: '0.72rem',
                                  boxShadow: isAwayHottest ? '0 0 6px rgba(0, 255, 170, 0.3)' : 'none'
                                }}
                              >
                                <strong style={{ color: '#fff' }}>{getPct(probAway)}%</strong>
                                <div style={{ color: '#ff9800', fontSize: '0.62rem', fontWeight: 'bold' }}>@{finalOddAway}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Card 2: Mercado de Gols */}
              <div className="glass-panel" style={{ borderTop: '4px solid #ff9800', padding: '14px' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                  <Info size={16} color="#ff9800" /> Mercado de Gols (Top 24)
                </h2>
                {!homeTeam || !awayTeam ? (
                  <div style={{ textAlign: 'center', color: '#666', padding: '30px', fontStyle: 'italic', fontSize: '0.8rem' }}>
                    Aguardando seleção de partida...
                  </div>
                ) : (
                  <div className="gols-grid-responsive">
                    {[
                      { label: 'Acima 0.5', prob: stats.probOver05 },
                      { label: 'Abaixo 0.5', prob: 1 - stats.probOver05 },
                      { label: 'Casa Acima 0.5', prob: stats.probHomeOver05 },
                      { label: 'Casa Abaixo 0.5', prob: 1 - stats.probHomeOver05 },

                      { label: 'Acima 1.5', prob: stats.probOver15 },
                      { label: 'Abaixo 1.5', prob: 1 - stats.probOver15 },
                      { label: 'Casa Acima 1.5', prob: stats.probHomeOver15 },
                      { label: 'Casa Abaixo 1.5', prob: 1 - stats.probHomeOver15 },

                      { label: 'Acima 2.5', prob: stats.probOver25 },
                      { label: 'Abaixo 2.5', prob: 1 - stats.probOver25 },
                      { label: 'Casa Acima 2.5', prob: stats.probHomeOver25 },
                      { label: 'Casa Abaixo 2.5', prob: 1 - stats.probHomeOver25 },

                      { label: 'Acima 3.5', prob: stats.probOver35 },
                      { label: 'Abaixo 3.5', prob: 1 - stats.probOver35 },
                      { label: 'Fora Acima 0.5', prob: stats.probAwayOver05 },
                      { label: 'Fora Abaixo 0.5', prob: 1 - stats.probAwayOver05 },

                      { label: 'Acima 4.5', prob: stats.probOver45 },
                      { label: 'Abaixo 4.5', prob: 1 - stats.probOver45 },
                      { label: 'Fora Acima 1.5', prob: stats.probAwayOver15 },
                      { label: 'Fora Abaixo 1.5', prob: 1 - stats.probAwayOver15 },

                      { label: 'Ambos Marcam (Sim)', prob: stats.probBtts },
                      { label: 'Ambos Marcam (Não)', prob: 1 - stats.probBtts },
                      { label: 'Fora Acima 2.5', prob: stats.probAwayOver25 },
                      { label: 'Fora Abaixo 2.5', prob: 1 - stats.probAwayOver25 }
                    ].map((item, idx) => {
                      const oddVal = getOdd(item.prob);
                      const bookInfo = getBookmakerOdds(oddVal, `${homeTeam || 'Casa'}_${awayTeam || 'Visitante'}_Gols_${item.label}`);
                      const finalOdd = bookInfo.best ? bookInfo.best.odd.toFixed(2) : oddVal;

                      const isSelected = selectedSelections.some(s => s.market === 'Gols' && s.label === item.label);
                      const isHottest = hottestGoal === item.label;
                      return (
                        <div 
                          key={idx} 
                          onClick={() => handleToggleSelection('Gols', item.label, item.prob, oddVal, `${homeTeam || 'Casa'}_${awayTeam || 'Visitante'}_Gols_${item.label}`)}
                          style={{ 
                            background: isSelected ? 'rgba(204, 255, 0, 0.15)' : 'transparent', 
                            border: isSelected 
                              ? '1.5px solid var(--brand-neon)' 
                              : isHottest 
                                ? '1.5px solid #00ffaa' 
                                : '1px solid #333', 
                            padding: '6px 2px', 
                            borderRadius: '6px', 
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: isHottest ? '0 0 6px rgba(0, 255, 170, 0.3)' : 'none'
                          }}
                        >
                          <div style={{ color: '#aaa', fontSize: '0.66rem', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.label}>
                            {item.label}
                          </div>
                          <strong style={{ fontSize: '0.82rem', display: 'block' }}>{getPct(item.prob)}%</strong>
                          <div style={{ fontSize: '0.66rem', color: '#ff9800', fontWeight: 'bold' }}>@{finalOdd}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Card 3: Previsão de Cartões */}
              <div className="glass-panel" style={{ borderTop: '4px solid #ff5722', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                  🟨 Previsão de Cartões
                </h2>
                {(() => {
                  const cardMarkets = [
                    { label: 'Total Amarelos Acima 3.5', prob: cardsPrediction.probYellowOver35 },
                    { label: 'Total Amarelos Acima 4.5', prob: cardsPrediction.probYellowOver45 },
                    { label: 'Total Amarelos Acima 5.5', prob: cardsPrediction.probYellowOver55 },
                    { label: 'Cartão Vermelho (Sim)', prob: Number(cardsPrediction.redCardProb) / 100 }
                  ];
                  cardMarkets.sort((a, b) => b.prob - a.prob);
                  const hottestCardMarket = cardMarkets[0]?.label;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Amarelos compactos */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <div style={{ 
                          background: '#ffd600', 
                          width: '28px', 
                          height: '38px', 
                          borderRadius: '4px', 
                          boxShadow: '0 0 8px rgba(255, 214, 0, 0.2)', 
                          display: 'flex', 
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          flexShrink: 0
                        }}>🟨</div>
                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                          {[
                            { label: 'Acima 3.5', prob: cardsPrediction.probYellowOver35 },
                            { label: 'Acima 4.5', prob: cardsPrediction.probYellowOver45 },
                            { label: 'Acima 5.5', prob: cardsPrediction.probYellowOver55 }
                          ].map((line, idx) => {
                            const marketLabel = `Total Amarelos ${line.label}`;
                            const rawOdd = getOdd(line.prob);
                            const bookInfo = getBookmakerOdds(rawOdd, `${homeTeam || 'Casa'}_${awayTeam || 'Visitante'}_Yellows_${marketLabel}`);
                            const finalOdd = bookInfo.best ? bookInfo.best.odd.toFixed(2) : rawOdd;
                            const isSelected = selectedSelections.some(s => s.market === 'Cartões' && s.label === marketLabel);
                            const isHottest = hottestCardMarket === marketLabel;

                            return (
                              <div 
                                key={idx}
                                onClick={() => handleToggleSelection('Cartões', marketLabel, line.prob, rawOdd, `${homeTeam || 'Casa'}_${awayTeam || 'Visitante'}_Yellows_${marketLabel}`)}
                                style={{
                                  background: isSelected ? 'rgba(204, 255, 0, 0.15)' : 'transparent',
                                  border: isSelected 
                                    ? '1.5px solid var(--brand-neon)' 
                                    : isHottest 
                                      ? '1.5px solid #00ffaa' 
                                      : '1px solid #333',
                                  borderRadius: '6px',
                                  padding: '5px 2px',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  boxShadow: isHottest ? '0 0 6px rgba(0, 255, 170, 0.3)' : 'none'
                                }}
                              >
                                <div style={{ fontSize: '0.58rem', color: '#aaa' }}>{line.label}</div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 'bold' }}>{getPct(line.prob)}%</div>
                                <div style={{ fontSize: '0.58rem', color: '#ff9800', fontWeight: 'bold' }}>@{finalOdd}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {/* Vermelho - mesmo modelo do amarelo */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <div style={{ 
                          background: '#ff3f3f', 
                          width: '28px', 
                          height: '38px', 
                          borderRadius: '4px', 
                          boxShadow: '0 0 8px rgba(255, 63, 63, 0.3)', 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          flexShrink: 0
                        }}>🟥</div>
                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                          {[
                            { label: 'Vermelho (Sim)', prob: Number(cardsPrediction.redCardProb) / 100, marketLabel: 'Cartão Vermelho (Sim)' },
                            { label: 'Vermelho (Não)', prob: 1 - Number(cardsPrediction.redCardProb) / 100, marketLabel: 'Cartão Vermelho (Não)' },
                            { label: `Risco: ${Number(cardsPrediction.redCardProb) > 25 ? 'Alto' : 'Mod.'}`, prob: null, marketLabel: null }
                          ].map((line, idx) => {
                            if (line.prob === null) {
                              return (
                                <div key={idx} style={{ borderRadius: '6px', padding: '3px 2px', textAlign: 'center', border: '1px solid #333', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                  <div style={{ fontSize: '0.58rem', color: Number(cardsPrediction.redCardProb) > 25 ? '#ff4b4b' : '#aaa', fontWeight: 'bold' }}>{line.label}</div>
                                  <div style={{ fontSize: '0.72rem', fontWeight: 'bold', color: Number(cardsPrediction.redCardProb) > 25 ? '#ff4b4b' : '#aaa' }}>{Number(cardsPrediction.redCardProb) > 25 ? '⚠️' : '✔️'}</div>
                                </div>
                              );
                            }
                            const rawOdd = getOdd(line.prob);
                            const bookInfo = getBookmakerOdds(rawOdd, `${homeTeam || 'Casa'}_${awayTeam || 'Visitante'}_Red_${line.marketLabel}`);
                            const finalOdd = bookInfo.best ? bookInfo.best.odd.toFixed(2) : rawOdd;
                            const isSelected = selectedSelections.some(s => s.market === 'Cartões' && s.label === line.marketLabel);
                            const isHottest = hottestCardMarket === line.marketLabel;

                            return (
                              <div 
                                key={idx}
                                onClick={() => handleToggleSelection('Cartões', line.marketLabel, line.prob, rawOdd, `${homeTeam || 'Casa'}_${awayTeam || 'Visitante'}_Red_${line.marketLabel}`)}
                                style={{
                                  background: isSelected ? 'rgba(204, 255, 0, 0.15)' : 'transparent',
                                  border: isSelected ? '1.5px solid var(--brand-neon)' : isHottest ? '1.5px solid #00ffaa' : '1px solid #333',
                                  borderRadius: '6px', padding: '5px 2px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                                  boxShadow: isHottest ? '0 0 6px rgba(0, 255, 170, 0.3)' : 'none'
                                }}
                              >
                                <div style={{ fontSize: '0.58rem', color: '#aaa' }}>{line.label}</div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 'bold' }}>{getPct(line.prob)}%</div>
                                <div style={{ fontSize: '0.58rem', color: '#ff9800', fontWeight: 'bold' }}>@{finalOdd}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Card 4: Resultados Exatos */}
              <div className="glass-panel" style={{ borderTop: '4px solid #b339ff', padding: '14px' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                  <Activity size={16} color="#b339ff" /> Resultados Exatos (Top 30)
                </h2>
                {!homeTeam || !awayTeam ? (
                  <div style={{ textAlign: 'center', color: '#666', padding: '30px', fontStyle: 'italic', fontSize: '0.8rem' }}>
                    Aguardando seleção de partida...
                  </div>
                ) : (
                  <div className="exatos-grid-responsive">
                    {(() => {
                      let flatScores = [];
                      for (let h = 0; h <= 5; h++) {
                        for (let a = 0; a <= 5; a++) {
                          flatScores.push({ score: `${h}x${a}`, prob: stats.scoreMatrix[h][a] });
                        }
                      }
                      flatScores.sort((a, b) => b.prob - a.prob);
                      
                      return flatScores.slice(0, 30).map((item, i) => {
                        const intensity = Math.min(1, item.prob * 5); 
                        const isSelected = selectedSelections.some(s => s.market === 'Resultados Exatos' && s.label === `Placar ${item.score}`);
                        const isHottest = i === 0;
                        const bg = isSelected 
                          ? 'rgba(204, 255, 0, 0.25)' 
                          : `rgba(0, 255, 170, ${intensity * 0.45})`;

                        const rawOdd = getOdd(item.prob);
                        const bookInfo = getBookmakerOdds(rawOdd, `${homeTeam || 'Casa'}_${awayTeam || 'Visitante'}_Exatos_Placar ${item.score}`);
                        const displayOdd = bookInfo.best ? bookInfo.best.odd.toFixed(2) : rawOdd;

                        return (
                          <div 
                            key={i} 
                            onClick={() => handleToggleSelection('Resultados Exatos', `Placar ${item.score}`, item.prob, rawOdd, `${homeTeam || 'Casa'}_${awayTeam || 'Visitante'}_Exatos_Placar ${item.score}`)}
                            style={{ 
                              background: bg, 
                              border: isSelected 
                                ? '1.5px solid var(--brand-neon)' 
                                : isHottest 
                                  ? '1.5px solid #00ffaa' 
                                  : '1px solid #333', 
                              borderRadius: '6px', 
                              padding: '4px 1px', 
                              textAlign: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              boxShadow: isHottest ? '0 0 6px rgba(0, 255, 170, 0.4)' : 'none'
                            }}
                          >
                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{item.score}</div>
                            <div style={{ fontSize: '0.62rem', color: isSelected ? '#fff' : '#aaa' }}>{getPct(item.prob)}%</div>
                            <div style={{ fontSize: '0.55rem', color: '#ff9800', fontWeight: 'bold' }}>@{displayOdd}</div>
                          </div>
                        )
                      });
                    })()}
                  </div>
                )}
              </div>

              {/* Card 5: Árbitro e Disciplina */}
              <div className="glass-panel" style={{ borderTop: '4px solid #00d2ff', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                  <Award size={16} color="#00d2ff" /> Árbitro e Disciplina
                </h2>
                {!homeTeam || !awayTeam ? (
                  <div style={{ textAlign: 'center', color: '#666', padding: '30px', fontStyle: 'italic', fontSize: '0.8rem' }}>
                    Aguardando seleção de partida...
                  </div>
                ) : (
                  <>
                    <select 
                      value={selectedRefIndex} 
                      onChange={(e) => setSelectedRefIndex(Number(e.target.value))}
                      style={{ width: '100%', background: '#1c1c24', border: '1px solid #333', color: '#fff', padding: '6px 8px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold', appearance: 'auto', marginBottom: '8px' }}
                    >
                      {REFEREES.map((ref, idx) => (
                        <option key={idx} value={idx}>{ref.name} ({ref.strictness})</option>
                      ))}
                    </select>
                    <div className="ref-stats-grid-responsive">
                      <div style={{ background: '#141419', padding: '6px 4px', borderRadius: '6px', border: '1px solid #222', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.55rem', color: '#888' }}>Amarelos</div>
                        <strong style={{ fontSize: '0.85rem', color: '#ffd600' }}>{selectedRef.yellows.toFixed(1)}</strong>
                      </div>
                      <div style={{ background: '#141419', padding: '6px 4px', borderRadius: '6px', border: '1px solid #222', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.55rem', color: '#888' }}>Vermelhos</div>
                        <strong style={{ fontSize: '0.85rem', color: '#ff4d4d' }}>{selectedRef.reds.toFixed(2)}</strong>
                      </div>
                      <div style={{ background: '#141419', padding: '6px 4px', borderRadius: '6px', border: '1px solid #222', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.55rem', color: '#888' }}>Pênaltis</div>
                        <strong style={{ fontSize: '0.85rem', color: '#00d2ff' }}>{selectedRef.penalties.toFixed(2)}</strong>
                      </div>
                      <div style={{ background: '#141419', padding: '6px 4px', borderRadius: '6px', border: '1px solid #222', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.55rem', color: '#888' }}>Rigor</div>
                        <strong style={{ fontSize: '0.75rem', color: selectedRef.strictness === 'Muito Alto' ? '#ff4d4d' : selectedRef.strictness === 'Alto' ? '#ff9800' : selectedRef.strictness === 'Médio' ? '#00d2ff' : '#4CAF50' }}>{selectedRef.strictness}</strong>
                      </div>
                    </div>
                  </>
                )}
              </div>

            </div>

          </div>
      )}

        {/* Espaçador entre grids */}
        <div style={{ height: '16px' }}></div>
      </div>

      {/* PAINEL DE CUPOM DE APOSTAS */}
      {selectedSelections.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          width: '310px',
          maxHeight: '410px',
          background: '#141419',
          border: '2px solid var(--brand-neon)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideDown 0.3s ease-out',
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out'
        }} className="bet-slip-panel">
          <div 
            onMouseDown={(e) => {
              if (e.button !== 0 || e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
              setIsDragging(true);
              setDragStart({
                x: e.clientX - position.x,
                y: e.clientY - position.y
              });
            }}
            style={{ 
              background: '#1c1c24', 
              padding: '12px 16px', 
              borderBottom: '1px solid #333', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={16} color="var(--brand-neon)" />
              <strong style={{ fontSize: '0.85rem', color: '#fff' }}>Criador de Aposta ({selectedSelections.length})</strong>
            </div>
            <button 
              onClick={() => { setSelectedSelections([]); setGlobalBookmaker("Best"); setPosition({ x: 0, y: 0 }); }}
              style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
            >
              Limpar
            </button>
          </div>

          <div style={{ padding: '14px', background: '#1c1c24', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }} className="no-scrollbar">
            {(() => {
              const totalOdd = selectedSelections.reduce((acc, s) => acc * Number(s.odd), 1).toFixed(2);
              const totalProb = selectedSelections.reduce((acc, s) => acc * s.prob, 1);
              return (
                <>
                  {/* Odd Combinada e Probabilidade na mesma linha horizontal */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '1 1 auto' }}>
                      <span style={{ color: '#aaa', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Odd:</span>
                      <span style={{ color: '#ff9800', fontWeight: 'bold', fontSize: '0.85rem' }}>@</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={customOdd !== "" ? customOdd : totalOdd} 
                        onChange={(e) => setCustomOdd(e.target.value)} 
                        style={{
                          background: '#141419',
                          border: '1px solid #333',
                          color: '#ff9800',
                          borderRadius: '6px',
                          padding: '4px 6px',
                          fontSize: '0.85rem',
                          outline: 'none',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          width: '75px'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <span style={{ color: '#aaa', fontSize: '0.75rem' }}>Probabilidade:</span>
                      <strong style={{ color: 'var(--brand-neon)', fontSize: '0.85rem' }}>{(totalProb * 100).toFixed(1)}%</strong>
                    </div>
                  </div>

                  {/* Stake e Casa de Aposta Selecionável */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '2px', justifyContent: 'space-between' }}>
                    {/* Stake Input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#aaa', whiteSpace: 'nowrap' }}>Stake (R$):</span>
                      <input 
                        type="number" 
                        placeholder="100" 
                        value={betStake}
                        onChange={(e) => setBetStake(e.target.value)}
                        style={{
                          width: '70px',
                          background: '#141419',
                          border: '1px solid #333',
                          color: '#fff',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          fontSize: '0.85rem',
                          outline: 'none',
                          textAlign: 'right',
                          fontWeight: 'bold'
                        }}
                      />
                    </div>
                    {/* Casa de Aposta Select */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                      <span style={{ fontSize: '0.72rem', color: '#aaa', whiteSpace: 'nowrap' }}>Casa:</span>
                      <select
                        value={globalBookmaker}
                        onChange={(e) => handleGlobalBookmakerChange(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#141419',
                          border: '1px solid #333',
                          color: 
                            globalBookmaker === 'Bet365' ? '#4caf50' :
                            globalBookmaker === 'Betano' ? '#ff9800' :
                            globalBookmaker === 'Betfair' ? '#ffb300' :
                            globalBookmaker === '1xBet' ? '#00d2ff' :
                            globalBookmaker === 'KTO' ? '#ff4d4d' :
                            'var(--brand-neon)',
                          borderRadius: '6px',
                          padding: '6px 4px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          outline: 'none',
                          cursor: 'pointer',
                          appearance: 'auto'
                        }}
                      >
                        <option value="Best" style={{ color: 'var(--brand-neon)', background: '#141419' }}>🏆 Melhor</option>
                        <option value="Bet365" style={{ color: '#4caf50', background: '#141419' }}>🟢 Bet365</option>
                        <option value="Betano" style={{ color: '#ff9800', background: '#141419' }}>🟠 Betano</option>
                        <option value="Betfair" style={{ color: '#ffb300', background: '#141419' }}>🟡 Betfair</option>
                        <option value="1xBet" style={{ color: '#00d2ff', background: '#141419' }}>🔵 1xBet</option>
                        <option value="KTO" style={{ color: '#ff4d4d', background: '#141419' }}>🔴 KTO</option>
                      </select>
                    </div>
                  </div>

                  {/* Botão Salvar abaixo deles */}
                  <button 
                    onClick={() => handleSaveCustomBet(customOdd !== "" ? customOdd : totalOdd, totalProb)}
                    style={{
                      background: 'var(--brand-neon)',
                      color: '#000',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'opacity 0.2s',
                      width: '100%',
                      marginTop: '4px'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    Salvar Aposta
                  </button>

                  {/* Card "Aposta sendo montada" abaixo, com possibilidade de excluir as apostas dentro dele */}
                  <div style={{ 
                    background: 'rgba(204, 255, 0, 0.04)', 
                    border: '1.5px dashed var(--brand-neon)', 
                    borderRadius: '8px', 
                    padding: '10px 12px', 
                    color: '#fff',
                    fontFamily: 'monospace',
                    marginTop: '6px',
                    maxHeight: '160px',
                    overflowY: 'auto'
                  }} className="no-scrollbar">
                    <div style={{ color: 'var(--brand-neon)', fontSize: '0.62rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '1.5px' }}>
                      🎫 Aposta sendo montada:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                      {selectedSelections.map((sel, idx) => (
                        <div key={idx} style={{ 
                          background: 'rgba(255, 255, 255, 0.04)', 
                          border: '1px solid rgba(255, 255, 255, 0.08)', 
                          borderRadius: '6px', 
                          padding: '4px 8px', 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center', 
                          fontSize: '0.72rem',
                          gap: '6px'
                        }}>
                          <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.55rem', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>{sel.market}</span>
                            <span style={{ color: '#fff', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sel.label}>{sel.label}</span>
                            <span style={{ fontSize: '0.58rem', color: 'var(--brand-neon)' }}>{sel.match}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <strong style={{ color: '#ff9800' }}>@{sel.odd}</strong>
                            <button 
                              onClick={() => setSelectedSelections(selectedSelections.filter(s => s.id !== sel.id))}
                              style={{ background: 'transparent', border: 'none', color: '#ff4b4b', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', padding: '2px 4px' }}
                              title="Excluir"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#1c1c24',
          border: '1.5px solid var(--brand-neon)',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          zIndex: 10000,
          fontSize: '0.85rem',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} color="var(--brand-neon)" />
          {toastMessage}
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .calculator-initial-layout {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }
        @media (min-width: 950px) {
          .calculator-initial-layout {
            display: grid;
            grid-template-columns: 380px 1fr;
            gap: 16px;
          }
        }
        @media (max-width: 950px) {
          .bet-slip-panel {
            right: 0 !important;
            left: 0 !important;
            top: 60px !important;
            bottom: auto !important;
            width: 100% !important;
            max-height: 320px !important;
            border-radius: 0 0 12px 12px !important;
            border-left: none !important;
            border-right: none !important;
            border-top: none !important;
            border-bottom: 2px solid var(--brand-neon) !important;
            animation: slideDown 0.3s ease-out !important;
            transform: none !important;
          }
        }

        /* Novas Classes de Layout Responsivo (Linhas Horizontais) */
        .calculator-layout-v2 {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }
        .calculator-row-1 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        .calculator-row-2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        .calculator-row-3 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        @media (min-width: 768px) {
          .calculator-row-1 {
            grid-template-columns: 1fr 1fr;
          }
          .calculator-row-2 {
            grid-template-columns: 1fr 1fr;
          }
          .calculator-row-3 {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .calculator-row-1 {
            grid-template-columns: 4.2fr 5.8fr;
          }
          .calculator-row-3 {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (min-width: 1280px) {
          .calculator-row-3 {
            grid-template-columns: repeat(5, 1fr);
          }
        }

        /* Estilos do card de palpites importados */
        .palpites-scroll-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        @media (min-width: 1300px) {
          .palpites-scroll-container {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 16px !important;
          }
        }

        .game-card-grid {
          display: grid;
          grid-template-columns: 310px 1.1fr 1.1fr 240px;
          gap: 16px;
          padding: 16px 20px;
          align-items: start;
        }
        
        .team-name {
          font-weight: bold;
          font-size: 0.9rem;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 120px;
        }
        
        .score-radar-container {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .protection-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 200px;
        }
        
        .projections-column {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        @media (min-width: 1300px) {
          .game-card-grid {
            display: grid !important;
            grid-template-columns: 1.4fr 0.9fr 1.1fr 1.2fr !important;
            grid-template-rows: auto !important;
            gap: 12px !important;
            padding: 12px 14px !important;
            align-items: start !important;
            height: auto !important;
            min-height: 155px !important;
          }
          
          .game-card-grid > div {
            grid-column: auto !important;
            grid-row: auto !important;
            display: flex !important;
            flex-direction: column !important;
            border-top: none !important;
            padding-top: 0 !important;
            height: auto !important;
            min-height: min-content !important;
          }
          
          .team-name {
            max-width: 70px !important;
            font-size: 0.78rem !important;
          }
          
          .score-radar-container {
            flex-direction: row !important;
            gap: 4px !important;
          }
          
          .protection-text {
            max-width: 110px !important;
            font-size: 0.68rem !important;
          }
        }
        
        @media (max-width: 1299px) and (min-width: 900px) {
          .game-card-grid {
            grid-template-columns: 310px 1.1fr 1.1fr 240px !important;
            gap: 16px !important;
            padding: 16px 20px !important;
          }
        }
        
        @media (max-width: 899px) and (min-width: 650px) {
          .game-card-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 16px !important;
            padding: 12px 16px !important;
          }
          
          .game-card-grid > div:nth-child(1),
          .game-card-grid > div:nth-child(2),
          .game-card-grid > div:nth-child(3),
          .game-card-grid > div:nth-child(4) {
            grid-column: auto !important;
            grid-row: auto !important;
            border-top: none !important;
            padding-top: 0 !important;
            display: flex !important;
            flex-direction: column !important;
          }
          
          .score-radar-container {
            flex-direction: column !important;
            gap: 4px !important;
          }
        }
        
        @media (max-width: 649px) {
          .game-card-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
            padding: 12px 10px !important;
          }
          
          .game-card-grid > div:nth-child(1),
          .game-card-grid > div:nth-child(2),
          .game-card-grid > div:nth-child(3),
          .game-card-grid > div:nth-child(4) {
            grid-column: auto !important;
            grid-row: auto !important;
            border-top: none !important;
            padding-top: 0 !important;
            display: flex !important;
            flex-direction: column !important;
          }
          
          .team-name {
            max-width: 75px !important;
          }
        }
      `}</style>
    </div>
  );
}
