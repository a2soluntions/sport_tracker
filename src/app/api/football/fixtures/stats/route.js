import { NextResponse } from 'next/server';

const API_KEY = process.env.API_FOOTBALL_KEY;
const API_HOST = 'https://v3.football.api-sports.io';

// Cache global em memória para as estatísticas
const statsCache = {};
const CACHE_DURATION = 60 * 1000; // 60 segundos

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fixtureId = searchParams.get('fixture');

  if (!fixtureId) {
    return NextResponse.json({ error: 'Parâmetro fixture é obrigatório' }, { status: 400 });
  }

  const now = Date.now();
  if (statsCache[fixtureId] && (now - statsCache[fixtureId].timestamp) < CACHE_DURATION) {
    return NextResponse.json({ ...statsCache[fixtureId].data, fromCache: true });
  }

  if (!API_KEY) {
    return NextResponse.json({ error: 'Chave API_FOOTBALL_KEY não configurada no servidor' }, { status: 500 });
  }

  try {
    const url = `${API_HOST}/fixtures/statistics?fixture=${fixtureId}`;
    const res = await fetch(url, {
      headers: {
        'x-apisports-key': API_KEY,
        'x-apisports-host': 'v3.football.api-sports.io'
      },
      next: { revalidate: 60 } // Next.js fetch cache
    });

    if (!res.ok) {
      throw new Error(`Erro HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.warn(`[API-Sports Stats] Erro na resposta do fixture ${fixtureId}:`, data.errors);
      return NextResponse.json({ error: 'Erro retornado pela API de Futebol', details: data.errors }, { status: 502 });
    }

    const responseTeams = data.response || [];
    if (responseTeams.length < 2) {
      return NextResponse.json({ error: 'Estatísticas não disponíveis para esta partida ainda', empty: true }, { status: 200 });
    }

    // Processar dados dos times (geralmente [0] é o time da Casa, [1] é o de Fora)
    const formatStats = (teamData) => {
      const statsArray = teamData.statistics || [];
      const getVal = (typeStr) => {
        const found = statsArray.find(s => s.type === typeStr);
        return found ? parseInt(found.value) || 0 : 0;
      };

      return {
        corners: getVal('Corner Kicks'),
        yellowCards: getVal('Yellow Cards'),
        redCards: getVal('Red Cards'),
        shotsOnGoal: getVal('Shots on Goal'),
        ballPossession: parseInt(String(getVal('Ball Possession')).replace('%', '')) || 50,
        goalkeeperSaves: getVal('Goalkeeper Saves')
      };
    };

    const teamHomeStats = formatStats(responseTeams[0]);
    const teamAwayStats = formatStats(responseTeams[1]);

    // Fetch players in parallel to get names of goalkeepers and shots on goal
    let goalkeepers = { 
      home: { name: 'Goleiro', saves: teamHomeStats.goalkeeperSaves }, 
      away: { name: 'Goleiro', saves: teamAwayStats.goalkeeperSaves } 
    };
    let topShooter = { name: 'Nenhum', team: '', shotsOnGoal: 0 };

    try {
      const playersUrl = `${API_HOST}/fixtures/players?fixture=${fixtureId}`;
      const playersRes = await fetch(playersUrl, {
        headers: {
          'x-apisports-key': API_KEY,
          'x-apisports-host': 'v3.football.api-sports.io'
        },
        next: { revalidate: 60 }
      });
      if (playersRes.ok) {
        const playersData = await playersRes.json();
        const teams = playersData.response || [];
        
        let maxShotsOnGoal = 0;
        const homeTeamId = responseTeams[0]?.team?.id;
        
        for (const t of teams) {
          const isHome = t.team?.id === homeTeamId;
          const teamName = t.team?.name || '';
          
          for (const p of (t.players || [])) {
            const playerName = p.player?.name || '';
            const position = p.statistics?.[0]?.games?.position || '';
            const saves = p.statistics?.[0]?.goals?.saves || 0;
            const shotsOn = p.statistics?.[0]?.shots?.on || 0;
            
            if (position.toLowerCase().includes('goalkeeper') || position === 'G' || position === 'GK') {
              if (isHome) {
                goalkeepers.home = { name: playerName, saves: saves || teamHomeStats.goalkeeperSaves };
              } else {
                goalkeepers.away = { name: playerName, saves: saves || teamAwayStats.goalkeeperSaves };
              }
            }
            
            if (shotsOn > maxShotsOnGoal && shotsOn > 0) {
              maxShotsOnGoal = shotsOn;
              topShooter = {
                name: playerName,
                team: teamName,
                shotsOnGoal: shotsOn
              };
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[API-Sports Players] Erro ao processar jogadores para fixture ${fixtureId}:`, err);
    }

    const formattedData = {
      home: teamHomeStats,
      away: teamAwayStats,
      goalkeepers,
      topShooter,
      timestamp: now
    };

    // Salva no cache
    statsCache[fixtureId] = {
      data: formattedData,
      timestamp: now
    };

    return NextResponse.json({ ...formattedData, fromCache: false });
  } catch (error) {
    console.error(`[API-Sports Stats] Falha ao buscar estatísticas do fixture ${fixtureId}:`, error);
    return NextResponse.json({ error: 'Falha na comunicação com o servidor de dados esportivos', message: error.message }, { status: 500 });
  }
}
