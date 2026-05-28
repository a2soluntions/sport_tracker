'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownLeft, 
  PlusCircle, 
  Trash2, 
  PiggyBank, 
  Percent 
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { calculatePoissonMatchStats } from '../../utils/poisson';

const getTeamLogoUrl = (teamName) => {
  if (!teamName) return '';
  const clean = teamName.trim().toUpperCase();
  const mapping = {
    'FLAMENGO': 127, 'PALMEIRAS': 121, 'CORINTHIANS': 131,
    'SÃO PAULO': 126, 'SAO PAULO': 126, 'SANTOS': 128,
    'GRÊMIO': 130, 'GREMIO': 130, 'INTERNACIONAL': 119,
    'ATLÉTICO-MG': 134, 'ATLETICO MG': 134, 'ATLÉTICO MG': 134,
    'FLUMINENSE': 124, 'BOTAFOGO': 120, 'VASCO': 133, 'VASCO DA GAMA': 133,
    'CRUZEIRO': 125, 'BAHIA': 118, 'ATHLETICO-PR': 135, 'ATHLETICO PR': 135,
    'FORTALEZA': 154, 'CEARÁ': 129, 'CEARA': 129, 'CORITIBA': 132,
    'GOIÁS': 151, 'GOIAS': 151, 'BRAGANTINO': 794, 'RED BULL BRAGANTINO': 794,
    'CUIABÁ': 1100, 'CUIABA': 1100, 'CRICIÚMA': 1192, 'CRICIUMA': 1192,
    'BOTAFOGO-SP': 1190, 'AMÉRICA-MG': 123, 'AMERICA MG': 123,
    'VILA NOVA': 1193, 'OPERÁRIO-PR': 1194, 'OPERARIO PR': 1194,
    'CHAPECOENSE': 122, 'REMO': 1195
  };
  const teamId = mapping[clean];
  if (teamId) return `https://media.api-sports.io/football/teams/${teamId}.png`;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(teamName)}&background=141419&color=CCFF00&rounded=true&bold=true&size=24`;
};

const parseMatchTeams = (description) => {
  const clean = description.replace('[Palpite] ', '').replace('[Aposta Criada] ', '');
  const matchPart = clean.split(' (')[0];
  let parts = [];
  if (matchPart.includes(' x ')) parts = matchPart.split(' x ');
  else if (matchPart.includes(' vs ')) parts = matchPart.split(' vs ');
  else if (matchPart.includes(' - ')) parts = matchPart.split(' - ');
  if (parts.length >= 2) return { home: parts[0].trim(), away: parts[1].trim(), rest: clean.includes('(') ? ' (' + clean.split('(').slice(1).join('(') : '' };
  return { home: matchPart, away: '', rest: '' };
};

const evaluateSelection = (selection, gh, ga) => {
  if (!selection) return true;
  const cleanSel = selection.trim().toLowerCase();
  
  // 1X2
  if (cleanSel === 'casa' || cleanSel === 'casa vence' || cleanSel === 'casa vencer') return gh > ga;
  if (cleanSel === 'fora' || cleanSel === 'fora vence' || cleanSel === 'fora vencer') return ga > gh;
  if (cleanSel === 'empate') return gh === ga;
  
  // Ambos marcam
  if (cleanSel.includes('ambos marcam') || cleanSel.includes('ambas marcam')) {
    if (cleanSel.includes('sim')) return gh > 0 && ga > 0;
    if (cleanSel.includes('nã') || cleanSel.includes('na')) return !(gh > 0 && ga > 0);
  }
  if (cleanSel === 'sim') return gh > 0 && ga > 0;
  if (cleanSel === 'não' || cleanSel === 'nao') return !(gh > 0 && ga > 0);
  
  // Placar Exato (e.g. Placar 1x0)
  const placarMatch = cleanSel.match(/placar\s+(\d+)\s*[x-]\s*(\d+)/);
  if (placarMatch) {
    const targetH = parseInt(placarMatch[1]);
    const targetA = parseInt(placarMatch[2]);
    return gh === targetH && ga === targetA;
  }
  
  // Fora Acima/Abaixo
  const foraOverMatch = cleanSel.match(/fora\s+(?:acima|mais)\s*(?:de)?\s*(\d+(?:\.\d+)?)/);
  if (foraOverMatch) {
    const val = parseFloat(foraOverMatch[1]);
    return ga > val;
  }
  const foraUnderMatch = cleanSel.match(/fora\s+(?:abaixo|menos)\s*(?:de)?\s*(\d+(?:\.\d+)?)/);
  if (foraUnderMatch) {
    const val = parseFloat(foraUnderMatch[1]);
    return ga < val;
  }

  // Acima/Mais de Z Gols
  const overMatch = cleanSel.match(/(?:acima|mais)\s*(?:de)?\s*(\d+(?:\.\d+)?)/);
  if (overMatch) {
    const val = parseFloat(overMatch[1]);
    return (gh + ga) > val;
  }
  
  // Abaixo/Menos de Z Gols
  const underMatch = cleanSel.match(/(?:abaixo|menos)\s*(?:de)?\s*(\d+(?:\.\d+)?)/);
  if (underMatch) {
    const val = parseFloat(underMatch[1]);
    return (gh + ga) < val;
  }

  // Outros (Marcadores, Cartões, etc.) fallback to true if the match finished
  return true;
};

export default function GestaoBancaPage() {
  const [initialValue, setInitialValue] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [syncStatus, setSyncStatus] = useState('connecting'); // 'connecting', 'cloud', 'local'
  
  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [modalInputVal, setModalInputVal] = useState('');

  // Form States
  const [txType, setTxType] = useState('ganho'); // 'ganho', 'perda'
  const [txAmount, setTxAmount] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // Load from Supabase (with fallback to LocalStorage)
  useEffect(() => {
    setMounted(true);
    
    // Carregar valor inicial da banca
    const savedInitialValue = localStorage.getItem('ev_tracker_banca_initial_value');
    if (savedInitialValue) {
      setInitialValue(parseFloat(savedInitialValue));
    }

    async function cleanupPastBets() {
      const cutoffDate = '2026-05-27';
      if (supabase) {
        try {
          await supabase
            .from('banca_transactions')
            .delete()
            .lt('date', cutoffDate)
            .in('type', ['ganho', 'perda', 'pendente']);
        } catch (e) {
          console.warn("Erro ao limpar apostas passadas no Supabase:", e);
        }
      }

      const savedTxs = localStorage.getItem('ev_tracker_banca_txs');
      if (savedTxs) {
        try {
          const localList = JSON.parse(savedTxs);
          if (Array.isArray(localList)) {
            const filteredList = localList.filter(t => {
              const isBet = ['ganho', 'perda', 'pendente'].includes(t.type);
              const isPast = t.date < cutoffDate;
              return !(isBet && isPast);
            });
            localStorage.setItem('ev_tracker_banca_txs', JSON.stringify(filteredList));
          }
        } catch (e) {
          console.warn("Erro ao limpar apostas passadas no localStorage:", e);
        }
      }
    }

    async function loadTransactions() {
      if (!supabase) {
        console.warn("Supabase não está configurado. Usando localStorage.");
        fallbackToLocal();
        return;
      }

      try {
        const { data, error } = await supabase
          .from('banca_transactions')
          .select('*')
          .order('date', { ascending: false })
          .order('id', { ascending: false });

        if (error) throw error;

        // Sincronizar dados locais pendentes para a nuvem
        const syncedList = await syncLocalTransactionsToCloud(data || []);

        // Auto resolver palpites pendentes
        const resolvedList = await autoResolvePendingBets(syncedList);
        
        setTransactions(resolvedList);
        setSyncStatus('cloud');
      } catch (err) {
        console.warn("Erro ao carregar do Supabase. Usando localStorage de fallback:", err);
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
          if (!t.description) continue;
          
          let isPalpite = t.description.startsWith('[Palpite] ');
          let isApostaCriada = t.description.startsWith('[Aposta Criada] ');
          if (!isPalpite && !isApostaCriada) continue;

          const prefix = isPalpite ? '[Palpite] ' : '[Aposta Criada] ';
          const matchName = t.description.replace(prefix, '').split(' (')[0];
          const selectionsStr = t.description.split(' (')[1]?.replace(')', '') || '';
          
          const game = allFixtures.find(f => {
            const gameName = `${f.home.trim()} x ${f.away.trim()}`.toLowerCase();
            return gameName === matchName.trim().toLowerCase();
          });

          if (game && game.isFinished) {
            const gh = game.goalsHome;
            const ga = game.goalsAway;
            let isHit = true;

            const selections = selectionsStr.split(',').map(s => s.trim()).filter(Boolean);
            if (selections.length === 0) {
              isHit = false;
            } else {
              for (const sel of selections) {
                if (!evaluateSelection(sel, gh, ga)) {
                  isHit = false;
                  break;
                }
              }
            }

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
      setSyncStatus('local');
    }

    async function init() {
      await cleanupPastBets();
      await loadTransactions();
    }

    init();
  }, []);

  // Helpers para salvar dados localmente (fallback)
  const saveTransactionsLocal = (txs) => {
    setTransactions(txs);
    localStorage.setItem('ev_tracker_banca_txs', JSON.stringify(txs));
  };

  const handleTypeChange = (type) => {
    setTxType(type);
  };

  // Handler para adicionar transação
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!txAmount || Number(txAmount) <= 0) return;

    const todayDate = new Date().toISOString().slice(0, 10);
    const desc = txType === 'ganho' ? 'Ganho Manual' : 'Perda Manual';
    const oddVal = null;

    const newTxLocal = {
      id: Date.now(),
      date: todayDate,
      type: txType,
      amount: Number(txAmount),
      description: desc,
      odd: oddVal
    };

    if (syncStatus === 'cloud' && supabase) {
      try {
        const { data, error } = await supabase
          .from('banca_transactions')
          .insert([{
            date: todayDate,
            type: txType,
            amount: Number(txAmount),
            description: desc,
            odd: oddVal
          }])
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          const updated = [data[0], ...transactions];
          updated.sort((a, b) => new Date(b.date) - new Date(a.date));
          setTransactions(updated);
        } else {
          const updated = [newTxLocal, ...transactions];
          updated.sort((a, b) => new Date(b.date) - new Date(a.date));
          setTransactions(updated);
        }
      } catch (err) {
        console.warn("Erro ao salvar no Supabase. Salvando localmente:", err);
        const updated = [newTxLocal, ...transactions];
        updated.sort((a, b) => new Date(b.date) - new Date(a.date));
        saveTransactionsLocal(updated);
      }
    } else {
      const updated = [newTxLocal, ...transactions];
      updated.sort((a, b) => new Date(b.date) - new Date(a.date));
      saveTransactionsLocal(updated);
    }

    // Resetar campos do formulário
    setTxAmount('');
    showToast('Transação gravada com sucesso!', 'success');
  };

  // Handler para deletar transação
  const handleDeleteTransaction = async (id) => {
    if (syncStatus === 'cloud' && supabase) {
      try {
        const { error } = await supabase
          .from('banca_transactions')
          .delete()
          .eq('id', id);

        if (error) throw error;

        const updated = transactions.filter(t => t.id !== id);
        setTransactions(updated);
        showToast('Transação excluída com sucesso!', 'success');
      } catch (err) {
        console.warn("Erro ao deletar no Supabase:", err);
        showToast("Erro ao excluir registro na nuvem: " + err.message, 'error');
      }
    } else {
      const updated = transactions.filter(t => t.id !== id);
      saveTransactionsLocal(updated);
      showToast('Transação excluída com sucesso!', 'success');
    }
  };
  
  // Cálculos de métricas da Banca
  const stats = useMemo(() => {
    let totalDeposits = initialValue;
    let totalWithdrawals = 0;
    let totalProfit = 0;
    let totalLoss = 0;
    let wins = 0;
    let losses = 0;

    transactions.forEach(t => {
      if (t.type === 'aporte') totalDeposits += t.amount;
      else if (t.type === 'retirada') totalWithdrawals += t.amount;
      else if (t.type === 'ganho') {
        const profit = t.odd ? t.amount * (t.odd - 1) : t.amount;
        totalProfit += profit;
        wins += 1;
      }
      else if (t.type === 'perda') {
        totalLoss += t.amount;
        losses += 1;
      }
    });

    const netProfit = totalProfit - totalLoss;
    const currentBalance = initialValue + netProfit; // Saldo calculado automaticamente
    const totalYield = totalLoss > 0 ? (netProfit / totalLoss) * 100 : 0;

    const totalBets = wins + losses;
    const hitRate = totalBets > 0 ? (wins / totalBets) * 100 : 0;

    return {
      totalDeposits,
      totalWithdrawals,
      netProfit,
      currentBalance,
      totalYield,
      wins,
      losses,
      totalBets,
      hitRate
    };
  }, [transactions, initialValue]);

  // Compilar dados para o gráfico (ordem cronológica ascendente)
  const chartData = useMemo(() => {
    const sorted = [...transactions]
      .filter(t => t.type === 'ganho' || t.type === 'perda')
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const dataPoints = [{
      date: 'Início',
      balance: initialValue,
      label: 'Saldo Inicial'
    }];

    let balance = initialValue;
    sorted.forEach((t) => {
      if (t.type === 'ganho') {
        const profit = t.odd ? t.amount * (t.odd - 1) : t.amount;
        balance += profit;
      }
      else if (t.type === 'perda') balance -= t.amount;

      // Formatar data para exibição no eixo X
      const txDateObj = new Date(t.date + 'T12:00:00');
      const dateStr = txDateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');

      dataPoints.push({
        date: dateStr,
        balance: balance,
        label: t.description
      });
    });

    return dataPoints;
  }, [transactions, initialValue]);

  const isPositive = stats.netProfit >= 0;

  return (
    <div style={{ padding: '0 20px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <header style={{ marginBottom: '16px', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
            <PiggyBank color="var(--brand-neon)" size={32} />
            Gestão e Controle de Banca
          </h1>
          <p style={{ color: '#888', marginTop: '8px', fontSize: '1.1rem', maxWidth: '800px' }}>
            Gerencie seu capital de apostas. Registre seus aportes, retiradas, greens e reds, e acompanhe o crescimento dos seus lucros.
          </p>
        </div>
        
        {/* Indicador de Sincronização */}
        <div style={{ marginTop: '8px' }}>
          {syncStatus === 'connecting' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', background: 'rgba(255, 255, 255, 0.05)', color: '#aaa', border: '1px solid #333' }}>
              <span className="sync-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff9800', display: 'inline-block' }}></span>
              Conectando Banco...
            </span>
          )}
          {syncStatus === 'cloud' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', background: 'rgba(0, 255, 170, 0.1)', color: '#00ffa0', border: '1px solid rgba(0, 255, 170, 0.2)' }}>
              ☁️ Nuvem Ativa (Supabase)
            </span>
          )}
          {syncStatus === 'local' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', background: 'rgba(255, 152, 0, 0.1)', color: '#ff9800', border: '1px solid rgba(255, 152, 0, 0.2)' }}>
              💾 Modo Local (Offline)
            </span>
          )}
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid-responsive-cards grid-responsive-cards-banca">
        
        <div className="glass-panel" style={{ background: 'linear-gradient(135deg, #111115, #161622)', borderLeft: '4px solid var(--brand-neon)', padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Saldo Atual</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
            R$ {stats.currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel" style={{ background: 'linear-gradient(135deg, #111115, #161622)', borderLeft: '4px solid ' + (isPositive ? '#4CAF50' : '#ff4d4d'), padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Lucro Líquido</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: isPositive ? '#4CAF50' : '#ff4d4d', marginTop: '4px', display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            {isPositive ? '+' : ''}R$ {stats.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>({stats.totalYield.toFixed(1)}% Yield)</span>
          </div>
        </div>

        <div className="glass-panel" style={{ background: 'linear-gradient(135deg, #111115, #161622)', borderLeft: '4px solid #FFD700', padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Valor Inicial</span>
            <button 
              onClick={() => {
                setModalInputVal(initialValue.toString());
                setShowModal(true);
              }}
              className="mobile-edit-btn"
              style={{ background: 'transparent', border: 'none', color: 'var(--brand-neon)', cursor: 'pointer', fontSize: '0.75rem', padding: '0 4px', fontWeight: 'bold' }}
            >
              Editar
            </button>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
            R$ {initialValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

      </div>

      {/* Formulário de Registrar Movimentação */}
      <div className="glass-panel responsive-banca-form" style={{ display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #222', paddingBottom: '12px' }}>
          <PlusCircle size={20} color="var(--brand-neon)" /> Registrar Movimentação
        </h2>
        
        <form onSubmit={handleAddTransaction} className="banca-form-row" style={{ marginTop: '12px' }}>
          
          <div style={{ flex: '2 1 120px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold' }}>Tipo de Lançamento</label>
            <select 
              value={txType} 
              onChange={(e) => handleTypeChange(e.target.value)}
              style={{ width: '100%', background: '#1c1c1c', border: '1px solid #333', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 'bold', height: '42px' }}
            >
              <option value="ganho">Ganho (Blue) 🔵</option>
              <option value="perda">Perda (Red) 🔴</option>
            </select>
          </div>

          <div style={{ flex: '2 1 120px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold' }}>Valor</label>
            <div style={{ display: 'flex', alignItems: 'center', background: '#1c1c1c', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden', height: '42px' }}>
              <span style={{ background: '#27272A', color: '#888', padding: '10px 14px', fontSize: '0.9rem', fontWeight: 'bold', borderRight: '1px solid #333' }}>
                R$
              </span>
              <input 
                type="number" 
                step="0.01" 
                min="0.01" 
                required
                placeholder="0,00"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', padding: '10px', fontSize: '0.9rem', outline: 'none' }} 
              />
            </div>
          </div>

          <button 
            type="submit"
            className="btn-responsive-compact"
            style={{ height: '42px', background: 'var(--brand-neon)', color: '#000', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(204, 255, 0, 0.2)' }}
            title="Gravar Transação"
          >
            <PlusCircle size={18} />
            <span className="btn-text-mobile-hide" style={{ marginLeft: '8px' }}>Gravar Transação</span>
          </button>

        </form>
      </div>

      {/* Gráfico de Crescimento do Capital */}
      <div className="glass-panel responsive-chart-panel" style={{ display: 'flex', flexDirection: 'column', maxWidth: '600px', width: '100%' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: '#ccc', borderBottom: '1px solid #222', paddingBottom: '12px' }}>
          Gráfico de Crescimento do Capital
        </h2>
        <div className="responsive-chart-wrapper">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="date" stroke="#666" tick={{ fill: '#666', fontSize: 11 }} />
                <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 11 }} tickFormatter={(val) => `R$${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#141419', border: '1px solid #333', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--brand-neon)' }}
                  labelStyle={{ color: '#aaa', fontWeight: 'bold' }}
                />

                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  name="Saldo da Banca"
                  stroke="var(--brand-neon)" 
                  strokeWidth={3} 
                  dot={{ r: 4, stroke: '#000', strokeWidth: 1, fill: 'var(--brand-neon)' }}
                  activeDot={{ r: 7 }}
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
              Carregando gráfico...
            </div>
          )}
        </div>
      </div>

      {/* Histórico de Lançamentos */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: '#ccc', borderBottom: '1px solid #222', paddingBottom: '12px' }}>
          Histórico de Lançamentos
        </h2>
        
        {transactions.filter(t => t.type === 'ganho' || t.type === 'perda' || t.type === 'pendente').length === 0 ? (
          <div style={{ color: '#888', fontStyle: 'italic', padding: '32px', textAlign: 'center' }}>
            Nenhum ganho ou perda registrado. Comece gravando um lançamento acima.
          </div>
        ) : (
          <div className="table-responsive-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #222', color: '#666', fontSize: '0.85rem', fontWeight: 600 }}>
                  <th style={{ padding: '12px' }} className="mobile-hide">Data</th>
                  <th style={{ padding: '12px' }} className="mobile-hide">Lançamento / Descrição</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Tipo</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Odd</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Valor</th>
                  <th style={{ padding: '12px', width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {transactions.filter(t => t.type === 'ganho' || t.type === 'perda' || t.type === 'pendente').map((tx) => {
                  const isGain = tx.type === 'ganho';
                  const isLoss = tx.type === 'perda';
                  const isPending = tx.type === 'pendente';

                  return (
                    <tr key={tx.id} style={{ borderBottom: '1px solid #1c1c24' }}>
                      <td style={{ padding: '12px', fontSize: '0.9rem', color: '#aaa' }} className="mobile-hide">
                        {new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 500, fontSize: '0.95rem' }} className="mobile-hide">
                        {(() => {
                          const teams = parseMatchTeams(tx.description);
                          if (teams.away) {
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <img
                                  src={getTeamLogoUrl(teams.home)}
                                  alt={teams.home}
                                  style={{ width: '20px', height: '20px', objectFit: 'contain', flexShrink: 0 }}
                                  onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${teams.home}&background=222&color=fff&rounded=true&bold=true&size=20`; }}
                                />
                                <span>{teams.home}</span>
                                <span style={{ color: '#555', fontSize: '0.8rem' }}>x</span>
                                <img
                                  src={getTeamLogoUrl(teams.away)}
                                  alt={teams.away}
                                  style={{ width: '20px', height: '20px', objectFit: 'contain', flexShrink: 0 }}
                                  onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${teams.away}&background=222&color=fff&rounded=true&bold=true&size=20`; }}
                                />
                                <span>{teams.away}</span>
                              </div>
                            );
                          }
                          return tx.description.replace('[Palpite] ', '').replace('[Aposta Criada] ', '');
                        })()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: '20px', 
                          fontSize: '0.75rem', 
                          fontWeight: 600,
                          background: isGain ? 'rgba(0, 210, 255, 0.15)' : isLoss ? 'rgba(255, 77, 77, 0.15)' : 'rgba(255, 193, 7, 0.15)',
                          color: isGain ? '#00d2ff' : isLoss ? '#ff4d4d' : '#FFC107',
                          border: '1px solid ' + (isGain ? 'rgba(0,210,255,0.3)' : isLoss ? 'rgba(255,77,77,0.3)' : 'rgba(255,193,7,0.3)')
                        }}>
                          {isGain ? 'GANHO' : isLoss ? 'PERDA' : 'PENDENTE'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#ff9800', fontWeight: 500 }}>
                        {tx.odd ? `@${tx.odd.toFixed(2)}` : '-'}
                      </td>
                      <td style={{ 
                        padding: '12px', 
                        textAlign: 'right', 
                        fontWeight: 500,
                        color: isPending ? '#FFC107' : isGain ? '#00d2ff' : '#ff4d4d' 
                      }}>
                        {isPending ? '' : isGain ? '+' : '-'} R$ {
                          isGain && tx.odd 
                            ? (tx.amount * (tx.odd - 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        }
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <button 
                            onClick={() => handleDeleteTransaction(tx.id)}
                            style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', transition: 'opacity 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.opacity = '0.7'}
                            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                            title="Excluir Transação"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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

      {/* Modal Customizado para Valor Inicial */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="glass-panel" style={{
            width: '90%',
            maxWidth: '400px',
            background: 'linear-gradient(135deg, #111115, #14141d)',
            border: '1px solid #333',
            borderTop: '4px solid var(--brand-neon)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>
              Definir Valor Inicial
            </h3>
            <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>
              Digite o valor inicial de sua banca para o cálculo automático do saldo atual:
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', background: '#1c1c1c', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden', height: '48px' }}>
              <span style={{ background: '#27272A', color: '#888', padding: '12px 14px', fontSize: '1rem', fontWeight: 'bold', borderRight: '1px solid #333' }}>
                R$
              </span>
              <input 
                type="number"
                step="0.01"
                min="0"
                value={modalInputVal}
                onChange={(e) => setModalInputVal(e.target.value)}
                placeholder="0,00"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  padding: '12px',
                  fontSize: '1rem',
                  outline: 'none'
                }}
                autoFocus
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button 
                onClick={() => setShowModal(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid #444',
                  color: '#aaa',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                onMouseOut={(e) => e.target.style.background = 'transparent'}
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  const num = parseFloat(modalInputVal.replace(',', '.'));
                  if (!isNaN(num)) {
                    setInitialValue(num);
                    localStorage.setItem('ev_tracker_banca_initial_value', num.toString());
                    showToast('Valor inicial atualizado com sucesso!', 'success');
                    setShowModal(false);
                  } else {
                    showToast('Por favor, insira um valor numérico válido.', 'error');
                  }
                }}
                style={{
                  background: 'var(--brand-neon)',
                  border: 'none',
                  color: '#000',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  boxShadow: '0 4px 15px rgba(204, 255, 0, 0.2)'
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        /* Remover setinhas de campos de número */
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}
