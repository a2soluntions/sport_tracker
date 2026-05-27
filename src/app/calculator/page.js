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
  Trophy
} from 'lucide-react';

const factorial = (n) => {
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
};

const getPoissonProbability = (lam, k) => {
  return (Math.exp(-lam) * Math.pow(lam, k)) / factorial(k);
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

const getPlayersForTeam = (teamName, isHome) => {
  return [
    { name: 'Jogador 1 (Atacante)', weight: 0.38, role: 'Atacante' },
    { name: 'Jogador 2 (Atacante)', weight: 0.30, role: 'Atacante' },
    { name: 'Jogador 3 (Meia/Defensor)', weight: 0.20, role: 'Meio-Campo' }
  ];
};

export default function CalculatorPage() {
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [homeTeamId, setHomeTeamId] = useState(null);
  const [awayTeamId, setAwayTeamId] = useState(null);
  const [matchDate, setMatchDate] = useState("");
  const [selectedGameId, setSelectedGameId] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("71");
  
  const [homeXG, setHomeXG] = useState("");
  const [awayXG, setAwayXG] = useState("");

  const [selectedSelections, setSelectedSelections] = useState([]);
  const [betStake, setBetStake] = useState("100");
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const handleToggleSelection = (market, label, prob, odd) => {
    const matchName = `${homeTeam || "Casa"} x ${awayTeam || "Visitante"}`;
    const id = `${matchName}_${market}_${label}`;
    
    setSelectedSelections(prev => {
      const exists = prev.some(s => s.id === id);
      if (exists) {
        return prev.filter(s => s.id !== id);
      } else {
        return [...prev, { id, match: matchName, market, label, prob, odd }];
      }
    });
  };

  const handleSaveCustomBet = (totalOdd, totalProb) => {
    if (selectedSelections.length === 0) return;
    const stakeVal = betStake === "" ? 100 : Number(betStake);

    const newCustomBet = {
      id: Date.now(),
      date: new Date().toISOString(),
      matchDate: matchDate || new Date().toISOString(),
      home: homeTeam || "Casa",
      away: awayTeam || "Visitante",
      selections: selectedSelections.map(s => ({
        market: s.market,
        label: s.label,
        prob: s.prob,
        odd: s.odd
      })),
      totalOdd: Number(totalOdd),
      totalProb: Number(totalProb),
      stake: stakeVal,
      status: 'pendente'
    };

    const saved = localStorage.getItem('ev_tracker_custom_bets');
    let list = [];
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch (e) {}
    }
    list = [newCustomBet, ...list];
    localStorage.setItem('ev_tracker_custom_bets', JSON.stringify(list));

    setSelectedSelections([]);
    triggerToast("Aposta salva! Veja na aba de Palpites.");
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
    setHomePlayersList([]);
    if (homeTeam) {
      setLoadingHomeSquad(true);
      const url = homeTeamId 
        ? `/api/football/squads?teamId=${homeTeamId}`
        : `/api/football/squads?team=${encodeURIComponent(homeTeam)}`;
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.players) {
            setHomeSquad(data.players);
          }
          setLoadingHomeSquad(false);
        }).catch(() => setLoadingHomeSquad(false));
    } else {
      setHomeSquad([]);
    }
  }, [homeTeam]);

  useEffect(() => {
    setAwayPlayersList([]);
    if (awayTeam) {
      setLoadingAwaySquad(true);
      const url = awayTeamId 
        ? `/api/football/squads?teamId=${awayTeamId}`
        : `/api/football/squads?team=${encodeURIComponent(awayTeam)}`;
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.players) {
            setAwaySquad(data.players);
          }
          setLoadingAwaySquad(false);
        }).catch(() => setLoadingAwaySquad(false));
    } else {
      setAwaySquad([]);
    }
  }, [awayTeam]);

  useEffect(() => {
    // Carregar jogos da rodada
    setLoadingGames(true);
    fetch(`/api/football/fixtures?league=${selectedLeague}&all=true`)
      .then(res => res.json())
      .then(data => {
        if (data && data.fixtures) {
          setGames(data.fixtures);
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
  }, [selectedLeague]);

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
      { label: 'Over 0.5', prob: stats.probOver05 },
      { label: 'Under 0.5', prob: 1 - stats.probOver05 },
      { label: 'Casa Over 0.5', prob: stats.probHomeOver05 },
      { label: 'Casa Under 0.5', prob: 1 - stats.probHomeOver05 },
      { label: 'Over 1.5', prob: stats.probOver15 },
      { label: 'Under 1.5', prob: 1 - stats.probOver15 },
      { label: 'Casa Over 1.5', prob: stats.probHomeOver15 },
      { label: 'Casa Under 1.5', prob: 1 - stats.probHomeOver15 },
      { label: 'Over 2.5', prob: stats.probOver25 },
      { label: 'Under 2.5', prob: 1 - stats.probOver25 },
      { label: 'Casa Over 2.5', prob: stats.probHomeOver25 },
      { label: 'Casa Under 2.5', prob: 1 - stats.probHomeOver25 },
      { label: 'Over 3.5', prob: stats.probOver35 },
      { label: 'Under 3.5', prob: 1 - stats.probOver35 },
      { label: 'Fora Over 0.5', prob: stats.probAwayOver05 },
      { label: 'Fora Under 0.5', prob: 1 - stats.probAwayOver05 },
      { label: 'Over 4.5', prob: stats.probOver45 },
      { label: 'Under 4.5', prob: 1 - stats.probOver45 },
      { label: 'Fora Over 1.5', prob: stats.probAwayOver15 },
      { label: 'Fora Under 1.5', prob: 1 - stats.probAwayOver15 },
      { label: 'BTTS (Sim)', prob: stats.probBtts },
      { label: 'BTTS (Não)', prob: 1 - stats.probBtts },
      { label: 'Fora Over 2.5', prob: stats.probAwayOver25 },
      { label: 'Fora Under 2.5', prob: 1 - stats.probAwayOver25 }
    ];
    markets.sort((a, b) => b.prob - a.prob);
    return markets[0].label;
  }, [stats]);

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

  return (
    <div className="calculator-container">
      
      {/* PAINEL FIXO NO TOPO */}
      <div style={{ flex: '0 0 auto', background: '#000', paddingBottom: '12px', zIndex: 10 }}>
        
        <header style={{ marginBottom: '12px', paddingTop: '12px' }}>
          <h1 className="page-title">
            <Calculator color="var(--brand-neon)" size={28} />
            Análise Profissional
          </h1>
          <p style={{ color: '#888', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
            Simule dados de gols, marcadores, cartões e arbitragem para obter prognósticos avançados e estatísticas de EV+.
          </p>
        </header>

        {/* 4 COLUNAS: CONFIG, 1X2, GOLS, HEATMAP */}
        <div className="calculator-top-grid">
          
          {/* COLUNA 1: Setup do Jogo */}
          <div className="glass-panel" style={{ borderTop: '4px solid #00d2ff', display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px' }}>
            <h2 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 'bold' }}>
              <Target size={16} color="#00d2ff" /> Setup do Jogo
            </h2>
            
            {/* Seletor de Liga */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Selecionar Liga:
              </label>
              <select
                value={selectedLeague}
                onChange={(e) => {
                  setSelectedLeague(e.target.value);
                  setSelectedGameId("");
                  setHomeTeam("");
                  setAwayTeam("");
                }}
                style={{ width: '100%', background: '#1c1c24', border: '1px solid #333', color: '#fff', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', appearance: 'auto' }}
              >
                <option value="71">🇧🇷 Brasileirão Série A</option>
                <option value="72">🇧🇷 Brasileirão Série B</option>
                <option value="13">🌎 Copa Libertadores</option>
                <option value="39">🇬🇧 Premier League</option>
                <option value="140">🇪🇸 La Liga</option>
                <option value="135">🇮🇹 Serie A (Itália)</option>
                <option value="78">🇩🇪 Bundesliga</option>
              </select>
            </div>

            {/* Seletor rápido de jogos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Selecionar Partida:
              </label>
              {loadingGames ? (
                <div style={{ fontSize: '0.75rem', color: '#555', fontStyle: 'italic' }}>Buscando partidas...</div>
              ) : games.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: '#888', fontStyle: 'italic' }}>Nenhum jogo nesta rodada.</div>
              ) : (
                <select 
                  onChange={(e) => {
                    const selectedId = Number(e.target.value);
                    const game = games.find(g => g.id === selectedId);
                    if (game) {
                      handleSelectGame(game);
                    }
                  }}
                  value={selectedGameId}
                  style={{ width: '100%', background: '#1c1c24', border: '1px solid #333', color: 'var(--brand-neon)', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', appearance: 'auto' }}
                >
                  <option value="" disabled>-- Selecione uma Partida --</option>
                  {games.map(g => (
                    <option key={g.id} value={g.id}>{g.home} x {g.away} ({g.date.split(' • ')[0]})</option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ 
              fontSize: '0.75rem', 
              color: selectedGameId ? '#888' : 'transparent', 
              textAlign: 'center', 
              marginTop: '4px',
              minHeight: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {selectedGameId ? (
                <span>Data do Jogo: {new Date(matchDate).toLocaleDateString('pt-BR')}</span>
              ) : (
                <span>&nbsp;</span>
              )}
            </div>

            {/* Nome dos Times (Editável) e xG */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  placeholder="Time Casa" 
                  value={homeTeam} 
                  onChange={(e) => setHomeTeam(e.target.value)} 
                  style={{ flex: 1, background: '#1c1c24', border: '1px solid #333', color: '#fff', padding: '6px 10px', borderRadius: '6px', fontSize: '0.8rem', outline: 'none' }}
                />
                <input 
                  type="number" 
                  step="0.1" 
                  min="0" 
                  value={homeXG} 
                  onChange={(e) => setHomeXG(Number(e.target.value))} 
                  style={{ width: '55px', background: '#1c1c24', border: '1px solid #333', color: '#fff', padding: '6px', borderRadius: '6px', fontSize: '0.9rem', textAlign: 'center', fontWeight: 'bold', outline: 'none' }} 
                  title="xG Mandante"
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  placeholder="Time Visitante" 
                  value={awayTeam} 
                  onChange={(e) => setAwayTeam(e.target.value)} 
                  style={{ flex: 1, background: '#1c1c24', border: '1px solid #333', color: '#fff', padding: '6px 10px', borderRadius: '6px', fontSize: '0.8rem', outline: 'none' }}
                />
                <input 
                  type="number" 
                  step="0.1" 
                  min="0" 
                  value={awayXG} 
                  onChange={(e) => setAwayXG(Number(e.target.value))} 
                  style={{ width: '55px', background: '#1c1c24', border: '1px solid #333', color: '#fff', padding: '6px', borderRadius: '6px', fontSize: '0.9rem', textAlign: 'center', fontWeight: 'bold', outline: 'none' }} 
                  title="xG Visitante"
                />
              </div>
            </div>
          </div>

          {/* COLUNA 2: Mercado 1X2 */}
          <div className="glass-panel" style={{ borderTop: '4px solid var(--brand-neon)', padding: '14px' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
              <Activity size={16} color="var(--brand-neon)" /> Mercado 1X2
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Casa Vence', key: 'Casa', prob: stats.probHome, odd: getOdd(stats.probHome), name: homeTeam || "Casa", color: 'var(--brand-neon)' },
                { label: 'Empate', key: 'Empate', prob: stats.probDraw, odd: getOdd(stats.probDraw), name: 'Empate', color: '#ffeb3b' },
                { label: 'Fora Vence', key: 'Visitante', prob: stats.probAway, odd: getOdd(stats.probAway), name: awayTeam || "Visitante", color: '#ff4b4b' }
              ].map((item, idx) => {
                const isSelected = selectedSelections.some(s => s.market === '1X2' && s.label === item.label);
                const isHottest = hottest1X2 === item.key;
                return (
                  <div 
                    key={idx}
                    onClick={() => handleToggleSelection('1X2', item.label, item.prob, item.odd)}
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
                      <span style={{ color: '#888', fontSize: '0.85rem' }}>@{item.odd}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUNA 3: Mercado de Gols */}
          <div className="glass-panel" style={{ borderTop: '4px solid #ff9800', padding: '14px' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
              <Info size={16} color="#ff9800" /> Mercado de Gols (Top 24)
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {[
                { label: 'Over 0.5', prob: stats.probOver05 },
                { label: 'Under 0.5', prob: 1 - stats.probOver05 },
                { label: 'Casa Over 0.5', prob: stats.probHomeOver05 },
                { label: 'Casa Under 0.5', prob: 1 - stats.probHomeOver05 },

                { label: 'Over 1.5', prob: stats.probOver15 },
                { label: 'Under 1.5', prob: 1 - stats.probOver15 },
                { label: 'Casa Over 1.5', prob: stats.probHomeOver15 },
                { label: 'Casa Under 1.5', prob: 1 - stats.probHomeOver15 },

                { label: 'Over 2.5', prob: stats.probOver25 },
                { label: 'Under 2.5', prob: 1 - stats.probOver25 },
                { label: 'Casa Over 2.5', prob: stats.probHomeOver25 },
                { label: 'Casa Under 2.5', prob: 1 - stats.probHomeOver25 },

                { label: 'Over 3.5', prob: stats.probOver35 },
                { label: 'Under 3.5', prob: 1 - stats.probOver35 },
                { label: 'Fora Over 0.5', prob: stats.probAwayOver05 },
                { label: 'Fora Under 0.5', prob: 1 - stats.probAwayOver05 },

                { label: 'Over 4.5', prob: stats.probOver45 },
                { label: 'Under 4.5', prob: 1 - stats.probOver45 },
                { label: 'Fora Over 1.5', prob: stats.probAwayOver15 },
                { label: 'Fora Under 1.5', prob: 1 - stats.probAwayOver15 },

                { label: 'BTTS (Sim)', prob: stats.probBtts },
                { label: 'BTTS (Não)', prob: 1 - stats.probBtts },
                { label: 'Fora Over 2.5', prob: stats.probAwayOver25 },
                { label: 'Fora Under 2.5', prob: 1 - stats.probAwayOver25 }
              ].map((item, idx) => {
                const isSelected = selectedSelections.some(s => s.market === 'Gols' && s.label === item.label);
                const isHottest = hottestGoal === item.label;
                const oddVal = getOdd(item.prob);
                return (
                  <div 
                    key={idx} 
                    onClick={() => handleToggleSelection('Gols', item.label, item.prob, oddVal)}
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
                    <div style={{ fontSize: '0.66rem', color: '#ff9800' }}>@{oddVal}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUNA 4: Heatmap Placar Exato */}
          <div className="glass-panel" style={{ borderTop: '4px solid #b339ff', padding: '14px' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
              <Activity size={16} color="#b339ff" /> Resultados Exatos (Top 30)
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
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
                  return (
                    <div 
                      key={i} 
                      onClick={() => handleToggleSelection('Resultados Exatos', `Placar ${item.score}`, item.prob, getOdd(item.prob))}
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
                    </div>
                  )
                });
              })()}
            </div>
          </div>

        </div>

        {/* Espaçador entre grids */}
        <div style={{ height: '16px' }}></div>
      </div>

      {/* SEÇÃO COM SCROLL: ANÁLISE PRO */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '4px', paddingBottom: '30px' }} className="no-scrollbar">
        <div className="calculator-bottom-grid">
          
          {/* COLUNA ESQUERDA: ANÁLISE DE JOGADORES */}
          <div className="glass-panel" style={{ borderLeft: '4px solid #ffeb3b', display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', overflow: 'hidden' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 'bold', color: '#fff' }}>
              <User size={18} color="#ffeb3b" /> Análise de Marcadores
            </h3>
            
            {/* COLUNAS DE JOGADORES LADO A LADO */}
            <div className="calculator-players-row" style={{ flex: 1, overflow: 'hidden' }}>
              
              {/* COLUNA CASA */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
                <div style={{ background: '#141419', padding: '12px', borderRadius: '8px', border: '1px solid #222' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--brand-neon)', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase' }}>
                    {homeTeam || 'Time Casa'}
                  </div>
                  <select
                    value=""
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const playerInfo = homeSquad.find(sq => sq.name === selectedName);
                      if (playerInfo && !homePlayersList.some(p => p.name === selectedName)) {
                        let newWeight = 0.15;
                        if (playerInfo.position === 'Attacker') newWeight = 0.35;
                        else if (playerInfo.position === 'Midfielder') newWeight = 0.22;
                        else if (playerInfo.position === 'Defender') newWeight = 0.08;
                        
                        setHomePlayersList([...homePlayersList, { name: selectedName, weight: newWeight, role: playerInfo.position }]);
                      }
                    }}
                    style={{ background: '#1c1c24', border: '1px solid #333', color: '#fff', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', width: '100%', outline: 'none', appearance: 'auto', cursor: 'pointer' }}
                  >
                    <option value="" disabled>+ Selecionar Jogador</option>
                    {homeSquad.map(sq => (
                      <option key={sq.id} value={sq.name}>{sq.name} ({sq.position === 'Attacker' ? 'ATA' : sq.position === 'Midfielder' ? 'MEI' : sq.position === 'Defender' ? 'DEF' : 'GOL'})</option>
                    ))}
                  </select>
                </div>

                {/* Lista Casa (Scrollável após 4) */}
                <div className="no-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', maxHeight: '250px', paddingRight: '4px' }}>
                  {homePlayersList.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#555', padding: '20px 10px', fontStyle: 'italic', fontSize: '0.75rem' }}>
                      Nenhum jogador do {homeTeam || 'Casa'} selecionado.
                    </div>
                  )}
                    {homePlayersList.map((p, idx) => {
                      const prob = calculatePlayerGoalProb(homeXG, p.weight);
                      const isAnytimeSelected = selectedSelections.some(s => s.market === 'Marcadores' && s.label === `${p.name} (Qualquer Momento)`);
                      const isFirstSelected = selectedSelections.some(s => s.market === 'Marcadores' && s.label === `${p.name} (Primeiro Gol)`);
                      const isHottestAnytime = hottestPlayerGoal && hottestPlayerGoal.name === p.name && hottestPlayerGoal.type === 'anytime' && hottestPlayerGoal.team === 'home';
                      return (
                        <div key={`h-${idx}`} style={{ background: '#141419', padding: '8px 12px', borderRadius: '8px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 120px' }}>
                            <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}>{p.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span style={{ fontSize: '0.65rem', background: '#222', padding: '2px 6px', borderRadius: '4px', color: '#aaa', fontWeight: 'bold' }}>{p.role === 'Attacker' ? 'ATA' : p.role === 'Midfielder' ? 'MEI' : p.role === 'Defender' ? 'DEF' : p.role || 'GOL'}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', textAlign: 'right', flexShrink: 0, alignItems: 'center' }}>
                            <div 
                              onClick={() => handleToggleSelection('Marcadores', `${p.name} (Qualquer Momento)`, Number(prob.anytime)/100, prob.anytimeOdd)}
                              style={{ 
                                padding: '4px 6px', 
                                borderRadius: '6px', 
                                cursor: 'pointer', 
                                background: isAnytimeSelected ? 'rgba(204, 255, 0, 0.15)' : 'transparent',
                                border: isAnytimeSelected 
                                  ? '1.5px solid var(--brand-neon)' 
                                  : isHottestAnytime 
                                    ? '1.5px solid #00ffaa' 
                                    : '1px solid transparent',
                                transition: 'all 0.2s',
                                boxShadow: isHottestAnytime ? '0 0 6px rgba(0, 255, 170, 0.3)' : 'none'
                              }}
                            >
                              <div style={{ fontSize: '0.65rem', color: '#888' }}>Anytime</div>
                              <strong style={{ color: '#fff', fontSize: '0.8rem' }}>{prob.anytime}% <span style={{ color: '#ff9800', fontSize: '0.75rem', display: 'block' }}>@{prob.anytimeOdd}</span></strong>
                            </div>
                            <div 
                              onClick={() => handleToggleSelection('Marcadores', `${p.name} (Primeiro Gol)`, Number(prob.first)/100, prob.firstOdd)}
                              style={{ 
                                padding: '4px 6px', 
                                borderRadius: '6px', 
                                cursor: 'pointer', 
                                background: isFirstSelected ? 'rgba(204, 255, 0, 0.15)' : 'transparent',
                                border: isFirstSelected 
                                  ? '1.5px solid var(--brand-neon)' 
                                  : '1px solid transparent',
                                transition: 'all 0.2s'
                              }}
                            >
                              <div style={{ fontSize: '0.65rem', color: '#888' }}>Primeiro</div>
                              <strong style={{ color: '#aaa', fontSize: '0.8rem' }}>{prob.first}% <span style={{ color: '#ff9800', fontSize: '0.75rem', display: 'block' }}>@{prob.firstOdd}</span></strong>
                            </div>
                            <button 
                              onClick={() => setHomePlayersList(homePlayersList.filter((_, i) => i !== idx))}
                              style={{ background: 'transparent', border: 'none', color: '#ff4b4b', cursor: 'pointer', padding: '4px', fontSize: '1rem', marginLeft: '4px' }}
                              title="Remover"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* COLUNA VISITANTE */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
                <div style={{ background: '#141419', padding: '12px', borderRadius: '8px', border: '1px solid #222' }}>
                  <div style={{ fontSize: '0.75rem', color: '#ff4b4b', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase' }}>
                    {awayTeam || 'Time Visitante'}
                  </div>
                  <select
                    value=""
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const playerInfo = awaySquad.find(sq => sq.name === selectedName);
                      if (playerInfo && !awayPlayersList.some(p => p.name === selectedName)) {
                        let newWeight = 0.15;
                        if (playerInfo.position === 'Attacker') newWeight = 0.35;
                        else if (playerInfo.position === 'Midfielder') newWeight = 0.22;
                        else if (playerInfo.position === 'Defender') newWeight = 0.08;
                        
                        setAwayPlayersList([...awayPlayersList, { name: selectedName, weight: newWeight, role: playerInfo.position }]);
                      }
                    }}
                    style={{ background: '#1c1c24', border: '1px solid #333', color: '#fff', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', width: '100%', outline: 'none', appearance: 'auto', cursor: 'pointer' }}
                  >
                    <option value="" disabled>+ Selecionar Jogador</option>
                    {awaySquad.map(sq => (
                      <option key={sq.id} value={sq.name}>{sq.name} ({sq.position === 'Attacker' ? 'ATA' : sq.position === 'Midfielder' ? 'MEI' : sq.position === 'Defender' ? 'DEF' : 'GOL'})</option>
                    ))}
                  </select>
                </div>

                {/* Lista Visitante (Scrollável após 4) */}
                <div className="no-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', maxHeight: '250px', paddingRight: '4px' }}>
                  {awayPlayersList.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#555', padding: '20px 10px', fontStyle: 'italic', fontSize: '0.75rem' }}>
                      Nenhum jogador do {awayTeam || 'Visitante'} selecionado.
                    </div>
                  )}
                    {awayPlayersList.map((p, idx) => {
                      const prob = calculatePlayerGoalProb(awayXG, p.weight);
                      const isAnytimeSelected = selectedSelections.some(s => s.market === 'Marcadores' && s.label === `${p.name} (Qualquer Momento)`);
                      const isFirstSelected = selectedSelections.some(s => s.market === 'Marcadores' && s.label === `${p.name} (Primeiro Gol)`);
                      const isHottestAnytime = hottestPlayerGoal && hottestPlayerGoal.name === p.name && hottestPlayerGoal.type === 'anytime' && hottestPlayerGoal.team === 'away';
                      return (
                        <div key={`a-${idx}`} style={{ background: '#141419', padding: '8px 12px', borderRadius: '8px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 120px' }}>
                            <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}>{p.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span style={{ fontSize: '0.65rem', background: '#222', padding: '2px 6px', borderRadius: '4px', color: '#aaa', fontWeight: 'bold' }}>{p.role === 'Attacker' ? 'ATA' : p.role === 'Midfielder' ? 'MEI' : p.role === 'Defender' ? 'DEF' : p.role || 'GOL'}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', textAlign: 'right', flexShrink: 0, alignItems: 'center' }}>
                            <div 
                              onClick={() => handleToggleSelection('Marcadores', `${p.name} (Qualquer Momento)`, Number(prob.anytime)/100, prob.anytimeOdd)}
                              style={{ 
                                padding: '4px 6px', 
                                borderRadius: '6px', 
                                cursor: 'pointer', 
                                background: isAnytimeSelected ? 'rgba(204, 255, 0, 0.15)' : 'transparent',
                                border: isAnytimeSelected 
                                  ? '1.5px solid var(--brand-neon)' 
                                  : isHottestAnytime 
                                    ? '1.5px solid #00ffaa' 
                                    : '1px solid transparent',
                                transition: 'all 0.2s',
                                boxShadow: isHottestAnytime ? '0 0 6px rgba(0, 255, 170, 0.3)' : 'none'
                              }}
                            >
                              <div style={{ fontSize: '0.65rem', color: '#888' }}>Anytime</div>
                              <strong style={{ color: '#fff', fontSize: '0.8rem' }}>{prob.anytime}% <span style={{ color: '#ff9800', fontSize: '0.75rem', display: 'block' }}>@{prob.anytimeOdd}</span></strong>
                            </div>
                            <div 
                              onClick={() => handleToggleSelection('Marcadores', `${p.name} (Primeiro Gol)`, Number(prob.first)/100, prob.firstOdd)}
                              style={{ 
                                padding: '4px 6px', 
                                borderRadius: '6px', 
                                cursor: 'pointer', 
                                background: isFirstSelected ? 'rgba(204, 255, 0, 0.15)' : 'transparent',
                                border: isFirstSelected 
                                  ? '1.5px solid var(--brand-neon)' 
                                  : '1px solid transparent',
                                transition: 'all 0.2s'
                              }}
                            >
                              <div style={{ fontSize: '0.65rem', color: '#888' }}>Primeiro</div>
                              <strong style={{ color: '#aaa', fontSize: '0.8rem' }}>{prob.first}% <span style={{ color: '#ff9800', fontSize: '0.75rem', display: 'block' }}>@{prob.firstOdd}</span></strong>
                            </div>
                            <button 
                              onClick={() => setAwayPlayersList(awayPlayersList.filter((_, i) => i !== idx))}
                              style={{ background: 'transparent', border: 'none', color: '#ff4b4b', cursor: 'pointer', padding: '4px', fontSize: '1rem', marginLeft: '4px' }}
                              title="Remover"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

            </div>
          </div>

          <div className="calculator-cards-grid">

          {/* COLUNA 2: MERCADO DE CARTÕES */}
          <div className="glass-panel" style={{ borderLeft: '4px solid #ff5722', display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 'bold', color: '#fff' }}>
              <ShieldAlert size={18} color="#ff5722" /> Previsão de Cartões & Disciplina
            </h3>

            {(() => {
              const cardMarkets = [
                { label: 'Total Amarelos Over 3.5', prob: cardsPrediction.probYellowOver35 },
                { label: 'Total Amarelos Over 4.5', prob: cardsPrediction.probYellowOver45 },
                { label: 'Total Amarelos Over 5.5', prob: cardsPrediction.probYellowOver55 },
                { label: 'Cartão Vermelho (Sim)', prob: Number(cardsPrediction.redCardProb) / 100 }
              ];
              cardMarkets.sort((a, b) => b.prob - a.prob);
              const hottestCardMarket = cardMarkets[0]?.label;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
                  
                  {/* Seção Cartões Amarelos */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'transparent', border: '1px solid #333', padding: '10px', borderRadius: '12px' }}>
                    <div style={{ 
                      background: '#ffd600', 
                      width: '42px', 
                      height: '58px', 
                      borderRadius: '6px', 
                      boxShadow: '0 0 12px rgba(255, 214, 0, 0.3)', 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#000',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      flexShrink: 0
                    }}>
                      🟨
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '4px' }}>
                        Amarelos Esperados: <strong style={{ color: '#fff' }}>{cardsPrediction.totalYellows}</strong> (Casa: {cardsPrediction.homeYellows} | Fora: {cardsPrediction.awayYellows})
                      </div>
                      {/* Linhas Clicáveis de Amarelos */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                        {[
                          { label: 'Over 3.5', prob: cardsPrediction.probYellowOver35 },
                          { label: 'Over 4.5', prob: cardsPrediction.probYellowOver45 },
                          { label: 'Over 5.5', prob: cardsPrediction.probYellowOver55 }
                        ].map((line, idx) => {
                          const marketLabel = `Total Amarelos ${line.label}`;
                          const isSelected = selectedSelections.some(s => s.market === 'Cartões' && s.label === marketLabel);
                          const isHottest = hottestCardMarket === marketLabel;
                          return (
                            <div 
                              key={idx}
                              onClick={() => handleToggleSelection('Cartões', marketLabel, line.prob, getOdd(line.prob))}
                              style={{
                                background: isSelected ? 'rgba(204, 255, 0, 0.15)' : 'transparent',
                                border: isSelected 
                                  ? '1.5px solid var(--brand-neon)' 
                                  : isHottest 
                                    ? '1.5px solid #00ffaa' 
                                    : '1px solid #333',
                                borderRadius: '6px',
                                padding: '4px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: isHottest ? '0 0 6px rgba(0, 255, 170, 0.3)' : 'none'
                              }}
                            >
                              <div style={{ fontSize: '0.62rem', color: '#aaa' }}>{line.label}</div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 'bold' }}>{getPct(line.prob)}%</div>
                              <div style={{ fontSize: '0.62rem', color: '#ff9800' }}>@{getOdd(line.prob)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Seção Cartão Vermelho */}
                  <div 
                    onClick={() => handleToggleSelection('Cartões', 'Cartão Vermelho (Sim)', Number(cardsPrediction.redCardProb)/100, cardsPrediction.redCardOdd)}
                    style={{ 
                      display: 'flex', 
                      gap: '12px', 
                      alignItems: 'center', 
                      background: selectedSelections.some(s => s.market === 'Cartões' && s.label === 'Cartão Vermelho (Sim)') ? 'rgba(204, 255, 0, 0.15)' : 'linear-gradient(135deg, #1f0808, #110404)', 
                      border: selectedSelections.some(s => s.market === 'Cartões' && s.label === 'Cartão Vermelho (Sim)') 
                        ? '1.5px solid var(--brand-neon)' 
                        : hottestCardMarket === 'Cartão Vermelho (Sim)' 
                          ? '1.5px solid #00ffaa' 
                          : '1px solid #ff444433', 
                      padding: '10px', 
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: hottestCardMarket === 'Cartão Vermelho (Sim)' ? '0 0 8px rgba(0, 255, 170, 0.3)' : 'none'
                    }}
                  >
                    <div style={{ 
                      background: '#ff3f3f', 
                      width: '42px', 
                      height: '58px', 
                      borderRadius: '6px', 
                      boxShadow: '0 0 12px rgba(255, 63, 63, 0.4)', 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      flexShrink: 0
                    }}>
                      🟥
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#ff6b6b', fontWeight: 'bold' }}>Chance de Expulsão (Vermelho)</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#fff', marginTop: '2px' }}>
                        {cardsPrediction.redCardProb}% <span style={{ color: '#ff9800', fontSize: '0.85rem' }}>@{cardsPrediction.redCardOdd}</span>
                      </div>
                      <span style={{ fontSize: '0.62rem', color: Number(cardsPrediction.redCardProb) > 25 ? '#ff4b4b' : '#aaa', fontWeight: 'bold' }}>
                        {Number(cardsPrediction.redCardProb) > 25 ? '⚠️ Risco de Vermelho Alto' : 'Risco de Expulsão Moderado'}
                      </span>
                    </div>
                  </div>

                </div>
              );
            })()}
          </div>

          {/* COLUNA 3: ANÁLISE DO ÁRBITRO */}
          <div className="glass-panel" style={{ borderLeft: '4px solid #00d2ff', display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 'bold', color: '#fff' }}>
              <Award size={18} color="#00d2ff" /> Escala e Rigor do Árbitro
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
              {/* Seletor de Árbitro */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: 'bold' }}>Selecionar Árbitro do Confronto:</label>
                <select 
                  value={selectedRefIndex} 
                  onChange={(e) => setSelectedRefIndex(Number(e.target.value))}
                  style={{ width: '100%', background: '#1c1c1c', border: '1px solid #333', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {REFEREES.map((ref, idx) => (
                    <option key={idx} value={idx}>{ref.name} ({ref.strictness})</option>
                  ))}
                </select>
              </div>

              {/* Stats do Árbitro */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                <div style={{ background: '#141419', padding: '10px', borderRadius: '8px', border: '1px solid #222', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '2px' }}>Média de Amarelos</div>
                  <strong style={{ fontSize: '1.2rem', color: '#fff' }}>{selectedRef.yellows.toFixed(2)}</strong>
                </div>
                <div style={{ background: '#141419', padding: '10px', borderRadius: '8px', border: '1px solid #222', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '2px' }}>Média de Vermelhos</div>
                  <strong style={{ fontSize: '1.2rem', color: '#ff4d4d' }}>{selectedRef.reds.toFixed(2)}</strong>
                </div>
              </div>

              <div style={{ background: '#141419', padding: '10px', borderRadius: '8px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#aaa' }}>Média Pênaltis p/ Jogo:</span>
                <strong style={{ color: '#00d2ff', fontSize: '0.85rem' }}>{selectedRef.penalties.toFixed(2)} Pênaltis</strong>
              </div>

              <div style={{ background: '#141419', padding: '10px', borderRadius: '8px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#aaa' }}>Rigor Geral:</span>
                <span style={{ 
                  padding: '2px 8px', 
                  borderRadius: '4px', 
                  fontSize: '0.7rem', 
                  fontWeight: 'bold',
                  background: selectedRef.strictness === 'Muito Alto' ? '#ff3f3f33' : selectedRef.strictness === 'Alto' ? '#ff980033' : selectedRef.strictness === 'Médio' ? '#00d2ff33' : '#4CAF5033',
                  color: selectedRef.strictness === 'Muito Alto' ? '#ff4d4d' : selectedRef.strictness === 'Alto' ? '#ff9800' : selectedRef.strictness === 'Médio' ? '#00d2ff' : '#4CAF50'
                }}>
                  {selectedRef.strictness}
                </span>
              </div>

              {/* Insight do Árbitro */}
              <div style={{ 
                background: 'rgba(0, 210, 255, 0.05)', 
                border: '1px dashed #00d2ff44', 
                borderRadius: '8px', 
                padding: '12px', 
                fontSize: '0.75rem', 
                color: '#aaa',
                lineHeight: '1.4',
                marginTop: 'auto'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00d2ff', fontWeight: 'bold', marginBottom: '4px' }}>
                  <AlertTriangle size={14} /> Insight de Arbitragem:
                </div>
                {selectedRef.insight}
              </div>

            </div>
          </div>
          </div>
        </div>
      </div>

      {/* PAINEL DE CUPOM DE APOSTAS */}
      {selectedSelections.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '340px',
          maxHeight: '450px',
          background: '#141419',
          border: '2px solid var(--brand-neon)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out'
        }} className="bet-slip-panel">
          <div style={{ background: '#1c1c24', padding: '12px 16px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={16} color="var(--brand-neon)" />
              <strong style={{ fontSize: '0.85rem', color: '#fff' }}>Criador de Aposta ({selectedSelections.length})</strong>
            </div>
            <button 
              onClick={() => setSelectedSelections([])}
              style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
            >
              Limpar
            </button>
          </div>

          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {selectedSelections.map((sel, idx) => (
              <div key={idx} style={{ background: '#1e1e24', border: '1px solid #333', borderRadius: '8px', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.62rem', color: '#aaa', textTransform: 'uppercase' }}>{sel.market}</div>
                  <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sel.label}>
                    {sel.label}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--brand-neon)' }}>{sel.match}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.85rem', color: '#ff9800', fontWeight: 'bold' }}>@{sel.odd}</span>
                  <button 
                    onClick={() => setSelectedSelections(selectedSelections.filter(s => s.id !== sel.id))}
                    style={{ background: 'transparent', border: 'none', color: '#ff4b4b', cursor: 'pointer', padding: '2px', fontSize: '0.85rem' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '14px', background: '#1c1c24', borderTop: '1px solid #333', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(() => {
              const totalOdd = selectedSelections.reduce((acc, s) => acc * Number(s.odd), 1).toFixed(2);
              const totalProb = selectedSelections.reduce((acc, s) => acc * s.prob, 1);
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <span style={{ color: '#aaa' }}>Odd Combinada:</span>
                    <strong style={{ color: '#ff9800', fontSize: '1.1rem' }}>@{totalOdd}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <span style={{ color: '#aaa' }}>Probabilidade:</span>
                    <strong style={{ color: 'var(--brand-neon)' }}>{(totalProb * 100).toFixed(1)}%</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#aaa' }}>Stake (R$):</span>
                    <input 
                      type="number" 
                      placeholder="100" 
                      value={betStake}
                      onChange={(e) => setBetStake(e.target.value)}
                      style={{
                        flex: 1,
                        background: '#141419',
                        border: '1px solid #333',
                        color: '#fff',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '0.85rem',
                        outline: 'none',
                        textAlign: 'right',
                        fontWeight: 'bold'
                      }}
                    />
                  </div>

                  <button 
                    onClick={() => handleSaveCustomBet(totalOdd, totalProb)}
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
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @media (max-width: 950px) {
          .bet-slip-panel {
            right: 0 !important;
            left: 0 !important;
            bottom: 60px !important;
            width: 100% !important;
            max-height: 380px !important;
            border-radius: 12px 12px 0 0 !important;
            border-left: none !important;
            border-right: none !important;
            border-bottom: none !important;
          }
        }
      `}</style>
    </div>
  );
}
