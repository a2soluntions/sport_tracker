import { NextResponse } from 'next/server';

const API_KEY = '4101632afdfe0cbb870f0432e05ec892';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');
  const teamName = searchParams.get('team'); // fallback

  if (!teamId && !teamName) {
    return NextResponse.json({ error: 'Team ID or Team Name is required' }, { status: 400 });
  }

  try {
    const headers = {
      'x-apisports-key': API_KEY
    };

    let resolvedTeamId = teamId;

    // Se só passou o nome, tenta buscar o ID do time na API-Sports
    if (!resolvedTeamId) {
      const searchRes = await fetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(teamName)}`, { headers });
      const searchData = await searchRes.json();
      
      if (searchData.response && searchData.response.length > 0) {
        resolvedTeamId = searchData.response[0].team.id;
      }
    }

    if (!resolvedTeamId) {
       return NextResponse.json({ error: 'Team not found for ' + teamName }, { status: 404 });
    }

    // Buscar o elenco atualizado do time
    const squadRes = await fetch(`https://v3.football.api-sports.io/players/squads?team=${resolvedTeamId}`, { headers });
    const squadData = await squadRes.json();

    if (!squadData.response || squadData.response.length === 0) {
      return NextResponse.json({ error: 'Squad not found' }, { status: 404 });
    }

    const players = squadData.response[0].players.map(p => ({
      id: p.id,
      name: p.name,
      age: p.age,
      number: p.number,
      position: p.position,
      photo: p.photo
    }));

    // Ordenar os atacantes primeiro, depois meio-campistas
    players.sort((a, b) => {
      const posA = a.position === 'Attacker' ? 1 : a.position === 'Midfielder' ? 2 : 3;
      const posB = b.position === 'Attacker' ? 1 : b.position === 'Midfielder' ? 2 : 3;
      return posA - posB;
    });

    return NextResponse.json({ players });
  } catch (error) {
    console.error('API Sports Squads Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
