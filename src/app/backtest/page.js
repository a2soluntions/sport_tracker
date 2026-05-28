'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  Activity, 
  Printer, 
  Send, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign, 
  Calendar, 
  AlertCircle,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

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

const formatOddMobile = (odd) => {
  if (!odd) return '-';
  if (odd >= 100) return Math.round(odd).toString().substring(0, 3);
  if (odd >= 10) return odd.toFixed(1);
  return odd.toFixed(2);
};

export default function RelatorioApostasPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // Load transactions and sync/resolve on load
  useEffect(() => {
    setMounted(true);

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
      } finally {
        setLoading(false);
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
      setLoading(false);
    }

    async function init() {
      await cleanupPastBets();
      await loadTransactions();
    }

    init();
  }, []);

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm("Deseja realmente excluir este palpite seguido da sua banca?")) return;
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);

    if (supabase) {
      try {
        const { error } = await supabase
          .from('banca_transactions')
          .delete()
          .eq('id', id);
        if (error) throw error;
        showToast('Aposta excluída da banca!', 'success');
      } catch (err) {
        console.warn("Erro ao deletar no Supabase:", err);
        showToast("Erro ao excluir registro: " + err.message, 'error');
      }
    } else {
      localStorage.setItem('ev_tracker_banca_txs', JSON.stringify(updated));
      showToast('Aposta excluída da banca!', 'success');
    }
  };

  // Filter only betting transactions (exclude deposit/withdrawal)
  const bets = useMemo(() => {
    return transactions
      .filter(t => t.type === 'ganho' || t.type === 'perda' || t.type === 'pendente')
      .sort((a, b) => new Date(b.date) - new Date(a.date)); // descending date for table
  }, [transactions]);

  // Chronological order for chart
  const chronoBets = useMemo(() => {
    return [...bets].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [bets]);

  // Stats Calculations
  const stats = useMemo(() => {
    let totalInvested = 0;
    let netProfit = 0;
    let greens = 0;
    let reds = 0;
    let pending = 0;

    bets.forEach(t => {
      totalInvested += t.amount;
      if (t.type === 'ganho') {
        const profit = t.odd ? t.amount * (t.odd - 1) : t.amount;
        netProfit += profit;
        greens += 1;
      } else if (t.type === 'perda') {
        netProfit -= t.amount;
        reds += 1;
      } else if (t.type === 'pendente') {
        pending += 1;
      }
    });

    const totalBets = bets.length;
    const resolvedBetsCount = greens + reds;
    const hitRate = resolvedBetsCount > 0 ? (greens / resolvedBetsCount) * 100 : 0;
    const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;

    return {
      totalBets,
      resolvedBetsCount,
      totalInvested,
      netProfit,
      hitRate,
      roi,
      greens,
      reds,
      pending
    };
  }, [bets]);

  // Compile data for line chart (Cumulative Profit)
  const chartData = useMemo(() => {
    const dataPoints = [{
      date: 'Início',
      profit: 0,
      label: 'Banca Inicial'
    }];

    let cumProfit = 0;
    chronoBets.forEach(t => {
      // Exclude pending bets from the chart to show real resolved profits
      if (t.type === 'pendente') return;

      const profitChange = t.type === 'ganho' 
        ? (t.odd ? t.amount * (t.odd - 1) : t.amount)
        : -t.amount;
      
      cumProfit += profitChange;

      const txDateObj = new Date(t.date + 'T12:00:00');
      const dateStr = txDateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');

      dataPoints.push({
        date: dateStr,
        profit: Number(cumProfit.toFixed(2)),
        label: t.description
      });
    });

    return dataPoints;
  }, [chronoBets]);

  const handleExportCSV = () => {
    if (bets.length === 0) {
      showToast('Nenhuma aposta para exportar.', 'error');
      return;
    }

    const headers = ['Data', 'Descricao / Confronto', 'Tipo', 'Odd', 'Valor Apostado (R$)', 'Lucro/Prejuizo Liquido (R$)'];
    const rows = bets.map(t => {
      const dateStr = new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR');
      const isGain = t.type === 'ganho';
      const isLoss = t.type === 'perda';
      const isPending = t.type === 'pendente';
      
      const typeStr = isGain ? 'GREEN' : isLoss ? 'RED' : 'PENDENTE';
      const oddStr = t.odd ? t.odd.toFixed(2) : '-';
      const amountStr = t.amount.toFixed(2);
      
      let returnVal = 0;
      if (isGain && t.odd) returnVal = t.amount * (t.odd - 1);
      else if (isLoss) returnVal = -t.amount;
      const returnStr = isPending ? '0.00' : returnVal.toFixed(2);

      return [dateStr, t.description, typeStr, oddStr, amountStr, returnStr];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" // UTF-8 BOM for Portuguese accents in Excel
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_de_apostas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendTelegram = async () => {
    if (bets.length === 0) {
      showToast('Nenhuma aposta para enviar.', 'error');
      return;
    }
    setSending(true);
    
    const payload = {
      totalBets: stats.totalBets,
      totalInvested: stats.totalInvested,
      netProfit: stats.netProfit,
      hitRate: stats.hitRate,
      roi: stats.roi,
      greens: stats.greens,
      reds: stats.reds,
      pending: stats.pending
    };

    try {
      const response = await fetch('/api/telegram/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showToast('Relatório de Desempenho enviado com sucesso para o Telegram! 🤖', 'success');
      } else {
        const data = await response.json();
        showToast('Erro ao enviar para o Telegram: ' + (data.error || 'Erro desconhecido.'), 'error');
      }
    } catch (err) {
      console.warn("Falha no broadcast do relatório:", err);
      showToast('Falha na comunicação com o servidor.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', color: 'var(--brand-neon)', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <span className="sync-pulse" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Carregando dados das apostas...</span>
        <p style={{ color: '#888', fontSize: '0.9rem' }}>Buscando transações e sincronizando com Supabase.</p>
      </div>
    );
  }

  const isProfitable = stats.netProfit >= 0;

  const gradientOffset = () => {
    if (chartData.length === 0) return 0;
    const dataMax = Math.max(...chartData.map(i => i.profit));
    const dataMin = Math.min(...chartData.map(i => i.profit));
    if (dataMax <= 0) return 0;
    if (dataMin >= 0) return 1;
    return dataMax / (dataMax - dataMin);
  };
  const off = gradientOffset();

  return (
    <div style={{ padding: '0 20px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          header, button, select, nav, aside, .no-print {
            display: none !important;
          }
          .glass-panel {
            background: #ffffff !important;
            color: #000000 !important;
            border: 1px solid #ccc !important;
            box-shadow: none !important;
          }
          h1, h2, h3, p, div, span, td, th {
            color: #000000 !important;
          }
          table {
            border-collapse: collapse;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #666 !important;
            padding: 8px !important;
          }
        }
      `}} />

      <header style={{ marginBottom: '16px', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }} className="no-print">
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
            <Activity color="var(--brand-neon)" size={32} />
            Relatório de Apostas
          </h1>
          <p style={{ color: '#888', marginTop: '8px', fontSize: '1.1rem' }}>
            Acompanhe o desempenho de todas as entradas reais feitas na banca. Imprima ou exporte o relatório.
          </p>
        </div>
        
        {/* Ações de Relatório */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            onClick={handlePrint}
            className="btn-responsive-compact"
            style={{
              background: '#222',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '10px 20px',
              transition: 'all 0.2s'
            }}
            title="Imprimir PDF"
          >
            <Printer size={16} />
            <span className="btn-text-mobile-hide" style={{ marginLeft: '8px' }}>Imprimir PDF</span>
          </button>
          
          <button 
            onClick={handleExportCSV}
            className="btn-responsive-compact"
            style={{
              background: '#222',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '10px 20px',
              transition: 'all 0.2s'
            }}
            title="Exportar CSV"
          >
            <Download size={16} />
            <span className="btn-text-mobile-hide" style={{ marginLeft: '8px' }}>Exportar CSV</span>
          </button>

          <button 
            onClick={handleSendTelegram}
            disabled={sending}
            className="btn-responsive-compact"
            style={{
              background: 'var(--brand-neon)',
              color: '#000',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 'bold',
              cursor: sending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '10px 20px',
              boxShadow: '0 4px 15px rgba(204, 255, 0, 0.2)',
              transition: 'all 0.2s'
            }}
            title="Enviar Telegram"
          >
            <Send size={16} className={sending ? 'sync-pulse' : ''} />
            <span className="btn-text-mobile-hide" style={{ marginLeft: '8px' }}>
              {sending ? 'Enviando...' : 'Enviar Telegram'}
            </span>
          </button>
        </div>
      </header>

      {bets.length === 0 ? (
        <div className="glass-panel" style={{ padding: '80px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          <AlertCircle size={48} color="var(--brand-neon)" />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Nenhum Palpite Seguido</h2>
          <p style={{ color: '#888', maxWidth: '500px' }}>
            Nenhuma aposta foi registrada na banca. Comece a acompanhar os palpites e registrar suas entradas na aba **Palpites** utilizando o botão **Seguir Palpite**!
          </p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid-responsive-cards">
            
            <div className="glass-panel" style={{ background: 'linear-gradient(135deg, #111115, #161622)', borderLeft: '4px solid ' + (isProfitable ? '#4CAF50' : '#ff4d4d'), padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Resultado Líquido</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: isProfitable ? '#4CAF50' : '#ff4d4d', marginTop: '4px' }}>
                {isProfitable ? '+' : ''}R$ {stats.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '4px' }}>{stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}% ROI líquido</div>
            </div>

            <div className="glass-panel" style={{ background: 'linear-gradient(135deg, #111115, #161622)', borderLeft: '4px solid #00d2ff', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Volume Apostado</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                R$ {stats.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '4px' }}>Total movimentado</div>
            </div>

            <div className="glass-panel" style={{ background: 'linear-gradient(135deg, #111115, #161622)', borderLeft: '4px solid #FFD700', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Taxa de Acerto</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                {stats.hitRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '4px' }}>{stats.greens} G / {stats.reds} R / {stats.pending} P</div>
            </div>

            <div className="glass-panel" style={{ background: 'linear-gradient(135deg, #111115, #161622)', borderLeft: '4px solid #b339ff', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Total de Entradas</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                {stats.totalBets}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '4px' }}>Apostas cadastradas</div>
            </div>

          </div>

          {/* CHARTS */}
          <div className="backtest-charts-grid">
            {/* Profit Curve */}
            <div className="glass-panel responsive-chart-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0, color: '#ccc', borderBottom: '1px solid #222', paddingBottom: '8px' }}>
                Curva de Lucro Acumulado (R$)
              </h2>
              <div className="responsive-chart-wrapper">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset={off} stopColor="var(--brand-neon)" stopOpacity={1} />
                          <stop offset={off} stopColor="#ff003c" stopOpacity={1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="date" stroke="#666" tick={{ fill: '#666', fontSize: 11 }} />
                      <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 11 }} tickFormatter={(val) => `R$${val}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#141419', border: '1px solid #333', borderRadius: '8px' }}
                        itemStyle={{ color: 'var(--brand-neon)' }}
                        labelStyle={{ color: '#aaa', fontWeight: 'bold' }}
                      />
                      <ReferenceLine y={0} stroke="#444" strokeDasharray="3 3" />
                      <Line 
                        type="monotone" 
                        dataKey="profit" 
                        name="Lucro Acumulado"
                        stroke="url(#splitColor)" 
                        strokeWidth={3} 
                        dot={false}
                        activeDot={{ r: 6, fill: 'var(--brand-neon)' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                    Carregando gráfico...
                  </div>
                )}
              </div>
            </div>

            {/* Wins vs Losses Pie Chart */}
            <div className="glass-panel responsive-chart-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0, color: '#ccc', borderBottom: '1px solid #222', paddingBottom: '8px' }}>
                Acertos vs Perdas
              </h2>
              <div className="responsive-chart-wrapper">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Acertos', value: stats.greens },
                          { name: 'Perdas', value: stats.reds }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="var(--brand-neon)" />
                        <Cell fill="#ff003c" />
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#141419', border: '1px solid #333', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '0.85rem', color: '#ccc', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                    Carregando gráfico...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* List of bets */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: '#ccc', borderBottom: '1px solid #222', paddingBottom: '12px' }}>
              Detalhamento de Apostas Efetuadas
            </h2>
            <div className="table-responsive-container">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #222', color: '#666', fontSize: '0.85rem', fontWeight: 600 }}>
                    <th style={{ padding: '12px' }} className="mobile-hide">Data</th>
                    <th style={{ padding: '12px' }}><span className="mobile-hide">Aposta / </span>Confronto</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Resultado</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Odd</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Stake<span className="mobile-hide"> (Apostado)</span></th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Retorno<span className="mobile-hide"> Líquido</span></th>
                    <th style={{ padding: '12px', width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {bets.map((tx) => {
                    const isGain = tx.type === 'ganho';
                    const isLoss = tx.type === 'perda';
                    const isPending = tx.type === 'pendente';

                    return (
                      <tr key={tx.id} style={{ borderBottom: '1px solid #1c1c24' }}>
                        <td style={{ padding: '12px', fontSize: '0.9rem', color: '#aaa' }} className="mobile-hide">
                          {new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{ padding: '12px', fontWeight: 500, fontSize: '0.95rem' }}>
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
                                  <span className="team-name-text-mobile-hide">{teams.home}</span>
                                  <span style={{ color: '#555', fontSize: '0.8rem' }}>x</span>
                                  <img
                                    src={getTeamLogoUrl(teams.away)}
                                    alt={teams.away}
                                    style={{ width: '20px', height: '20px', objectFit: 'contain', flexShrink: 0 }}
                                    onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${teams.away}&background=222&color=fff&rounded=true&bold=true&size=20`; }}
                                  />
                                  <span className="team-name-text-mobile-hide">{teams.away}</span>
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
                            background: isGain ? 'rgba(76, 175, 80, 0.15)' : isLoss ? 'rgba(255, 77, 77, 0.15)' : 'rgba(255, 193, 7, 0.15)',
                            color: isGain ? '#4CAF50' : isLoss ? '#ff4d4d' : '#FFC107',
                            border: '1px solid ' + (isGain ? 'rgba(76,175,80,0.3)' : isLoss ? 'rgba(255,77,77,0.3)' : 'rgba(255,193,7,0.3)')
                          }}>
                            <span className="mobile-hide">{isGain ? 'GREEN' : isLoss ? 'RED' : 'PENDENTE'}</span>
                            <span className="mobile-show">{isGain ? 'G' : isLoss ? 'R' : 'P'}</span>
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#ff9800', fontWeight: 500 }}>
                          <span className="mobile-hide">{tx.odd ? `@${tx.odd.toFixed(2)}` : '-'}</span>
                          <span className="mobile-show">{tx.odd ? `@${formatOddMobile(tx.odd)}` : '-'}</span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 500, color: '#fff' }}>
                          R$ {tx.amount.toFixed(2)}
                        </td>
                        <td style={{ 
                          padding: '12px', 
                          textAlign: 'right', 
                          fontWeight: 500,
                          color: isPending ? '#FFC107' : isGain ? '#4CAF50' : '#ff4d4d' 
                        }}>
                          {isPending ? '' : isGain ? '+' : '-'} R$ {
                            isGain && tx.odd 
                              ? (tx.amount * (tx.odd - 1)).toFixed(2)
                              : tx.amount.toFixed(2)
                          }
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <button 
                              onClick={() => handleDeleteTransaction(tx.id)}
                              style={{ background: 'transparent', border: '1px solid #444', borderRadius: '4px', color: '#aaa', padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                              onMouseOver={(e) => { e.currentTarget.style.color = '#ff4d4d'; e.currentTarget.style.borderColor = '#ff4d4d'; }}
                              onMouseOut={(e) => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.borderColor = '#444'; }}
                              title="Excluir da Banca"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Toast Notificação Customizada */}
      {toast.show && (
        <div className="no-print" style={{
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
        @keyframes slideIn {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
