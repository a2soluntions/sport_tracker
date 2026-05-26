import { NextResponse } from 'next/server';
import { getCurrentRound, getStandings } from 'campeonato-brasileiro-api';

const API_KEY = '4101632afdfe0cbb870f0432e05ec892';
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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('league') || '71';
    const targetDate = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // ==========================================
    // FALLBACK BRASILEIRÃO (LIGA 71) - IGNORA DATA SE FOR HOJE/RODADA ATUAL
    // A chave API-Sports do usuário está bloqueada para temporadas 2025/2026 (Free Plan limitation).
    // Então, para o Brasileirão, usamos o web scraper gratuito que funciona 100%.
    // ==========================================
    if (leagueId === '71' || leagueId === '72') {
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
          homeTeamId: null, // Será buscado pelo nome na calculadora
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

      // Se o usuário selecionou uma data específica, filtramos os jogos dessa data localmente (exceto se pediu all=true para auto-resolver)
      const returnAll = searchParams.get('all') === 'true';
      const filteredByDate = returnAll ? formattedFixtures : formattedFixtures.filter(f => f.rawDate === targetDate);

      return NextResponse.json({ 
        fixtures: filteredByDate, 
        round: activeRound.number,
        season: 2026,
        fromCache: false 
      });
    }

    // ==========================================
    // OUTRAS LIGAS - TENTA USAR API-SPORTS (Pode vir vazio devido ao plano Free)
    // ==========================================
    const season = '2024'; // Forçado 2024 pois a API key Free só aceita até 2024.
    const returnAll = searchParams.get('all') === 'true';

    const url = returnAll
      ? `${API_HOST}/fixtures?league=${leagueId}&season=${season}`
      : `${API_HOST}/fixtures?league=${leagueId}&season=${season}&date=${targetDate}`;

    const fixturesRes = await fetch(url, {
      headers: { 'x-apisports-key': API_KEY }
    });
    const fixturesData = await fixturesRes.json();
    const matches = fixturesData.response || [];

    let formattedFixtures = matches.map((m) => {
      const isFinished = ['FT', 'AET', 'PEN'].includes(m.fixture.status.short);
      const isLive = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT'].includes(m.fixture.status.short);
      let statusLabel = isLive ? `Em Andamento ⚽ ${m.fixture.status.elapsed}'` : isFinished ? 'Finalizado' : 'Não Iniciado';

      return {
        id: m.fixture.id,
        homeTeamId: m.teams.home.id,
        awayTeamId: m.teams.away.id,
        date: `${new Date(m.fixture.date).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})} • ${new Date(m.fixture.date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}`,
        rawDate: m.fixture.date.split('T')[0],
        dayCategory: 'TODOS',
        round: m.league.round.replace('Regular Season - ', '') || '?',
        home: m.teams.home.name,
        away: m.teams.away.name,
        homeLogo: m.teams.home.logo,
        awayLogo: m.teams.away.logo,
        homeXG: 1.5, // Mock baseline já que stats de 2024 n fazem sentido
        awayXG: 1.1,
        goalsHome: m.goals.home ?? 0,
        goalsAway: m.goals.away ?? 0,
        status: statusLabel,
        isLive,
        isFinished,
        minute: m.fixture.status.elapsed || 0,
        venue: m.fixture.venue?.name || '',
        homePosition: '-',
        awayPosition: '-'
      };
    });

    if (returnAll) {
      // Ordena por data decrescente e pega as 40 partidas mais recentes
      formattedFixtures.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
      formattedFixtures = formattedFixtures.slice(0, 40);
    }

    return NextResponse.json({ 
      fixtures: formattedFixtures, 
      round: '?',
      season: 2024,
      fromCache: false 
    });

  } catch (error) {
    console.error('Fixtures API Error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
