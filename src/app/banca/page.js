'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart as RechartsLineChart, 
  Line, 
  BarChart as RechartsBarChart,
  Bar,
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
  Percent,
  Eye
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { calculatePoissonMatchStats } from '../../utils/poisson';
import { useAuth } from '../../context/AuthContext';

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

export default function GestaoBancaPage() {
  const { user, isTrialActive } = useAuth();
  const [initialValue, setInitialValue] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [syncStatus, setSyncStatus] = useState('connecting'); // 'connecting', 'cloud', 'local'
  
  // Pagination States
  const [bancaPage, setBancaPage] = useState(1);
  const [bancaLimit, setBancaLimit] = useState(10);
  
  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [modalInputVal, setModalInputVal] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTxForDetail, setSelectedTxForDetail] = useState(null);
  const [fixtures, setFixtures] = useState([]);

  const [txType, setTxType] = useState('ganho'); // 'ganho', 'perda', 'alavancagem'
  const [txAmount, setTxAmount] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [chartView, setChartView] = useState('banca'); // 'banca' or 'alavancagem'
  const [chartPeriod, setChartPeriod] = useState('diario'); // 'diario' or 'mensal'
  const [riskPct, setRiskPct] = useState(0.05); // default 5%
  const [selectedMonth, setSelectedMonth] = useState('Todos');
  const [selectedYear, setSelectedYear] = useState('Todos');

  useEffect(() => {
    if (!user) return;
    const userRiskKey = `ev_tracker_max_risk_pct_${user.id}`;
    const savedRisk = localStorage.getItem(userRiskKey);
    if (savedRisk) {
      setRiskPct(parseFloat(savedRisk));
    } else {
      setRiskPct(0.05);
    }
  }, [user?.id]);

  const handleIncreaseRisk = () => {
    setRiskPct(prev => {
      const next = Math.min(1.0, parseFloat((prev + 0.01).toFixed(2)));
      if (user) {
        localStorage.setItem(`ev_tracker_max_risk_pct_${user.id}`, next.toString());
      }
      return next;
    });
  };

  const handleDecreaseRisk = () => {
    setRiskPct(prev => {
      const next = Math.max(0.01, parseFloat((prev - 0.01).toFixed(2)));
      if (user) {
        localStorage.setItem(`ev_tracker_max_risk_pct_${user.id}`, next.toString());
      }
      return next;
    });
  };

  // Mapeia transações com descrição 'Alavancagem' para o tipo virtual 'alavancagem'
  const normalizedTransactions = useMemo(() => {
    return transactions.map(t => {
      if (t.description === 'Alavancagem' || t.description === 'Alavancagem Manual' || (t.description && t.description.startsWith('[Alavancagem]'))) {
        return { ...t, type: 'alavancagem' };
      }
      return t;
    });
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return normalizedTransactions.filter(t => t.type === 'ganho' || t.type === 'perda' || t.type === 'alavancagem' || t.type === 'pendente');
  }, [normalizedTransactions]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (bancaPage - 1) * bancaLimit;
    return filteredTransactions.slice(startIndex, startIndex + bancaLimit);
  }, [filteredTransactions, bancaPage, bancaLimit]);

  // Reset page to 1 if the list size shrinks below current page range
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredTransactions.length / bancaLimit));
    if (bancaPage > maxPage) {
      setBancaPage(maxPage);
    }
  }, [filteredTransactions.length, bancaLimit, bancaPage]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // Load from Supabase (with fallback to LocalStorage)
  useEffect(() => {
    setMounted(true);
    if (!user) return;
    const userBancaKey = `ev_tracker_banca_initial_value_${user.id}`;
    const userTxsKey = `ev_tracker_banca_txs_${user.id}`;
    const userTxIdsKey = `ev_tracker_user_tx_ids_${user.id}`;

    async function loadInitialValue() {
      if (supabase && user) {
        try {
          const { data, error } = await supabase
            .from('user_settings')
            .select('banca')
            .eq('id', user.id)
            .maybeSingle();

          if (error) throw error;
          if (data && data.banca !== undefined && data.banca !== null) {
            const val = parseFloat(data.banca);
            setInitialValue(val);
            localStorage.setItem(userBancaKey, val.toString());
            return;
          }
        } catch (e) {
          console.warn("Erro ao buscar banca inicial do Supabase:", e);
        }
      }

      const savedInitialValue = localStorage.getItem(userBancaKey);
      if (savedInitialValue) {
        setInitialValue(parseFloat(savedInitialValue));
      } else {
        setInitialValue(1000);
        localStorage.setItem(userBancaKey, '1000');
      }
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
        console.warn("Supabase não está configurado. Usando localStorage.");
        fallbackToLocal();
        return;
      }

      try {
        const { data, error } = await supabase
          .from('banca_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .order('id', { ascending: false });

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
        setSyncStatus('cloud');
      } catch (err) {
        console.warn("Erro ao carregar do Supabase. Usando localStorage de fallback:", err);
        fallbackToLocal();
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

        // Adicionar IDs sincronizados nas IDs locais do usuário
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
            let isHit = true; // true = ganho, false = perda, null = reembolso (devolvida)

            const selections = selectionsStr.split(',').map(s => s.trim()).filter(Boolean);
            if (selections.length === 0) {
              isHit = false;
            } else {
              let hasRefund = false;
              for (const sel of selections) {
                const res = evaluateSelection(sel, gh, ga);
                if (res === false) {
                  isHit = false;
                  hasRefund = false;
                  break;
                } else if (res === null) {
                  hasRefund = true;
                }
              }
              if (isHit !== false && hasRefund) {
                isHit = null; // Aposta devolvida (anulada)
              }
            }

            const resolvedType = isHit === false ? 'perda' : 'ganho';
            const finalOdd = isHit === null ? 1.0 : t.odd;
            
            t.type = resolvedType;
            t.odd = finalOdd;
            if (isHit === null && !t.description.includes('[DEVOLVIDA]')) {
              t.description = t.description + ' [DEVOLVIDA]';
            }
            didUpdate = true;

            // Atualizar no Supabase
            if (supabase) {
              await supabase
                .from('banca_transactions')
                .update({ 
                  type: resolvedType, 
                  odd: finalOdd,
                  description: t.description
                })
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
      setSyncStatus('local');
    }

    async function init() {
      await loadInitialValue();
      await cleanupPastBets();
      await loadTransactions();
    }

    init();
  }, [user]);

  // Helpers para salvar dados localmente (fallback)
  const saveTransactionsLocal = (txs) => {
    setTransactions(txs);
    const userTxsKey = `ev_tracker_banca_txs_${user?.id || 'guest'}`;
    localStorage.setItem(userTxsKey, JSON.stringify(txs));
  };

  const handleTypeChange = (type) => {
    setTxType(type);
  };

  // Handler para adicionar transação
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!txAmount || Number(txAmount) <= 0) return;

    const todayDate = new Date().toISOString().slice(0, 10);
    const userTxIdsKey = `ev_tracker_user_tx_ids_${user?.id || 'guest'}`;
    const userTxsKey = `ev_tracker_banca_txs_${user?.id || 'guest'}`;
    
    // Se for Alavancagem, salvamos na DB como "ganho" para respeitar a constraint,
    // e na descrição como "Alavancagem" para ser mapeada no frontend.
    const dbType = txType === 'alavancagem' ? 'ganho' : txType;
    const desc = txType === 'alavancagem' 
      ? 'Alavancagem' 
      : txType === 'ganho' 
        ? 'Ganho Manual' 
        : 'Perda Manual';
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
            type: dbType,
            amount: Number(txAmount),
            description: desc,
            odd: oddVal,
            user_id: user.id
          }])
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          // Guardar ID associado a este usuário
          const userTxIds = JSON.parse(localStorage.getItem(userTxIdsKey) || '[]');
          userTxIds.push(data[0].id);
          localStorage.setItem(userTxIdsKey, JSON.stringify(userTxIds));

          const updated = [data[0], ...transactions];
          updated.sort((a, b) => new Date(b.date) - new Date(a.date));
          setTransactions(updated);
          localStorage.setItem(userTxsKey, JSON.stringify(updated));
        } else {
          const updated = [newTxLocal, ...transactions];
          updated.sort((a, b) => new Date(b.date) - new Date(a.date));
          setTransactions(updated);
          localStorage.setItem(userTxsKey, JSON.stringify(updated));
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
    const userTxIdsKey = `ev_tracker_user_tx_ids_${user?.id || 'guest'}`;
    const userTxsKey = `ev_tracker_banca_txs_${user?.id || 'guest'}`;

    if (syncStatus === 'cloud' && supabase) {
      try {
        const { error } = await supabase
          .from('banca_transactions')
          .delete()
          .eq('id', id);

        if (error) throw error;

        // Remover ID associado a este usuário
        const userTxIds = JSON.parse(localStorage.getItem(userTxIdsKey) || '[]');
        const filteredIds = userTxIds.filter(tid => tid !== id);
        localStorage.setItem(userTxIdsKey, JSON.stringify(filteredIds));

        const updated = transactions.filter(t => t.id !== id);
        setTransactions(updated);
        localStorage.setItem(userTxsKey, JSON.stringify(updated));
        showToast('Transação excluída com sucesso!', 'success');
      } catch (err) {
        console.warn("Erro ao deletar no Supabase:", err);
        showToast("Erro ao excluir registro na nuvem: " + err.message, 'error');
      }
    } else {
      // Deletar da lista de IDs do usuário
      const userTxIds = JSON.parse(localStorage.getItem(userTxIdsKey) || '[]');
      const filteredIds = userTxIds.filter(tid => tid !== id);
      localStorage.setItem(userTxIdsKey, JSON.stringify(filteredIds));

      const updated = transactions.filter(t => t.id !== id);
      saveTransactionsLocal(updated);
      showToast('Transação excluída com sucesso!', 'success');
    }
  };

  const handleToggleStatus = async (tx) => {
    let nextType = 'pendente';
    if (tx.type === 'pendente') nextType = 'ganho';
    else if (tx.type === 'ganho') nextType = 'perda';
    else if (tx.type === 'perda') nextType = 'pendente';
    else if (tx.type === 'alavancagem') return; // Alavancagem não altera status

    const userTxsKey = `ev_tracker_banca_txs_${user?.id || 'guest'}`;

    // Atualiza localmente
    const updated = transactions.map(t => t.id === tx.id ? { ...t, type: nextType } : t);
    setTransactions(updated);
    localStorage.setItem(userTxsKey, JSON.stringify(updated));

    // Atualiza no Supabase
    if (syncStatus === 'cloud' && supabase && user) {
      try {
        const { error } = await supabase
          .from('banca_transactions')
          .update({ type: nextType })
          .eq('id', tx.id);
        if (error) throw error;
        showToast('Resultado da aposta alterado!', 'success');
      } catch (err) {
        console.warn("Erro ao atualizar status no Supabase:", err);
        showToast("Erro ao sincronizar alteração na nuvem", "error");
      }
    } else {
      showToast('Resultado da aposta alterado!', 'success');
    }
  };
  
  // Cálculos de métricas da Banca
  const stats = useMemo(() => {
    let totalDeposits = initialValue;
    let totalWithdrawals = 0;
    let totalLeverage = 0;
    let totalProfit = 0;
    let totalLoss = 0;
    let wins = 0;
    let losses = 0;
    let pendingStakes = 0;

    normalizedTransactions.forEach(t => {
      if (t.type === 'aporte') totalDeposits += t.amount;
      else if (t.type === 'retirada') totalWithdrawals += t.amount;
      else if (t.type === 'alavancagem') {
        totalLeverage += t.amount;
      }
      else if (t.type === 'ganho') {
        const profit = t.odd ? t.amount * (t.odd - 1) : t.amount;
        totalProfit += profit;
        wins += 1;
      }
      else if (t.type === 'perda') {
        totalLoss += t.amount;
        losses += 1;
      }
      else if (t.type === 'pendente') {
        pendingStakes += t.amount;
      }
    });

    const netProfit = totalProfit - totalLoss;
    const currentBalance = totalDeposits + totalLeverage - totalWithdrawals + netProfit - pendingStakes; // Saldo calculado automaticamente descontando pendentes
    const totalYield = totalLoss > 0 ? (netProfit / totalLoss) * 100 : 0;

    const totalBets = wins + losses;
    const hitRate = totalBets > 0 ? (wins / totalBets) * 100 : 0;

    return {
      totalDeposits,
      totalWithdrawals,
      totalLeverage,
      netProfit,
      currentBalance,
      totalYield,
      wins,
      losses,
      totalBets,
      hitRate
    };
  }, [normalizedTransactions, initialValue]);

  // Compilar dados para o gráfico (ordem cronológica ascendente)
  const chartData = useMemo(() => {
    const sorted = [...normalizedTransactions]
      .filter(t => t.type === 'ganho' || t.type === 'perda' || t.type === 'alavancagem')
      .filter(t => {
        if (!t.date) return true;
        const [y, m, d] = t.date.split('-');
        if (selectedYear !== 'Todos' && y !== selectedYear) return false;
        if (selectedMonth !== 'Todos' && m !== selectedMonth) return false;
        return true;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (chartPeriod === 'mensal') {
      let minYearMonth = null;
      let maxYearMonth = null;
      
      const allSorted = [...normalizedTransactions]
        .filter(t => t.date && (t.type === 'ganho' || t.type === 'perda' || t.type === 'alavancagem'))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
        
      allSorted.forEach(t => {
        const ym = t.date.substring(0, 7); // "YYYY-MM"
        if (!minYearMonth || ym < minYearMonth) minYearMonth = ym;
        if (!maxYearMonth || ym > maxYearMonth) maxYearMonth = ym;
      });
      
      const now = new Date();
      const currentYearMonth = now.toISOString().substring(0, 7);
      if (!minYearMonth) minYearMonth = currentYearMonth;
      if (!maxYearMonth) maxYearMonth = currentYearMonth;
      
      const monthsSequence = [];
      let currentYM = minYearMonth;
      while (currentYM <= maxYearMonth) {
        monthsSequence.push(currentYM);
        let [y, m] = currentYM.split('-').map(Number);
        m++;
        if (m > 12) {
          m = 1;
          y++;
        }
        currentYM = `${y}-${String(m).padStart(2, '0')}`;
      }

      const monthlyDataMap = {};
      let balance = initialValue;
      let leverage = 0;
      
      allSorted.forEach((t) => {
        if (t.type === 'ganho') {
          const profit = t.odd ? t.amount * (t.odd - 1) : t.amount;
          balance += profit;
        } else if (t.type === 'alavancagem') {
          balance += t.amount;
          leverage += t.amount;
        } else if (t.type === 'perda') {
          balance -= t.amount;
        }
        
        const monthYear = t.date.substring(0, 7);
        monthlyDataMap[monthYear] = {
          balance: balance,
          leverage: leverage,
          date: monthYear
        };
      });

      let lastKnownBalance = initialValue;
      let lastKnownLeverage = 0;
      
      const fullMonthlyPoints = monthsSequence.map(ym => {
        if (monthlyDataMap[ym]) {
          lastKnownBalance = monthlyDataMap[ym].balance;
          lastKnownLeverage = monthlyDataMap[ym].leverage;
        }
        
        return {
          yearMonth: ym,
          balance: lastKnownBalance,
          leverage: lastKnownLeverage
        };
      });
      
      const monthNames = {
        '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
        '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
      };
      
      const monthlyPoints = fullMonthlyPoints
        .filter(p => {
          const [year, month] = p.yearMonth.split('-');
          if (selectedYear !== 'Todos' && year !== selectedYear) return false;
          if (selectedMonth !== 'Todos' && month !== selectedMonth) return false;
          return true;
        })
        .map(p => {
          const [year, month] = p.yearMonth.split('-');
          const displayLabel = `${monthNames[month] || month}/${year.substring(2)}`;
          return {
            date: displayLabel,
            balance: parseFloat(p.balance.toFixed(2)),
            leverage: parseFloat(p.leverage.toFixed(2)),
            label: `Fim de ${monthNames[month] || month} ${year}`
          };
        });

      return monthlyPoints;
    }

    const dataPoints = [{
      date: 'Início',
      balance: initialValue,
      leverage: 0,
      label: 'Saldo Inicial'
    }];

    let balance = initialValue;
    let leverage = 0;
    sorted.forEach((t) => {
      if (t.type === 'ganho') {
        const profit = t.odd ? t.amount * (t.odd - 1) : t.amount;
        balance += profit;
      }
      else if (t.type === 'alavancagem') {
        balance += t.amount;
        leverage += t.amount;
      }
      else if (t.type === 'perda') {
        balance -= t.amount;
      }

      // Formatar data para exibição no eixo X (dia, mês e ano)
      const txDateObj = new Date(t.date + 'T12:00:00');
      const dateStr = txDateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

      dataPoints.push({
        date: dateStr,
        balance: balance,
        leverage: leverage,
        label: t.description
      });
    });

    return dataPoints;
  }, [normalizedTransactions, initialValue, selectedMonth, selectedYear, chartView, chartPeriod]);

  const isPositive = stats.netProfit >= 0;

  if (!user) {
    return null;
  }

  if (!isTrialActive()) {
    return (
      <div style={{
        padding: '40px 24px',
        textAlign: 'center',
        background: '#111116',
        border: '2px solid rgba(255, 68, 68, 0.3)',
        borderRadius: '16px',
        maxWidth: '600px',
        margin: '60px auto',
        boxShadow: '0 0 30px rgba(255, 68, 68, 0.05)',
        fontFamily: 'system-ui, sans-serif',
        color: '#fff'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', textTransform: 'uppercase' }}>
          Seu Teste Grátis de 7 Dias Expirou!
        </h3>
        <p style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '12px', lineHeight: 1.5 }}>
          O período de avaliação gratuita da sua Carteira e Gestão de Banca acabou. Assine agora o plano PRO por apenas **R$ 19,90/mês** para liberar acesso instantâneo e ilimitado.
        </p>
        
        <div style={{ margin: '30px 0', borderTop: '1px dashed #222', borderBottom: '1px dashed #222', padding: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: 'var(--brand-neon)', fontSize: '1.8rem', fontWeight: 900 }}>PRO</div>
              <div style={{ color: '#888', fontSize: '0.78rem', marginTop: '4px' }}>R$ 19,90 / mês</div>
            </div>
            <div>
              <div style={{ color: '#0088cc', fontSize: '1.8rem', fontWeight: 900 }}>TELEGRAM VIP</div>
              <div style={{ color: '#888', fontSize: '0.78rem', marginTop: '4px' }}>R$ 9,90 / mês</div>
            </div>
          </div>
        </div>
        <button
          onClick={() => window.location.href = '/pricing'}
          style={{
            background: 'var(--brand-neon)',
            color: '#000',
            border: 'none',
            padding: '14px 28px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(204, 255, 0, 0.2)'
          }}
        >
          Assinar Agora
        </button>
      </div>
    );
  }

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
      </header>

      {/* KPI Cards & Formulário de Movimentação Unificados */}
      <form onSubmit={handleAddTransaction}>
        {(() => {
          // Calcular porcentagens para as bordas de progresso circular (conic-gradient)
          const growthPct = initialValue > 0 ? Math.min(100, Math.max(0, (stats.currentBalance / initialValue) * 100)) : 100;
          const yieldProgress = Math.min(100, Math.max(0, Math.abs(stats.totalYield) * 2)); // 50% Yield = 100% de preenchimento
          let typeColor = 'var(--brand-neon)';
          let typeLabel = 'Ganho 🔵';
          if (txType === 'ganho') {
            typeColor = '#00d2ff';
            typeLabel = 'Ganho 🔵';
          } else if (txType === 'perda') {
            typeColor = '#ff4d4d';
            typeLabel = 'Perda 🔴';
          } else if (txType === 'alavancagem') {
            typeColor = '#4CAF50';
            typeLabel = 'Alavancagem 🟢';
          }

          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '32px', width: '100%', alignItems: 'flex-start' }}>
              
              {/* 1. Saldo Atual */}
              <div style={{ 
                width: '132px', 
                height: '132px', 
                borderRadius: '50%', 
                background: `conic-gradient(var(--brand-neon) ${growthPct}%, #27272a ${growthPct}%)`,
                display: 'flex', 
                flexShrink: 0,
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)'
              }}>
                <div style={{
                  width: '124px',
                  height: '124px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #111115, #161622)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '8px',
                  boxSizing: 'border-box'
                }}>
                  <div className="kpi-title" style={{ fontSize: '0.62rem', marginBottom: '2px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Saldo Atual</div>
                  <div className="kpi-value" style={{ fontSize: '0.88rem', color: '#fff', margin: '2px 0', wordBreak: 'break-word', fontWeight: 800 }}>
                    R$ {stats.currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="kpi-subtext" style={{ fontSize: '0.58rem', lineHeight: '1.2', color: '#555' }}>
                    Total em caixa
                  </div>
                </div>
              </div>

              {/* 2. Lucro Líquido */}
              <div style={{ 
                width: '132px', 
                height: '132px', 
                borderRadius: '50%', 
                background: `conic-gradient(${isPositive ? '#4CAF50' : '#ff4d4d'} ${yieldProgress}%, #27272a ${yieldProgress}%)`,
                display: 'flex', 
                flexShrink: 0,
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)'
              }}>
                <div style={{
                  width: '124px',
                  height: '124px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #111115, #161622)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '8px',
                  boxSizing: 'border-box'
                }}>
                  <div className="kpi-title" style={{ fontSize: '0.62rem', marginBottom: '2px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lucro Líquido</div>
                  <div className="kpi-value" style={{ fontSize: '0.88rem', color: isPositive ? '#4CAF50' : '#ff4d4d', margin: '2px 0', wordBreak: 'break-word', fontWeight: 800 }}>
                    {isPositive ? '+' : ''}R$ {stats.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="kpi-subtext" style={{ fontSize: '0.58rem', lineHeight: '1.2', color: isPositive ? '#4CAF50' : '#ff4d4d', fontWeight: 'bold' }}>
                    {stats.totalYield.toFixed(1)}% Yield
                  </div>
                </div>
              </div>

              {/* 3. Retorno Real */}
              <div style={{ 
                width: '132px', 
                height: '132px', 
                borderRadius: '50%', 
                background: `conic-gradient(#00d2ff 100%, #27272a 100%)`,
                display: 'flex', 
                flexShrink: 0,
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)'
              }}>
                <div style={{
                  width: '124px',
                  height: '124px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #111115, #161622)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '8px',
                  boxSizing: 'border-box'
                }}>
                  <div className="kpi-title" style={{ fontSize: '0.62rem', marginBottom: '2px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Retorno Real</div>
                  <div className="kpi-value" style={{ fontSize: '0.88rem', color: '#00d2ff', margin: '2px 0', wordBreak: 'break-word', fontWeight: 800 }}>
                    R$ {stats.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="kpi-subtext" style={{ fontSize: '0.58rem', lineHeight: '1.2', color: '#888' }}>
                    Ganhos reais
                  </div>
                </div>
              </div>

              {/* 4. Alavancagem */}
              <div style={{ 
                width: '132px', 
                height: '132px', 
                borderRadius: '50%', 
                background: `conic-gradient(#4CAF50 100%, #27272a 100%)`,
                display: 'flex', 
                flexShrink: 0,
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)'
              }}>
                <div style={{
                  width: '124px',
                  height: '124px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #111115, #161622)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '8px',
                  boxSizing: 'border-box'
                }}>
                  <div className="kpi-title" style={{ fontSize: '0.62rem', marginBottom: '2px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Alavancagem</div>
                  <div className="kpi-value" style={{ fontSize: '0.88rem', color: '#4CAF50', margin: '2px 0', wordBreak: 'break-word', fontWeight: 800 }}>
                    R$ {stats.totalLeverage.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="kpi-subtext" style={{ fontSize: '0.58rem', lineHeight: '1.2', color: '#888' }}>
                    Capital alavancado
                  </div>
                </div>
              </div>

              {/* 5. Valor Inicial */}
              <div style={{ 
                width: '132px', 
                height: '132px', 
                borderRadius: '50%', 
                background: `conic-gradient(var(--brand-neon) 100%, #27272a 100%)`,
                display: 'flex', 
                flexShrink: 0,
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)'
              }}>
                <div style={{
                  width: '124px',
                  height: '124px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #111115, #161622)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '8px',
                  boxSizing: 'border-box'
                }}>
                  <div className="kpi-title" style={{ fontSize: '0.62rem', marginBottom: '2px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor Inicial</div>
                  <div className="kpi-value" style={{ fontSize: '0.88rem', color: '#fff', margin: '2px 0', wordBreak: 'break-word', fontWeight: 800 }}>
                    R$ {initialValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setModalInputVal(initialValue.toString());
                      setShowModal(true);
                    }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--brand-neon)', cursor: 'pointer', fontSize: '0.62rem', padding: '2px 6px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px dashed var(--brand-neon)' }}
                  >
                    Editar
                  </button>
                </div>
              </div>

              {/* 6. Tipo de Lançamento (Seletor Circular) */}
              <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
                <div 
                  onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                  style={{ 
                    width: '132px', 
                    height: '132px', 
                    borderRadius: '50%', 
                    background: `conic-gradient(${typeColor} 100%, #27272a 100%)`,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    width: '124px',
                    height: '124px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #111115, #161622)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '8px',
                    boxSizing: 'border-box'
                  }}>
                    <div className="kpi-title" style={{ fontSize: '0.62rem', marginBottom: '2px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tipo</div>
                    <div className="kpi-value" style={{ fontSize: '0.82rem', color: typeColor, margin: '2px 0', fontWeight: 800 }}>
                      {typeLabel}
                    </div>
                    <div className="kpi-subtext" style={{ fontSize: '0.58rem', lineHeight: '1.2', color: 'var(--brand-neon)', borderBottom: '1px dashed var(--brand-neon)' }}>
                      Alterar
                    </div>
                  </div>
                </div>

                {isTypeDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '132px',
                    height: '132px',
                    borderRadius: '50%',
                    background: 'rgba(17, 17, 21, 0.98)',
                    border: `2px solid ${typeColor}`,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '8px',
                    boxSizing: 'border-box'
                  }}>
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTypeChange('ganho');
                        setIsTypeDropdownOpen(false);
                      }}
                      style={{ padding: '4px 8px', color: '#fff', fontSize: '0.72rem', cursor: 'pointer', fontWeight: txType === 'ganho' ? 'bold' : 'normal', borderRadius: '20px', background: txType === 'ganho' ? 'rgba(0, 210, 255, 0.15)' : 'transparent', border: txType === 'ganho' ? '1px solid rgba(0, 210, 255, 0.3)' : '1px dashed rgba(255,255,255,0.05)', width: '100px', textAlign: 'center' }}
                    >
                      Ganho 🔵
                    </div>
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTypeChange('perda');
                        setIsTypeDropdownOpen(false);
                      }}
                      style={{ padding: '4px 8px', color: '#fff', fontSize: '0.72rem', cursor: 'pointer', fontWeight: txType === 'perda' ? 'bold' : 'normal', borderRadius: '20px', background: txType === 'perda' ? 'rgba(255, 77, 77, 0.15)' : 'transparent', border: txType === 'perda' ? '1px solid rgba(255, 77, 77, 0.3)' : '1px dashed rgba(255,255,255,0.05)', width: '100px', textAlign: 'center' }}
                    >
                      Perda 🔴
                    </div>
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTypeChange('alavancagem');
                        setIsTypeDropdownOpen(false);
                      }}
                      style={{ padding: '4px 8px', color: '#fff', fontSize: '0.72rem', cursor: 'pointer', fontWeight: txType === 'alavancagem' ? 'bold' : 'normal', borderRadius: '20px', background: txType === 'alavancagem' ? 'rgba(76, 175, 80, 0.15)' : 'transparent', border: txType === 'alavancagem' ? '1px solid rgba(76, 175, 80, 0.3)' : '1px dashed rgba(255,255,255,0.05)', width: '100px', textAlign: 'center' }}
                    >
                      Alavancagem 🟢
                    </div>
                  </div>
                )}
              </div>

              {/* 7. Campo de Valor Circular com Botão de Adicionar Integrado */}
              {(() => {
                const maxSafeStake = stats.currentBalance * riskPct;
                const isExcessiveRisk = txAmount && Number(txAmount) > maxSafeStake && (txType === 'ganho' || txType === 'perda');
                return (
                  <div style={{ 
                    width: '132px', 
                    height: '132px', 
                    borderRadius: '50%', 
                    background: isExcessiveRisk ? `conic-gradient(#ff3b30 100%, #27272a 100%)` : `conic-gradient(var(--brand-neon) 100%, #27272a 100%)`,
                    display: 'flex', 
                    flexShrink: 0,
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)',
                    transition: 'background 0.3s'
                  }}>
                    <div style={{
                      width: '124px',
                      height: '124px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #111115, #161622)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      padding: '8px',
                      boxSizing: 'border-box'
                    }}>
                      <div className="kpi-title" style={{ fontSize: '0.62rem', marginBottom: '2px', color: isExcessiveRisk ? '#ff3b30' : '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {isExcessiveRisk ? '⚠️ ALERTA' : 'Valor'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2px 0', width: '100%' }}>
                        <span style={{ color: '#888', fontSize: '0.78rem', fontWeight: 'bold', marginRight: '2px' }}>R$</span>
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0.01" 
                          required
                          placeholder="0,00"
                          value={txAmount}
                          onChange={(e) => setTxAmount(e.target.value)}
                          style={{
                            width: '60px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: '1px dashed #555',
                            color: '#fff',
                            textAlign: 'center',
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            outline: 'none',
                            padding: '1px 0'
                          }} 
                        />
                      </div>

                      {isExcessiveRisk ? (
                        <div style={{ fontSize: '0.45rem', color: '#ff3b30', fontWeight: 'bold', lineHeight: '1.2', margin: '1px 0', maxWidth: '110px' }}>
                          Excede ({ (riskPct * 100).toFixed(0) }%)
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.55rem', color: '#555', lineHeight: '1.2' }}>
                          Limite R$ {maxSafeStake.toFixed(0)}
                        </div>
                      )}
                      
                      <button 
                        type="submit"
                        style={{
                          marginTop: '2px',
                          background: isExcessiveRisk ? '#ff3b30' : 'var(--brand-neon)',
                          color: isExcessiveRisk ? '#fff' : '#000',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: isExcessiveRisk ? '0 3px 8px rgba(255, 59, 48, 0.4)' : '0 3px 8px rgba(204, 255, 0, 0.4)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        title="Salvar Lançamento"
                      >
                        <PlusCircle size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* 8. Gestão de Risco / Plano de Gerenciamento */}
              {(() => {
                const pct = Math.round(riskPct * 100);
                const isHighRisk = riskPct > 0.10;
                const isModerateRisk = riskPct > 0.05 && riskPct <= 0.10;
                
                let riskColor = 'var(--brand-neon)';
                let riskStatus = 'Seguro';
                if (isHighRisk) {
                  riskColor = '#ff3b30';
                  riskStatus = 'Alto Risco ⚠️';
                } else if (isModerateRisk) {
                  riskColor = 'orange';
                  riskStatus = 'Moderado ⚡';
                }
                
                const maxSafeAmount = stats.currentBalance * riskPct;

                return (
                  <div style={{ 
                    width: '132px', 
                    height: '132px', 
                    borderRadius: '50%', 
                    background: `conic-gradient(${riskColor} ${pct}%, #27272a ${pct}%)`,
                    display: 'flex', 
                    flexShrink: 0,
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)'
                  }}>
                    <div style={{
                      width: '124px',
                      height: '124px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #111115, #161622)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      padding: '8px',
                      boxSizing: 'border-box'
                    }}>
                      <div className="kpi-title" style={{ fontSize: '0.62rem', marginBottom: '2px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        % Risco Max
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '2px 0' }}>
                        <button
                          type="button"
                          onClick={handleDecreaseRisk}
                          style={{
                            background: '#222',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            outline: 'none'
                          }}
                        >
                          -
                        </button>
                        
                        <span style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 800 }}>
                          {pct}%
                        </span>
                        
                        <button
                          type="button"
                          onClick={handleIncreaseRisk}
                          style={{
                            background: '#222',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            outline: 'none'
                          }}
                        >
                          +
                        </button>
                      </div>
                      
                      <div style={{ fontSize: '0.58rem', lineHeight: '1.2', color: riskColor, fontWeight: 'bold' }}>
                        {riskStatus}
                      </div>
                      
                      <div style={{ fontSize: '0.5rem', color: '#555', marginTop: '2px' }} title="Limite máximo de stake calculado para este risco">
                        Lim: R$ {maxSafeAmount.toFixed(0)}
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>
          );
        })()}
      </form>

      {/* Gráfico de Crescimento do Capital */}
      <div className="glass-panel responsive-chart-panel" style={{ display: 'flex', flexDirection: 'column', maxWidth: '100%', width: '100%', height: '480px', minHeight: '480px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222', paddingBottom: '12px', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: '#ccc' }}>
            Gráfico de Desempenho
          </h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Filtro Mês */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                background: '#141419',
                border: '1px solid #333',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="Todos">Todos os Meses</option>
              <option value="01">Janeiro</option>
              <option value="02">Fevereiro</option>
              <option value="03">Março</option>
              <option value="04">Abril</option>
              <option value="05">Maio</option>
              <option value="06">Junho</option>
              <option value="07">Julho</option>
              <option value="08">Agosto</option>
              <option value="09">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </select>

            {/* Filtro Ano */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                background: '#141419',
                border: '1px solid #333',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="Todos">Todos os Anos</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>

            {/* Seletor de Métrica */}
            <div style={{ display: 'flex', gap: '6px', background: '#111116', padding: '3px', borderRadius: '20px', border: '1px solid #222' }}>
              <button
                type="button"
                onClick={() => setChartView('banca')}
                style={{
                  background: chartView === 'banca' ? 'var(--brand-neon)' : 'transparent',
                  color: chartView === 'banca' ? '#000' : '#888',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
              >
                Saldo Banca
              </button>
              <button
                type="button"
                onClick={() => setChartView('alavancagem')}
                style={{
                  background: chartView === 'alavancagem' ? '#4CAF50' : 'transparent',
                  color: chartView === 'alavancagem' ? '#fff' : '#888',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
              >
                Alavancagem
              </button>
            </div>

            {/* Seletor de Período */}
            <div style={{ display: 'flex', gap: '6px', background: '#111116', padding: '3px', borderRadius: '20px', border: '1px solid #222' }}>
              <button
                type="button"
                onClick={() => setChartPeriod('diario')}
                style={{
                  background: chartPeriod === 'diario' ? 'var(--brand-neon)' : 'transparent',
                  color: chartPeriod === 'diario' ? '#000' : '#888',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
              >
                Detalhado
              </button>
              <button
                type="button"
                onClick={() => setChartPeriod('mensal')}
                style={{
                  background: chartPeriod === 'mensal' ? '#2196F3' : 'transparent',
                  color: chartPeriod === 'mensal' ? '#fff' : '#888',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
              >
                Evolução Mensal
              </button>
            </div>
          </div>
        </div>
        <div className="responsive-chart-wrapper" style={{ height: '360px', minHeight: '360px', width: '100%' }}>
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              {chartPeriod === 'mensal' ? (
                <RechartsBarChart data={chartData} margin={{ top: 10, right: 10, left: 25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="date" stroke="#666" tick={{ fill: '#666', fontSize: 11 }} />
                  <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 11 }} tickFormatter={(val) => `R$${val}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#141419', border: '1px solid #333', borderRadius: '8px' }}
                    itemStyle={{ color: chartView === 'banca' ? 'var(--brand-neon)' : '#4CAF50' }}
                    labelStyle={{ color: '#aaa', fontWeight: 'bold' }}
                  />
                  <Bar 
                    dataKey={chartView === 'banca' ? 'balance' : 'leverage'} 
                    name={chartView === 'banca' ? 'Saldo da Banca' : 'Alavancagem Acumulada'}
                    fill={chartView === 'banca' ? 'var(--brand-neon)' : '#4CAF50'}
                    radius={[4, 4, 0, 0]}
                  />
                </RechartsBarChart>
              ) : (
                <RechartsLineChart data={chartData} margin={{ top: 10, right: 10, left: 25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="date" stroke="#666" tick={{ fill: '#666', fontSize: 11 }} />
                  <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 11 }} tickFormatter={(val) => `R$${val}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#141419', border: '1px solid #333', borderRadius: '8px' }}
                    itemStyle={{ color: chartView === 'banca' ? 'var(--brand-neon)' : '#4CAF50' }}
                    labelStyle={{ color: '#aaa', fontWeight: 'bold' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={chartView === 'banca' ? 'balance' : 'leverage'} 
                    name={chartView === 'banca' ? 'Saldo da Banca' : 'Alavancagem Acumulada'}
                    stroke={chartView === 'banca' ? 'var(--brand-neon)' : '#4CAF50'} 
                    strokeWidth={3} 
                    dot={false}
                    activeDot={{ r: 6, stroke: '#000', strokeWidth: 1 }}
                  />
                </RechartsLineChart>
              )}
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

        {filteredTransactions.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #222', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#888' }}>
              <span>Itens visíveis:</span>
              <select
                value={bancaLimit}
                onChange={(e) => {
                  setBancaLimit(parseInt(e.target.value));
                  setBancaPage(1);
                }}
                style={{
                  background: '#1a1a24',
                  border: '1px solid #333',
                  color: '#fff',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value={10}>10 por página</option>
                <option value={25}>25 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>
              <span>de {filteredTransactions.length} lançamentos</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                disabled={bancaPage === 1}
                onClick={() => setBancaPage(p => Math.max(1, p - 1))}
                style={{
                  background: '#1a1a24',
                  border: '1px solid #333',
                  color: bancaPage === 1 ? '#444' : '#fff',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '0.78rem',
                  cursor: bancaPage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  transition: 'all 0.2s'
                }}
              >
                ◀ Anterior
              </button>
              <span style={{ fontSize: '0.8rem', color: '#ccc', fontFamily: 'monospace' }}>
                Página {bancaPage} de {Math.max(1, Math.ceil(filteredTransactions.length / bancaLimit))}
              </span>
              <button
                disabled={bancaPage >= Math.ceil(filteredTransactions.length / bancaLimit)}
                onClick={() => setBancaPage(p => p + 1)}
                style={{
                  background: '#1a1a24',
                  border: '1px solid #333',
                  color: bancaPage >= Math.ceil(filteredTransactions.length / bancaLimit) ? '#444' : '#fff',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '0.78rem',
                  cursor: bancaPage >= Math.ceil(filteredTransactions.length / bancaLimit) ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  transition: 'all 0.2s'
                }}
              >
                Próxima ▶
              </button>
            </div>
          </div>
        )}
        
        {filteredTransactions.length === 0 ? (
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
                 {paginatedTransactions.map((tx) => {
                  const isGain = tx.type === 'ganho';
                  const isLoss = tx.type === 'perda';
                  const isPending = tx.type === 'pendente';
                  const isAlav = tx.type === 'alavancagem';

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
                        className="mobile-hide"
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
                        <span 
                          onClick={() => handleToggleStatus(tx)}
                          title={tx.type !== 'alavancagem' ? "Clique para alternar o resultado da aposta (GANHO / PERDA / PENDENTE)" : undefined}
                          style={{ 
                            padding: '4px 10px', 
                            borderRadius: '20px', 
                            fontSize: '0.75rem', 
                            fontWeight: 600,
                            cursor: tx.type !== 'alavancagem' ? 'pointer' : 'default',
                            background: isGain ? 'rgba(0, 210, 255, 0.15)' : isLoss ? 'rgba(255, 77, 77, 0.15)' : isAlav ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 193, 7, 0.15)',
                            color: isGain ? '#00d2ff' : isLoss ? '#ff4d4d' : isAlav ? '#4CAF50' : '#FFC107',
                            border: '1px solid ' + (isGain ? 'rgba(0,210,255,0.3)' : isLoss ? 'rgba(255,77,77,0.3)' : isAlav ? 'rgba(76,175,80,0.3)' : 'rgba(255,193,7,0.3)')
                          }}
                        >
                          <span className="mobile-hide">{isGain ? 'GANHO' : isLoss ? 'PERDA' : isAlav ? 'ALAVANCAGEM' : 'PENDENTE'}</span>
                          <span className="mobile-show">{isGain ? 'G' : isLoss ? 'P' : isAlav ? 'A' : 'E'}</span>
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#ff9800', fontWeight: 500 }}>
                        <span className="mobile-hide">{tx.odd ? `@${tx.odd.toFixed(2)}` : '-'}</span>
                        <span className="mobile-show">{tx.odd ? `@${formatOddMobile(tx.odd)}` : '-'}</span>
                      </td>
                      <td style={{ 
                        padding: '12px', 
                        textAlign: 'right', 
                        fontWeight: 500,
                        color: isPending ? '#FFC107' : (isGain || isAlav) ? '#4CAF50' : '#ff4d4d' 
                      }}>
                        {isPending ? '' : (isGain || isAlav) ? '+' : '-'} R$ {
                          (isGain || isAlav) && tx.odd 
                            ? (tx.amount * (tx.odd - 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        }
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                          <button 
                            onClick={() => {
                              setSelectedTxForDetail(tx);
                              setShowDetailModal(true);
                            }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--brand-neon)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', transition: 'opacity 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.opacity = '0.7'}
                            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                            title="Ver Detalhes"
                          >
                            <Eye size={16} />
                          </button>
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
                type="text"
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
                  let clean = modalInputVal.trim();
                  if (clean.includes('.') && clean.includes(',')) {
                    clean = clean.replace(/\./g, '').replace(/,/g, '.');
                  } else if (clean.includes(',')) {
                    clean = clean.replace(/,/g, '.');
                  } else if (clean.includes('.')) {
                    const parts = clean.split('.');
                    if (parts[1] && parts[1].length === 3) {
                      clean = clean.replace(/\./g, '');
                    }
                  }
                  const num = parseFloat(clean);
                  if (!isNaN(num) && num >= 0) {
                    setInitialValue(num);
                    const userBancaKey = user ? `ev_tracker_banca_initial_value_${user.id}` : 'ev_tracker_banca_initial_value';
                    localStorage.setItem(userBancaKey, num.toString());

                    if (supabase && user) {
                      supabase
                        .from('user_settings')
                        .upsert({ id: user.id, banca: num })
                        .then(({ error }) => {
                          if (error) {
                            console.error("Erro ao salvar banca inicial no Supabase:", error);
                          }
                        });
                    }

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
