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
      // Retorna objeto vazio ou erro apropriado para o client lidar
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
        ballPossession: parseInt(String(getVal('Ball Possession')).replace('%', '')) || 50
      };
    };

    const formattedData = {
      home: formatStats(responseTeams[0]),
      away: formatStats(responseTeams[1]),
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
