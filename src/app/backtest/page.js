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
  CheckCircle2,
  Eye
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../../components/ConfirmModal';

const getTeamLogoUrl = (teamName) => {
  if (!teamName) return '';
  
  // Decompose accents (NFD normalization) and strip diacritics
  const clean = teamName
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[-]/g, ' ') // Replace hyphens with spaces
    .replace(/\s+/g, ' '); // Collapse spaces
  
  const mapping = {
    // Série A
    'FLAMENGO': 127,
    'PALMEIRAS': 121,
    'CORINTHIANS': 131,
    'SAO PAULO': 126,
    'SÃO PAULO': 126,
    'SANTOS': 128,
    'GREMIO': 130,
    'INTERNACIONAL': 119,
    'ATLETICO MG': 134,
    'ATLETICO MINEIRO': 134,
    'FLUMINENSE': 124,
    'BOTAFOGO': 120,
    'VASCO': 133,
    'VASCO DA GAMA': 133,
    'CRUZEIRO': 125,
    'BAHIA': 118,
    'ATHLETICO PR': 135,
    'FORTALEZA': 154,
    'CEARA': 129,
    'CORITIBA': 132,
    'GOIAS': 151,
    'BRAGANTINO': 794,
    'RED BULL BRAGANTINO': 794,
    'CUIABA': 1100,
    'CRICIUMA': 1192,
    'BOTAFOGO SP': 1190,
    'BOTAFOGO-SP': 1190,
    'AMERICA MG': 123,
    'AMERICA-MG': 123,
    'AMERICA MINEIRO': 123,
    'VILA NOVA': 1193,
    'OPERARIO PR': 1194,
    'OPERARIO': 1194,
    'CHAPECOENSE': 122,
    'REMO': 1195,
    'BRUSQUE': 1189,
    'BARRA': 9770,
    'JUVENTUDE': 1062,
    'ATLETICO GO': 144,
    'ATLETICO GOIANIENSE': 144,
    'VITORIA': 2420,
    'VITORIA BA': 2420,
    // Série B & C
    'SPORT': 136,
    'SPORT RECIFE': 136,
    'SPORT CLUB DO RECIFE': 136,
    'PONTE PRETA': 137,
    'CRB': 1187,
    'PAYSANDU': 1188,
    'AMAZONAS': 10565,
    'AMAZONAS FC': 10565,
    'ITUANO': 1185,
    'MIRASSOL': 1184,
    'NOVORIZONTINO': 1186,
    'GREMIO NOVORIZONTINO': 1186,
    'AVAI': 1246,
    'GUARANI': 138,
    'LONDRINA': 1244,
    'NAUTICO': 1196,
    'SAO BERNARDO': 2419,
    'ATHLETIC CLUB': 9640
  };
  
  const teamId = mapping[clean];
  if (teamId) return `https://media.api-sports.io/football/teams/${teamId}.png`;

  // Country Flags Check
  const baseCountry = clean
    .replace(/\s*(U\d+|SUB\s*\d+|SUB-\d+)\s*/g, '')
    .trim();

  const countryFlags = {
    'ARGENTINA': 'ar', 'ARMENIA': 'am', 'AZERBAIJAN': 'az', 'BAHRAIN': 'bh',
    'BELARUS': 'by', 'BELGIUM': 'be', 'BOLIVIA': 'bo', 'BRAZIL': 'br',
    'BRASIL': 'br', 'BURKINA FASO': 'bf', 'CHINA': 'cn', 'COLOMBIA': 'co',
    'CROATIA': 'hr', 'ECUADOR': 'ec', 'ENGLAND': 'gb-eng', 'ESTONIA': 'ee',
    'FINLAND': 'fi', 'FRANCE': 'fr', 'GEORGIA': 'ge', 'GERMANY': 'de',
    'HUNGARY': 'hu', 'INDIA': 'in', 'ITALY': 'it', 'JAPAN': 'jp',
    'JORDAN': 'jo', 'KAZAKHSTAN': 'kz', 'KYRGYZSTAN': 'kg', 'LATVIA': 'lv',
    'LIBERIA': 'lr', 'MAURITANIA': 'mr', 'MOLDOVA': 'md', 'MYANMAR': 'mm',
    'NETHERLANDS': 'nl', 'NIGER': 'ne', 'NORTHERN IRELAND': 'gb-nir',
    'NORWAY': 'no', 'PALESTINE': 'ps', 'PANAMA': 'pa', 'PARAGUAY': 'py',
    'PERU': 'pe', 'PHILIPPINES': 'ph', 'PORTUGAL': 'pt', 'SAN MARINO': 'sm',
    'SAUDI ARABIA': 'sa', 'SENEGAL': 'sn', 'SIERRA LEONE': 'sl', 'SPAIN': 'es',
    'SYRIA': 'sy', 'TAJIKISTAN': 'tj', 'THAILAND': 'th', 'UKRAINE': 'ua',
    'URUGUAY': 'uy', 'UZBEKISTAN': 'uz', 'VENEZUELA': 've', 'VIETNAM': 'vn'
  };

  const flagCode = countryFlags[baseCountry];
  if (flagCode) {
    return `https://flagcdn.com/w80/${flagCode}.png`;
  }
  
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

