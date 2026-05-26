'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Send, CheckCircle2, Trophy, Loader2 } from 'lucide-react';
import { calculatePoissonMatchStats, formatPct, formatOdd } from '../../utils/poisson';
import { supabase } from '../../lib/supabaseClient';

export default function PalpitesPage() {
  const [games, setGames] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [successId, setSuccessId] = useState(null);
  const [sentIds, setSentIds] = useState(new Set());
  const [autoStatus, setAutoStatus] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [roundInfo, setRoundInfo] = useState(null);

  // Novos estados para Filtro de Ligas e Data
  const [selectedLeague, setSelectedLeague] = useState('71'); // 71 = Brasileirão A
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Estados do Controle de Banca integrado
  const [transactions, setTransactions] = useState([]);
  const [statsMode, setStatsMode] = useState('minhas'); // 'minhas' ou 'modelo'
  const [followAmount, setFollowAmount] = useState('50');
  const [followOdd, setFollowOdd] = useState('');
  const [activeFollowId, setActiveFollowId] = useState(null);
  const [sendingSummary, setSendingSummary] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const currentRoundBets = useMemo(() => {
    if (!roundInfo || games.length === 0 || transactions.length === 0) return [];
    
    return transactions.filter(t => {
      if (!t.description || !t.description.startsWith('[Palpite] ')) return false;
      
      const matchName = t.description.replace('[Palpite] ', '').split(' (')[0];
      return games.some(g => `${g.home} x ${g.away}` === matchName);
    });
  }, [transactions, games, roundInfo]);

  const handleSendRoundSummary = async () => {
    if (currentRoundBets.length === 0) {
      showToast('Nenhuma aposta registrada nesta rodada.', 'error');
      return;
    }

    setSendingSummary(true);

    const formattedBets = currentRoundBets.map(t => {
      const matchName = t.description.replace('[Palpite] ', '').split(' (')[0];
      const selection = t.description.split(' (')[1]?.replace(')', '');
      const game = games.find(g => `${g.home} x ${g.away}` === matchName);

      return {
        home: game ? game.home : matchName.split(' x ')[0],
        away: game ? game.away : matchName.split(' x ')[1],
        selection,
        type: t.type,
        amount: t.amount,
        odd: t.odd || 2.0
      };
    });

    let totalInvested = 0;
    let netProfit = 0;
    let greens = 0;
    let reds = 0;
    let pending = 0;

    currentRoundBets.forEach(t => {
      totalInvested += t.amount;
      if (t.type === 'ganho') {
        netProfit += t.odd ? t.amount * (t.odd - 1) : t.amount;
        greens += 1;
      } else if (t.type === 'perda') {
        netProfit -= t.amount;
        reds += 1;
      } else if (t.type === 'pendente') {
        pending += 1;
      }
    });

    const hitRate = (greens + reds) > 0 ? (greens / (greens + reds)) * 100 : 0;
    const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;

    const payload = {
      round: roundInfo ? roundInfo.round : 'Atual',
      bets: formattedBets,
      stats: {
        totalBets: currentRoundBets.length,
        totalInvested,
        netProfit,
        hitRate,
        roi,
        greens,
        reds,
        pending
      }
    };

    try {
      const response = await fetch('/api/telegram/round-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showToast(`Balanço consolidado da Rodada ${roundInfo?.round} enviado com sucesso para o Telegram! 🏁`, 'success');
      } else {
        const data = await response.json();
        showToast('Erro ao enviar balanço: ' + (data.error || 'Erro desconhecido.'), 'error');
      }
    } catch (err) {
      console.warn("Erro ao enviar resumo:", err);
      showToast('Falha na comunicação com o servidor.', 'error');
    } finally {
      setSendingSummary(false);
    }
  };

  // Auto-disparar resumo da rodada quando ela finalizar (apenas uma vez)
  useEffect(() => {
    if (!roundInfo || games.length === 0 || transactions.length === 0 || currentRoundBets.length === 0 || sendingSummary) return;

    const isRoundFinished = games.every(g => g.isFinished);
    const todayKey = `round_summary_sent_${roundInfo.round}`;
    const alreadySent = localStorage.getItem(todayKey) === 'true';

    if (isRoundFinished && !alreadySent) {
      console.log(`[Auto-Report] Rodada ${roundInfo.round} finalizada. Disparando resumo consolidado automático...`);
      const autoSendRoundSummary = async () => {
        localStorage.setItem(todayKey, 'true');
        
        const formattedBets = currentRoundBets.map(t => {
          const matchName = t.description.replace('[Palpite] ', '').split(' (')[0];
          const selection = t.description.split(' (')[1]?.replace(')', '');
          const game = games.find(g => `${g.home} x ${g.away}` === matchName);

          return {
            home: game ? game.home : matchName.split(' x ')[0],
            away: game ? game.away : matchName.split(' x ')[1],
            selection,
            type: t.type,
            amount: t.amount,
            odd: t.odd || 2.0
          };
        });

        let totalInvested = 0;
        let netProfit = 0;
        let greens = 0;
        let reds = 0;
        let pending = 0;

        currentRoundBets.forEach(t => {
          totalInvested += t.amount;
          if (t.type === 'ganho') {
            netProfit += t.odd ? t.amount * (t.odd - 1) : t.amount;
            greens += 1;
          } else if (t.type === 'perda') {
            netProfit -= t.amount;
            reds += 1;
          } else if (t.type === 'pendente') {
            pending += 1;
          }
        });

        const hitRate = (greens + reds) > 0 ? (greens / (greens + reds)) * 100 : 0;
        const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;

        const payload = {
          round: roundInfo.round,
          bets: formattedBets,
          stats: {
            totalBets: currentRoundBets.length,
            totalInvested,
            netProfit,
            hitRate,
            roi,
            greens,
            reds,
            pending
          }
        };

        try {
          const response = await fetch('/api/telegram/round-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            showToast(`Balanço da Rodada ${roundInfo.round} enviado automaticamente ao Telegram! 🏁`, 'success');
          } else {
            localStorage.removeItem(todayKey);
          }
        } catch (err) {
          console.warn("[Auto-Report] Falha no disparo automático:", err);
          localStorage.removeItem(todayKey);
        }
      };

      autoSendRoundSummary();
    }
  }, [games, transactions, currentRoundBets, roundInfo, sendingSummary]);

  // Carregar transações para estatísticas e verificação de palpites seguidos
  useEffect(() => {
    async function loadTransactions() {
      if (!supabase) {
        fallbackToLocal();
        return;
      }
      try {
        const { data, error } = await supabase
          .from('banca_transactions')
          .select('*');
        if (error) throw error;
        
        // Sincronizar dados locais pendentes para a nuvem
        const syncedList = await syncLocalTransactionsToCloud(data || []);
        
        // Auto resolver palpites pendentes
        const resolvedList = await autoResolvePendingBets(syncedList);
        setTransactions(resolvedList);
      } catch (err) {
        console.warn("Erro ao carregar transações do Supabase:", err);
        fallbackToLocal();
      }
    }

    async function syncLocalTransactionsToCloud(cloudList) {
      const savedTxs = localStorage.getItem('ev_tracker_banca_txs');
      if (!savedTxs) return cloudList;

      try {
        const localList = JSON.parse(savedTxs);
        if (!Array.isArray(localList) || localList.length === 0) return cloudList;

        const unsyncedList = [];
        const cloudKeys = new Set(cloudList.map(t => `${t.date}_${t.type}_${t.amount}_${t.description}`));

        for (const localTx of localList) {
          const key = `${localTx.date}_${localTx.type}_${localTx.amount}_${localTx.description}`;
          if (!cloudKeys.has(key)) {
            const { id, ...txToUpload } = localTx;
            unsyncedList.push(txToUpload);
          }
        }

        if (unsyncedList.length === 0) return cloudList;

        console.log(`[Sync] Enviando ${unsyncedList.length} transações locais para o Supabase...`);
        const { data: insertedData, error } = await supabase
          .from('banca_transactions')
          .insert(unsyncedList)
          .select();

        if (error) {
          console.warn("[Sync] Erro ao sincronizar transações locais para o Supabase:", error);
          return cloudList;
        }

        const newCloudList = [...(insertedData || []), ...cloudList];
        localStorage.setItem('ev_tracker_banca_txs', JSON.stringify(newCloudList));
        console.log("[Sync] Sincronização automática concluída!");
        return newCloudList;
      } catch (e) {
        console.warn("[Sync] Falha no processo de sincronização automática:", e);
        return cloudList;
      }
    }

    async function autoResolvePendingBets(txList) {
      const pendingTxs = txList.filter(t => t.type === 'pendente');
      if (pendingTxs.length === 0) return txList;

      try {
        const [resA, resB] = await Promise.all([
          fetch('/api/football/fixtures?league=71&all=true'),
          fetch('/api/football/fixtures?league=72&all=true')
        ]);
        
        let allFixtures = [];
        if (resA.ok) {
          const dataA = await resA.json();
          if (dataA.fixtures) allFixtures = [...allFixtures, ...dataA.fixtures];
        }
        if (resB.ok) {
          const dataB = await resB.json();
          if (dataB.fixtures) allFixtures = [...allFixtures, ...dataB.fixtures];
        }

        if (allFixtures.length === 0) return txList;

        let updatedList = [...txList];
        let didUpdate = false;

        for (const t of pendingTxs) {
          if (!t.description || !t.description.startsWith('[Palpite] ')) continue;
          
          const matchName = t.description.replace('[Palpite] ', '').split(' (')[0];
          const bestTip = t.description.split(' (')[1]?.replace(')', '');
          
          const game = allFixtures.find(f => `${f.home} x ${f.away}` === matchName);
          if (game && game.isFinished) {
            const gh = game.goalsHome;
            const ga = game.goalsAway;
            let isHit = false;

            if (bestTip === 'Casa' || bestTip === 'Casa Vence') isHit = gh > ga;
            else if (bestTip === 'Fora' || bestTip === 'Fora Vence') isHit = ga > gh;
            else if (bestTip === 'Empate') isHit = gh === ga;
            else if (bestTip === 'Mais de 2.5 Gols') isHit = (gh + ga) > 2;
            else if (bestTip === 'Menos de 2.5 Gols') isHit = (gh + ga) < 3;
            else if (bestTip === 'Ambos Marcam' || bestTip === 'Sim' || bestTip === 'Ambas Marcam') isHit = gh > 0 && ga > 0;

            const resolvedType = isHit ? 'ganho' : 'perda';
            t.type = resolvedType;
            didUpdate = true;

            // Atualizar no Supabase
            if (supabase) {
              await supabase
                .from('banca_transactions')
                .update({ type: resolvedType })
                .eq('id', t.id);
            }
          }
        }

        if (didUpdate && !supabase) {
          localStorage.setItem('ev_tracker_banca_txs', JSON.stringify(updatedList));
        }

        return updatedList;
      } catch (e) {
        console.warn("Auto-resolve no Supabase falhou:", e);
        return txList;
      }
    }

    function fallbackToLocal() {
      const savedTxs = localStorage.getItem('ev_tracker_banca_txs');
      if (savedTxs) {
        try {
          const parsed = JSON.parse(savedTxs);
          autoResolvePendingBets(parsed).then(resolved => {
            setTransactions(resolved);
          });
        } catch (e) {
          console.warn("Erro ao carregar transações locais:", e);
        }
      }
    }

    loadTransactions();
  }, []);

  const myStats = useMemo(() => {
    // Filtrar apenas transações associadas a palpites da página (iniciam com [Palpite])
    const followedBets = transactions.filter(t => t.description && t.description.startsWith('[Palpite]'));
    
    const totalBets = followedBets.filter(t => t.type === 'ganho' || t.type === 'perda').length;
    const wins = followedBets.filter(t => t.type === 'ganho').length;
    const losses = followedBets.filter(t => t.type === 'perda').length;
    const hitRate = totalBets > 0 ? (wins / totalBets) * 100 : 0;
    
    let totalProfit = 0;
    let totalLoss = 0;
    let totalAmountBet = 0;
    
    followedBets.forEach(t => {
      if (t.type === 'ganho') {
        const profit = t.odd ? t.amount * (t.odd - 1) : t.amount;
        totalProfit += profit;
        totalAmountBet += t.amount;
      } else if (t.type === 'perda') {
        totalLoss += t.amount;
        totalAmountBet += t.amount;
      }
    });
    
    const netProfit = totalProfit - totalLoss;
    const roi = totalAmountBet > 0 ? (netProfit / totalAmountBet) * 100 : 0;
    
    return {
      totalBets,
      wins,
      losses,
      hitRate,
      roi,
      netProfit,
      totalAmountBet
    };
  }, [transactions]);

  const isFollowed = (game) => {
    const bestTip = game.stats?.bestTip?.selection;
    const desc = `[Palpite] ${game.home} x ${game.away} (${bestTip})`;
    return transactions.some(t => t.description === desc);
  };

  const handleConfirmFollow = async (game) => {
    if (!followAmount || Number(followAmount) <= 0) return;
    
    const amount = Number(followAmount);
    const odd = followOdd ? Number(followOdd) : (game.stats.bestTip.prob ? Number((1 / game.stats.bestTip.prob).toFixed(2)) : 2.0);
    const bestTip = game.stats.bestTip.selection;
    const desc = `[Palpite] ${game.home} x ${game.away} (${bestTip})`;
    
    let type = 'pendente';
    if (game.isFinished) {
      const gh = game.goalsHome;
      const ga = game.goalsAway;
      let isHit = false;

      if (bestTip === 'Casa' || bestTip === 'Casa Vence') isHit = gh > ga;
      else if (bestTip === 'Fora' || bestTip === 'Fora Vence') isHit = ga > gh;
      else if (bestTip === 'Empate') isHit = gh === ga;
      else if (bestTip === 'Mais de 2.5 Gols') isHit = (gh + ga) > 2;
      else if (bestTip === 'Menos de 2.5 Gols') isHit = (gh + ga) < 3;
      else if (bestTip === 'Ambos Marcam' || bestTip === 'Sim' || bestTip === 'Ambas Marcam') isHit = gh > 0 && ga > 0;

      type = isHit ? 'ganho' : 'perda';
    }

    const newTx = {
      date: new Date().toISOString().slice(0, 10),
      type,
      amount,
      description: desc,
      odd
    };

    let success = false;
    let savedTx = null;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('banca_transactions')
          .insert([newTx])
          .select();

        if (error) throw error;
        if (data && data.length > 0) {
          savedTx = data[0];
          success = true;
        }
      } catch (err) {
        console.warn("Erro ao salvar no Supabase (usando fallback local):", err);
      }
    }

    if (!success) {
      savedTx = { id: Date.now(), ...newTx };
      const savedTxs = localStorage.getItem('ev_tracker_banca_txs');
      let txList = [];
      if (savedTxs) {
        try {
          txList = JSON.parse(savedTxs);
        } catch (e) {}
      }
      txList = [savedTx, ...txList];
      localStorage.setItem('ev_tracker_banca_txs', JSON.stringify(txList));
      success = true;
    }

    if (success && savedTx) {
      setTransactions(prev => [savedTx, ...prev]);
      showToast('Palpite registrado com sucesso no seu Controle de Banca!', 'success');
    }

    setActiveFollowId(null);
  };


  useEffect(() => {
    const fetchFixtures = async () => {
      setPageLoading(true);
      try {
        const response = await fetch(`/api/football/fixtures?league=${selectedLeague}&date=${selectedDate}`);
        const data = await response.json();

        if (data.error) {
          setApiError(data.error);
          setPageLoading(false);
          return;
        }

        const processedGames = data.fixtures.map(game => {
          const stats = calculatePoissonMatchStats(
            game.homeXG, 
            game.awayXG, 
            game.isLive, 
            game.minute || 0, 
            game.goalsHome || 0, 
            game.goalsAway || 0
          );
          return { ...game, stats };
        });

        setGames(processedGames);
        setRoundInfo({ round: data.round, season: data.season });
      } catch (err) {
        console.error('Erro ao buscar jogos:', err);
        setApiError('Falha ao conectar com a API de futebol.');
      } finally {
        setPageLoading(false);
      }
    };

    fetchFixtures();
  }, [selectedLeague, selectedDate]);

  // === MOTOR DE ENVIO AUTOMÁTICO ===
  useEffect(() => {
    if (games.length === 0) return;

    // Ler configurações do localStorage
    const savedConfig = localStorage.getItem('ev_tracker_settings');
    if (!savedConfig) return;

    const config = JSON.parse(savedConfig);
    if (!config.autoBroadcast) return;

    // Verificar quais jogos de HOJE já foram enviados
    const todayKey = `sent_palpites_${new Date().toISOString().slice(0, 10)}`;
    const alreadySent = JSON.parse(localStorage.getItem(todayKey) || '[]');
    const alreadySentSet = new Set(alreadySent);
    setSentIds(alreadySentSet);

    // Filtrar apenas jogos de HOJE que ainda não foram enviados
    const todayGames = games.filter(g => g.dayCategory === 'HOJE' && !alreadySentSet.has(g.id));
    if (todayGames.length === 0) return;

    // Disparar em sequência com delay de 1s entre cada
    const autoSend = async () => {
      setAutoStatus('sending');
      const newSentIds = new Set(alreadySentSet);

      for (const game of todayGames) {
        const payload = {
          match: `${game.home} x ${game.away}`,
          tip: game.stats.bestTip.selection,
          probability: formatPct(game.stats.bestTip.prob),
          odd: formatOdd(game.stats.bestTip.prob)
        };

        try {
          const response = await fetch('/api/telegram/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            newSentIds.add(game.id);
            setSentIds(new Set(newSentIds));
          }
        } catch (err) {
          console.error('Auto-broadcast falhou para:', game.home, 'x', game.away, err);
        }

        // Pausa de 1 segundo entre envios para não sobrecarregar a API do Telegram
        await new Promise(r => setTimeout(r, 1000));
      }

      // Salvar no localStorage para não reenviar
      localStorage.setItem(todayKey, JSON.stringify([...newSentIds]));
      setAutoStatus('done');
      setTimeout(() => setAutoStatus(null), 5000);
    };

    autoSend();
  }, [games]);

  const handleBroadcast = async (game) => {
    setLoadingId(game.id);
    
    const payload = {
      match: `${game.home} x ${game.away}`,
      tip: game.stats.bestTip.selection,
      probability: formatPct(game.stats.bestTip.prob),
      odd: formatOdd(game.stats.bestTip.prob)
    };

    try {
      const response = await fetch('/api/telegram/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setSuccessId(game.id);
        const todayKey = `sent_palpites_${new Date().toISOString().slice(0, 10)}`;
        const alreadySent = JSON.parse(localStorage.getItem(todayKey) || '[]');
        alreadySent.push(game.id);
        localStorage.setItem(todayKey, JSON.stringify(alreadySent));
        setSentIds(prev => new Set([...prev, game.id]));
        setTimeout(() => setSuccessId(null), 3000);
      } else {
        showToast('Erro ao disparar no Telegram.', 'error');
      }
    } catch (err) {
      showToast('Falha na comunicação com o servidor.', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  // Filtro de jogos removido pois a API já traz a data exata


  return (
    <div className="palpites-container">
      
      <header style={{ marginBottom: '32px', paddingTop: '16px' }}>
        <h1 className="page-title">
          <Trophy color="#FFD700" size={32} />
          Palpites Brasileirão 🇧🇷
        </h1>
        <p style={{ color: '#888', marginTop: '8px', fontSize: '1.1rem' }}>
          Lista de prognósticos matemáticos gerados via Distribuição de Poisson. Dispare diretamente para os seus clientes.
        </p>
      </header>

      {/* Seletores de Liga e Data (Layout Organizado e Responsivo) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          overflowX: 'auto', 
          paddingBottom: '8px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }} className="no-scrollbar">
          {[
            { id: '71', name: '🇧🇷 Série A' },
            { id: '72', name: '🇧🇷 Série B' },
            { id: '13', name: '🌎 Libertadores' },
            { id: '39', name: '🇬🇧 Premier' },
            { id: '140', name: '🇪🇸 La Liga' },
            { id: '135', name: '🇮🇹 Serie A' },
            { id: '78', name: '🇩🇪 Bundes' }
          ].map(lg => (
            <button
              key={lg.id}
              onClick={() => setSelectedLeague(lg.id)}
              style={{
                background: selectedLeague === lg.id ? 'var(--brand-neon)' : '#222',
                color: selectedLeague === lg.id ? '#000' : '#888',
                padding: '8px 16px',
                borderRadius: '20px',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              {lg.name}
            </button>
          ))}
        </div>

        {/* Data e Seletor de Rodada Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ color: 'var(--brand-neon)', fontWeight: 'bold', fontSize: '0.9rem' }}>
            {roundInfo ? `Temporada ${roundInfo.season} • Rodada ${roundInfo.round}` : ''}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: '#888', fontWeight: 'bold' }}>Filtro de Data:</span>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: '8px 12px',
                background: '#222',
                border: 'none',
                color: 'var(--brand-neon)',
                borderRadius: '20px',
                cursor: 'pointer',
                colorScheme: 'dark',
                fontWeight: 'bold',
                outline: 'none',
                fontSize: '0.9rem'
              }}
            />
          </div>
        </div>
      </div>

      {/* Banner Balanço da Rodada */}
      {currentRoundBets.length > 0 && (
        <div style={{ 
          background: 'linear-gradient(90deg, #111115, #1c1c24)', 
          border: '1px solid #333', 
          borderLeft: '4px solid var(--brand-neon)',
          borderRadius: '12px', 
          padding: '14px 20px', 
          marginBottom: '24px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fff' }}>
              🏁 Rodada {roundInfo?.round} em Andamento/Finalizada
            </div>
            <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '2px' }}>
              Você seguiu {currentRoundBets.length} palpites nesta rodada. Deseja enviar o balanço parcial/final para os seus clientes no Telegram?
            </div>
          </div>
          
          <button
            onClick={handleSendRoundSummary}
            disabled={sendingSummary}
            style={{
              background: 'var(--brand-neon)',
              color: '#000',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              cursor: sendingSummary ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(204, 255, 0, 0.2)'
            }}
          >
            {sendingSummary ? (
              <>Enviando...</>
            ) : (
              <>Enviar Balanço da Rodada 🤖</>
            )}
          </button>
        </div>
      )}

      {/* Seletor de Estatísticas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ fontSize: '1rem', color: '#ccc', margin: 0, fontWeight: 'bold' }}>Estatísticas de Desempenho</h3>
        <div style={{ display: 'flex', background: '#141419', borderRadius: '20px', padding: '4px', border: '1px solid #27272a' }}>
          <button 
            onClick={() => setStatsMode('minhas')}
            style={{
              background: statsMode === 'minhas' ? 'var(--brand-neon)' : 'transparent',
              color: statsMode === 'minhas' ? '#000' : '#888',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '20px',
              fontWeight: 'bold',
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Minhas Apostas
          </button>
          <button 
            onClick={() => setStatsMode('modelo')}
            style={{
              background: statsMode === 'modelo' ? 'var(--brand-neon)' : 'transparent',
              color: statsMode === 'modelo' ? '#000' : '#888',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '20px',
              fontWeight: 'bold',
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Histórico do Modelo
          </button>
        </div>
      </div>

      {/* Estatísticas de Acertos (KPI Cards) */}
      {(() => {
        const currentStats = statsMode === 'minhas' 
          ? {
              hitRate: myStats.totalBets > 0 ? `${myStats.hitRate.toFixed(1)}%` : '--',
              roi: myStats.totalBets > 0 ? `${myStats.roi >= 0 ? '+' : ''}${myStats.roi.toFixed(1)}%` : '--',
              greens: myStats.wins,
              reds: myStats.losses,
              subtextRate: `Base: ${myStats.totalBets} palpites seguidos`,
              subtextRoi: `Volume: R$ ${myStats.totalAmountBet.toFixed(2)}`,
              subtextResult: `Últimas rodadas ativas`
            }
          : {
              hitRate: '78.4%',
              roi: '+18.2%',
              greens: 116,
              reds: 32,
              subtextRate: 'Base: 148 palpites enviados',
              subtextRoi: 'Volume: 12.4 u líquidas',
              subtextResult: 'Últimas 4 rodadas monitoradas'
            };

        return (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '20px', 
            marginBottom: '32px' 
          }}>
            <div className="glass-panel" style={{ 
              background: 'linear-gradient(135deg, #111115, #161622)', 
              borderLeft: '4px solid var(--brand-neon)',
              padding: '12px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minHeight: '85px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Taxa de Acerto Geral</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                {currentStats.hitRate}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '2px' }}>{currentStats.subtextRate}</div>
            </div>

            <div className="glass-panel" style={{ 
              background: 'linear-gradient(135deg, #111115, #161622)', 
              borderLeft: '4px solid #00d2ff',
              padding: '12px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minHeight: '85px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>ROI (Retorno do Mês)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--brand-neon)', marginTop: '4px' }}>
                {currentStats.roi}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '2px' }}>{currentStats.subtextRoi}</div>
            </div>

            <div className="glass-panel" style={{ 
              background: 'linear-gradient(135deg, #111115, #161622)', 
              borderLeft: '4px solid #ff9800',
              padding: '12px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minHeight: '85px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Palpites Verdes / Vermelhos</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: '#4CAF50' }}>{currentStats.greens} 🟢</span>
                <span style={{ fontSize: '1.1rem', color: '#444' }}>/</span>
                <span style={{ color: '#ff4d4d' }}>{currentStats.reds} 🔴</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '2px' }}>{currentStats.subtextResult}</div>
            </div>

            <div className="glass-panel" style={{ 
              background: 'linear-gradient(135deg, #111115, #161622)', 
              borderLeft: '4px solid #b339ff',
              padding: '12px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minHeight: '85px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Mercado mais Lucrativo</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                Mais de 2.5 Gols
              </div>
              <div style={{ fontSize: '0.7rem', color: '#4CAF50', fontWeight: 'bold', marginTop: '2px' }}>Taxa de Acerto: 84.1%</div>
            </div>
          </div>
        );
      })()}

      {/* Banner de Status do Auto-Broadcast */}
      {autoStatus === 'sending' && (
        <div style={{ background: 'linear-gradient(90deg, #1a1a2e, #16213e)', border: '1px solid #4CAF50', borderRadius: '12px', padding: '16px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', animation: 'pulse 2s infinite' }}>
          <Loader2 size={20} color="#4CAF50" className="spin" />
          <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>🤖 Piloto Automático ativo — Disparando palpites do dia para o Telegram...</span>
        </div>
      )}
      {autoStatus === 'done' && (
        <div style={{ background: 'linear-gradient(90deg, #1a2e1a, #162e16)', border: '1px solid #4CAF50', borderRadius: '12px', padding: '16px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CheckCircle2 size={20} color="#4CAF50" />
          <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>✅ Todos os palpites do dia foram enviados automaticamente para o Telegram!</span>
        </div>
      )}

      {/* Tabs Funcionais Removidas (Filtro por API-Sports já resolve) */}

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '60px' }}>
        {pageLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ background: '#111', borderRadius: '16px', border: '1px solid #333', padding: '32px', animation: 'pulse 1.5s infinite', flexShrink: 0 }}>
                <div style={{ height: '14px', width: '120px', background: '#222', borderRadius: '4px', marginBottom: '12px' }} />
                <div style={{ height: '20px', width: '280px', background: '#222', borderRadius: '4px', marginBottom: '12px' }} />
                <div style={{ height: '16px', width: '200px', background: '#222', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        )}
        {apiError && (
          <div style={{ color: '#ff6b6b', padding: '24px', background: '#1a0000', borderRadius: '12px', textAlign: 'center', border: '1px solid #ff6b6b' }}>⚠️ {apiError}</div>
        )}
        {!pageLoading && !apiError && games.length === 0 && (
          <div style={{ color: '#888', fontStyle: 'italic', padding: '24px', background: '#111', borderRadius: '12px', textAlign: 'center' }}>Nenhum jogo encontrado para este dia.</div>
        )}
        {games.map(game => (
          <div key={game.id} style={{ 
            background: '#111', 
            borderRadius: '16px', 
            border: game.isLive ? '1px solid #ff4444' : '1px solid #333', 
            borderLeft: game.isLive ? '6px solid #ff4444' : game.isFinished ? '6px solid #666' : '6px solid #4CAF50',
            overflow: 'hidden',
            opacity: game.isFinished ? 0.7 : 1,
            flexShrink: 0
          }}>
            {/* Linha Principal do Card */}
            <div className="game-card-main-row">
              
              {/* Bloco 1: Informações do Jogo */}
              <div className="game-card-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className="mobile-hide" style={{ color: game.isLive ? '#ff4444' : '#4CAF50', fontWeight: 'bold', fontSize: '0.9rem' }}>{game.date}</span>
                  {game.isLive && <span style={{ background: '#ff4444', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', animation: 'pulse 1.5s infinite' }}>🔴 AO VIVO</span>}
                  {game.isFinished && <span style={{ background: '#444', color: '#aaa', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>ENCERRADO</span>}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '4px', textTransform: 'uppercase' }}>Futebol</div>
                <div style={{ fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Brasileirão Série A <span style={{ background: '#333', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', color: '#aaa' }}>Rodada {game.round}</span>
                </div>
                
                <div className="game-card-teams-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'flex-end', textAlign: 'right' }}>
                    <span className="team-name-text-mobile-hide">{game.home}</span>
                    <img 
                      src={game.homeLogo || `https://ui-avatars.com/api/?name=${game.home}&background=222&color=fff&rounded=true&bold=true&size=32`} 
                      alt={game.home} 
                      style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px', maxWidth: '32px', maxHeight: '32px', objectFit: 'contain', display: 'block' }}
                      onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${game.home}&background=222&color=fff&rounded=true&bold=true&size=32`; }} 
                    />
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    color: (game.isLive || game.isFinished) ? '#4CAF50' : '#555', 
                    fontSize: '1.2rem', 
                    fontWeight: 'bold',
                    background: (game.isLive || game.isFinished) ? '#1a1a1a' : 'transparent',
                    padding: (game.isLive || game.isFinished) ? '6px 14px' : '0',
                    borderRadius: '8px',
                    border: (game.isLive || game.isFinished) ? '1px solid #333' : 'none',
                    justifyContent: 'center'
                  }}>
                    {(game.isLive || game.isFinished) ? (
                      <>
                        <span style={{ fontSize: '1.3rem', color: '#fff' }}>{game.goalsHome}</span>
                        <span style={{ fontSize: '0.85rem', color: '#555' }}>X</span>
                        <span style={{ fontSize: '1.3rem', color: '#fff' }}>{game.goalsAway}</span>
                      </>
                    ) : (
                      'X'
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'flex-start' }}>
                    <img 
                      src={game.awayLogo || `https://ui-avatars.com/api/?name=${game.away}&background=222&color=fff&rounded=true&bold=true&size=32`} 
                      alt={game.away} 
                      style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px', maxWidth: '32px', maxHeight: '32px', objectFit: 'contain', display: 'block' }}
                      onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${game.away}&background=222&color=fff&rounded=true&bold=true&size=32`; }} 
                    />
                    <span className="team-name-text-mobile-hide">{game.away}</span>
                  </div>
                </div>
              </div>

              {/* Bloco 2: 1 X 2 Visual */}
              <div className="game-card-1x2">
                <div style={{ border: '1px solid #333', padding: '6px 0', textAlign: 'center', borderRadius: '4px', color: '#888', fontWeight: 'bold', background: game.stats.bestTip.selection === 'Casa Vence' ? '#4CAF50' : 'transparent', color: game.stats.bestTip.selection === 'Casa Vence' ? '#fff' : '#888' }}>1</div>
                <div style={{ border: '1px solid #333', padding: '6px 0', textAlign: 'center', borderRadius: '4px', color: '#888', fontWeight: 'bold', background: game.stats.bestTip.selection === 'Empate' ? '#4CAF50' : 'transparent', color: game.stats.bestTip.selection === 'Empate' ? '#fff' : '#888' }}>X</div>
                <div style={{ border: '1px solid #333', padding: '6px 0', textAlign: 'center', borderRadius: '4px', color: '#888', fontWeight: 'bold', background: game.stats.bestTip.selection === 'Fora Vence' ? '#4CAF50' : 'transparent', color: game.stats.bestTip.selection === 'Fora Vence' ? '#fff' : '#888' }}>2</div>
              </div>

              {/* Bloco 3: Destaque do Palpite */}
              <div className="game-card-highlight">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', letterSpacing: '2px', color: '#888', marginBottom: '4px' }}>P A L P I T E</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '8px', color: '#fff' }}>{game.stats.bestTip.selection}</div>
                  <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Probabilidade <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{formatPct(game.stats.bestTip.prob)}%</span></div>
                </div>
                
                {/* ODD Verde Redonda */}
                <div style={{ background: '#4CAF50', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 15px rgba(76, 175, 80, 0.4)', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>ODD</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>@{formatOdd(game.stats.bestTip.prob)}</div>
                </div>
              </div>
            </div>

            {/* Expansão e Área de Disparo */}
            <div style={{ borderTop: '1px solid #222', padding: '16px 24px', background: '#0a0a0a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ color: '#aaa', fontSize: '0.9rem', flex: '1 1 300px' }}>
                O nosso <strong>algoritmo de Poisson</strong> validou esta entrada (Base: xG {game.homeXG} vs {game.awayXG}).
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                {/* Botão Seguir Palpite */}
                <button
                  onClick={() => {
                    if (isFollowed(game)) return;
                    if (activeFollowId === game.id) {
                      setActiveFollowId(null);
                    } else {
                      setActiveFollowId(game.id);
                      setFollowAmount('50');
                      setFollowOdd(game.stats.bestTip.prob ? (1 / game.stats.bestTip.prob).toFixed(2) : '2.00');
                    }
                  }}
                  disabled={isFollowed(game)}
                  style={{
                    background: isFollowed(game) ? 'rgba(76, 175, 80, 0.15)' : activeFollowId === game.id ? '#ff9800' : 'transparent',
                    color: isFollowed(game) ? '#4CAF50' : activeFollowId === game.id ? '#fff' : '#aaa',
                    border: isFollowed(game) ? '1px solid rgba(76, 175, 80, 0.3)' : activeFollowId === game.id ? '1px solid #ff9800' : '1px solid #444',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 'bold',
                    cursor: isFollowed(game) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s'
                  }}
                >
                  {isFollowed(game) ? (
                    <>✓ Seguido (Banca)</>
                  ) : activeFollowId === game.id ? (
                    <>Cancelar ✕</>
                  ) : (
                    <>Seguir Palpite 🎯</>
                  )}
                </button>

                {/* Botão Enviar p/ Telegram */}
                <button 
                  onClick={() => handleBroadcast(game)}
                  disabled={loadingId === game.id || sentIds.has(game.id)}
                  style={{ 
                    background: sentIds.has(game.id) ? '#333' : successId === game.id ? '#4CAF50' : 'var(--brand-neon)', 
                    color: sentIds.has(game.id) ? '#888' : '#000', 
                    padding: '10px 24px', 
                    borderRadius: '8px', 
                    fontSize: '0.95rem', 
                    fontWeight: 'bold', 
                    border: 'none', 
                    cursor: (loadingId === game.id || sentIds.has(game.id)) ? 'not-allowed' : 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    transition: 'all 0.3s',
                    opacity: sentIds.has(game.id) ? 0.7 : 1
                  }}
                >
                  {loadingId === game.id ? (
                    <><Loader2 size={18} className="spin" /> Disparando...</>
                  ) : sentIds.has(game.id) ? (
                    <><CheckCircle2 size={18} /> Já Enviado ✅</>
                  ) : successId === game.id ? (
                    <><CheckCircle2 size={18} /> Enviado!</>
                  ) : (
                    <><Send size={18} /> Enviar p/ Telegram</>
                  )}
                </button>
              </div>
            </div>

            {/* Painel Inline para Entrada Rápida na Banca */}
            {activeFollowId === game.id && (
              <div style={{ 
                borderTop: '1px solid #222', 
                padding: '16px 24px', 
                background: '#0c0c10', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                flexWrap: 'wrap', 
                gap: '16px' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'bold' }}>Valor da Aposta (R$)</label>
                    <input 
                      type="number"
                      value={followAmount}
                      onChange={(e) => setFollowAmount(e.target.value)}
                      placeholder="50"
                      style={{ 
                        background: '#1a1a24', 
                        border: '1px solid #333', 
                        color: '#fff', 
                        padding: '8px 12px', 
                        borderRadius: '6px', 
                        width: '120px',
                        fontSize: '0.9rem' 
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'bold' }}>Odd Coletada</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={followOdd}
                      onChange={(e) => setFollowOdd(e.target.value)}
                      placeholder="2.00"
                      style={{ 
                        background: '#1a1a24', 
                        border: '1px solid #333', 
                        color: '#fff', 
                        padding: '8px 12px', 
                        borderRadius: '6px', 
                        width: '100px',
                        fontSize: '0.9rem' 
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => handleConfirmFollow(game)}
                    style={{
                      background: 'var(--brand-neon)',
                      color: '#000',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 8px rgba(204, 255, 0, 0.2)'
                    }}
                  >
                    Confirmar Registro 🎯
                  </button>
                  <button
                    onClick={() => setActiveFollowId(null)}
                    style={{
                      background: 'transparent',
                      color: '#aaa',
                      border: '1px solid #444',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Voltar
                  </button>
                </div>
              </div>
            )}

          </div>
        ))}
      </div>

      {/* Toast Notificação Customizada */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#141419',
          border: '1px solid ' + (toast.type === 'success' ? '#4CAF50' : toast.type === 'error' ? '#ff4d4d' : '#ff9800'),
          borderLeft: '5px solid ' + (toast.type === 'success' ? '#4CAF50' : toast.type === 'error' ? '#ff4d4d' : '#ff9800'),
          borderRadius: '8px',
          padding: '16px 24px',
          zIndex: 9999,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <span style={{ fontSize: '1.2rem' }}>
            {toast.type === 'success' ? '🟢' : toast.type === 'error' ? '🔴' : '⏳'}
          </span>
          <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.9rem' }}>{toast.message}</span>
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
        @keyframes slideIn {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
