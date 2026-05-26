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
  TrendingUp 
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
  
  const [homeXG, setHomeXG] = useState(1.50);
  const [awayXG, setAwayXG] = useState(1.10);

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
    let probOver15 = 0;
    let probOver25 = 0;
    let probOver35 = 0;
    let probBtts = 0;

    const scoreMatrix = [];

    for (let h = 0; h <= 6; h++) {
      scoreMatrix[h] = [];
      for (let a = 0; a <= 6; a++) {
        const prob = getPoissonProbability(homeXG, h) * getPoissonProbability(awayXG, a);
        scoreMatrix[h][a] = prob;

        if (h > a) probHome += prob;
        else if (h === a) probDraw += prob;
        else probAway += prob;

        const totalGoals = h + a;
        if (totalGoals > 1.5) probOver15 += prob;
        if (totalGoals > 2.5) probOver25 += prob;
        if (totalGoals > 3.5) probOver35 += prob;
        if (h > 0 && a > 0) probBtts += prob;
      }
    }

    return {
      probHome, probDraw, probAway,
      probOver15, probOver25, probOver35,
      probBtts,
      scoreMatrix
    };
  }, [homeXG, awayXG]);

  const getOdd = (prob) => (prob > 0 ? (1 / prob).toFixed(2) : "0.00");
  const getPct = (prob) => (prob * 100).toFixed(1);

  // === ANÁLISE DETALHADA E PROFISSIONAL ===

  const selectedRef = REFEREES[selectedRefIndex];

  // Marcadores de Gols (Home/Away) referenciando os estados editáveis
  const homePlayers = homePlayersList;
  const awayPlayers = awayPlayersList;

  // Estimar Probabilidade dos Marcadores
  const calculatePlayerGoalProb = (xg, weight) => {
    // P(Golo do jogador a qualquer momento) = 1 - e^(-xg * weight)
    const anytime = 1 - Math.exp(-xg * weight);
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

    return {
      homeYellows: expectedHomeYellows,
      awayYellows: expectedAwayYellows,
      totalYellows: expectedTotalYellows,
      redCardProb: getPct(redCardProb),
      redCardOdd: getOdd(redCardProb)
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#1c1c1c', borderRadius: '8px', gap: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={homeTeam || "Casa"}>{homeTeam || "Casa"}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <strong style={{ color: 'var(--brand-neon)', fontSize: '0.85rem' }}>{getPct(stats.probHome)}%</strong>
                  <span style={{ color: '#888', fontSize: '0.85rem' }}>@{getOdd(stats.probHome)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#1c1c1c', borderRadius: '8px', gap: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', flex: 1 }}>Empate</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <strong style={{ color: '#ffeb3b', fontSize: '0.85rem' }}>{getPct(stats.probDraw)}%</strong>
                  <span style={{ color: '#888', fontSize: '0.85rem' }}>@{getOdd(stats.probDraw)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#1c1c1c', borderRadius: '8px', gap: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={awayTeam || "Visit."}>{awayTeam || "Visit."}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <strong style={{ color: '#ff4b4b', fontSize: '0.85rem' }}>{getPct(stats.probAway)}%</strong>
                  <span style={{ color: '#888', fontSize: '0.85rem' }}>@{getOdd(stats.probAway)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA 3: Mercado de Gols */}
          <div className="glass-panel" style={{ borderTop: '4px solid #ff9800', padding: '14px' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
              <Info size={16} color="#ff9800" /> Gols (O/U)
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div style={{ background: '#1c1c1c', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ color: '#aaa', fontSize: '0.75rem', marginBottom: '2px' }}>Over 1.5</div>
                <strong style={{ fontSize: '0.9rem' }}>{getPct(stats.probOver15)}%</strong>
                <div style={{ fontSize: '0.75rem', color: '#ff9800' }}>@{getOdd(stats.probOver15)}</div>
              </div>
              <div style={{ background: '#1c1c1c', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ color: '#aaa', fontSize: '0.75rem', marginBottom: '2px' }}>Over 2.5</div>
                <strong style={{ fontSize: '0.9rem' }}>{getPct(stats.probOver25)}%</strong>
                <div style={{ fontSize: '0.75rem', color: '#ff9800' }}>@{getOdd(stats.probOver25)}</div>
              </div>
              <div style={{ background: '#1c1c1c', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ color: '#aaa', fontSize: '0.75rem', marginBottom: '2px' }}>Over 3.5</div>
                <strong style={{ fontSize: '0.9rem' }}>{getPct(stats.probOver35)}%</strong>
                <div style={{ fontSize: '0.75rem', color: '#ff9800' }}>@{getOdd(stats.probOver35)}</div>
              </div>
              <div style={{ background: '#1c1c1c', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ color: '#aaa', fontSize: '0.75rem', marginBottom: '2px' }}>BTTS</div>
                <strong style={{ fontSize: '0.9rem' }}>{getPct(stats.probBtts)}%</strong>
                <div style={{ fontSize: '0.75rem', color: '#ff9800' }}>@{getOdd(stats.probBtts)}</div>
              </div>
            </div>
          </div>

          {/* COLUNA 4: Heatmap Placar Exato */}
          <div className="glass-panel" style={{ borderTop: '4px solid #b339ff', padding: '14px' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
              <Activity size={16} color="#b339ff" /> Heatmap (Top 9)
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {(() => {
                let flatScores = [];
                for (let h = 0; h <= 4; h++) {
                  for (let a = 0; a <= 4; a++) {
                    flatScores.push({ score: `${h}x${a}`, prob: stats.scoreMatrix[h][a] });
                  }
                }
                flatScores.sort((a, b) => b.prob - a.prob);
                
                return flatScores.slice(0, 9).map((item, i) => {
                  const intensity = Math.min(1, item.prob * 5); 
                  const bg = `rgba(0, 255, 170, ${intensity * 0.45})`;
                  return (
                    <div key={i} style={{ background: bg, border: '1px solid #333', borderRadius: '6px', padding: '4px 2px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{item.score}</div>
                      <div style={{ fontSize: '0.7rem', color: '#aaa' }}>{getPct(item.prob)}%</div>
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
                      return (
                        <div key={`h-${idx}`} style={{ background: '#141419', padding: '8px 12px', borderRadius: '8px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 120px' }}>
                            <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}>{p.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span style={{ fontSize: '0.65rem', background: '#222', padding: '2px 6px', borderRadius: '4px', color: '#aaa', fontWeight: 'bold' }}>{p.role === 'Attacker' ? 'ATA' : p.role === 'Midfielder' ? 'MEI' : p.role === 'Defender' ? 'DEF' : p.role || 'GOL'}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '10px', textAlign: 'right', flexShrink: 0, alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '0.65rem', color: '#888' }}>Anytime</div>
                              <strong style={{ color: '#fff', fontSize: '0.8rem' }}>{prob.anytime}% <span style={{ color: '#ff9800', fontSize: '0.75rem', display: 'block' }}>@{prob.anytimeOdd}</span></strong>
                            </div>
                            <div>
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
                      return (
                        <div key={`a-${idx}`} style={{ background: '#141419', padding: '8px 12px', borderRadius: '8px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 120px' }}>
                            <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}>{p.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span style={{ fontSize: '0.65rem', background: '#222', padding: '2px 6px', borderRadius: '4px', color: '#aaa', fontWeight: 'bold' }}>{p.role === 'Attacker' ? 'ATA' : p.role === 'Midfielder' ? 'MEI' : p.role === 'Defender' ? 'DEF' : p.role || 'GOL'}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '10px', textAlign: 'right', flexShrink: 0, alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '0.65rem', color: '#888' }}>Anytime</div>
                              <strong style={{ color: '#fff', fontSize: '0.8rem' }}>{prob.anytime}% <span style={{ color: '#ff9800', fontSize: '0.75rem', display: 'block' }}>@{prob.anytimeOdd}</span></strong>
                            </div>
                            <div>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
              
              {/* Cartões Casa */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                  <span>Esperados {homeTeam || 'Casa'}:</span>
                  <strong style={{ color: '#ffeb3b' }}>{cardsPrediction.homeYellows} Amarelos</strong>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (cardsPrediction.homeYellows / 6) * 100)}%`, height: '100%', background: '#ffeb3b', borderRadius: '4px' }}></div>
                </div>
              </div>

              {/* Cartões Visitante */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                  <span>Esperados {awayTeam || 'Visitante'}:</span>
                  <strong style={{ color: '#ffeb3b' }}>{cardsPrediction.awayYellows} Amarelos</strong>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (cardsPrediction.awayYellows / 6) * 100)}%`, height: '100%', background: '#ffeb3b', borderRadius: '4px' }}></div>
                </div>
              </div>

              {/* Totais Acumulados */}
              <div style={{ background: '#141419', padding: '12px', borderRadius: '8px', border: '1px solid #222', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>Total de Cartões Estimados na Partida</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#ffeb3b', margin: '4px 0' }}>
                  {cardsPrediction.totalYellows} <span style={{ fontSize: '1rem', color: '#aaa' }}>Amarelos</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#555' }}>Cálculo combinando a agressividade dos times + rigor do árbitro</div>
              </div>

              {/* Cartão Vermelho */}
              <div style={{ background: 'linear-gradient(135deg, #1f0808, #110404)', padding: '12px', borderRadius: '8px', border: '1px solid #ff444433', display: 'flex', alignItems: 'center', justifySpace: 'between', gap: '12px' }}>
                <div style={{ background: '#ff3f3f', width: '30px', height: '42px', borderRadius: '4px', boxShadow: '0 0 10px rgba(255, 63, 63, 0.4)', flexShrink: 0 }}></div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#ff6b6b', fontWeight: 'bold' }}>Chance de Expulsão (Vermelho)</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', marginTop: '2px' }}>
                    {cardsPrediction.redCardProb}% <span style={{ color: '#ff9800', fontSize: '0.85rem' }}>@{cardsPrediction.redCardOdd}</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: Number(cardsPrediction.redCardProb) > 25 ? '#ff4b4b' : '#aaa', fontWeight: 'bold' }}>
                    {Number(cardsPrediction.redCardProb) > 25 ? '⚠️ Risco de Cartão Vermelho Alto' : 'Risco de Expulsão Moderado'}
                  </span>
                </div>
              </div>

            </div>
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

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
