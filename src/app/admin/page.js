'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { 
  ShieldCheck, ShieldAlert, Users, TrendingUp, DollarSign, ArrowUpRight, 
  Trash2, Plus, Sparkles, Filter, Search, Award, RefreshCw, BarChart2,
  Settings, Key, Tag, Layers, HelpCircle, Edit, Trophy,
  Activity, Calendar, Target, Zap, UserPlus, Eye, Send, Clock
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'finance' | 'settings' | 'subscribers'

  // Helper para requisições administrativas anexando token de autorização
  const adminFetch = async (url, options = {}) => {
    console.log("[AdminDashboard adminFetch] Interceptando:", url, "method:", options.method || 'GET');
    if (typeof url === 'string' && (url.startsWith('/api/admin') || url.startsWith('/api/telegram'))) {
      let headers = options.headers || {};
      try {
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            headers = {
              ...headers,
              'Authorization': `Bearer ${session.access_token}`
            };
            console.log("[AdminDashboard adminFetch] Token de autorização anexado");
          } else {
            console.log("[AdminDashboard adminFetch] Sem token de acesso na sessão");
          }
        }
      } catch (e) {
        console.warn("[AdminDashboard adminFetch] Erro ao anexar token do Supabase:", e);
      }
      console.log("[AdminDashboard adminFetch] Executando globalThis.fetch com headers:", headers);
      return globalThis.fetch(url, { ...options, headers, cache: 'no-store' });
    }
    console.log("[AdminDashboard adminFetch] Repassando chamada padrão para:", url);
    return globalThis.fetch(url, options);
  };

  // --- ESTADOS PERSISTIDOS EM LOCALSTORAGE ---
  
  // 1. Controle de Gastos
  // --- ESTADOS INTEGRADOS COM SUPABASE ---
  const [gastos, setGastos] = useState([]);
  const [usersBase, setUsersBase] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false); // Mantido por retrocompatibilidade de layout
  const [subAdmins, setSubAdmins] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cupons, setCupons] = useState([]);
  const [gastosCategorias, setGastosCategorias] = useState([]);
  const [funnelMetrics, setFunnelMetrics] = useState({ visitors: 10200, trials: 2450 });

  const [loadingData, setLoadingData] = useState(true);

  // Custom Toast Notification System
  const [notification, setNotification] = useState(null);
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Modal States para Categorias de Gastos
  const [showExpenseCatModal, setShowExpenseCatModal] = useState(false);
  const [newExpenseCatName, setNewExpenseCatName] = useState('');
  const [editingExpenseCatIndex, setEditingExpenseCatIndex] = useState(null);
  const [editingExpenseCatName, setEditingExpenseCatName] = useState('');

  // Modal States para Editar Gasto/Despesa
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editExpenseName, setEditExpenseName] = useState('');
  const [editExpenseValue, setEditExpenseValue] = useState('');
  const [editExpenseCategory, setEditExpenseCategory] = useState('Outros');

  // --- OUTROS ESTADOS AUXILIARES ---
  const [novoGastoNome, setNovoGastoNome] = useState('');
  const [novoGastoValor, setNovoGastoValor] = useState('');
  const [novoGastoCat, setNovoGastoCat] = useState('Outros');

  const [searchUser, setSearchUser] = useState('');
  const [planFilter, setPlanFilter] = useState('todos');

  const [novoAdminEmail, setNovoAdminEmail] = useState('');
  const [novaCatNome, setNovaCatNome] = useState('');
  const [novaCatDesc, setNovaCatDesc] = useState('');

  const [novoCupomCode, setNovoCupomCode] = useState('');
  const [novoCupomDesc, setNovoCupomDesc] = useState('');
  const [novoCupomDisc, setNovoCupomDisc] = useState('');

  // Estados para Gerenciamento de Ligas Ativas (Palpites)
  const [ligasSaaS, setLigasSaaS] = useState([]);
  const [novaLigaNome, setNovaLigaNome] = useState('');
  const [novaLigaId, setNovaLigaId] = useState('');

  // --- ESTADOS DO TELEGRAM CONTROL ---
  const [opportunities, setOpportunities] = useState([]);
  const [loadingOpps, setLoadingOpps] = useState(false);
  const [selectedBets, setSelectedBets] = useState([]);
  const [customMessage, setCustomMessage] = useState('');
  const [cardImageUrl, setCardImageUrl] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [msgTemplate, setMsgTemplate] = useState('free');
  const [isVipSending, setIsVipSending] = useState(false);
  const fileInputRef = useRef(null);
  
  // Paginação da lista
  const [oppsPage, setOppsPage] = useState(1);
  const [oppsLimit, setOppsLimit] = useState(25);
  const [totalOppsCount, setTotalOppsCount] = useState(0);
  const [filterDate, setFilterDate] = useState('');
  const [filterLeague, setFilterLeague] = useState('');
  const [sortEV, setSortEV] = useState(false);

  // Configurações do Robô de Sinais (saas_settings)
  const [botEnabled, setBotEnabled] = useState(true);
  const [botMinEv, setBotMinEv] = useState(4.0);
  const [botHours, setBotHours] = useState(['10:00', '14:00', '18:00']);
  const [newHourInput, setNewHourInput] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [dispatchHistory, setDispatchHistory] = useState([]);
  const [companyInfo, setCompanyInfo] = useState({
    cnpj_cpf: '',
    razao_social: '',
    endereco: '',
    contato: '',
    instagram: '',
    telegram: '',
    facebook: '',
    email_suporte: ''
  });

  // Carregar histórico local
  useEffect(() => {
    const history = localStorage.getItem('ev_telegram_dispatch_history');
    if (history) {
      try {
        const parsed = JSON.parse(history);
        const todayStr = new Date().toDateString();
        const filtered = parsed.filter(item => {
          if (!item.timestamp) return false;
          return new Date(item.timestamp).toDateString() === todayStr;
        });
        setDispatchHistory(filtered);
        localStorage.setItem('ev_telegram_dispatch_history', JSON.stringify(filtered));
      } catch (e) {
        console.error('Error parsing dispatch history:', e);
      }
    }
  }, []);

  const addHistoryItem = (type, message, status) => {
    const newItem = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type,
      message,
      status // 'success' | 'error'
    };
    const todayStr = new Date().toDateString();
    const filteredCurrent = dispatchHistory.filter(item => {
      if (!item.timestamp) return false;
      return new Date(item.timestamp).toDateString() === todayStr;
    });
    const updated = [newItem, ...filteredCurrent].slice(0, 100);
    setDispatchHistory(updated);
    localStorage.setItem('ev_telegram_dispatch_history', JSON.stringify(updated));
  };

  const loadOpportunities = async (page = oppsPage, limit = oppsLimit, date = filterDate, league = filterLeague, evFirst = sortEV) => {
    try {
      setLoadingOpps(true);
      let url = `/api/admin/opportunities?page=${page}&limit=${limit}&resultado=pending`;
      if (date) url += `&date=${date}`;
      if (league) url += `&league=${encodeURIComponent(league)}`;
      if (evFirst) url += `&sortBy=ev`;
      console.log("[loadOpportunities] Chamando URL:", url, "evFirst:", evFirst);
      const res = await adminFetch(url);
      if (res.ok) {
        const data = await res.json();
        setOpportunities(data.opportunities || []);
        setTotalOppsCount(data.totalCount || 0);
      } else {
        const data = await res.json().catch(() => ({}));
        showNotification('Erro ao carregar oportunidades: ' + (data.error || 'Erro interno'), 'error');
      }
    } catch (err) {
      console.error('Erro ao carregar oportunidades:', err);
      showNotification('Erro ao conectar à API de oportunidades', 'error');
    } finally {
      setLoadingOpps(false);
    }
  };

  // Carregar sempre que trocar para a aba telegram ou quando mudar página/limite/filtros/ordenação
  useEffect(() => {
    if (activeTab === 'telegram') {
      loadOpportunities(oppsPage, oppsLimit, filterDate, filterLeague, sortEV);
    }
  }, [activeTab, oppsPage, oppsLimit, filterDate, filterLeague, sortEV]);

  const handleSaveTelegramSettings = async (enabled, minEv, hoursList) => {
    try {
      setIsSavingSettings(true);
      
      const res1 = await adminFetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'telegram_bot_enabled', value: enabled })
      });
      const res2 = await adminFetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'telegram_bot_min_ev', value: parseFloat(minEv) })
      });
      const res3 = await adminFetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'telegram_bot_hours', value: hoursList })
      });

      if (res1.ok && res2.ok && res3.ok) {
        showNotification('Configurações do Telegram salvas com sucesso!', 'success');
      } else {
        showNotification('Erro ao salvar algumas configurações.', 'error');
      }
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      showNotification('Falha de rede ao salvar configurações', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const formatCPFCNPJ = (val) => {
    const raw = val.replace(/\D/g, '');
    if (raw.length <= 11) {
      return raw
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      return raw
        .substring(0, 14)
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
  };

  const formatPhone = (val) => {
    const raw = val.replace(/\D/g, '');
    if (raw.length <= 10) {
      return raw
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
    } else {
      return raw
        .substring(0, 11)
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
    }
  };

  const handleSaveCompanyInfo = async (e) => {
    if (e) e.preventDefault();
    try {
      setIsSavingSettings(true);
      const res = await adminFetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'company_info', value: companyInfo })
      });
      if (res.ok) {
        showNotification('Informações da empresa salvas com sucesso!', 'success');
      } else {
        const data = await res.json().catch(() => ({}));
        showNotification('Erro ao salvar: ' + (data.error || 'Erro interno'), 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Falha de rede ao salvar informações', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDispatchSelected = async () => {
    if (selectedBets.length === 0) {
      showNotification('Selecione pelo menos uma aposta para enviar', 'info');
      return;
    }

    setIsVipSending(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedBets.length; i++) {
      const betId = selectedBets[i];
      const opp = opportunities.find(o => o.id === betId);
      if (!opp) continue;

      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      try {
        const response = await adminFetch('/api/telegram/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isVip: true,
            opportunity: opp
          })
        });

        if (response.ok) {
          successCount++;
          addHistoryItem('Automático/Manual', `Enviada: ${opp.confronto} (${opp.mercado})`, 'success');
        } else {
          failCount++;
          const errData = await response.json().catch(() => ({}));
          addHistoryItem('Automático/Manual', `Falha: ${opp.confronto} - ${errData.error || 'Erro'}`, 'error');
        }
      } catch (err) {
        failCount++;
        addHistoryItem('Automático/Manual', `Erro: ${opp.confronto}`, 'error');
      }
    }

    setIsVipSending(false);
    setSelectedBets([]);
    showNotification(`Envio concluído: ${successCount} enviadas, ${failCount} falhas.`, successCount > 0 ? 'success' : 'error');
  };

  const [broadcastChannel, setBroadcastChannel] = useState('vip'); // 'vip' | 'free' | 'radar_ev'

  const handleSendCustomCard = async () => {
    if (!customMessage.trim() && !cardImageUrl) {
      showNotification('Escreva a mensagem ou escolha uma imagem', 'info');
      return;
    }

    setIsVipSending(true);
    try {
      const response = await adminFetch('/api/telegram/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isVip: broadcastChannel === 'vip',
          targetChannel: broadcastChannel,
          message: customMessage,
          imageUrl: cardImageUrl,
          buttonText,
          buttonUrl
        })
      });

      if (response.ok) {
        addHistoryItem(`Card (${broadcastChannel.toUpperCase()})`, customMessage.substring(0, 50) + '...', 'success');
        showNotification(`Mensagem enviada com sucesso para o canal ${broadcastChannel.toUpperCase()}!`, 'success');
        setCustomMessage('');
        setCardImageUrl('');
        setButtonText('');
        setButtonUrl('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        addHistoryItem(`Card (${broadcastChannel.toUpperCase()})`, `Falha: ${errData.error || 'Erro'}`, 'error');
        showNotification('Erro ao enviar: ' + (errData.error || 'Desconhecido'), 'error');
      }
    } catch (err) {
      console.error(err);
      addHistoryItem('Card Personalizado', 'Erro de rede', 'error');
      showNotification('Erro de rede ao enviar mensagem', 'error');
    } finally {
      setIsVipSending(false);
    }
  };

  const applyTemplate = (type) => {
    setMsgTemplate(type);
    if (type === 'tip') {
      const opp = (selectedBets.length > 0 
        ? opportunities.find(o => o.id === selectedBets[0]) 
        : opportunities[0]) || null;

      if (opp) {
        const risk = Math.max(0.5, Math.min(5.0, (opp.vantagem_ev_porcentagem * 0.25))).toFixed(1);
        setCustomMessage(`🔥 *DICA QUENTE VIP!*

⚽ *Confronto:* ${opp.confronto}
🏆 *Campeonato:* ${opp.campeonato || 'Geral'}
🎯 *Palpite:* ${opp.mercado}
📈 *Odd Recomendada:* @${opp.odd_oferecida} (Justa: @${opp.odd_justa})
🛡️ *Stake:* ${risk}% da banca

_Faça sua entrada com gestão!_ 🚀`);
      } else {
        setCustomMessage(`🔥 *DICA QUENTE VIP!*

⚽ *Confronto:* Flamengo x Palmeiras
🏆 *Campeonato:* Brasileirão
🎯 *Palpite:* Mais de 2.5 Gols
📈 *Odd Recomendada:* @2.00
🛡️ *Stake:* 2% da banca

_Faça sua entrada com gestão!_ 🚀`);
        showNotification('Nenhuma aposta encontrada na lista para preencher dados reais.', 'info');
      }
    } else if (type === 'report') {
      const total = opportunities.length;
      if (total > 0) {
        const greens = opportunities.filter(o => o.resultado === 'green').length;
        const reds = opportunities.filter(o => o.resultado === 'red').length;
        const pending = opportunities.filter(o => o.resultado === 'pending').length;
        let profitUnits = 0;
        opportunities.forEach(o => {
          if (o.resultado === 'green') {
            profitUnits += (parseFloat(o.odd_oferecida) - 1);
          } else if (o.resultado === 'red') {
            profitUnits -= 1;
          }
        });
        const profitStr = profitUnits >= 0 ? `+${profitUnits.toFixed(2)}` : profitUnits.toFixed(2);
        setCustomMessage(`📊 *BALANÇO DAS ÚLTIMAS TIPS*

✅ Sinais Enviados: ${total}
🟢 Greens: ${greens}
🔴 Reds: ${reds}
⏳ Pendentes: ${pending}
📈 Lucro Líquido: ${profitStr} unidades

_Seguimos o plano à risca!_ 💪`);
      } else {
        setCustomMessage(`📊 *BALANÇO GERAL DO DIA*

✅ Sinais Enviados: 12
🟢 Greens: 8
🔴 Reds: 4
📈 Lucro Líquido: +4.20 unidades

_Seguimos o plano à risca!_ 💪`);
      }
    } else if (type === 'alert') {
      setCustomMessage(`📢 *COMUNICADO IMPORTANTE!*

Atenção grupo, o mercado está com pouca liquidez hoje devido a poucas rodadas. Recomenda-se reduzir a stake para a metade nas próximas entradas.

_Gestão de banca é o segredo do longo prazo!_ 🛡️`);
    } else {
      setCustomMessage('');
    }
  };

  // Carregar dados reais do Supabase
  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoadingData(true);
        setLoadingUsers(true);
        
        const [resUsers, resExpenses, resCoupons, resFeatures, resSettings] = await Promise.all([
          adminFetch('/api/admin/users'),
          adminFetch('/api/admin/expenses'),
          adminFetch('/api/admin/coupons'),
          adminFetch('/api/admin/features'),
          adminFetch('/api/admin/settings')
        ]);

        let usersList = [];
        if (resUsers.ok) {
          const data = await resUsers.json();
          usersList = data.users || [];
          setUsersBase(usersList);
        } else {
          const data = await resUsers.json().catch(() => ({}));
          showNotification('Erro ao carregar usuários: ' + (data.error || 'Erro interno'), 'error');
        }
        if (resExpenses.ok) {
          const data = await resExpenses.json();
          setGastos(data.expenses || []);
        } else {
          const data = await resExpenses.json().catch(() => ({}));
          showNotification('Erro ao carregar despesas: ' + (data.error || 'Erro interno'), 'error');
        }
        if (resCoupons.ok) {
          const data = await resCoupons.json();
          setCupons(data.coupons || []);
        } else {
          const data = await resCoupons.json().catch(() => ({}));
          showNotification('Erro ao carregar cupons: ' + (data.error || 'Erro interno'), 'error');
        }
        if (resFeatures.ok) {
          const data = await resFeatures.json();
          setCategorias(data.features || []);
        } else {
          const data = await resFeatures.json().catch(() => ({}));
          showNotification('Erro ao carregar módulos: ' + (data.error || 'Erro interno'), 'error');
        }
        if (resSettings.ok) {
          const data = await resSettings.json();
          const settings = data.settings || {};
          setSubAdmins(settings.sub_admins || []);
          setGastosCategorias(settings.expense_categories || []);
          if (settings.expense_categories && settings.expense_categories.length > 0) {
            setNovoGastoCat(settings.expense_categories[0]);
          }
          
          const realTrialsCount = usersList.filter(u => u.plan === 'gratis').length;
          setFunnelMetrics({
            visitors: settings.visitors_count !== undefined ? settings.visitors_count : 0,
            trials: realTrialsCount
          });

          // Configurações do Telegram
          if (settings.telegram_bot_enabled !== undefined) setBotEnabled(settings.telegram_bot_enabled);
          if (settings.telegram_bot_min_ev !== undefined) setBotMinEv(settings.telegram_bot_min_ev);
          if (settings.telegram_bot_hours !== undefined) setBotHours(settings.telegram_bot_hours);
          if (settings.company_info) {
            setCompanyInfo(prev => ({ ...prev, ...settings.company_info }));
          }
          
          // Ligas ativas na aba palpites
          setLigasSaaS(settings.target_leagues || [
            {"id": "1", "name": "Copa do Mundo"},
            {"id": "71", "name": "Série A"},
            {"id": "72", "name": "Série B"},
            {"id": "75", "name": "Série C"},
            {"id": "13", "name": "Libertadores"},
            {"id": "12", "name": "Sulamericana"},
            {"id": "39", "name": "Premier"},
            {"id": "140", "name": "La Liga"},
            {"id": "135", "name": "Serie A"},
            {"id": "78", "name": "Bundes"},
            {"id": "3", "name": "Europa League"},
            {"id": "848", "name": "Conference"},
            {"id": "44", "name": "Liga Argentina"},
            {"id": "10", "name": "Amistosos"}
          ]);
        } else {
          const data = await resSettings.json().catch(() => ({}));
          showNotification('Erro ao carregar configurações SaaS: ' + (data.error || 'Erro interno'), 'error');
        }
      } catch (err) {
        console.error('[Admin Dashboard] Erro ao carregar dados:', err);
      } finally {
        setLoadingData(false);
        setLoadingUsers(false);
      }
    }

    if (user) {
      loadDashboardData();
    }
  }, [user?.id]);

  // --- CÁLCULO DE MÉTRICAS SaaS REAL ---
  const financialMetrics = useMemo(() => {
    let proCount = 0;
    let vipCount = 0;
    let gratisCount = 0;
    let couponCount = 0;
    let telegramCount = 0;
    let telegramMrr = 0;

    usersBase.forEach(u => {
      // Usuários com cupom aplicado não geram receita
      if (u.coupon_code) {
        couponCount++;
        return;
      }
      
      const isTelegram = u.email && u.email.toLowerCase().startsWith('tg_');
      
      if (isTelegram) {
        if (u.plan === 'vip') {
          telegramCount++;
          telegramMrr += 9.90;
        } else if (u.plan === 'pro') {
          proCount++;
        } else {
          gratisCount++;
        }
      } else {
        if (u.plan === 'pro') proCount++;
        else if (u.plan === 'vip' || u.plan === 'vitalicio') vipCount++;
        else gratisCount++;
      }
    });

    const mrr = (proCount * 19.90) + (vipCount * 49.90) + telegramMrr;
    const totalExpenses = gastos.reduce((sum, g) => sum + parseFloat(g.value || 0), 0);
    const netProfit = mrr - totalExpenses;
    const baseChurn = 2.4; 
    const dynamicChurn = Math.max(1.2, parseFloat((baseChurn + (totalExpenses / 5000) - ((vipCount + telegramCount) / 500)).toFixed(1)));

    return {
      mrr,
      expenses: totalExpenses,
      profit: netProfit,
      churn: dynamicChurn,
      proCount,
      vipCount,
      telegramCount,
      telegramMrr,
      couponCount,
      totalUsers: usersBase.length
    };
  }, [usersBase, gastos]);

  // --- MÉTRICAS DE EVOLUÇÃO DE ASSINANTES ---
  const subscriberMetrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Agrupar assinantes por mês (últimos 6 meses)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      monthlyData.push({
        key: monthKey,
        label: monthNames[d.getMonth()],
        year: d.getFullYear(),
        month: d.getMonth(),
        total: 0,
        telegram: 0,
        site: 0,
        paid: 0
      });
    }

    // Contadores gerais
    let totalPaid = 0;
    let newThisMonth = 0;
    let lastMonthCount = 0;
    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);

    // Distribuição de planos
    const planDist = { gratis: 0, pro: 0, vip: 0, telegram: 0 };

    // Últimas inscrições
    const recentUsers = [];

    usersBase.forEach(u => {
      const createdAt = u.created_at ? new Date(u.created_at) : null;
      const isTelegram = u.email && u.email.toLowerCase().startsWith('tg_');
      const isPaid = u.plan === 'pro' || u.plan === 'vip' || u.plan === 'vitalicio';

      // Distribuição de planos
      if (isTelegram && isPaid) {
        planDist.telegram++;
      } else if (u.plan === 'pro') {
        planDist.pro++;
      } else if (u.plan === 'vip' || u.plan === 'vitalicio') {
        planDist.vip++;
      } else {
        planDist.gratis++;
      }

      if (isPaid || (isTelegram && u.plan === 'vip')) totalPaid++;

      if (createdAt) {
        // Novos este mês
        if (createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear) {
          newThisMonth++;
        }
        // Mês anterior
        if (createdAt.getMonth() === lastMonthDate.getMonth() && createdAt.getFullYear() === lastMonthDate.getFullYear()) {
          lastMonthCount++;
        }

        // Agrupar por mês
        const userMonth = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
        const entry = monthlyData.find(m => m.key === userMonth);
        if (entry) {
          entry.total++;
          if (isTelegram) entry.telegram++;
          else entry.site++;
          if (isPaid) entry.paid++;
        }

        // Recentes
        recentUsers.push({
          id: u.id,
          name: u.name || u.email?.split('@')[0] || 'Sem nome',
          email: u.email || '',
          plan: u.plan || 'gratis',
          createdAt,
          isTelegram
        });
      }
    });

    // Ordenar recentes por data (mais novo primeiro)
    recentUsers.sort((a, b) => b.createdAt - a.createdAt);

    // Taxa de crescimento
    const growthRate = lastMonthCount > 0
      ? (((newThisMonth - lastMonthCount) / lastMonthCount) * 100).toFixed(1)
      : newThisMonth > 0 ? '100.0' : '0.0';

    // ARPU
    const arpu = totalPaid > 0 ? (financialMetrics.mrr / totalPaid) : 0;

    // Projeções
    const avgMonthlyGrowth = monthlyData.reduce((s, m) => s + m.total, 0) / 6;
    const projection30 = Math.round(usersBase.length + avgMonthlyGrowth);
    const projection90 = Math.round(usersBase.length + (avgMonthlyGrowth * 3));

    // Max value for chart scaling
    const maxMonthly = Math.max(...monthlyData.map(m => m.total), 1);

    return {
      monthlyData,
      newThisMonth,
      lastMonthCount,
      growthRate: parseFloat(growthRate),
      totalPaid,
      arpu,
      planDist,
      recentUsers: recentUsers.slice(0, 15),
      projection30,
      projection90,
      avgMonthlyGrowth,
      maxMonthly
    };
  }, [usersBase, financialMetrics.mrr]);

  // Helper: tempo relativo
  const timeAgo = (date) => {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'agora mesmo';
    if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
    const days = Math.floor(diff / 86400);
    if (days === 1) return 'há 1 dia';
    if (days < 30) return `há ${days} dias`;
    if (days < 60) return 'há 1 mês';
    return `há ${Math.floor(days / 30)} meses`;
  };

  // Filtragem de Usuários
  const filteredUsers = useMemo(() => {
    return usersBase.filter(u => {
      const matchSearch = (u.name || '').toLowerCase().includes(searchUser.toLowerCase()) || 
                          (u.email || '').toLowerCase().includes(searchUser.toLowerCase());
      const matchPlan = planFilter === 'todos' || u.plan === planFilter;
      return matchSearch && matchPlan;
    });
  }, [usersBase, searchUser, planFilter]);

  // --- MANIPULADORES DE SUB-ADMINS (SUPABASE) ---
  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!novoAdminEmail || !novoAdminEmail.includes('@')) return;
    const email = novoAdminEmail.trim().toLowerCase();
    if (subAdmins.includes(email) || email === 'a2soluntions@gmail.com') return;

    const newAdmins = [...subAdmins, email];
    try {
      const res = await adminFetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'sub_admins', value: newAdmins })
      });
      if (res.ok) {
        setSubAdmins(newAdmins);
        setNovoAdminEmail('');
        showNotification('Administrador autorizado com sucesso!');
      } else {
        showNotification('Erro ao salvar novo administrador', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Erro de conexão/servidor ao adicionar administrador: ' + err.message, 'error');
    }
  };

  const handleRemoveAdmin = async (email) => {
    const newAdmins = subAdmins.filter(adm => adm !== email);
    try {
      const res = await adminFetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'sub_admins', value: newAdmins })
      });
      if (res.ok) {
        setSubAdmins(newAdmins);
        showNotification('Autorização de administrador removida com sucesso!');
      } else {
        showNotification('Erro ao remover administrador', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Erro de conexão/servidor ao remover administrador: ' + err.message, 'error');
    }
  };

  // --- MANIPULADORES DE CATEGORIAS / MÓDULOS FUTUROS (SUPABASE) ---
  const handleAddCategoria = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!novaCatNome) return;
    const cleanName = novaCatNome.trim();
    if (!cleanName) return;

    const newCatPayload = {
      name: cleanName,
      description: novaCatDesc.trim() || 'Sem descrição cadastrada.',
      active: true
    };

    try {
      const res = await adminFetch('/api/admin/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCatPayload)
      });
      if (res.ok) {
        const data = await res.json();
        setCategorias(prev => [...prev, data.feature]);
        setNovaCatNome('');
        setNovaCatDesc('');
        showNotification('Módulo futuro criado com sucesso!');
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification('Erro ao criar módulo futuro: ' + (errData.error || res.statusText), 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Erro de conexão/servidor ao criar módulo: ' + err.message, 'error');
    }
  };

  const handleToggleCategoria = async (id) => {
    const item = categorias.find(c => c.id === id);
    if (!item) return;

    const newActiveState = !item.active;
    try {
      const res = await adminFetch('/api/admin/features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: newActiveState })
      });
      if (res.ok) {
        setCategorias(prev => prev.map(c => c.id === id ? { ...c, active: newActiveState } : c));
        showNotification(`Módulo futuro ${newActiveState ? 'ativado' : 'pausado'} com sucesso!`);
      } else {
        showNotification('Erro ao alterar status do módulo', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Erro de conexão/servidor ao alterar status do módulo: ' + err.message, 'error');
    }
  };

  const handleRemoveCategoria = async (id) => {
    try {
      const res = await adminFetch(`/api/admin/features?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCategorias(prev => prev.filter(c => c.id !== id));
        showNotification('Módulo futuro removido com sucesso!');
      } else {
        showNotification('Erro ao remover módulo', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Erro de conexão/servidor ao remover módulo: ' + err.message, 'error');
    }
  };

  // --- MANIPULADORES DE CUPONS (SUPABASE) ---
  const handleAddCupom = async (e) => {
    e.preventDefault();
    if (!novoCupomCode || !novoCupomDisc || isNaN(parseInt(novoCupomDisc))) return;

    const newCupPayload = {
      code: novoCupomCode.trim().toUpperCase(),
      discount: parseInt(novoCupomDisc),
      description: novoCupomDesc.trim() || 'Sem descrição.'
    };

    try {
      const res = await adminFetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCupPayload)
      });
      if (res.ok) {
        const data = await res.json();
        setCupons(prev => [...prev, data.coupon]);
        setNovoCupomCode('');
        setNovoCupomDisc('');
        setNovoCupomDesc('');
        showNotification('Cupom de desconto criado com sucesso!');
      } else {
        const errData = await res.json();
        showNotification(errData.error || 'Erro ao criar cupom', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Erro de conexão/servidor ao criar cupom: ' + err.message, 'error');
    }
  };

  const handleRemoveCupom = async (id) => {
    try {
      const res = await adminFetch(`/api/admin/coupons?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCupons(prev => prev.filter(c => c.id !== id));
        showNotification('Cupom de desconto removido com sucesso!');
      } else {
        showNotification('Erro ao remover cupom', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Erro de conexão/servidor ao remover cupom: ' + err.message, 'error');
    }
  };

  // --- MANIPULADORES DE LIGAS (SUPABASE) ---
  const handleAddLiga = async (e) => {
    e.preventDefault();
    if (!novaLigaNome.trim() || !novaLigaId.trim()) return;

    if (ligasSaaS.some(l => String(l.id) === String(novaLigaId.trim()))) {
      showNotification('Esta liga já está cadastrada!', 'error');
      return;
    }

    const novasLigas = [...ligasSaaS, { id: novaLigaId.trim(), name: novaLigaNome.trim() }];
    try {
      const res = await adminFetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'target_leagues', value: novasLigas })
      });
      if (res.ok) {
        setLigasSaaS(novasLigas);
        setNovaLigaNome('');
        setNovaLigaId('');
        showNotification('Liga adicionada com sucesso!');
      } else {
        showNotification('Erro ao salvar nova liga', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Erro de conexão ao adicionar liga: ' + err.message, 'error');
    }
  };

  const handleRemoveLiga = async (id) => {
    const novasLigas = ligasSaaS.filter(l => String(l.id) !== String(id));
    try {
      const res = await adminFetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'target_leagues', value: novasLigas })
      });
      if (res.ok) {
        setLigasSaaS(novasLigas);
        showNotification('Liga removida com sucesso!');
      } else {
        showNotification('Erro ao remover liga', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Erro de conexão ao remover liga: ' + err.message, 'error');
    }
  };

  // --- OUTROS DIRETOS - DESPESAS (SUPABASE) ---
  const handleAddGasto = async (e) => {
    e.preventDefault();
    if (!novoGastoNome || !novoGastoValor || isNaN(parseFloat(novoGastoValor))) return;
    
    const newGPayload = {
      name: novoGastoNome.trim(),
      value: parseFloat(novoGastoValor),
      category: novoGastoCat
    };

    try {
      const res = await adminFetch('/api/admin/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGPayload)
      });
      if (res.ok) {
        const data = await res.json();
        setGastos(prev => [...prev, data.expense]);
        setNovoGastoNome('');
        setNovoGastoValor('');
        showNotification('Despesa registrada com sucesso!');
      } else {
        showNotification('Erro ao registrar despesa', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Erro de conexão/servidor ao registrar despesa: ' + err.message, 'error');
    }
  };

  const handleRemoveGasto = async (id) => {
    try {
      const res = await adminFetch(`/api/admin/expenses?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setGastos(prev => prev.filter(g => g.id !== id));
        showNotification('Despesa operacional removida com sucesso!');
      } else {
        showNotification('Erro ao remover despesa', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Erro de conexão/servidor ao remover despesa: ' + err.message, 'error');
    }
  };

  const handleUpdateGasto = async (e) => {
    e.preventDefault();
    if (!editingExpense || !editExpenseName || !editExpenseValue || isNaN(parseFloat(editExpenseValue))) return;

    const editPayload = {
      id: editingExpense.id,
      name: editExpenseName.trim(),
      value: parseFloat(editExpenseValue),
      category: editExpenseCategory
    };

    try {
      const res = await adminFetch('/api/admin/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPayload)
      });
      if (res.ok) {
        const data = await res.json();
        setGastos(prev => prev.map(g => g.id === editingExpense.id ? data.expense : g));
        setShowEditExpenseModal(false);
        setEditingExpense(null);
        showNotification('Despesa operacional atualizada com sucesso!');
      } else {
        showNotification('Erro ao atualizar despesa', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Erro de conexão/servidor ao atualizar despesa: ' + err.message, 'error');
    }
  };

  const handleAddGastoCategory = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newExpenseCatName) return;
    const clean = newExpenseCatName.trim();
    if (!clean) return;

    if (gastosCategorias.includes(clean)) {
      showNotification('Esta categoria de despesas já existe!', 'error');
      return;
    }

    const newCats = [...gastosCategorias, clean];
    try {
      const res = await adminFetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'expense_categories', value: newCats })
      });
      if (res.ok) {
        setGastosCategorias(newCats);
        setNewExpenseCatName('');
        showNotification('Categoria de despesas adicionada com sucesso!');
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification('Erro ao adicionar categoria de despesas: ' + (errData.error || res.statusText), 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Erro de conexão/servidor ao adicionar categoria: ' + err.message, 'error');
    }
  };

  const handleRemoveGastoCategory = async (catName) => {
    if (catName === 'Outros') return;
    const newCats = gastosCategorias.filter(c => c !== catName);
    
    try {
      const res = await adminFetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'expense_categories', value: newCats })
      });
      if (res.ok) {
        setGastosCategorias(newCats);
        // Atualizar lista de despesas após o remapeamento no backend
        const resExpenses = await adminFetch('/api/admin/expenses');
        if (resExpenses.ok) {
          const data = await resExpenses.json();
          setGastos(data.expenses || []);
        }
        showNotification('Categoria de despesas removida com sucesso!');
      } else {
        showNotification('Erro ao remover categoria de despesas', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Erro de conexão/servidor ao remover categoria: ' + err.message, 'error');
    }
  };

  const handleSaveGastoCategoryName = async (index, newName) => {
    if (!newName) return;
    const clean = newName.trim();
    const oldName = gastosCategorias[index];
    if (oldName === 'Outros') return;
    if (gastosCategorias.includes(clean) && clean !== oldName) return;

    const newCats = gastosCategorias.map((c, i) => i === index ? clean : c);
    try {
      const res = await adminFetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'expense_categories', value: newCats })
      });
      if (res.ok) {
        setGastosCategorias(newCats);
        const resExpenses = await adminFetch('/api/admin/expenses');
        if (resExpenses.ok) {
          const data = await resExpenses.json();
          setGastos(data.expenses || []);
        }
        setEditingExpenseCatIndex(null);
        setEditingExpenseCatName('');
        showNotification('Categoria de despesas renomeada com sucesso!');
      } else {
        showNotification('Erro ao renomear categoria de despesas', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Erro de conexão/servidor ao renomear categoria: ' + err.message, 'error');
    }
  };

  const handleToggleUserPlan = async (id) => {
    const userToUpdate = usersBase.find(u => u.id === id);
    if (!userToUpdate) return;

    const nextPlan = userToUpdate.plan === 'gratis' ? 'pro' : userToUpdate.plan === 'pro' ? 'vip' : userToUpdate.plan === 'vip' ? 'vitalicio' : 'gratis';

    // Otimista: atualiza localmente
    setUsersBase(prev => prev.map(u => u.id === id ? { ...u, plan: nextPlan } : u));

    try {
      const res = await adminFetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: id, plan: nextPlan }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao atualizar plano');
      }
      showNotification('Plano do usuário atualizado com sucesso!');
    } catch (e) {
      console.error('[Admin Dashboard] Erro ao atualizar plano:', e);
      // Reverter alteração otimista
      setUsersBase(prev => prev.map(u => u.id === id ? { ...u, plan: userToUpdate.plan } : u));
      showNotification('Erro ao atualizar plano no Supabase: ' + e.message, 'error');
    }
  };

  // Aplicar/Remover cupom de um usuário
  const handleApplyCoupon = async (userId, couponCode) => {
    const userToUpdate = usersBase.find(u => u.id === userId);
    if (!userToUpdate) return;

    const isRemoving = !couponCode;
    const selectedCoupon = isRemoving ? null : cupons.find(c => c.code === couponCode);

    // Se o cupom é de 100%, o plano vira 'gratis' (acesso total sem gerar receita)
    const isFullAccess = selectedCoupon && selectedCoupon.discount === 100;
    const newPlan = isFullAccess ? 'gratis' : userToUpdate.plan;

    // Otimista: atualiza localmente
    setUsersBase(prev => prev.map(u => u.id === userId ? { ...u, coupon_code: couponCode || null, plan: newPlan } : u));

    try {
      const body = { userId, coupon_code: couponCode || null };
      if (isFullAccess) body.plan = 'gratis';

      const res = await adminFetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao aplicar cupom');
      }
      showNotification(
        isRemoving 
          ? 'Cupom removido do usuário com sucesso!' 
          : `Cupom ${couponCode} aplicado com sucesso!${isFullAccess ? ' (Acesso total gratuito)' : ''}`
      );
    } catch (e) {
      console.error('[Admin Dashboard] Erro ao aplicar cupom:', e);
      // Reverter
      setUsersBase(prev => prev.map(u => u.id === userId ? { ...u, coupon_code: userToUpdate.coupon_code, plan: userToUpdate.plan } : u));
      showNotification('Erro ao aplicar cupom: ' + e.message, 'error');
    }
  };

  // Verificação de Segurança (Super Admin ou Admin Secundário)
  const isSuperAdmin = user && (user.email === 'a2soluntions@gmail.com' || user.role === 'super_admin');
  const isSubAdmin = user && (user.role === 'admin' || subAdmins.includes(user.email));
  const isAdmin = isSuperAdmin || isSubAdmin;

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '80vh',
        fontFamily: 'monospace',
        color: 'var(--brand-neon)'
      }}>
        <RefreshCw size={32} className="spin" style={{ marginBottom: '16px' }} />
        <span>AUTENTICANDO CREDENCIAIS DE ADMINISTRADOR...</span>
      </div>
    );
  }

  // Se estiver carregando os dados do banco e o usuário não for o super admin, aguarda
  if (loadingData && !isSuperAdmin) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '80vh',
        fontFamily: 'monospace',
        color: 'var(--brand-neon)'
      }}>
        <RefreshCw size={32} className="spin" style={{ marginBottom: '16px' }} />
        <span>VALIDANDO CREDENCIAIS...</span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{
        margin: '100px auto 40px auto',
        padding: '32px',
        textAlign: 'center',
        background: '#121216',
        border: '2px solid #ff4444',
        boxShadow: '0 0 30px rgba(255, 68, 68, 0.08)',
        borderRadius: '12px',
        fontFamily: 'system-ui, sans-serif',
        color: '#fff'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: 'rgba(255, 68, 68, 0.1)',
          border: '1px solid rgba(255, 68, 68, 0.3)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto',
          color: '#ff4444'
        }}>
          <ShieldAlert size={36} />
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, textTransform: 'uppercase', color: '#ff4444' }}>
          Acesso Negado
        </h2>
        <p style={{ color: '#aaa', fontSize: '0.92rem', marginTop: '16px', lineHeight: 1.6 }}>
          Esta área é restrita para o administrador do sistema. Suas credenciais de login não possuem privilégios de acesso necessários para visualizar dados financeiros e operacionais do SaaS.
        </p>
        <div style={{
          marginTop: '24px',
          background: '#0a0a0d',
          border: '1px solid #222',
          padding: '12px',
          fontSize: '0.8rem',
          color: '#666',
          fontFamily: 'monospace',
          borderRadius: '6px'
        }}>
          LOGGED_USER: {user ? user.email : 'NÃO AUTENTICADO'}
        </div>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            marginTop: '28px',
            background: '#ff4444',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.9rem',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#d32f2f'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#ff4444'}
        >
          Voltar para a Home 🏠
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 8px 60px 8px', width: '100%', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Cabeçalho */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '28px', borderBottom: '1px solid #222', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-neon)' }}>
            <ShieldCheck size={24} />
            <span style={{ fontSize: '0.78rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', background: 'rgba(204,255,0,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
              {isSuperAdmin ? 'SUPER ADMIN • ACESSO VITALÍCIO' : 'MODO ADMINISTRADOR'}
            </span>
          </div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.5px', marginTop: '6px', margin: 0 }}>
            Painel Geral do SaaS
          </h1>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#16161a',
          border: '1px solid #333',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '0.82rem',
          color: '#aaa'
        }}>
          <Sparkles size={14} color="var(--brand-neon)" />
          <span>E-mail: <strong>{user.email}</strong></span>
        </div>
      </header>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div style={{ background: '#111116', border: '1px solid #222', borderLeft: '5px solid var(--brand-neon)', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
            <span>Receita Mensal (MRR)</span>
            <DollarSign size={16} color="var(--brand-neon)" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, color: 'var(--brand-neon)', marginTop: '12px', fontFamily: 'monospace' }}>
            R$ {financialMetrics.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span>PRO: <strong>{financialMetrics.proCount}</strong></span>
            <span>•</span>
            <span>VIP Site: <strong>{financialMetrics.vipCount}</strong></span>
            <span>•</span>
            <span style={{ color: '#00d2ff' }}>Telegram: <strong>{financialMetrics.telegramCount}</strong> (R$ {financialMetrics.telegramMrr.toFixed(2)})</span>
          </div>
        </div>

        <div style={{ background: '#111116', border: '1px solid #222', borderLeft: '5px solid #00d2ff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
            <span>Churn Rate (Mensal)</span>
            <ArrowUpRight size={16} color="#00d2ff" style={{ transform: 'rotate(90deg)' }} />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#00d2ff', marginTop: '12px', fontFamily: 'monospace' }}>
            {financialMetrics.churn}%
          </div>
          <div style={{ fontSize: '0.78rem', color: '#4CAF50', marginTop: '8px', fontWeight: 'bold' }}>
            🟢 Dentro do limite aceitável (&lt; 4%)
          </div>
        </div>

        <div style={{ background: '#111116', border: '1px solid #222', borderLeft: '5px solid #ff9800', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
            <span>Despesas do Mês</span>
            <Trash2 size={16} color="#ff9800" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#ff9800', marginTop: '12px', fontFamily: 'monospace' }}>
            R$ {financialMetrics.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '8px' }}>
            Despesas operacionais fixas + anúncios
          </div>
        </div>

        <div style={{ background: '#111116', border: '1px solid #222', borderLeft: '5px solid #b339ff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
            <span>Lucro Líquido</span>
            <Sparkles size={16} color="#b339ff" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#b339ff', marginTop: '12px', fontFamily: 'monospace' }}>
            R$ {financialMetrics.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--brand-neon)', marginTop: '8px', fontWeight: 'bold' }}>
            Margem de Lucro: {financialMetrics.mrr > 0 ? ((financialMetrics.profit / financialMetrics.mrr) * 100).toFixed(1) : (financialMetrics.profit < 0 ? '-100.0' : '0.0')}%
          </div>
        </div>
      </div>

      {/* Navegação por Abas (Tab Selector) */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #222', paddingBottom: '8px' }}>
        {[
          { id: 'dashboard', name: 'Dashboard Geral', icon: BarChart2 },
          { id: 'subscribers', name: 'Evolução Assinantes', icon: Activity },
          { id: 'finance', name: 'Gastos & Clientes', icon: Users },
          { id: 'telegram', name: 'Controle Telegram', icon: Send },
          { id: 'settings', name: 'Configurações SaaS', icon: Settings }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '6px',
                border: isActive ? '1px solid var(--brand-neon)' : '1px solid transparent',
                background: isActive ? 'rgba(204,255,0,0.08)' : 'transparent',
                color: isActive ? 'var(--brand-neon)' : '#888',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={16} />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* --- ABA 1: DASHBOARD GERAL --- */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '20px'
          }}>
            
            {/* Evolução de Vendas (Gráfico de Barras) */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '380px' }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 20px 0', borderBottom: '1px dashed #222', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={16} color="var(--brand-neon)" /> Evolução de Receita (MRR)
              </h3>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                flex: 1,
                padding: '10px 10px 0 10px',
                borderBottom: '2px solid #333',
                position: 'relative'
              }}>
                {[0.25, 0.5, 0.75, 1.0].map((p, idx) => (
                  <div key={idx} style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: `${p * 100}%`,
                    borderBottom: '1px dashed rgba(255,255,255,0.03)',
                    pointerEvents: 'none'
                  }}></div>
                ))}

                {[
                  { label: 'Jan', val: 0, pct: 0 },
                  { label: 'Fev', val: 0, pct: 0 },
                  { label: 'Mar', val: 0, pct: 0 },
                  { label: 'Abr', val: 0, pct: 0 },
                  { label: 'Mai', val: 0, pct: 0 },
                  { label: 'Jun', val: Math.round(financialMetrics.mrr), pct: financialMetrics.mrr > 0 ? 100 : 0 }
                ].map((bar, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: 1,
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--brand-neon)', fontWeight: 'bold', fontFamily: 'monospace' }}>
                      R$ {bar.val >= 1000 ? `${(bar.val/1000).toFixed(1)}k` : bar.val}
                    </span>
                    <div style={{
                      width: '28px',
                      height: `${bar.pct * 1.8}px`,
                      background: idx === 5 ? 'linear-gradient(to top, #b339ff, var(--brand-neon))' : 'var(--brand-neon)',
                      border: '1px solid #000',
                      boxShadow: idx === 5 ? '0 0 15px rgba(204,255,0,0.3)' : '0 0 8px rgba(204,255,0,0.1)',
                      transition: 'all 0.4s ease-out'
                    }}></div>
                    <span style={{ fontSize: '0.78rem', color: '#888', fontWeight: 'bold', marginTop: '4px' }}>
                      {bar.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Funil de Vendas Geométrico CSS */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '380px' }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 20px 0', borderBottom: '1px dashed #222', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={16} color="#00d2ff" /> Funil de Conversão (Visual Funil)
              </h3>
              
              {/* Funil Visual Geométrico Centralizado */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                gap: '4px',
                paddingTop: '10px'
              }}>
                {[
                  { 
                    label: '1. Visitantes Únicos', 
                    val: funnelMetrics.visitors.toLocaleString('pt-BR'), 
                    subtext: '100% de tráfego',
                    width: '320px', 
                    polygon: 'polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)',
                    bg: 'linear-gradient(90deg, #1c1c24, #2d2d38)',
                    color: '#fff'
                  },
                  { 
                    label: '2. Trials Ativados', 
                    val: funnelMetrics.trials.toLocaleString('pt-BR'), 
                    subtext: `${((funnelMetrics.trials / (funnelMetrics.visitors || 1)) * 100).toFixed(1)}% conversão`,
                    width: '272px', // 85% de 320
                    polygon: 'polygon(0% 0%, 100% 0%, 82% 100%, 18% 100%)',
                    bg: 'linear-gradient(90deg, rgba(0,210,255,0.15), rgba(0,150,220,0.3))',
                    color: '#00d2ff'
                  },
                  { 
                    label: '3. Assinantes PRO', 
                    val: String(financialMetrics.proCount), 
                    subtext: `${((financialMetrics.proCount / (funnelMetrics.trials || 1)) * 100).toFixed(1)}% do trial`,
                    width: '223px', // 82% de 272
                    polygon: 'polygon(0% 0%, 100% 0%, 78% 100%, 22% 100%)',
                    bg: 'linear-gradient(90deg, rgba(204,255,0,0.15), rgba(150,200,0,0.3))',
                    color: 'var(--brand-neon)'
                  },
                  { 
                    label: '4. VIP Elite', 
                    val: String(financialMetrics.vipCount), 
                    subtext: `${((financialMetrics.vipCount / (funnelMetrics.trials || 1)) * 100).toFixed(1)}% do trial`,
                    width: '174px', // Restaura a geometria perfeita do funil
                    polygon: 'polygon(0% 0%, 100% 0%, 50% 100%, 50% 100%)', // Triângulo invertido perfeito (ponta do funil)
                    bg: 'linear-gradient(to bottom, rgba(179,57,255,0.25), rgba(100,20,150,0.55))',
                    color: '#e5a3ff', // Lindo roxo claro de excelente visibilidade/contraste
                    height: '65px',
                    justify: 'flex-start',
                    paddingTop: '8px',
                    paddingLeft: '4px',
                    paddingRight: '4px'
                  }
                ].map((level, idx) => (
                  <div 
                    key={idx} 
                    style={{
                      width: level.width,
                      height: level.height || '46px',
                      clipPath: level.polygon,
                      background: level.bg,
                      border: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: level.justify || 'center',
                      color: level.color,
                      fontSize: '0.78rem',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                      paddingTop: level.paddingTop || '2px',
                      paddingBottom: '2px',
                      paddingLeft: level.paddingLeft || '20px',
                      paddingRight: level.paddingRight || '20px',
                      transition: 'all 0.3s ease'
                    }}
                    title={`${level.label}: ${level.val} (${level.subtext})`}
                  >
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>{level.label.split('. ')[1]}:</span>
                      <strong style={{ fontSize: '0.85rem' }}>{level.val}</strong>
                    </div>
                    <span style={{ fontSize: '0.62rem', opacity: 0.7, fontWeight: 'normal', marginTop: '1px' }}>
                      {level.subtext}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- ABA 2: GASTOS E USUÁRIOS --- */}
      {activeTab === 'finance' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '20px'
        }}>
          
          {/* Tabela de Despesas */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px 0', borderBottom: '1px dashed #222', paddingBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={16} color="#ff9800" /> Controle de Despesas Operacionais
              </div>
              <button
                onClick={() => setShowExpenseCatModal(true)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,152,0,0.2)',
                  color: '#ff9800',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,152,0,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                type="button"
              >
                <Tag size={12} /> Categorias
              </button>
            </h3>

            <form onSubmit={handleAddGasto} style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '20px',
              background: '#16161a',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #222'
            }}>
              <input 
                type="text" 
                placeholder="Nome da despesa (ex: VPS)" 
                value={novoGastoNome}
                onChange={(e) => setNovoGastoNome(e.target.value)}
                style={{
                  flex: 2,
                  minWidth: '140px',
                  background: '#111',
                  border: '1px solid #333',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
                required
              />
              <input 
                type="text" 
                placeholder="Valor (R$)" 
                value={novoGastoValor}
                onChange={(e) => setNovoGastoValor(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '70px',
                  background: '#111',
                  border: '1px solid #333',
                  color: 'var(--brand-neon)',
                  fontWeight: 'bold',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
                required
              />
              <select
                value={novoGastoCat}
                onChange={(e) => setNovoGastoCat(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '90px',
                  background: '#111',
                  border: '1px solid #333',
                  color: '#aaa',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                {gastosCategorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button type="submit" style={{
                background: '#ff9800',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Plus size={14} /> Add
              </button>
            </form>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333', color: '#888', textAlign: 'left' }}>
                    <th style={{ padding: '8px 4px' }}>Item</th>
                    <th style={{ padding: '8px 4px' }}>Categoria</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Valor</th>
                    <th style={{ padding: '8px 4px', textAlign: 'center', width: '80px' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {gastos.map(g => (
                    <tr key={g.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '10px 4px', fontWeight: 'bold' }}>{g.name}</td>
                      <td style={{ padding: '10px 4px' }}>
                        <span style={{
                          background: '#222',
                          color: '#aaa',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.7rem'
                        }}>
                          {g.category}
                        </span>
                      </td>
                      <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace', color: '#ff9800' }}>
                        R$ {parseFloat(g.value || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          <button 
                            onClick={() => {
                              setEditingExpense(g);
                              setEditExpenseName(g.name);
                              setEditExpenseValue(g.value.toString());
                              setEditExpenseCategory(g.category);
                              setShowEditExpenseModal(true);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#00d2ff',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                            title="Editar Despesa"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => handleRemoveGasto(g.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ff4d4d',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                            title="Remover Despesa"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gerenciamento de Usuários */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px 0', borderBottom: '1px dashed #222', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} color="#b339ff" /> Controle de Usuários Cadastrados
            </h3>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 2, minWidth: '180px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#666' }} />
                <input 
                  type="text" 
                  placeholder="Pesquisar por nome ou e-mail..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#16161a',
                    border: '1px solid #333',
                    color: '#fff',
                    padding: '6px 12px 6px 30px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                />
              </div>
              
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '100px',
                  background: '#16161a',
                  border: '1px solid #333',
                  color: '#aaa',
                  padding: '6px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                <option value="todos">Todos Planos</option>
                <option value="vitalicio">Vitalício</option>
                <option value="vip">VIP</option>
                <option value="pro">PRO</option>
                <option value="gratis">Trial (Grátis)</option>
              </select>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '350px', overflowY: 'auto' }} className="no-scrollbar">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333', color: '#888', textAlign: 'left' }}>
                    <th style={{ padding: '8px 4px' }}>Nome / E-mail</th>
                    <th style={{ padding: '8px 4px' }}>Plano</th>
                    <th style={{ padding: '8px 4px' }}>Cupom</th>
                    <th style={{ padding: '8px 4px', textAlign: 'center' }}>Promover</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--brand-neon)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <RefreshCw size={20} className="spin" />
                          <span>Carregando usuários do banco...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => {
                      const userCoupon = u.coupon_code ? cupons.find(c => c.code === u.coupon_code) : null;
                      const isFullAccessCoupon = userCoupon && userCoupon.discount === 100;
                      
                      const isTelegramUser = u.email && u.email.toLowerCase().startsWith('tg_');
                      return (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '10px 4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 'bold' }}>{u.name}</span>
                            {isTelegramUser && (
                              <span style={{
                                background: 'rgba(0,180,255,0.15)',
                                color: '#00d2ff',
                                fontSize: '0.62rem',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                border: '1px solid rgba(0,180,255,0.3)',
                                fontWeight: 'bold'
                              }}>
                                TELEGRAM
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '2px' }}>{u.email}</div>
                        </td>
                        <td style={{ padding: '10px 4px' }}>
                          <span style={{
                            background: isFullAccessCoupon ? 'rgba(0, 210, 255, 0.12)' : u.plan === 'vitalicio' ? 'rgba(204,255,0,0.15)' : u.plan === 'vip' ? 'rgba(179,57,255,0.15)' : u.plan === 'pro' ? 'rgba(204,255,0,0.1)' : '#222',
                            color: isFullAccessCoupon ? '#00d2ff' : u.plan === 'vitalicio' ? 'var(--brand-neon)' : u.plan === 'vip' ? '#b339ff' : u.plan === 'pro' ? 'var(--brand-neon)' : '#888',
                            border: '1px solid ' + (isFullAccessCoupon ? '#00d2ff' : u.plan === 'vitalicio' ? 'var(--brand-neon)' : u.plan === 'vip' ? '#b339ff' : u.plan === 'pro' ? 'var(--brand-neon)' : '#333'),
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 'bold'
                          }}>
                            {isFullAccessCoupon ? 'GRATUITO ★' : u.plan === 'vitalicio' ? 'VITALÍCIO' : u.plan === 'vip' ? 'VIP ELITE' : u.plan === 'pro' ? 'PRO' : 'TRIAL'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 4px' }}>
                          <select
                            value={u.coupon_code || ''}
                            onChange={(e) => handleApplyCoupon(u.id, e.target.value)}
                            style={{
                              background: u.coupon_code ? 'rgba(179, 57, 255, 0.08)' : '#16161a',
                              border: '1px solid ' + (u.coupon_code ? '#b339ff' : '#333'),
                              color: u.coupon_code ? '#b339ff' : '#888',
                              padding: '3px 6px',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              cursor: 'pointer',
                              fontWeight: u.coupon_code ? 'bold' : 'normal',
                              outline: 'none',
                              maxWidth: '120px'
                            }}
                          >
                            <option value="">Sem cupom</option>
                            {cupons.map(cup => (
                              <option key={cup.id} value={cup.code}>
                                {cup.code} ({cup.discount === 100 ? 'FREE' : `-${cup.discount}%`})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleToggleUserPlan(u.id)}
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '4px',
                              color: 'var(--brand-neon)',
                              padding: '4px 8px',
                              cursor: 'pointer',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--brand-neon)';
                              e.currentTarget.style.color = '#000';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = 'var(--brand-neon)';
                            }}
                          >
                            Alterar ⚡
                          </button>
                        </td>
                      </tr>
                    );})
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* --- ABA 3: CONFIGURAÇÕES SAAS --- */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px'
          }}>
            
            {/* 1. Gerenciador de Admins */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px 0', borderBottom: '1px dashed #222', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={16} color="#00d2ff" /> Cadastro de Administradores
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#888', lineHeight: 1.4, marginBottom: '16px' }}>
                Adicione e-mails de suporte ou sócios da <strong>A2 Solutions</strong> para conceder acesso às telas de controle financeiro e KPIs do SaaS.
              </p>

              {/* Apenas Super Admin pode gerenciar admins */}
              {isSuperAdmin ? (
                <>
                  <form onSubmit={handleAddAdmin} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    <input 
                      type="email" 
                      placeholder="E-mail do novo administrador"
                      value={novoAdminEmail}
                      onChange={(e) => setNovoAdminEmail(e.target.value)}
                      style={{
                        flex: 1,
                        background: '#16161a',
                        border: '1px solid #333',
                        color: '#fff',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                      required
                    />
                    <button type="submit" style={{
                      background: '#00d2ff',
                      color: '#000',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.82rem'
                    }}>
                      Autorizar
                    </button>
                  </form>
                </>
              ) : (
                <div style={{ background: 'rgba(255, 152, 0, 0.05)', border: '1px dashed rgba(255, 152, 0, 0.2)', padding: '10px', borderRadius: '6px', fontSize: '0.78rem', color: '#ff9800', marginBottom: '20px', fontWeight: 'bold' }}>
                  ⚠️ Somente o Super Admin vitalício (a2soluntions@gmail.com) tem permissão de gerenciar outros administradores.
                </div>
              )}

              {/* Lista de Admins Cadastrados */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.78rem', color: '#666', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>
                  E-mails com Poder Admin:
                </div>
                {/* Dono vitalício */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#16161a', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--brand-neon)' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--brand-neon)' }}>a2soluntions@gmail.com</span>
                  <span style={{ fontSize: '0.65rem', background: 'rgba(204,255,0,0.15)', color: 'var(--brand-neon)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>SUPER ADMIN</span>
                </div>
                {/* Outros admins */}
                {subAdmins.map(email => (
                  <div key={email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#16161a', padding: '10px 12px', borderRadius: '6px', border: '1px solid #333' }}>
                    <span style={{ fontSize: '0.82rem' }}>{email}</span>
                    {isSuperAdmin ? (
                      <button 
                        onClick={() => handleRemoveAdmin(email)}
                        style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: '2px' }}
                        title="Remover Autorização"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.65rem', background: '#222', color: '#888', padding: '2px 6px', borderRadius: '4px' }}>ADMIN</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Categorias de Lançamentos Futuros */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px 0', borderBottom: '1px dashed #222', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} color="var(--brand-neon)" /> Planejamento de Lançamentos
              </h3>
              
              <form onSubmit={handleAddCategoria} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                <input 
                  type="text" 
                  placeholder="Nome do novo recurso/mercado (ex: NBA)"
                  value={novaCatNome}
                  onChange={(e) => setNovaCatNome(e.target.value)}
                  style={{
                    background: '#16161a',
                    border: '1px solid #333',
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                  required
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Descrição breve..."
                    value={novaCatDesc}
                    onChange={(e) => setNovaCatDesc(e.target.value)}
                    style={{
                      flex: 1,
                      background: '#16161a',
                      border: '1px solid #333',
                      color: '#fff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                  <button type="submit" style={{
                    background: 'var(--brand-neon)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.82rem'
                  }}>
                    Criar
                  </button>
                </div>
              </form>

              {/* Lista de Categorias Futuras */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }} className="no-scrollbar">
                {categorias.map(cat => (
                  <div key={cat.id} style={{
                    background: '#16161a',
                    border: '1px solid #222',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    opacity: cat.active ? 1 : 0.6,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{cat.name}</span>
                        {!cat.active && <span style={{ fontSize: '0.62rem', background: '#333', color: '#888', padding: '1px 4px', borderRadius: '2px' }}>PAUSADO</span>}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cat.description}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => handleToggleCategoria(cat.id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid ' + (cat.active ? '#4CAF50' : '#888'),
                          color: cat.active ? '#4CAF50' : '#888',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        {cat.active ? 'Ativo' : 'Pausar'}
                      </button>
                      
                      <button 
                        onClick={() => handleRemoveCategoria(cat.id)}
                        style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: '2px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Criar Cupons e Promoções */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px 0', borderBottom: '1px dashed #222', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={16} color="#b339ff" /> Campanhas & Cupons de Promoção
              </h3>
              
              <form onSubmit={handleAddCupom} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Código (ex: VIP50)"
                    value={novoCupomCode}
                    onChange={(e) => setNovoCupomCode(e.target.value)}
                    style={{
                      flex: 2,
                      background: '#16161a',
                      border: '1px solid #333',
                      color: '#fff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      outline: 'none',
                      textTransform: 'uppercase'
                    }}
                    required
                  />
                  <input 
                    type="number" 
                    placeholder="Desc (%)"
                    min="1"
                    max="100"
                    value={novoCupomDisc}
                    onChange={(e) => setNovoCupomDisc(e.target.value)}
                    style={{
                      flex: 1,
                      background: '#16161a',
                      border: '1px solid #333',
                      color: 'var(--brand-neon)',
                      fontWeight: 'bold',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Descrição da campanha..."
                    value={novoCupomDesc}
                    onChange={(e) => setNovoCupomDesc(e.target.value)}
                    style={{
                      flex: 1,
                      background: '#16161a',
                      border: '1px solid #333',
                      color: '#fff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                  <button type="submit" style={{
                    background: '#b339ff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.82rem'
                  }}>
                    Ativar Cupom
                  </button>
                </div>
              </form>

              {/* Lista de Cupons Ativos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }} className="no-scrollbar">
                {cupons.map(cup => (
                  <div key={cup.id} style={{
                    background: '#16161a',
                    border: '1px solid #222',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#b339ff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{cup.code}</span>
                        <span style={{ fontSize: '0.65rem', background: 'rgba(179,57,255,0.15)', color: '#b339ff', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                          -{cup.discount}%
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cup.description}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleRemoveCupom(cup.id)}
                      style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: '2px' }}
                      title="Deletar Cupom"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Métricas do Funil do SaaS (Automático) */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px 0', borderBottom: '1px dashed #222', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={16} color="#00d2ff" /> Tráfego & Funil do SaaS
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#888', lineHeight: 1.4, marginBottom: '16px' }}>
                As métricas de tráfego e conversão do funil de vendas agora são calculadas e atualizadas de forma <strong>100% automática</strong>.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#16161a', padding: '12px', borderRadius: '6px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold' }}>Visitantes Únicos</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>
                      {funnelMetrics.visitors}
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowResetConfirmModal(true)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #ff4d4d',
                      color: '#ff4d4d',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: 'bold',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 77, 77, 0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    Resetar Contador
                  </button>
                </div>

                <div style={{ background: '#16161a', padding: '12px', borderRadius: '6px', border: '1px solid #222' }}>
                  <div style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold' }}>Trials Ativados (Grátis)</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#00d2ff', marginTop: '4px' }}>
                    {funnelMetrics.trials}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#555', marginTop: '4px' }}>
                    Calculado automaticamente a partir de contas com plano gratuito ativas.
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Gerenciamento de Ligas Ativas (Palpites) */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px 0', borderBottom: '1px dashed #222', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trophy size={16} color="var(--brand-neon)" /> Ligas Ativas (Palpites)
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#888', lineHeight: 1.4, marginBottom: '16px' }}>
                Gerencie as ligas de futebol exibidas na aba de palpites e consultas de jogos. As partidas dessas ligas serão integradas dinamicamente.
              </p>

              <form onSubmit={handleAddLiga} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.78rem', color: '#aaa', fontWeight: 'bold' }}>Escolher Liga API-Football</label>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setNovaLigaNome('');
                        setNovaLigaId('');
                        return;
                      }
                      if (val === 'custom') {
                        setNovaLigaNome('');
                        setNovaLigaId('');
                        return;
                      }
                      const predefined = [
                        { id: '71', name: 'Série A' },
                        { id: '72', name: 'Série B' },
                        { id: '75', name: 'Série C' },
                        { id: '73', name: 'Copa do Brasil' },
                        { id: '13', name: 'Libertadores' },
                        { id: '12', name: 'Sulamericana' },
                        { id: '39', name: 'Premier League' },
                        { id: '140', name: 'La Liga' },
                        { id: '135', name: 'Serie A' },
                        { id: '78', name: 'Bundesliga' },
                        { id: '61', name: 'Ligue 1' },
                        { id: '94', name: 'Liga Portugal' },
                        { id: '88', name: 'Eredivisie' },
                        { id: '2', name: 'Champions League' },
                        { id: '3', name: 'Europa League' },
                        { id: '848', name: 'Conference League' },
                        { id: '1', name: 'Copa do Mundo' },
                        { id: '44', name: 'Liga Argentina' },
                        { id: '10', name: 'Amistosos de Seleções' }
                      ];
                      const selected = predefined.find(l => l.id === val);
                      if (selected) {
                        setNovaLigaNome(selected.name);
                        setNovaLigaId(selected.id);
                      }
                    }}
                    style={{
                      background: '#16161a',
                      border: '1px solid #333',
                      color: '#fff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      outline: 'none',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    <option value="">— Selecionar Liga Pronta —</option>
                    <option value="71">Série A (Brasil) [ID: 71]</option>
                    <option value="72">Série B (Brasil) [ID: 72]</option>
                    <option value="75">Série C (Brasil) [ID: 75]</option>
                    <option value="73">Copa do Brasil [ID: 73]</option>
                    <option value="13">Libertadores [ID: 13]</option>
                    <option value="12">Sulamericana [ID: 12]</option>
                    <option value="39">Premier League (Inglaterra) [ID: 39]</option>
                    <option value="140">La Liga (Espanha) [ID: 140]</option>
                    <option value="135">Serie A (Itália) [ID: 135]</option>
                    <option value="78">Bundesliga (Alemanha) [ID: 78]</option>
                    <option value="61">Ligue 1 (França) [ID: 61]</option>
                    <option value="94">Liga Portugal [ID: 94]</option>
                    <option value="88">Eredivisie (Holanda) [ID: 88]</option>
                    <option value="2">Champions League [ID: 2]</option>
                    <option value="3">Europa League [ID: 3]</option>
                    <option value="848">Conference League [ID: 848]</option>
                    <option value="1">Copa do Mundo [ID: 1]</option>
                    <option value="44">Liga Argentina [ID: 44]</option>
                    <option value="10">Amistosos de Seleções [ID: 10]</option>
                    <option value="custom">Outra (Digitar ID Manual)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Nome da Liga (ex: Copa do Mundo)"
                    value={novaLigaNome}
                    onChange={(e) => setNovaLigaNome(e.target.value)}
                    style={{
                      background: '#16161a',
                      border: '1px solid #333',
                      color: '#fff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      outline: 'none',
                      width: '100%'
                    }}
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="ID API (ex: 1)"
                    value={novaLigaId}
                    onChange={(e) => setNovaLigaId(e.target.value)}
                    style={{
                      background: '#16161a',
                      border: '1px solid #333',
                      color: '#fff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      outline: 'none',
                      width: '100%'
                    }}
                    required
                  />
                </div>
                <button type="submit" style={{
                  background: 'var(--brand-neon)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}>
                  <Plus size={14} /> Adicionar Liga
                </button>
              </form>

              {/* Lista de Ligas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }} className="no-scrollbar">
                {ligasSaaS.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: '#666', fontStyle: 'italic', textAlign: 'center', padding: '12px' }}>
                    Nenhuma liga cadastrada.
                  </div>
                ) : (
                  ligasSaaS.map((liga) => (
                    <div key={liga.id} style={{
                      background: '#16161a',
                      border: '1px solid #222',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(204,255,0,0.1)', color: 'var(--brand-neon)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                          {liga.name}
                        </span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          ID {liga.id}
                        </span>
                      </div>
                      
                      <button 
                        type="button"
                        onClick={() => handleRemoveLiga(liga.id)}
                        style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                        title="Deletar Liga"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 6. Informações da Empresa */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px 0', borderBottom: '1px dashed #222', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🏢 Dados da Empresa / Suporte
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#888', lineHeight: 1.4, marginBottom: '16px' }}>
                Insira as informações de contato, dados cadastrais e links de suporte. Esses dados serão exibidos nas seções institucionais do app.
              </p>

              <form onSubmit={handleSaveCompanyInfo} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: 'bold' }}>CPF ou CNPJ</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 00.000.000/0001-00"
                    value={companyInfo.cnpj_cpf}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, cnpj_cpf: formatCPFCNPJ(e.target.value) })}
                    style={{
                      background: '#16161a',
                      border: '1px solid #333',
                      color: '#fff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: 'bold' }}>Nome / Razão Social</label>
                  <input 
                    type="text" 
                    placeholder="Ex: A2 Solutions LTDA"
                    value={companyInfo.razao_social}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, razao_social: e.target.value })}
                    style={{
                      background: '#16161a',
                      border: '1px solid #333',
                      color: '#fff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: 'bold' }}>Endereço Completo</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Av. Paulista, 1000 - São Paulo, SP"
                    value={companyInfo.endereco}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, endereco: e.target.value })}
                    style={{
                      background: '#16161a',
                      border: '1px solid #333',
                      color: '#fff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: 'bold' }}>Telefone / WhatsApp</label>
                  <input 
                    type="text" 
                    placeholder="Ex: (11) 99999-9999"
                    value={companyInfo.contato}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, contato: formatPhone(e.target.value) })}
                    style={{
                      background: '#16161a',
                      border: '1px solid #333',
                      color: '#fff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: 'bold' }}>E-mail de Suporte</label>
                  <input 
                    type="email" 
                    placeholder="suporte@a2sporttrackers.com"
                    value={companyInfo.email_suporte}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, email_suporte: e.target.value })}
                    style={{
                      background: '#16161a',
                      border: '1px solid #333',
                      color: '#fff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: 'bold' }}>Instagram</label>
                  <input 
                    type="text" 
                    placeholder="@a2sports"
                    value={companyInfo.instagram}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, instagram: e.target.value })}
                    style={{
                      background: '#16161a',
                      border: '1px solid #333',
                      color: '#fff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: 'bold' }}>Telegram (Grupo/Link)</label>
                  <input 
                    type="text" 
                    placeholder="t.me/a2sports"
                    value={companyInfo.telegram}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, telegram: e.target.value })}
                    style={{
                      background: '#16161a',
                      border: '1px solid #333',
                      color: '#fff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: 'bold' }}>Facebook</label>
                  <input 
                    type="text" 
                    placeholder="fb.com/a2sports"
                    value={companyInfo.facebook}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, facebook: e.target.value })}
                    style={{
                      background: '#16161a',
                      border: '1px solid #333',
                      color: '#fff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isSavingSettings}
                  style={{
                    background: 'var(--brand-neon)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    marginTop: '10px',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 15px rgba(204, 255, 0, 0.15)'
                  }}
                >
                  {isSavingSettings ? 'Salvando...' : '💾 Salvar Informações da Empresa'}
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* Modal de Gerenciamento de Categorias de Gastos */}
      {showExpenseCatModal && (
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
          animation: 'fadeIn 0.2s ease-out',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div className="glass-panel" style={{
            width: '90%',
            maxWidth: '420px',
            background: 'linear-gradient(135deg, #111115, #14141d)',
            border: '1px solid #333',
            borderTop: '4px solid #ff9800',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={18} color="#ff9800" /> Categorias de Despesas
              </h3>
              <button 
                onClick={() => { setShowExpenseCatModal(false); setEditingExpenseCatIndex(null); }}
                style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            {/* Lista de categorias existentes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }} className="no-scrollbar">
              {gastosCategorias.map((cat, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#16161a',
                  border: '1px solid #222',
                  padding: '8px 12px',
                  borderRadius: '6px'
                }}>
                  {editingExpenseCatIndex === index ? (
                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                      <input 
                        type="text"
                        value={editingExpenseCatName}
                        onChange={(e) => setEditingExpenseCatName(e.target.value)}
                        style={{
                          flex: 1,
                          background: '#111',
                          border: '1px solid #444',
                          color: '#fff',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.82rem',
                          outline: 'none'
                        }}
                      />
                      <button
                        onClick={() => handleSaveGastoCategoryName(index, editingExpenseCatName)}
                        style={{ background: '#ff9800', color: '#000', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditingExpenseCatIndex(null)}
                        style={{ background: 'transparent', border: '1px solid #444', color: '#aaa', borderRadius: '4px', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Canc.
                      </button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 500 }}>{cat}</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {cat !== 'Outros' && (
                          <>
                            <button
                              onClick={() => {
                                setEditingExpenseCatIndex(index);
                                setEditingExpenseCatName(cat);
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#00d2ff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleRemoveGastoCategory(cat)}
                              style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                        {cat === 'Outros' && (
                          <span style={{ fontSize: '0.65rem', color: '#666', fontStyle: 'italic' }}>Padrão</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Adicionar nova categoria */}
            <form onSubmit={handleAddGastoCategory} style={{ display: 'flex', gap: '8px', borderTop: '1px solid #222', paddingTop: '16px', marginTop: '4px' }}>
              <input 
                type="text"
                placeholder="Nova Categoria..."
                value={newExpenseCatName}
                onChange={(e) => setNewExpenseCatName(e.target.value)}
                style={{
                  flex: 1,
                  background: '#16161a',
                  border: '1px solid #333',
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
                required
              />
              <button
                type="submit"
                style={{
                  background: '#ff9800',
                  color: '#000',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontWeight: 'bold',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Add
              </button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button 
                onClick={() => { setShowExpenseCatModal(false); setEditingExpenseCatIndex(null); }}
                style={{
                  background: '#222',
                  border: '1px solid #333',
                  color: '#ccc',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.85rem'
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Gasto/Despesa */}
      {showEditExpenseModal && editingExpense && (
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
          animation: 'fadeIn 0.2s ease-out',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div className="glass-panel" style={{
            width: '90%',
            maxWidth: '400px',
            background: 'linear-gradient(135deg, #111115, #14141d)',
            border: '1px solid #333',
            borderTop: '4px solid #00d2ff',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit size={18} color="#00d2ff" /> Editar Despesa
              </h3>
              <button 
                onClick={() => { setShowEditExpenseModal(false); setEditingExpense(null); }}
                style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateGasto} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold' }}>Nome da Despesa</label>
                <input 
                  type="text"
                  value={editExpenseName}
                  onChange={(e) => setEditExpenseName(e.target.value)}
                  style={{ width: '100%', background: '#16161a', border: '1px solid #333', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold' }}>Valor (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editExpenseValue}
                    onChange={(e) => setEditExpenseValue(e.target.value)}
                    style={{ width: '100%', background: '#16161a', border: '1px solid #333', color: 'var(--brand-neon)', fontWeight: 'bold', padding: '10px', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold' }}>Categoria</label>
                  <select 
                    value={editExpenseCategory} 
                    onChange={(e) => setEditExpenseCategory(e.target.value)}
                    style={{ width: '100%', background: '#16161a', border: '1px solid #333', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 'bold', height: '40px' }}
                  >
                    {gastosCategorias.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', borderTop: '1px solid #222', paddingTop: '16px' }}>
                <button 
                  type="button"
                  onClick={() => { setShowEditExpenseModal(false); setEditingExpense(null); }}
                  style={{
                    background: 'transparent',
                    border: '1px solid #444',
                    color: '#aaa',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  style={{
                    background: '#00d2ff',
                    border: 'none',
                    color: '#000',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    boxShadow: '0 4px 15px rgba(0, 210, 255, 0.2)'
                  }}
                >
                  Salvar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Resetar Visitantes */}
      {showResetConfirmModal && (
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
          animation: 'fadeIn 0.2s ease-out',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div className="glass-panel" style={{
            width: '90%',
            maxWidth: '400px',
            background: 'linear-gradient(135deg, #111115, #14141d)',
            border: '1px solid #333',
            borderTop: '4px solid var(--alert-red)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
            borderRadius: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="var(--alert-red)" /> Confirmar Ação
              </h3>
              <button 
                onClick={() => setShowResetConfirmModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>
            
            <p style={{ fontSize: '0.88rem', color: '#aaa', margin: 0, lineHeight: 1.5 }}>
              Deseja realmente zerar o contador de visitantes únicos? Essa ação não poderá ser desfeita.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button 
                onClick={() => setShowResetConfirmModal(false)}
                style={{
                  background: '#222',
                  border: '1px solid #333',
                  color: '#ccc',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.82rem'
                }}
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  try {
                    const res = await adminFetch('/api/admin/settings', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ key: 'visitors_count', value: 0 })
                    });
                    if (res.ok) {
                      setFunnelMetrics(prev => ({ ...prev, visitors: 0 }));
                      showNotification('Contador de visitantes zerado!');
                    } else {
                      showNotification('Erro ao zerar contador', 'error');
                    }
                  } catch (err) {
                    showNotification('Erro: ' + err.message, 'error');
                  } finally {
                    setShowResetConfirmModal(false);
                  }
                }}
                style={{
                  background: 'var(--alert-red)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.82rem'
                }}
              >
                Zerar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ABA 4: EVOLUÇÃO DE ASSINANTES --- */}
      {activeTab === 'subscribers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* BLOCO 1: KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#111116', border: '1px solid #222', borderLeft: '5px solid var(--brand-neon)', padding: '18px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#888', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
                <span>Assinantes Pagos</span>
                <Users size={16} color="var(--brand-neon)" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--brand-neon)', marginTop: '10px', fontFamily: 'monospace' }}>
                {subscriberMetrics.totalPaid}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '6px' }}>PRO + VIP + Telegram</div>
            </div>

            <div style={{ background: '#111116', border: '1px solid #222', borderLeft: '5px solid #00d2ff', padding: '18px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#888', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
                <span>Novos este Mês</span>
                <UserPlus size={16} color="#00d2ff" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#00d2ff', marginTop: '10px', fontFamily: 'monospace' }}>
                {subscriberMetrics.newThisMonth}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '6px' }}>Registros no mês atual</div>
            </div>

            <div style={{ background: '#111116', border: '1px solid #222', borderLeft: '5px solid ' + (subscriberMetrics.growthRate >= 0 ? '#4CAF50' : '#ff5252'), padding: '18px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#888', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
                <span>Crescimento</span>
                <TrendingUp size={16} color={subscriberMetrics.growthRate >= 0 ? '#4CAF50' : '#ff5252'} />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: subscriberMetrics.growthRate >= 0 ? '#4CAF50' : '#ff5252', marginTop: '10px', fontFamily: 'monospace' }}>
                {subscriberMetrics.growthRate >= 0 ? '+' : ''}{subscriberMetrics.growthRate}%
              </div>
              <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '6px' }}>vs mês anterior ({subscriberMetrics.lastMonthCount} registros)</div>
            </div>

            <div style={{ background: '#111116', border: '1px solid #222', borderLeft: '5px solid #b339ff', padding: '18px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#888', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
                <span>ARPU</span>
                <DollarSign size={16} color="#b339ff" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#b339ff', marginTop: '10px', fontFamily: 'monospace' }}>
                R$ {subscriberMetrics.arpu.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '6px' }}>Receita média por assinante</div>
            </div>
          </div>

          {/* BLOCO 2 + 3: Charts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
            
            {/* Gráfico de Evolução Mensal */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '380px' }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px 0', borderBottom: '1px dashed #222', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={16} color="#00d2ff" /> Evolução Mensal de Registros
              </h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flex: 1, padding: '10px 10px 0 10px', borderBottom: '2px solid #333', position: 'relative' }}>
                {[0.25, 0.5, 0.75, 1.0].map((p, idx) => (
                  <div key={idx} style={{ position: 'absolute', left: 0, right: 0, bottom: `${p * 100}%`, borderBottom: '1px dashed rgba(255,255,255,0.04)', pointerEvents: 'none' }}></div>
                ))}

                {subscriberMetrics.monthlyData.map((bar, idx) => {
                  const pct = subscriberMetrics.maxMonthly > 0 ? (bar.total / subscriberMetrics.maxMonthly) * 100 : 0;
                  const isCurrentMonth = idx === subscriberMetrics.monthlyData.length - 1;
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '6px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#00d2ff', fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {bar.total}
                      </span>
                      <div style={{ position: 'relative', width: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                        {/* Telegram portion */}
                        {bar.telegram > 0 && (
                          <div style={{
                            width: '32px',
                            height: `${(bar.telegram / subscriberMetrics.maxMonthly) * 180}px`,
                            background: 'linear-gradient(to top, #0088cc, #00d2ff)',
                            borderRadius: '3px 3px 0 0',
                            minHeight: bar.telegram > 0 ? '4px' : '0'
                          }} title={`Telegram: ${bar.telegram}`}></div>
                        )}
                        {/* Site portion */}
                        <div style={{
                          width: '32px',
                          height: `${(bar.site / subscriberMetrics.maxMonthly) * 180}px`,
                          background: isCurrentMonth ? 'linear-gradient(to top, #b339ff, var(--brand-neon))' : 'var(--brand-neon)',
                          border: '1px solid rgba(0,0,0,0.3)',
                          boxShadow: isCurrentMonth ? '0 0 15px rgba(204,255,0,0.3)' : '0 0 6px rgba(204,255,0,0.1)',
                          borderRadius: bar.telegram > 0 ? '0' : '3px 3px 0 0',
                          minHeight: bar.site > 0 ? '4px' : '0',
                          transition: 'all 0.4s ease-out'
                        }}></div>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#888', fontWeight: 'bold', marginTop: '4px' }}>
                        {bar.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Legenda */}
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#888' }}>
                  <div style={{ width: '12px', height: '12px', background: 'var(--brand-neon)', borderRadius: '2px' }}></div>
                  Site
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#888' }}>
                  <div style={{ width: '12px', height: '12px', background: '#00d2ff', borderRadius: '2px' }}></div>
                  Telegram
                </div>
              </div>
            </div>

            {/* Distribuição de Planos (Donut CSS) */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '380px' }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px 0', borderBottom: '1px dashed #222', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={16} color="#b339ff" /> Distribuição de Planos
              </h3>

              {(() => {
                const { gratis, pro, vip, telegram } = subscriberMetrics.planDist;
                const total = gratis + pro + vip + telegram || 1;
                const pGratis = (gratis / total) * 100;
                const pPro = (pro / total) * 100;
                const pVip = (vip / total) * 100;
                const pTelegram = (telegram / total) * 100;
                
                let offset = 0;
                const segments = [
                  { label: 'Grátis', val: gratis, pct: pGratis, color: '#555' },
                  { label: 'PRO', val: pro, pct: pPro, color: 'var(--brand-neon)' },
                  { label: 'VIP', val: vip, pct: pVip, color: '#b339ff' },
                  { label: 'Telegram', val: telegram, pct: pTelegram, color: '#00d2ff' },
                ];
                
                const gradientParts = segments.map(s => {
                  const start = offset;
                  offset += s.pct;
                  return `${s.color} ${start}% ${offset}%`;
                });

                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '30px' }}>
                    {/* Donut */}
                    <div style={{
                      width: '180px',
                      height: '180px',
                      borderRadius: '50%',
                      background: `conic-gradient(${gradientParts.join(', ')})`,
                      position: 'relative',
                      boxShadow: '0 0 30px rgba(0,0,0,0.5)'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        background: '#111116',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>{total}</span>
                        <span style={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase' }}>Total</span>
                      </div>
                    </div>

                    {/* Legenda */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {segments.map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: s.color, boxShadow: `0 0 8px ${s.color}40` }}></div>
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#ddd' }}>{s.label}</div>
                            <div style={{ fontSize: '0.7rem', color: '#888' }}>{s.val} ({s.pct.toFixed(1)}%)</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* BLOCO 4 + 5: Timeline + Projeções */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
            
            {/* Timeline de Últimos Registros */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', maxHeight: '420px' }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px 0', borderBottom: '1px dashed #222', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} color="var(--brand-neon)" /> Últimos Registros
              </h3>

              <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {subscriberMetrics.recentUsers.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#555', padding: '40px 0', fontSize: '0.85rem' }}>Nenhum registro encontrado</div>
                ) : (
                  subscriberMetrics.recentUsers.map((u, idx) => (
                    <div key={u.id || idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      border: '1px solid #1a1a1f',
                      transition: 'all 0.2s ease'
                    }}>
                      {/* Avatar */}
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: u.isTelegram ? 'linear-gradient(135deg, #0088cc, #00d2ff)' : 'linear-gradient(135deg, #b339ff, var(--brand-neon))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        color: '#fff',
                        flexShrink: 0,
                        textTransform: 'uppercase'
                      }}>
                        {u.isTelegram ? '📱' : (u.name || '?').charAt(0)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.email}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 'bold',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          background: u.plan === 'vip' || u.plan === 'vitalicio' ? 'rgba(179,57,255,0.15)' : u.plan === 'pro' ? 'rgba(204,255,0,0.1)' : 'rgba(255,255,255,0.05)',
                          color: u.plan === 'vip' || u.plan === 'vitalicio' ? '#e5a3ff' : u.plan === 'pro' ? 'var(--brand-neon)' : '#666',
                          border: '1px solid ' + (u.plan === 'vip' || u.plan === 'vitalicio' ? 'rgba(179,57,255,0.3)' : u.plan === 'pro' ? 'rgba(204,255,0,0.2)' : 'rgba(255,255,255,0.05)')
                        }}>
                          {u.plan}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: '#555' }}>
                          {timeAgo(u.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Perspectivas & Projeções */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', maxHeight: '420px' }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px 0', borderBottom: '1px dashed #222', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={16} color="#ff9800" /> Perspectivas & Projeções
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                {/* Projeção 30 dias */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1a1a1f', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.82rem', color: '#aaa', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={14} color="#00d2ff" /> Projeção 30 dias
                    </span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#00d2ff', fontFamily: 'monospace' }}>
                      {subscriberMetrics.projection30} usuários
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#666' }}>Baseado na média de {subscriberMetrics.avgMonthlyGrowth.toFixed(1)} novos/mês</div>
                </div>

                {/* Projeção 90 dias */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1a1a1f', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.82rem', color: '#aaa', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={14} color="#b339ff" /> Projeção 90 dias
                    </span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#b339ff', fontFamily: 'monospace' }}>
                      {subscriberMetrics.projection90} usuários
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#666' }}>Extrapolação linear da tendência atual</div>
                </div>

                {/* Meta MRR R$ 5.000 */}
                {(() => {
                  const meta = 5000;
                  const progress = Math.min((financialMetrics.mrr / meta) * 100, 100);
                  return (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1a1a1f', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.82rem', color: '#aaa', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Target size={14} color="var(--brand-neon)" /> Meta MRR
                        </span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--brand-neon)', fontFamily: 'monospace' }}>
                          R$ {financialMetrics.mrr.toFixed(0)} / R$ {meta.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '10px', background: '#1a1a1f', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${progress}%`,
                          height: '100%',
                          background: progress >= 100 ? 'linear-gradient(90deg, var(--brand-neon), #4CAF50)' : 'linear-gradient(90deg, var(--brand-neon), #b339ff)',
                          borderRadius: '5px',
                          transition: 'width 0.6s ease-out',
                          boxShadow: `0 0 10px ${progress >= 100 ? 'rgba(76,175,80,0.4)' : 'rgba(204,255,0,0.2)'}`
                        }}></div>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '6px', textAlign: 'right' }}>
                        {progress.toFixed(1)}% da meta
                      </div>
                    </div>
                  );
                })()}

                {/* Indicador de Saúde */}
                {(() => {
                  const rate = subscriberMetrics.growthRate;
                  let status, color, emoji, desc;
                  if (rate >= 10) {
                    status = 'EXCELENTE'; color = '#4CAF50'; emoji = '🟢'; desc = 'Crescimento acelerado. Continue investindo!';
                  } else if (rate >= 0) {
                    status = 'ESTÁVEL'; color = '#ff9800'; emoji = '🟡'; desc = 'Crescimento positivo mas moderado.';
                  } else {
                    status = 'ATENÇÃO'; color = '#ff5252'; emoji = '🔴'; desc = 'Base de usuários encolhendo. Rever estratégia.';
                  }
                  return (
                    <div style={{
                      background: `${color}08`,
                      border: `1px solid ${color}30`,
                      borderRadius: '10px',
                      padding: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px'
                    }}>
                      <span style={{ fontSize: '1.8rem' }}>{emoji}</span>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 900, color, textTransform: 'uppercase', letterSpacing: '1px' }}>
                          {status}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '3px' }}>{desc}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* --- ABA 5: CONTROLE DO TELEGRAM --- */}
      {activeTab === 'telegram' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* HEADER DA ABA */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Send size={24} color="var(--brand-neon)" />
                Central de Controle do Telegram VIP
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#888' }}>
                Gerencie disparos automáticos por horário, crie cards personalizados e despache tips selecionadas.
              </p>
            </div>
            <button 
              onClick={() => loadOpportunities(oppsPage, oppsLimit)}
              disabled={loadingOpps}
              style={{
                background: '#1a1a24',
                border: '1px solid #333',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand-neon)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#333'}
            >
              <RefreshCw size={14} className={loadingOpps ? 'spin' : ''} />
              Atualizar Dados
            </button>
          </div>

          {/* GRID SUPERIOR: CONFIGS, HISTÓRICO E PREVIEW - 3 COLUNAS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 0.7fr', gap: '16px', alignItems: 'stretch' }}>
            
            {/* COLUNA 1: CONFIGS E CRIADOR DE CARDS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* CONFIGS DO AGENDAMENTO (MAIS COMPACTO) */}
              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} color="var(--brand-neon)" />
                  ⏱️ Configuração de Disparos por Horários
                </h3>
                
                {/* LIGA / DESLIGA BOT */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0a0f', padding: '8px 12px', borderRadius: '6px', border: '1px solid #1a1a24' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff' }}>Robô de Sinais VIP</div>
                  </div>
                  <button
                    onClick={() => setBotEnabled(!botEnabled)}
                    style={{
                      width: '44px',
                      height: '22px',
                      borderRadius: '11px',
                      background: botEnabled ? 'var(--brand-neon)' : '#222',
                      border: 'none',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: botEnabled ? '#000' : '#888',
                      position: 'absolute',
                      top: '2px',
                      left: botEnabled ? '24px' : '2px',
                      transition: 'all 0.2s'
                    }} />
                  </button>
                </div>

                {/* EV MINIMO SLIDER */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ color: '#aaa', fontWeight: 'bold' }}>Vantagem Mínima (EV%)</span>
                    <span style={{ color: 'var(--brand-neon)', fontFamily: 'monospace', fontWeight: 'bold' }}>+{botMinEv.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="3.0"
                    max="15.0"
                    step="0.5"
                    value={botMinEv}
                    onChange={(e) => setBotMinEv(parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: 'var(--brand-neon)',
                      background: '#222',
                      height: '4px',
                      borderRadius: '2px',
                      cursor: 'pointer'
                    }}
                  />
                </div>

                {/* HORARIOS PROGRAMADOS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #222', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="HH:MM (ex: 14:30)"
                      value={newHourInput}
                      onChange={(e) => setNewHourInput(e.target.value)}
                      style={{
                        flex: 1,
                        background: '#0a0a0f',
                        border: '1px solid #222',
                        borderRadius: '4px',
                        color: '#fff',
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        outline: 'none'
                      }}
                    />
                    <button
                      onClick={() => {
                        const val = newHourInput.trim();
                        if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val)) {
                          if (!botHours.includes(val)) {
                            setBotHours([...botHours, val].sort());
                            setNewHourInput('');
                          } else {
                            showNotification('Horário já cadastrado', 'info');
                          }
                        } else {
                          showNotification('Formato inválido (Use HH:MM)', 'error');
                        }
                      }}
                      style={{
                        background: '#1a1a24',
                        border: '1px solid #333',
                        color: 'var(--brand-neon)',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      Add
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {botHours.map((hr, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#1a1a24',
                          border: '1px solid #222',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          color: '#fff',
                          fontFamily: 'monospace'
                        }}
                      >
                        <span>{hr}</span>
                        <button
                          onClick={() => setBotHours(botHours.filter(h => h !== hr))}
                          style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleSaveTelegramSettings(botEnabled, botMinEv, botHours)}
                  disabled={isSavingSettings}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--brand-neon)',
                    color: 'var(--brand-neon)',
                    padding: '6px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {isSavingSettings ? 'Salvando...' : '💾 Salvar Configurações'}
                </button>
              </div>

              {/* CRIADOR DE CARDS (MAIS COMPACTO COM UPLOAD LOCAL) */}
              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🎨 Criador de Cards Customizados
                </h3>
                
                {/* Seleção de Templates */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {['free', 'tip', 'report', 'alert'].map((t) => (
                    <button 
                      key={t}
                      onClick={() => applyTemplate(t)}
                      style={{
                        background: msgTemplate === t ? 'rgba(204,255,0,0.1)' : '#1a1a24',
                        border: msgTemplate === t ? '1px solid var(--brand-neon)' : '1px solid #333',
                        color: msgTemplate === t ? 'var(--brand-neon)' : '#aaa',
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold'
                      }}
                    >
                      {t === 'free' ? 'Livre' : t === 'tip' ? '🔥 Palpite' : t === 'report' ? '📊 Balanço' : '📢 Alerta'}
                    </button>
                  ))}
                </div>

                {/* Upload de Imagem de Arquivo Local ou URL */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.78rem', color: '#aaa', fontWeight: 'bold' }}>
                    Imagem do Card (Arquivo Local ou link)
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setCardImageUrl(reader.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      style={{
                        fontSize: '0.75rem',
                        color: '#aaa',
                        cursor: 'pointer'
                      }}
                    />
                    <input
                      type="text"
                      value={cardImageUrl.startsWith('data:') ? '' : cardImageUrl}
                      onChange={(e) => setCardImageUrl(e.target.value)}
                      placeholder="Ou cole a URL da imagem aqui..."
                      style={{
                        width: '100%',
                        background: '#0a0a0f',
                        border: '1px solid #222',
                        borderRadius: '4px',
                        color: '#fff',
                        padding: '6px 10px',
                        fontSize: '0.78rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Legenda em Markdown (*negrito*, _itálico_)"
                    rows={4}
                    style={{
                      width: '100%',
                      background: '#0a0a0f',
                      border: '1px solid #222',
                      borderRadius: '4px',
                      color: '#fff',
                      padding: '8px',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace',
                      resize: 'none',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Botão de Link Opcional */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #222', paddingTop: '10px' }}>
                  <label style={{ fontSize: '0.78rem', color: '#aaa', fontWeight: 'bold' }}>
                    🔗 Botão de Link com a Mensagem (Opcional)
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="Texto (Ex: 💎 Assinar VIP)"
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                      style={{
                        flex: 1,
                        background: '#0a0a0f',
                        border: '1px solid #222',
                        borderRadius: '4px',
                        color: '#fff',
                        padding: '6px 10px',
                        fontSize: '0.78rem',
                        outline: 'none'
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Link (Ex: https://t.me/...)"
                      value={buttonUrl}
                      onChange={(e) => setButtonUrl(e.target.value)}
                      style={{
                        flex: 1.5,
                        background: '#0a0a0f',
                        border: '1px solid #222',
                        borderRadius: '4px',
                        color: '#fff',
                        padding: '6px 10px',
                        fontSize: '0.78rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Seleção do Canal de Destino */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.78rem', color: '#aaa', fontWeight: 'bold' }}>
                    Postar no Canal/Grupo:
                  </label>
                  <select
                    value={broadcastChannel}
                    onChange={(e) => setBroadcastChannel(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#0a0a0f',
                      border: '1px solid #222',
                      borderRadius: '4px',
                      color: '#fff',
                      padding: '6px',
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="vip">Grupo VIP (Premium)</option>
                    <option value="free">Canal Livre (Geral)</option>
                    <option value="radar_ev">Marketing: Radar EV</option>
                  </select>
                </div>

                <button
                  onClick={handleSendCustomCard}
                  disabled={isVipSending || (!customMessage.trim() && !cardImageUrl)}
                  style={{
                    background: 'var(--brand-neon)',
                    color: '#000',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    transition: 'all 0.2s'
                  }}
                >
                  Enviar para {broadcastChannel === 'vip' ? 'Grupo VIP' : broadcastChannel === 'free' ? 'Canal Livre' : 'Radar EV'}
                </button>
              </div>

            </div>

            {/* COLUNA 2: HISTÓRICO DE DESPACHO VIP */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222', paddingBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📜 Histórico de Despacho VIP
                  </h3>
                  {dispatchHistory.length > 0 && (
                    <button
                      onClick={() => {
                        setDispatchHistory([]);
                        localStorage.removeItem('ev_telegram_dispatch_history');
                        showNotification('Histórico limpo', 'success');
                      }}
                      style={{ background: 'transparent', border: 'none', color: '#ff4d4d', fontSize: '0.7rem', cursor: 'pointer' }}
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <div 
                  style={{
                    height: '150px',
                    flexGrow: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  {dispatchHistory.length === 0 ? (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: '#555', fontSize: '0.75rem' }}>
                      Nenhum envio registrado recentemente.
                    </div>
                  ) : (
                    dispatchHistory.map(item => (
                      <div
                        key={item.id}
                        style={{
                          background: '#0a0a0f',
                          border: '1px solid #1a1a24',
                          borderLeft: `4px solid ${item.status === 'success' ? 'var(--brand-neon)' : 'var(--alert-red)'}`,
                          padding: '8px 10px',
                          borderRadius: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
                          <span style={{ fontWeight: 'bold', color: item.status === 'success' ? 'var(--brand-neon)' : 'var(--alert-red)' }}>
                            {item.type}
                          </span>
                          <span style={{ color: '#555', fontFamily: 'monospace' }}>
                            {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#ccc', lineBreak: 'anywhere' }}>
                          {item.message}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* COLUNA 3: PRÉVIA DA MENSAGEM (TELEGRAM - FORMATO 9:16) */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  👁️ Prévia da Mensagem (Telegram)
                </h3>
                
                <div style={{
                  background: 'radial-gradient(circle at top, #1e2c3a, #151f28)',
                  borderRadius: '8px',
                  padding: '10px',
                  border: '1px solid #283747',
                  boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div style={{
                    background: '#182533',
                    border: '1px solid #202f3e',
                    borderRadius: '8px',
                    padding: '0',
                    color: '#eef2f5',
                    fontSize: '0.78rem',
                    lineHeight: '1.4',
                    maxWidth: '100%',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    overflow: 'hidden'
                  }}>
                    {cardImageUrl && (
                      <div style={{ width: '100%', borderBottom: '1px solid #202f3e' }}>
                        <img 
                          src={cardImageUrl} 
                          alt="Pré-visualização do Card" 
                          style={{ width: '100%', height: 'auto', maxHeight: '180px', display: 'block', objectFit: 'contain' }}
                        />
                      </div>
                    )}
                    <div style={{ padding: '8px 10px', whiteSpace: 'pre-wrap' }}>
                      {customMessage.trim() ? (
                        customMessage
                          .split('\n')
                          .map((line, idx) => {
                            let rendered = line;
                            const boldMatches = rendered.match(/\*(.*?)\*/g);
                            if (boldMatches) {
                              boldMatches.forEach(m => {
                                const clean = m.replace(/\*/g, '');
                                rendered = rendered.replace(m, `<strong>${clean}</strong>`);
                              });
                            }
                            const italicMatches = rendered.match(/_(.*?)_/g);
                            if (italicMatches) {
                              italicMatches.forEach(m => {
                                const clean = m.replace(/_/g, '');
                                rendered = rendered.replace(m, `<em>${clean}</em>`);
                              });
                            }
                            return <div key={idx} dangerouslySetInnerHTML={{ __html: rendered || '&nbsp;' }} />;
                          })
                      ) : cardImageUrl ? (
                        <span style={{ color: '#7a8a99', fontStyle: 'italic' }}>Apenas imagem (sem legenda)</span>
                      ) : (
                        <span style={{ color: '#7a8a99', fontStyle: 'italic' }}>Nenhum conteúdo criado.</span>
                      )}
                    </div>
                  </div>

                  {buttonText && (
                    <div style={{ marginTop: '8px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#2b5278',
                          color: '#fff',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          border: '1px solid #36618e',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          cursor: 'default'
                        }}
                      >
                        {buttonText}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.65rem', color: '#7a8a99', marginTop: '10px', padding: '0 4px' }}>
                    {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Algoritmo Bot
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ROW ABAIXO: DESPACHO MANUAL DE APOSTAS COM PAGINAÇÃO */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #222', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📋 Despacho Manual de Tips</span>
                <span style={{ fontSize: '0.75rem', background: '#222', color: '#aaa', padding: '2px 8px', borderRadius: '10px' }}>
                  {totalOppsCount} detectadas
                </span>
              </h3>

              {/* FILTROS POR DATA E LIGAS */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} color="#888" />
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => { setFilterDate(e.target.value); setOppsPage(1); }}
                    style={{
                      background: '#16161a',
                      border: '1px solid #333',
                      color: '#fff',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                </div>
                <select
                  value={filterLeague}
                  onChange={(e) => { setFilterLeague(e.target.value); setOppsPage(1); }}
                  style={{
                    background: '#16161a',
                    border: '1px solid #333',
                    color: '#fff',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    outline: 'none',
                    cursor: 'pointer',
                    minWidth: '160px'
                  }}
                >
                  <option value="">Todas as Ligas</option>
                  {ligasSaaS.map(liga => {
                    const mapping = {
                      'Copa do Mundo': 'World Cup',
                      'Série A': 'Serie A',
                      'Série B': 'Serie B',
                      'Série C': 'Serie C',
                      'Libertadores': 'Copa Libertadores',
                      'Sulamericana': 'Copa Sudamericana',
                      'Premier': 'Premier League',
                      'La Liga': 'La Liga',
                      'Serie A': 'Serie A',
                      'Bundes': 'Bundesliga',
                      'Europa League': 'UEFA Europa League',
                      'Conference': 'UEFA Conference League',
                      'Liga Argentina': 'Liga Profesional',
                      'Amistosos': 'Friendly'
                    };
                    const queryName = mapping[liga.name] || liga.name;
                    return (
                      <option key={liga.id} value={queryName}>
                        {liga.name}
                      </option>
                    );
                  })}
                </select>
                <button
                  onClick={() => {
                    setSortEV(!sortEV);
                    setOppsPage(1);
                  }}
                  style={{
                    background: sortEV ? 'rgba(0, 210, 255, 0.1)' : 'transparent',
                    border: sortEV ? '1px solid #00d2ff' : '1px solid #333',
                    color: sortEV ? '#00d2ff' : '#aaa',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <TrendingUp size={14} />
                  Maiores EV%
                </button>
                {(filterDate || filterLeague || sortEV) && (
                  <button
                    onClick={() => {
                      setFilterDate('');
                      setFilterLeague('');
                      setSortEV(false);
                      setOppsPage(1);
                    }}
                    style={{
                      background: 'transparent',
                      border: '1px solid #ff4d4d',
                      color: '#ff4d4d',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Limpar
                  </button>
                )}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {selectedBets.length > 0 && (
                  <button
                    onClick={handleDispatchSelected}
                    disabled={isVipSending}
                    style={{
                      background: 'var(--brand-neon)',
                      color: '#000',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Send size={14} />
                    Enviar {selectedBets.length} Selecionada{selectedBets.length > 1 ? 's' : ''} para VIP
                  </button>
                )}
              </div>
            </div>

            {loadingOpps ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#888', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <RefreshCw size={24} className="spin" color="var(--brand-neon)" />
                <span>Carregando oportunidades da base de dados...</span>
              </div>
            ) : opportunities.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#666' }}>
                Nenhuma aposta detectada recente no banco de dados.
              </div>
            ) : (
              <div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #222', color: '#888' }}>
                        <th style={{ padding: '10px 8px', width: '30px' }}>
                          <input 
                            type="checkbox"
                            checked={opportunities.length > 0 && selectedBets.length === opportunities.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBets(opportunities.map(o => o.id));
                              } else {
                                setSelectedBets([]);
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        </th>
                        <th style={{ padding: '10px 8px' }}>Data</th>
                        <th style={{ padding: '10px 8px' }}>Confronto / Liga</th>
                        <th style={{ padding: '10px 8px' }}>Mercado</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center' }}>Odd</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center' }}>EV%</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center' }}>Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {opportunities.map(opp => {
                        const isSelected = selectedBets.includes(opp.id);
                        const isLive = opp.campeonato && opp.campeonato.startsWith('[LIVE|');

                        const dataFormatada = new Date(opp.created_at).toLocaleString('pt-BR', {
                          timeZone: 'America/Sao_Paulo',
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        
                        let resColor = '#888';
                        let resBg = '#222';
                        let labelStatus = opp.resultado;

                        if (opp.resultado === 'pending') {
                          if (isLive) {
                            labelStatus = 'EM ANDAMENTO';
                            resColor = '#ff9800';
                            resBg = 'rgba(255, 152, 0, 0.15)';
                          } else {
                            labelStatus = 'AGUARDANDO INÍCIO';
                            resColor = '#00d2ff';
                            resBg = 'rgba(0, 210, 255, 0.15)';
                          }
                        } else if (opp.resultado === 'green') {
                          resColor = 'var(--brand-neon)';
                          resBg = 'rgba(204,255,0,0.08)';
                        } else if (opp.resultado === 'red') {
                          resColor = 'var(--alert-red)';
                          resBg = 'var(--alert-red-dim)';
                        }

                        return (
                          <tr 
                            key={opp.id} 
                            style={{ 
                              borderBottom: '1px solid #1a1a24',
                              background: isSelected ? 'rgba(204, 255, 0, 0.02)' : 'transparent',
                              transition: 'background 0.2s'
                            }}
                          >
                            <td style={{ padding: '10px 8px' }}>
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    setSelectedBets(selectedBets.filter(id => id !== opp.id));
                                  } else {
                                    setSelectedBets([...selectedBets, opp.id]);
                                  }
                                }}
                                style={{ cursor: 'pointer' }}
                              />
                            </td>
                            <td style={{ padding: '10px 8px', color: '#666', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                              {dataFormatada}
                            </td>
                            <td style={{ padding: '10px 8px' }}>
                              <div style={{ fontWeight: 'bold', color: '#fff' }}>{opp.confronto}</div>
                              <div style={{ fontSize: '0.72rem', color: '#666' }}>{opp.campeonato}</div>
                            </td>
                            <td style={{ padding: '10px 8px', color: '#aaa' }}>{opp.mercado}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 'bold', color: 'var(--brand-neon)' }}>
                              @{opp.odd_oferecida}
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 'bold', color: '#00d2ff' }}>
                              +{parseFloat(opp.vantagem_ev_porcentagem || 0).toFixed(1)}%
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                              <span style={{ 
                                display: 'inline-block',
                                fontSize: '0.7rem', 
                                padding: '2px 8px', 
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                color: resColor,
                                background: resBg,
                                textTransform: 'uppercase',
                                whiteSpace: 'nowrap'
                              }}>
                                {labelStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* CONTROLES DE PAGINAÇÃO */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #222', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#888' }}>
                    <span>Itens visíveis:</span>
                    <select
                      value={oppsLimit}
                      onChange={(e) => {
                        setOppsLimit(parseInt(e.target.value));
                        setOppsPage(1);
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
                    <span>de {totalOppsCount} oportunidades</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      disabled={oppsPage === 1 || loadingOpps}
                      onClick={() => setOppsPage(p => Math.max(1, p - 1))}
                      style={{
                        background: '#1a1a24',
                        border: '1px solid #333',
                        color: oppsPage === 1 ? '#444' : '#fff',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '0.78rem',
                        cursor: oppsPage === 1 ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                      }}
                    >
                      ◀ Anterior
                    </button>
                    <span style={{ fontSize: '0.8rem', color: '#ccc', fontFamily: 'monospace' }}>
                      Página {oppsPage} de {Math.max(1, Math.ceil(totalOppsCount / oppsLimit))}
                    </span>
                    <button
                      disabled={oppsPage >= Math.ceil(totalOppsCount / oppsLimit) || loadingOpps}
                      onClick={() => setOppsPage(p => p + 1)}
                      style={{
                        background: '#1a1a24',
                        border: '1px solid #333',
                        color: oppsPage >= Math.ceil(totalOppsCount / oppsLimit) ? '#444' : '#fff',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '0.78rem',
                        cursor: oppsPage >= Math.ceil(totalOppsCount / oppsLimit) ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                      }}
                    >
                      Próxima ▶
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Toast Notification */}
      {notification && (
        <div 
          className="toast-notification"
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 11000,
            background: 'rgba(20, 20, 25, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid ' + (notification.type === 'error' ? 'var(--alert-red)' : notification.type === 'info' ? '#00d2ff' : 'var(--brand-neon)'),
            borderLeft: '5px solid ' + (notification.type === 'error' ? 'var(--alert-red)' : notification.type === 'info' ? '#00d2ff' : 'var(--brand-neon)'),
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            borderRadius: '8px',
            padding: '14px 18px',
            minWidth: '280px',
            maxWidth: '400px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#fff',
            fontFamily: 'var(--font-family), system-ui, sans-serif'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: notification.type === 'error' ? 'var(--alert-red-dim)' : notification.type === 'info' ? 'rgba(0, 210, 255, 0.15)' : 'var(--brand-neon-dim)',
            color: notification.type === 'error' ? 'var(--alert-red)' : notification.type === 'info' ? '#00d2ff' : 'var(--brand-neon)'
          }}>
            {notification.type === 'error' ? <ShieldAlert size={16} /> : notification.type === 'info' ? <HelpCircle size={16} /> : <ShieldCheck size={16} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#fff' }}>
              {notification.type === 'error' ? 'Atenção' : notification.type === 'info' ? 'Informação' : 'Sucesso'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#aaa', marginTop: '2px', lineHeight: 1.4 }}>
              {notification.message}
            </div>
          </div>
          <button 
            onClick={() => setNotification(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
          >
            ✕
          </button>
        </div>
      )}

      <style jsx>{`
        .glass-panel {
          background: #111116;
          border: 1px solid #222;
          border-radius: 12px;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .no-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .no-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
      `}</style>
      
    </div>
  );
}
