import { NextResponse } from 'next/server';
import { getCurrentRound, getStandings } from 'campeonato-brasileiro-api';

const API_KEY = process.env.API_FOOTBALL_KEY;
const API_HOST = 'https://v3.football.api-sports.io';

// Caches
const cache = { fixtures: {}, stats: {} };
const CACHE_DURATION_FIXTURES = 5 * 60 * 1000; 

// ESTATÍSTICAS PARA BRASILEIRÃO VIA PACOTE LOCAL
async function getBrasileiraoStats() {
  const now = Date.now();
  if (cache.stats['br'] && (now - cache.stats['br'].timestamp) < 12 * 60 * 60 * 1000) {
    return cache.stats['br'].data;
  }
  try {
    const standingsData = await getStandings('a');
    if (!standingsData || !standingsData.tables || !standingsData.tables[0]) return {};
    const stats = {};
    for (const entry of standingsData.tables[0].entries) {
      const played = entry.matches || 1;
      stats[entry.team.name] = {
        name: entry.team.name,
        logo: entry.team.badge,
        goalsFor: entry.goalsFor / played,
        goalsAgainst: entry.goalsAgainst / played,
        position: entry.position
      };
    }
    cache.stats['br'] = { data: stats, timestamp: now };
    return stats;
  } catch (err) {
    return {};
  }
}