const parseSelections = (description) => {
  if (!description) return [];
  const startIdx = description.indexOf('(');
  const endIdx = description.lastIndexOf(')');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const content = description.substring(startIdx + 1, endIdx);
    return content.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

const evaluateSelection = (selection, gh, ga) => {
  if (!selection) return true;
  const cleanSel = selection.trim().toLowerCase();
  
  // Handicap Asiático (ex: "casa ah -1.0", "fora ah 0.0", "casa ah +1.5")
  if (cleanSel.includes('ah') || cleanSel.includes('handicap')) {
    const isHome = cleanSel.includes('casa');
    const isAway = cleanSel.includes('fora');
    const valueMatch = cleanSel.match(/[+-]?\d+(?:\.\d+)?/);
    if (valueMatch && (isHome || isAway)) {
      const hc = parseFloat(valueMatch[0]);
      const diff = isHome ? (gh - ga) : (ga - gh);
      const total = diff + hc;
      
      if (total > 0) return true;      // Venceu
      if (total < 0) return false;     // Perdeu
      return null;                     // Reembolso (Aposta nula/devolvida)
    }
  }

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
  
  const isGoalMarket = !cleanSel.includes('escanteio') && !cleanSel.includes('canto') && !cleanSel.includes('cartã') && !cleanSel.includes('cartao') && !cleanSel.includes('amarelo') && !cleanSel.includes('vermelho');

  if (isGoalMarket) {
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
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTxForDetail, setSelectedTxForDetail] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState({ show: false, txId: null });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // Load transactions and sync/resolve on load
  useEffect(() => {
    if (!user) return;
    setMounted(true);

    const userTxsKey = `ev_tracker_banca_txs_${user.id}`;
    const userTxIdsKey = `ev_tracker_user_tx_ids_${user.id}`;

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

      const savedTxs = localStorage.getItem(userTxsKey);
      if (savedTxs) {
        try {
          const localList = JSON.parse(savedTxs);
          if (Array.isArray(localList)) {
            const filteredList = localList.filter(t => {
              const isBet = ['ganho', 'perda', 'pendente'].includes(t.type);
              const isPast = t.date < cutoffDate;
              return !(isBet && isPast);
            });
            localStorage.setItem(userTxsKey, JSON.stringify(filteredList));
          }
        } catch (e) {
          console.warn("Erro ao limpar apostas passadas no localStorage:", e);
        }
      }
    }

    async function loadFixturesForTransactions(txList) {
      try {
        const pendingOrRecent = txList.filter(t => {
          if (t.type === 'pendente') return true;
          if (t.date) {
            const txDate = new Date(t.date + 'T00:00:00-03:00');
            const now = new Date();
            const diffTime = Math.abs(now - txDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 3;
          }
          return false;
        });

        const uniqueDates = [...new Set(pendingOrRecent.map(t => t.date).filter(Boolean))];
        if (uniqueDates.length === 0) return [];

        const fetchPromises = uniqueDates.map(async (dateStr) => {
          try {
            const res = await fetch(`/api/football/fixtures?league=all&date=${dateStr}`);
            if (res.ok) {
              const data = await res.json();
              return data.fixtures || [];
            }
          } catch (e) {
            console.warn(`[LoadFixtures] Falha ao buscar fixtures da data ${dateStr}:`, e);
          }
          return [];
        });

        const results = await Promise.all(fetchPromises);
        let allFixtures = [];
        results.forEach(fixtures => {
          allFixtures = [...allFixtures, ...fixtures];
        });

        setFixtures(allFixtures);
        return allFixtures;
      } catch (e) {
        console.warn("Erro ao buscar fixtures:", e);
        return [];
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
          .select('*')
          .eq('user_id', user.id);
        if (error) throw error;
        
        const filteredData = data || [];

        // Sincronizar dados locais pendentes para a nuvem
        const syncedList = await syncLocalTransactionsToCloud(filteredData);
        
        // Carregar fixtures primeiro
        const allFixtures = await loadFixturesForTransactions(syncedList);

        // Auto resolver palpites pendentes
        const resolvedList = await autoResolvePendingBets(syncedList, allFixtures);
        setTransactions(resolvedList);
        localStorage.setItem(userTxsKey, JSON.stringify(resolvedList));
      } catch (err) {
        console.warn("Erro ao carregar transações do Supabase:", err);
        fallbackToLocal();
      } finally {
        setLoading(false);
      }
    }

    async function syncLocalTransactionsToCloud(cloudList) {
      const savedTxs = localStorage.getItem(userTxsKey);
      if (!savedTxs) return cloudList;

      try {
        const localList = JSON.parse(savedTxs);
        if (!Array.isArray(localList) || localList.length === 0) return cloudList;

        const unsyncedList = [];
        const cloudKeys = new Set(cloudList.map(t => `${t.date}_${t.amount}_${t.description}`));

        for (const localTx of localList) {
          const key = `${localTx.date}_${localTx.amount}_${localTx.description}`;
          if (!cloudKeys.has(key)) {
            const { id, ...txToUpload } = localTx;
            txToUpload.user_id = user.id; // Vincular ao usuário logado
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

        // Adicionar os IDs criados na lista local de IDs do usuário
        const userTxIds = JSON.parse(localStorage.getItem(userTxIdsKey) || '[]');
        insertedData.forEach(tx => userTxIds.push(tx.id));
        localStorage.setItem(userTxIdsKey, JSON.stringify(userTxIds));

        const newCloudList = [...(insertedData || []), ...cloudList];
        localStorage.setItem(userTxsKey, JSON.stringify(newCloudList));
        console.log("[Sync] Sincronização automática concluída!");
        return newCloudList;
      } catch (e) {
        console.warn("[Sync] Falha no processo de sincronização automática:", e);
        return cloudList;
      }
    }

    async function autoResolvePendingBets(txList, loadedFixtures) {
      const pendingTxs = txList.filter(t => t.type === 'pendente');
      if (pendingTxs.length === 0) return txList;

      try {
        const allFixtures = loadedFixtures && loadedFixtures.length > 0 ? loadedFixtures : await loadFixtures();
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
          localStorage.setItem(userTxsKey, JSON.stringify(updatedList));
        }

        return updatedList;
      } catch (e) {
        console.warn("Auto-resolve no Supabase falhou:", e);
        return txList;
      }
    }

    function fallbackToLocal() {
      const savedTxs = localStorage.getItem(userTxsKey);
      if (savedTxs) {
        try {
          const parsed = JSON.parse(savedTxs);
          loadFixturesForTransactions(parsed).then(allFixtures => {
            autoResolvePendingBets(parsed, allFixtures).then(resolved => {
              setTransactions(resolved);
            });
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
  }, [user]);

  const handleDeleteTransaction = (id) => {
    setConfirmDeleteModal({ show: true, txId: id });
  };

  const executeDeleteTransaction = async () => {
    const id = confirmDeleteModal.txId;
    setConfirmDeleteModal({ show: false, txId: null });
    if (!id) return;

    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);

    const userTxIdsKey = `ev_tracker_user_tx_ids_${user?.id || 'guest'}`;
    const userTxsKey = `ev_tracker_banca_txs_${user?.id || 'guest'}`;

    if (supabase) {
      try {
        const { error } = await supabase
          .from('banca_transactions')
          .delete()
          .eq('id', id);
        if (error) throw error;

        // Atualizar lista local no localStorage para evitar ressincronização no refresh
        localStorage.setItem(userTxsKey, JSON.stringify(updated));

        // Remover da lista de IDs do usuário
        const userTxIds = JSON.parse(localStorage.getItem(userTxIdsKey) || '[]');
        const filteredIds = userTxIds.filter(tid => tid !== id);
        localStorage.setItem(userTxIdsKey, JSON.stringify(filteredIds));

        showToast('Aposta excluída da banca!', 'success');
      } catch (err) {
        console.warn("Erro ao deletar no Supabase:", err);
        showToast("Erro ao excluir registro: " + err.message, 'error');
      }
    } else {
      localStorage.setItem(userTxsKey, JSON.stringify(updated));
      // Remover da lista de IDs do usuário
      const userTxIds = JSON.parse(localStorage.getItem(userTxIdsKey) || '[]');
      const filteredIds = userTxIds.filter(tid => tid !== id);
      localStorage.setItem(userTxIdsKey, JSON.stringify(filteredIds));
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
        @page {
          size: A4 portrait;
          margin: 15mm 15mm 15mm 15mm;
        }
        @media print {
          html, body, .app-container, .main-content, .table-responsive-container, 
          [class*="app-container"], [class*="main-content"], [class*="app_container"], [class*="main_content"] {
            overflow: visible !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          header, button, select, nav, aside, .no-print,
          [class*="mobileHeader"], [class*="bottomNav"], [class*="sidebar"] {
            display: none !important;
            height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            position: absolute !important;
            visibility: hidden !important;
          }
          .main-content {
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .main-content > div {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          /* Grid de KPIs lado a lado na impressão */
          .grid-responsive-cards {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 12px !important;
            margin-bottom: 20px !important;
          }
          /* Gráficos um abaixo do outro na impressão para evitar sobreposição */
          .backtest-charts-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 20px !important;
            margin-bottom: 20px !important;
            page-break-inside: avoid;
          }
          .responsive-chart-wrapper {
            width: 100% !important;
            height: 250px !important;
          }
          .glass-panel {
            background: #ffffff !important;
            color: #000000 !important;
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            border-radius: 8px !important;
            padding: 12px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          h1, h2, h3, p, div, span, td, th {
            color: #000000 !important;
          }
          /* Forçar cores de gráficos na impressão */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          table {
            border-collapse: collapse;
            width: 100% !important;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          th, td {
            border-bottom: 1px solid #e2e8f0 !important;
            padding: 8px !important;
          }
          th {
            background-color: #f8fafc !important;
            font-weight: bold !important;
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
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 25, bottom: 0 }}>
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
                        <td 
                          onClick={() => {
                            setSelectedTxForDetail(tx);
                            setShowDetailModal(true);
                          }}
                          style={{ padding: '12px', fontWeight: 500, fontSize: '0.95rem', cursor: 'pointer' }}
                          title="Ver detalhes da aposta"
                        >
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
                        <td style={{ padding: '12px' }} className="no-print">
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                            <button 
                              onClick={() => {
                                setSelectedTxForDetail(tx);
                                setShowDetailModal(true);
                              }}
                              style={{ background: 'transparent', border: '1px solid #444', borderRadius: '4px', color: 'var(--brand-neon)', padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                              onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--brand-neon)'; }}
                              onMouseOut={(e) => { e.currentTarget.style.borderColor = '#444'; }}
                              title="Ver Detalhes"
                            >
                              <Eye size={14} />
                            </button>
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

      {/* Modal de Detalhes da Aposta */}
      {showDetailModal && selectedTxForDetail && (
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
            width: '95%',
            maxWidth: '450px',
            background: 'linear-gradient(135deg, #111115, #14141d)',
            border: '1px solid #333',
            borderTop: '4px solid var(--brand-neon)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                🎫 Detalhes da Aposta
              </h3>
              <button 
                onClick={() => { setShowDetailModal(false); setSelectedTxForDetail(null); }}
                style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            {/* Match info */}
            {(() => {
              const teams = parseMatchTeams(selectedTxForDetail.description);
              const selections = parseSelections(selectedTxForDetail.description);
              const isGain = selectedTxForDetail.type === 'ganho';
              const isLoss = selectedTxForDetail.type === 'perda';
              const isPending = selectedTxForDetail.type === 'pendente';
              const isAlav = selectedTxForDetail.type === 'alavancagem';

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  
                  {/* Partida / Evento */}
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Partida</span>
                    {teams.away ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#141419', padding: '10px 14px', borderRadius: '8px', border: '1px solid #222' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                          <img
                            src={getTeamLogoUrl(teams.home)}
                            alt={teams.home}
                            style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                            onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${teams.home}&background=222&color=fff&rounded=true&bold=true&size=24`; }}
                          />
                          <strong style={{ color: '#fff', fontSize: '0.92rem' }}>{teams.home}</strong>
                          <span style={{ color: '#555', fontSize: '0.8rem' }}>x</span>
                          <img
                            src={getTeamLogoUrl(teams.away)}
                            alt={teams.away}
                            style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                            onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${teams.away}&background=222&color=fff&rounded=true&bold=true&size=24`; }}
                          />
                          <strong style={{ color: '#fff', fontSize: '0.92rem' }}>{teams.away}</strong>
                        </div>
                        {(() => {
                          const matchName = selectedTxForDetail.description.replace('[Palpite] ', '').replace('[Aposta Criada] ', '').split(' (')[0].trim().toLowerCase();
                          const game = fixtures.find(f => `${f.home.trim()} x ${f.away.trim()}`.toLowerCase() === matchName);
                          if (game && game.isFinished) {
                            return (
                              <div style={{ textAlign: 'center', borderTop: '1px dashed #222', paddingTop: '6px', marginTop: '2px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#888' }}>Placar Final: </span>
                                <strong style={{ color: 'var(--brand-neon)', fontSize: '0.85rem' }}>{game.goalsHome} x {game.goalsAway}</strong>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    ) : (
                      <div style={{ background: '#141419', padding: '10px 14px', borderRadius: '8px', border: '1px solid #222', color: '#fff', fontWeight: 'bold', fontSize: '0.95rem' }}>
                        {selectedTxForDetail.description.replace('[Palpite] ', '').replace('[Aposta Criada] ', '')}
                      </div>
                    )}
                  </div>

                  {/* Seleções */}
                  {selections.length > 0 && (
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Seleções Incluídas</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {(() => {
                          const matchName = selectedTxForDetail.description.replace('[Palpite] ', '').replace('[Aposta Criada] ', '').split(' (')[0].trim().toLowerCase();
                          const game = fixtures.find(f => `${f.home.trim()} x ${f.away.trim()}`.toLowerCase() === matchName);
                          const gh = game?.isFinished ? game.goalsHome : null;
                          const ga = game?.isFinished ? game.goalsAway : null;

                          return selections.map((sel, idx) => {
                            let statusIcon = '•';
                            let statusColor = 'var(--brand-neon)';
                            let statusText = '';

                            if (game && game.isFinished && gh !== null && ga !== null) {
                              const isHit = evaluateSelection(sel, gh, ga);
                              statusIcon = isHit ? '✔️' : '❌';
                              statusColor = isHit ? '#4CAF50' : '#ff4d4d';
                              statusText = isHit ? 'Acertou' : 'Errou';
                            }

                            return (
                              <div key={idx} style={{ 
                                background: 'rgba(255,255,255,0.02)', 
                                border: '1px solid #222', 
                                padding: '8px 12px', 
                                borderRadius: '6px', 
                                fontSize: '0.82rem', 
                                color: '#eee', 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                alignItems: 'center' 
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ color: statusColor, fontWeight: 'bold' }}>{statusIcon}</span>
                                  <span>{sel}</span>
                                </div>
                                {statusText && (
                                  <span style={{ 
                                    fontSize: '0.68rem', 
                                    color: '#000', 
                                    background: statusColor, 
                                    padding: '2px 6px', 
                                    borderRadius: '4px',
                                    fontWeight: 'bold' 
                                  }}>
                                    {statusText}
                                  </span>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Informações Financeiras */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', borderTop: '1px solid #222', paddingTop: '14px' }}>
                    <div style={{ background: '#141419', padding: '8px 12px', borderRadius: '8px', border: '1px solid #222' }}>
                      <span style={{ fontSize: '0.65rem', color: '#888', display: 'block' }}>Data</span>
                      <strong style={{ color: '#fff', fontSize: '0.85rem' }}>{new Date(selectedTxForDetail.date + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>
                    </div>
                    <div style={{ background: '#141419', padding: '8px 12px', borderRadius: '8px', border: '1px solid #222' }}>
                      <span style={{ fontSize: '0.65rem', color: '#888', display: 'block' }}>Status</span>
                      <span style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: 'bold',
                        color: isGain ? '#4CAF50' : isLoss ? '#ff4d4d' : isAlav ? '#4CAF50' : '#FFC107'
                      }}>
                        {isGain ? 'GANHO' : isLoss ? 'PERDA' : isAlav ? 'ALAVANCAGEM' : 'PENDENTE'}
                      </span>
                    </div>
                    <div style={{ background: '#141419', padding: '8px 12px', borderRadius: '8px', border: '1px solid #222' }}>
                      <span style={{ fontSize: '0.65rem', color: '#888', display: 'block' }}>Valor Apostado (Stake)</span>
                      <strong style={{ color: '#fff', fontSize: '0.85rem' }}>R$ {selectedTxForDetail.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                    <div style={{ background: '#141419', padding: '8px 12px', borderRadius: '8px', border: '1px solid #222' }}>
                      <span style={{ fontSize: '0.65rem', color: '#888', display: 'block' }}>Odd</span>
                      <strong style={{ color: '#ff9800', fontSize: '0.85rem' }}>{selectedTxForDetail.odd ? `@${selectedTxForDetail.odd.toFixed(2)}` : '-'}</strong>
                    </div>
                  </div>

                  {/* Resultado Financeiro */}
                  <div style={{ 
                    background: isPending ? 'rgba(255, 193, 7, 0.05)' : (isGain || isAlav) ? 'rgba(76, 175, 80, 0.05)' : 'rgba(255, 77, 77, 0.05)', 
                    border: '1.5px dashed ' + (isPending ? '#FFC107' : (isGain || isAlav) ? '#4CAF50' : '#ff4d4d'), 
                    borderRadius: '8px', 
                    padding: '12px 14px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginTop: '4px'
                  }}>
                    <span style={{ fontSize: '0.78rem', color: '#eee', fontWeight: 'bold' }}>
                      {isPending ? 'Retorno Estimado:' : (isGain || isAlav) ? 'Lucro Líquido:' : 'Prejuízo:'}
                    </span>
                    <strong style={{ 
                      fontSize: '1.05rem', 
                      color: isPending ? '#FFC107' : (isGain || isAlav) ? '#4CAF50' : '#ff4d4d' 
                    }}>
                      R$ {
                        isPending 
                          ? (selectedTxForDetail.odd ? (selectedTxForDetail.amount * selectedTxForDetail.odd).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : selectedTxForDetail.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
                          : (isGain || isAlav) && selectedTxForDetail.odd
                            ? (selectedTxForDetail.amount * (selectedTxForDetail.odd - 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                            : selectedTxForDetail.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                      }
                    </strong>
                  </div>

                </div>
              );
            })()}

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button 
                onClick={() => { setShowDetailModal(false); setSelectedTxForDetail(null); }}
                style={{
                  background: 'var(--brand-neon)',
                  border: 'none',
                  color: '#000',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  boxShadow: '0 4px 15px rgba(204, 255, 0, 0.2)'
                }}
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Confirmar Exclusão da Aposta */}
      <ConfirmModal
        isOpen={confirmDeleteModal.show}
        onClose={() => setConfirmDeleteModal({ show: false, txId: null })}
        onConfirm={executeDeleteTransaction}
        title="Excluir da Banca"
        message="Deseja realmente excluir este palpite seguido da sua banca?"
        confirmText="Excluir"
        cancelText="Cancelar"
        isDestructive={true}
      />

      <style>{`
        @keyframes slideIn {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
