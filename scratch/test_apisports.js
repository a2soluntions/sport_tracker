const API_KEY = '4101632afdfe0cbb870f0432e05ec892';
const API_HOST = 'https://v3.football.api-sports.io';
const leagueId = '13'; // Libertadores
const season = '2026';

fetch(`${API_HOST}/fixtures?league=${leagueId}&season=${season}`, {
  headers: { 'x-apisports-key': API_KEY }
})
  .then(res => res.json())
  .then(data => {
    console.log("Status:", data.errors);
    console.log("Count:", data.results);
    if (data.response && data.response.length > 0) {
      console.log("Sample matches:", JSON.stringify(data.response.slice(0, 3).map(m => ({
        id: m.fixture.id,
        date: m.fixture.date,
        home: m.teams.home.name,
        away: m.teams.away.name
      })), null, 2));
    }
  })
  .catch(err => console.error(err));