// ESTATÍSTICAS DETALHADAS DE QUALQUER LIGA VIA API-SPORTS (CLASSIFICAÇÃO)
async function getApiSportsStandings(leagueId, season) {
  const cacheKey = `${leagueId}_${season}`;
  const now = Date.now();
  if (cache.stats[cacheKey] && (now - cache.stats[cacheKey].timestamp) < 12 * 60 * 60 * 1000) {
    return cache.stats[cacheKey].data;
  }
  
  try {
    const url = `${API_HOST}/standings?league=${leagueId}&season=${season}`;
    const res = await fetch(url, {
      headers: { 'x-apisports-key': API_KEY }
    });
    const data = await res.json();
    const standings = data.response?.[0]?.league?.standings?.[0] || [];
    
    const stats = {};
    for (const entry of standings) {
      const teamName = entry.team.name;
      const played = entry.all.played || 1;
      stats[teamName] = {
        name: teamName,
        logo: entry.team.logo,
        goalsFor: entry.all.goals.for / played,
        goalsAgainst: entry.all.goals.against / played,
        position: entry.rank
      };
    }
    
    cache.stats[cacheKey] = { data: stats, timestamp: now };
    return stats;
  } catch (err) {
    console.warn(`[API-Sports Standings] Falha ao carregar classificação da liga ${leagueId}:`, err);
    return {};
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('league') || '71';
    const targetDate = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const season = process.env.API_FOOTBALL_SEASON || '2024';
    const isPaidPlan = season === '2026';
    const returnAll = searchParams.get('all') === 'true';

    // Determinar a temporada ativa correspondente com base no ano da data de destino
    const dateObj = new Date(targetDate + 'T00:00:00');
    const targetYear = dateObj.getFullYear();
    const targetMonth = dateObj.getMonth();

    let activeSeason = String(targetYear);
    const europeanLeagues = ['39', '140', '135', '78'];
    if (europeanLeagues.includes(leagueId)) {
      if (targetMonth < 6) { // Antes de julho, a temporada europeia ativa ainda é a do ano anterior (e.g. 2025 para maio de 2026)
        activeSeason = String(targetYear - 1);
      } else {
        activeSeason = String(targetYear);
      }
    }

    // Para Brasileirão (Ligas 71/72), se não for plano pago (temporada 2026),
    // ou se for plano pago mas a API falhar/retornar vazio, usamos o scraper campeonato-brasileiro-api.
    let useScraper = (leagueId === '71' || leagueId === '72') && !isPaidPlan;
    let apiSportsFixtures = [];
    let apiSportsRound = '?';

    if ((leagueId === '71' || leagueId === '72') && isPaidPlan) {
      try {
        const url = returnAll
          ? `${API_HOST}/fixtures?league=${leagueId}&season=${activeSeason}`
          : `${API_HOST}/fixtures?league=${leagueId}&season=${activeSeason}&date=${targetDate}`;

        const res = await fetch(url, { headers: { 'x-apisports-key': API_KEY } });
        const data = await res.json();
        
        if (data.response && data.response.length > 0) {
          apiSportsFixtures = data.response;
          apiSportsRound = data.response[0].league.round.replace('Regular Season - ', '') || '?';
        } else {
          console.log(`[API-Sports] Nenhum jogo retornado para Brasileirão liga ${leagueId} temporada ${activeSeason}. Usando fallback Scraper...`);
          if (data.errors && Object.keys(data.errors).length > 0) {
            console.error(`[API-Sports] Detalhes dos erros da API:`, data.errors);
          }
          useScraper = true;
        }
      } catch (err) {
        console.warn(`[API-Sports] Erro ao buscar Brasileirão da API. Usando fallback Scraper...`, err);
        useScraper = true;
      }
    }

    if (useScraper) {
      const currentRoundData = await getCurrentRound(leagueId === '71' ? 'a' : 'b');
      if (!currentRoundData || !currentRoundData.rounds || currentRoundData.rounds.length === 0) {
        return NextResponse.json({ fixtures: [], round: '?', season: 2026, fromCache: false });
      }

      const activeRound = currentRoundData.rounds[0];
      const fixtures = activeRound.matches || [];
      const teamStats = await getBrasileiraoStats();

      const formattedFixtures = fixtures.map((m) => {
        const homeStats = teamStats[m.homeTeam.name] || { goalsFor: 1.2, goalsAgainst: 1.0, position: 10 };
        const awayStats = teamStats[m.awayTeam.name] || { goalsFor: 1.0, goalsAgainst: 1.2, position: 11 };

        const homeXG = Math.round(((homeStats.goalsFor + awayStats.goalsAgainst) / 2) * 10) / 10;
        const awayXG = Math.round(((awayStats.goalsFor + homeStats.goalsAgainst) / 2) * 10) / 10;

        const isLive = m.statusCode === 'LIVE' || m.status === 'live';
        const isFinished = m.statusCode === 'ENCERRADO' || m.status === 'finished' || m.status === 'ended';
        let statusLabel = isLive ? 'Em Andamento ⚽' : isFinished ? 'Finalizado' : 'Não Iniciado';

        return {
          id: m.id,
          homeTeamId: null,
          awayTeamId: null,
          date: `${new Date(m.date + 'T' + m.time + ':00').toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})} • ${m.time}`,
          rawDate: m.date,
          dayCategory: 'TODOS',
          round: activeRound.number || '?',
          home: m.homeTeam.name,
          away: m.awayTeam.name,
          homeLogo: m.homeTeam.badge,
          awayLogo: m.awayTeam.badge,
          homeXG,
          awayXG,
          goalsHome: m.score.home,
          goalsAway: m.score.away,
          status: statusLabel,
          isLive,
          isFinished,
          minute: isLive ? 45 : 0,
          venue: m.venue || '',
          homePosition: homeStats.position,
          awayPosition: awayStats.position
        };
      });

      const filteredByDate = returnAll ? formattedFixtures : formattedFixtures.filter(f => f.rawDate === targetDate);

      return NextResponse.json({ 
        fixtures: filteredByDate, 
        round: activeRound.number,
        season: 2026,
        fromCache: false 
      });
    }

    // ==========================================
    // OUTRAS LIGAS OU BRASILEIRÃO VIA API-SPORTS
    // ==========================================
    const matches = apiSportsFixtures.length > 0 ? apiSportsFixtures : await (async () => {
      const url = returnAll
        ? `${API_HOST}/fixtures?league=${leagueId}&season=${activeSeason}`
        : `${API_HOST}/fixtures?league=${leagueId}&season=${activeSeason}&date=${targetDate}`;
      const res = await fetch(url, { headers: { 'x-apisports-key': API_KEY } });
      const data = await res.json();
      if (data.errors && Object.keys(data.errors).length > 0) {
        console.error(`[API-Sports] Erro retornado pela API para a liga ${leagueId}:`, data.errors);
      }
      return data.response || [];
    })();

    // Buscar classificação (standings) da liga para calcular xG dinâmico
    const teamStats = await getApiSportsStandings(leagueId, activeSeason);

    let formattedFixtures = matches.map((m) => {
      const isFinished = ['FT', 'AET', 'PEN'].includes(m.fixture.status.short);
      const isLive = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT'].includes(m.fixture.status.short);
      let statusLabel = isLive ? `Em Andamento ⚽ ${m.fixture.status.elapsed}'` : isFinished ? 'Finalizado' : 'Não Iniciado';

      // Calcular xG dinâmico usando estatísticas da classificação
      const homeTeamName = m.teams.home.name;
      const awayTeamName = m.teams.away.name;
      const homeStats = teamStats[homeTeamName] || { goalsFor: 1.4, goalsAgainst: 1.2, position: '-' };
      const awayStats = teamStats[awayTeamName] || { goalsFor: 1.2, goalsAgainst: 1.4, position: '-' };

      const homeXG = Math.round(((homeStats.goalsFor + awayStats.goalsAgainst) / 2) * 10) / 10;
      const awayXG = Math.round(((awayStats.goalsFor + homeStats.goalsAgainst) / 2) * 10) / 10;

      return {
        id: m.fixture.id,
        homeTeamId: m.teams.home.id,
        awayTeamId: m.teams.away.id,
        date: `${new Date(m.fixture.date).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})} • ${new Date(m.fixture.date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}`,
        rawDate: m.fixture.date.split('T')[0],
        dayCategory: 'TODOS',
        round: m.league.round.replace('Regular Season - ', '') || '?',
        home: homeTeamName,
        away: awayTeamName,
        homeLogo: m.teams.home.logo,
        awayLogo: m.teams.away.logo,
        homeXG,
        awayXG,
        goalsHome: m.goals.home ?? 0,
        goalsAway: m.goals.away ?? 0,
        status: statusLabel,
        isLive,
        isFinished,
        minute: m.fixture.status.elapsed || 0,
        venue: m.fixture.venue?.name || '',
        homePosition: homeStats.position,
        awayPosition: awayStats.position
      };
    });

    if (returnAll && !(leagueId === '71' || leagueId === '72')) {
      // Ordena por data decrescente e pega as 40 partidas mais recentes
      formattedFixtures.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
      formattedFixtures = formattedFixtures.slice(0, 40);
    }

    return NextResponse.json({ 
      fixtures: formattedFixtures, 
      round: apiSportsRound !== '?' ? apiSportsRound : (matches[0]?.league?.round?.replace('Regular Season - ', '') || '?'),
      season: parseInt(activeSeason),
      fromCache: false 
    });

  } catch (error) {
    console.error('Fixtures API Error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
