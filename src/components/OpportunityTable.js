'use client'; // Necessário pois usaremos os hooks useEffect e useState

import React, { useEffect, useState } from 'react';
import styles from './OpportunityTable.module.css';
import { supabase } from '@/lib/supabaseClient';
import { Search, Zap, Clock, Trophy, LineChart, Calendar } from 'lucide-react';

const getTeamLogoUrl = (teamName) => {
  if (!teamName) return '';
  const clean = teamName.trim().toUpperCase();
  
  const mapping = {
    'FLAMENGO': 127,
    'PALMEIRAS': 121,
    'CORINTHIANS': 131,
    'SÃO PAULO': 126,
    'SAO PAULO': 126,
    'SANTOS': 128,
    'GRÊMIO': 130,
    'GREMIO': 130,
    'INTERNACIONAL': 119,
    'ATLÉTICO-MG': 134,
    'ATLETICO MG': 134,
    'ATLÉTICO MG': 134,
    'FLUMINENSE': 124,
    'BOTAFOGO': 120,
    'VASCO': 133,
    'VASCO DA GAMA': 133,
    'CRUZEIRO': 125,
    'BAHIA': 118,
    'ATHLETICO-PR': 135,
    'ATHLETICO PR': 135,
    'FORTALEZA': 154,
    'CEARÁ': 129,
    'CEARA': 129,
    'CORITIBA': 132,
    'GOIÁS': 151,
    'GOIAS': 151,
    'BRAGANTINO': 794,
    'RED BULL BRAGANTINO': 794,
    'CUIABÁ': 1100,
    'CUIABA': 1100,
    'CRICIÚMA': 1192,
    'CRICIUMA': 1192,
    'BOTAFOGO-SP': 1190,
    'AMÉRICA-MG': 123,
    'AMERICA MG': 123,
    'VILA NOVA': 1193,
    'OPERÁRIO-PR': 1194,
    'OPERARIO PR': 1194,
    'CHAPECOENSE': 122,
    'REMO': 1195
  };
  
  const teamId = mapping[clean];
  if (teamId) {
    return `https://media.api-sports.io/football/teams/${teamId}.png`;
  }
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(teamName)}&background=141419&color=CCFF00&rounded=true&bold=true&size=32`;
};

export default function OpportunityTable() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados dos Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [leagueFilter, setLeagueFilter] = useState('Todas');
  const [marketFilter, setMarketFilter] = useState('Todos');
  const [minEvFilter, setMinEvFilter] = useState(0);
  const [dateFilter, setDateFilter] = useState('');

  const [hideOld, setHideOld] = useState(true);

  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase não configurado. Verifique as variáveis de ambiente.');
      setLoading(false);
      return;
    }

    // 1. Busca inicial dos dados que já estão no banco
    const fetchOpportunities = async () => {
      const { data, error } = await supabase
        .from('ev_opportunities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30); 
        
      if (error) {
        console.error("Erro ao buscar dados do Supabase:", error);
      } else {
        setOpportunities(data);
      }
      setLoading(false);
    };

    fetchOpportunities();

    // 2. A MÁGICA: Inscrição em Tempo Real (WebSockets)
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ev_opportunities',
        },
        (payload) => {
          console.log("🔔 NOVA OPORTUNIDADE RECEBIDA AO VIVO:", payload.new);
          // Adiciona a nova aposta no topo da tabela
          setOpportunities((current) => [payload.new, ...current].slice(0, 30));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return <div style={{ color: 'var(--brand-neon)', padding: '24px' }}>Conectando aos servidores do Supabase...</div>;
  }


  // --- LÓGICA DE FILTRAGEM ---
  const predefinedLeagues = [
    "Brasileirão Série A",
    "Brasileirão Série B",
    "Copa do Brasil",
    "Copa Libertadores",
    "Champions League",
    "Premier League (ING)",
    "La Liga (ESP)",
    "Serie A (ITA)",
    "Bundesliga (ALE)"
  ];

  const predefinedMarkets = [
    "Vencedor (1X2)",
    "Mais de 2.5 Gols"
  ];

  // Função para destrinchar a tag [LIVE] que injetamos via backend
  const parseLiveLeagueName = (rawName) => {
    if (rawName.startsWith('[LIVE|')) {
      const parts = rawName.split('] ');
      const liveData = parts[0].replace('[LIVE|', '').split('|'); // [minuto, placar]
      return { isLive: true, minuto: liveData[0], placar: liveData[1], cleanName: parts[1] };
    }
    return { isLive: false, cleanName: rawName };
  };

  const parseTeams = (confronto) => {
    if (!confronto) return { home: '', away: '' };
    let parts = [];
    if (confronto.includes(' vs ')) {
      parts = confronto.split(' vs ');
    } else if (confronto.includes(' - ')) {
      parts = confronto.split(' - ');
    } else if (confronto.includes(' x ')) {
      parts = confronto.split(' x ');
    }
    
    if (parts.length >= 2) {
      return { home: parts[0].trim(), away: parts[1].trim() };
    }
    return { home: confronto, away: '' };
  };

  const parseScores = (placar) => {
    if (!placar) return { homeScore: '', awayScore: '' };
    let cleanPlacar = placar.replace(/[()]/g, '').trim();
    let scores = [];
    if (cleanPlacar.includes('-')) {
      scores = cleanPlacar.split('-');
    } else if (cleanPlacar.includes('x')) {
      scores = cleanPlacar.split('x');
    } else if (cleanPlacar.includes(':')) {
      scores = cleanPlacar.split(':');
    }
    
    if (scores.length >= 2) {
      return { homeScore: scores[0].trim(), awayScore: scores[1].trim() };
    }
    return { homeScore: placar, awayScore: '' };
  };

  const uniqueLeagues = ["Todas", ...new Set([...predefinedLeagues, ...opportunities.map(item => parseLiveLeagueName(item.campeonato).cleanName)])]
    .filter(liga => !liga.includes("Suécia") && !liga.includes("România") && !liga.includes("Extração Direta"));

  const uniqueMarkets = ["Todos", ...new Set([...predefinedMarkets, ...opportunities.map(item => item.mercado)])];

  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

  const filteredOpportunities = opportunities.filter((item) => {
    const parsedLeague = parseLiveLeagueName(item.campeonato).cleanName;
    const matchesSearch = item.confronto.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLeague = leagueFilter === 'Todas' || parsedLeague === leagueFilter;
    const matchesMarket = marketFilter === 'Todos' || item.mercado === marketFilter;
    const matchesEv = item.vantagem_ev_porcentagem >= minEvFilter;
    
    const itemDate = new Date(item.created_at);
    const isRecent = !hideOld || itemDate > twelveHoursAgo;
    
    const matchesDate = !dateFilter || itemDate.toISOString().split('T')[0] === dateFilter;
    
    const isExcluded = parsedLeague.includes("Suécia") || parsedLeague.includes("România") || parsedLeague.includes("Extração Direta");
    
    return matchesSearch && matchesLeague && matchesMarket && matchesEv && isRecent && matchesDate && !isExcluded;
  });

  return (
    <div>
      {/* BARRA DE FERRAMENTAS (FILTROS) */}
      <div className="opportunities-toolbar">
        
        {/* COLUNA 1: Parâmetros */}
        <div style={{ 
          display: 'flex', flexDirection: 'column', gap: '20px',
          border: '1px solid var(--brand-neon)', padding: '16px', borderRadius: '8px', 
          backgroundColor: 'rgba(212, 255, 0, 0.02)' 
        }}>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.8rem', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Search size={14} color="var(--brand-neon)" /> Pesquisar Confronto
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Ex: Flamengo"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1, width: '100%', minWidth: '0', padding: '0 14px', height: '38px', borderRadius: '6px', background: '#1c1c1c', border: '1px solid #444', color: '#fff', fontSize: '0.95rem' }}
              />
              <button 
                style={{ width: '42px', height: '38px', borderRadius: '6px', background: 'var(--brand-neon)', color: '#000', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Search size={18} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 70px', minWidth: '70px' }}>
              <label style={{ fontSize: '0.8rem', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={14} /> EV Min (%)
              </label>
              <input 
                type="number" 
                min="0"
                max="100"
                value={minEvFilter}
                onChange={(e) => setMinEvFilter(Number(e.target.value))}
                style={{ width: '100%', minWidth: '0', padding: '0 14px', height: '38px', borderRadius: '6px', background: '#1c1c1c', border: '1px solid #444', color: 'var(--brand-neon)', fontWeight: 'bold', fontSize: '0.95rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 110px', minWidth: '110px' }}>
              <label style={{ fontSize: '0.8rem', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} /> Calendário
              </label>
              <input 
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{ width: '100%', minWidth: '0', padding: '0 14px', height: '38px', borderRadius: '6px', background: '#1c1c1c', border: '1px solid #444', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 90px', minWidth: '90px' }}>
              <label style={{ fontSize: '0.8rem', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} /> Frescor
              </label>
              <button 
                onClick={() => setHideOld(!hideOld)}
                style={{
                  height: '38px', borderRadius: '6px', border: hideOld ? '1px solid #ff9800' : '1px solid #444',
                  background: hideOld ? 'rgba(255, 152, 0, 0.15)' : '#1c1c1c',
                  color: hideOld ? '#ff9800' : '#aaa',
                  fontWeight: 'bold', cursor: 'pointer', transition: '0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {hideOld ? 'Recentes' : 'Todos'}
              </button>
            </div>
          </div>
        </div>

        {/* COLUNA 2: Ligas */}
        <div style={{ 
          display: 'flex', flexDirection: 'column', 
          border: '1px solid var(--brand-neon)', padding: '16px', borderRadius: '8px', 
          backgroundColor: 'rgba(212, 255, 0, 0.02)' 
        }}>
          <label style={{ fontSize: '0.8rem', color: '#888', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Trophy size={14} color="#ff9800" /> Ligas Monitoradas
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
            {uniqueLeagues.map((liga) => {
              const isActive = leagueFilter === liga;
              return (
                <button
                  key={liga}
                  onClick={() => setLeagueFilter(liga)}
                  style={{
                    padding: '0 14px',
                    height: '38px',
                    width: '100%',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? '600' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: isActive ? 'rgba(255, 152, 0, 0.15)' : '#1c1c1c',
                    color: isActive ? '#ff9800' : '#ccc',
                    border: `1px solid ${isActive ? '#ff9800' : '#8a5a19'}`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}
                  title={liga} // Mostra o nome completo no hover caso corte
                >
                  {liga}
                </button>
              );
            })}
          </div>
        </div>

        {/* COLUNA 3: Mercados */}
        <div style={{ 
          display: 'flex', flexDirection: 'column', 
          border: '1px solid var(--brand-neon)', padding: '16px', borderRadius: '8px', 
          backgroundColor: 'rgba(212, 255, 0, 0.02)' 
        }}>
          <label style={{ fontSize: '0.8rem', color: '#888', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LineChart size={14} color="var(--brand-neon)" /> Mercados
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
            {uniqueMarkets.map((merc) => {
              const isActive = marketFilter === merc;
              return (
                <button
                  key={merc}
                  onClick={() => setMarketFilter(merc)}
                  style={{
                    padding: '0 14px',
                    height: '38px',
                    width: '100%',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? '600' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: isActive ? 'rgba(212, 255, 0, 0.15)' : '#1c1c1c',
                    color: isActive ? 'var(--brand-neon)' : '#ccc',
                    border: `1px solid ${isActive ? 'var(--brand-neon)' : '#4a5c11'}`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}
                  title={merc}
                >
                  {merc}
                </button>
              );
            })}
          </div>
        </div>
        {/* TABELA DE RESULTADOS COM SCROLL INTERNO E BORDA VERDE - DESKTOP */}
      <div className={styles.desktopTableContainer}>
        <div className="table-responsive-container" style={{ maxHeight: '600px', overflowY: 'auto', borderRadius: '12px', border: '1px solid var(--brand-neon)', boxShadow: '0 0 20px rgba(212, 255, 0, 0.05)' }}>
          <table className={styles.tableContainer} style={{ margin: 0 }}>
            <thead>
              <tr className={styles.tableHeader}>
                <th>Confronto</th>
                <th>Mercado Específico</th>
                <th>Odd Justa vs Mercado</th>
                <th>Margem Matemática (+EV)</th>
                <th style={{ textAlign: 'center' }}>Ação Recomendada</th>
              </tr>
            </thead>
            <tbody>
              {filteredOpportunities.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    Nenhum jogo atende aos filtros atuais ou os jogos antigos foram ocultados.
                  </td>
                </tr>
              ) : (
                filteredOpportunities.map((item) => {
                  const parsedData = parseLiveLeagueName(item.campeonato);
                  
                  return (
                    <tr key={item.id} className={styles.tableRow}>
                      <td>
                        <div style={{ fontSize: '0.8rem', color: 'var(--brand-neon)', marginBottom: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} /> 
                          {new Date(item.created_at).toLocaleDateString('pt-BR')} às {new Date(item.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        
                        <div className={styles.teamName} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {item.confronto}
                          {parsedData.isLive && (
                            <span style={{ 
                              background: '#d32f2f', color: '#fff', fontSize: '0.75rem', 
                              padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold',
                              animation: 'pulse 2s infinite'
                            }}>
                              🔴 {parsedData.minuto}'
                            </span>
                          )}
                        </div>
                        
                        <div className={styles.leagueName} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          {parsedData.cleanName}
                          {parsedData.isLive && (
                            <span style={{ color: '#fff', background: '#333', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                              {parsedData.placar}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>{item.mercado}</td>
                      <td>
                        <span className={styles.oddFair}>{item.odd_justa}</span>
                        <span className={styles.oddValue}>{item.odd_oferecida}</span>
                      </td>
                      <td className={styles.evPositive}>+{item.vantagem_ev_porcentagem}%</td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.stakeBadge}>
                          <span>💰</span> {item.status_aposta.replace("Apostar ", "Aposte ")}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CARDS DE RESULTADOS - MOBILE */}
      <div className={styles.mobileCardsContainer}>
        {filteredOpportunities.length === 0 ? (
          <div className={styles.noOpportunities}>
            Nenhum jogo atende aos filtros atuais ou os jogos antigos foram ocultados.
          </div>
        ) : (
          filteredOpportunities.map((item) => {
            const parsedData = parseLiveLeagueName(item.campeonato);
            const teams = parseTeams(item.confronto);
            const scores = parseScores(parsedData.placar);
            
            const eventDate = new Date(item.created_at);
            const dateStr = eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const timeStr = eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            return (
              <div key={item.id} className={`${styles.mobileCard} ${parsedData.isLive ? styles.liveCard : ''}`}>
                {/* Cabeçalho do Card */}
                <div className={styles.mobileCardHeader}>
                  <div className={styles.mobileCardLeague}>
                    <Trophy size={12} className={styles.leagueIcon} />
                    <span>{parsedData.cleanName}</span>
                  </div>
                  <div className={styles.mobileCardTime}>
                    {parsedData.isLive ? (
                      <span className={styles.liveIndicator}>
                        <span className={styles.liveDot}></span>
                        AO VIVO {parsedData.minuto}'
                      </span>
                    ) : (
                      <span className={styles.timeText}>
                        <Clock size={10} style={{ marginRight: '4px' }} />
                        {dateStr} - {timeStr}
                      </span>
                    )}
                  </div>
                </div>

                {/* Corpo do Card */}
                <div className={styles.mobileCardBody}>
                  {/* Lado Esquerdo: Confronto e Mercado */}
                  <div className={styles.mobileCardLeft}>
                    <div className={styles.mobileCardTeams}>
                      <div className={styles.mobileTeamRow}>
                        <div className={styles.teamNameContainer}>
                          <img 
                            src={getTeamLogoUrl(teams.home)} 
                            alt={teams.home} 
                            style={{ width: '22px', height: '22px', objectFit: 'contain', marginRight: '6px' }} 
                            onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${teams.home}&background=222&color=fff&rounded=true&bold=true&size=22`; }}
                          />
                          <span className={`${styles.mobileTeamName} team-name-text-mobile-hide`}>{teams.home}</span>
                        </div>
                        {parsedData.isLive && (
                          <span className={styles.mobileTeamScore}>{scores.homeScore}</span>
                        )}
                      </div>
                      
                      {teams.away && (
                        <div className={styles.mobileTeamRow}>
                          <div className={styles.teamNameContainer}>
                            <img 
                              src={getTeamLogoUrl(teams.away)} 
                              alt={teams.away} 
                              style={{ width: '22px', height: '22px', objectFit: 'contain', marginRight: '6px' }} 
                              onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${teams.away}&background=222&color=fff&rounded=true&bold=true&size=22`; }}
                            />
                            <span className={`${styles.mobileTeamName} team-name-text-mobile-hide`}>{teams.away}</span>
                          </div>
                          {parsedData.isLive && (
                            <span className={styles.mobileTeamScore}>{scores.awayScore}</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className={styles.mobileMarketInfo}>
                      <span className={styles.marketLabel}>Seleção:</span>
                      <span className={styles.marketValue}>{item.mercado}</span>
                    </div>
                  </div>

                  {/* Lado Direito: Odds e EV */}
                  <div className={styles.mobileCardRight}>
                    <div className={styles.evBadgeMobile}>
                      +{item.vantagem_ev_porcentagem}% EV
                    </div>
                    
                    <div className={styles.mobileOddBox}>
                      <span className={styles.oddLabel}>Odd Oferecida</span>
                      <span className={styles.oddValueMobile}>{item.odd_oferecida}</span>
                      <span className={styles.oddFairMobile}>Justa: {item.odd_justa}</span>
                    </div>
                  </div>
                </div>

                {/* Rodapé do Card: Ação Recomendada */}
                <div className={styles.mobileCardFooter}>
                  <div className={styles.mobileStakeBadge}>
                    <span>💰 Aposta Sugerida:</span>
                    <strong>{item.status_aposta.replace("Apostar ", "Aposte ")}</strong>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

        <style jsx>{`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.6; }
            100% { opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}

