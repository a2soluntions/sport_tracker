'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { 
  ShieldCheck, ShieldAlert, Users, TrendingUp, DollarSign, ArrowUpRight, 
  Trash2, Plus, Sparkles, Filter, Search, Award, RefreshCw, BarChart2,
  Settings, Key, Tag, Layers, HelpCircle, Edit
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'finance' | 'settings'

  // Helper para requisições administrativas anexando token de autorização
  const adminFetch = async (url, options = {}) => {
    console.log("[AdminDashboard adminFetch] Interceptando:", url, "method:", options.method || 'GET');
    if (typeof url === 'string' && url.startsWith('/api/admin')) {
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

        if (resUsers.ok) {
          const data = await resUsers.json();
          setUsersBase(data.users || []);
        }
        if (resExpenses.ok) {
          const data = await resExpenses.json();
          setGastos(data.expenses || []);
        }
        if (resCoupons.ok) {
          const data = await resCoupons.json();
          setCupons(data.coupons || []);
        }
        if (resFeatures.ok) {
          const data = await resFeatures.json();
          setCategorias(data.features || []);
        }
        if (resSettings.ok) {
          const data = await resSettings.json();
          const settings = data.settings || {};
          setSubAdmins(settings.sub_admins || []);
          setGastosCategorias(settings.expense_categories || []);
          if (settings.expense_categories && settings.expense_categories.length > 0) {
            setNovoGastoCat(settings.expense_categories[0]);
          }
          setFunnelMetrics({
            visitors: settings.visitors_count !== undefined ? settings.visitors_count : 10200,
            trials: settings.trial_count !== undefined ? settings.trial_count : 2450
          });
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

    usersBase.forEach(u => {
      // Usuários com cupom aplicado não geram receita
      if (u.coupon_code) {
        couponCount++;
        return;
      }
      if (u.plan === 'pro') proCount++;
      else if (u.plan === 'vip' || u.plan === 'vitalicio') vipCount++;
      else gratisCount++;
    });

    const mrr = (proCount * 19.90) + (vipCount * 49.90);
    const totalExpenses = gastos.reduce((sum, g) => sum + parseFloat(g.value || 0), 0);
    const netProfit = mrr - totalExpenses;
    const baseChurn = 2.4; 
    const dynamicChurn = Math.max(1.2, parseFloat((baseChurn + (totalExpenses / 5000) - (vipCount / 500)).toFixed(1)));

    return {
      mrr,
      expenses: totalExpenses,
      profit: netProfit,
      churn: dynamicChurn,
      proCount,
      vipCount,
      couponCount,
      totalUsers: usersBase.length
    };
  }, [usersBase, gastos]);

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
        throw new Error('Falha ao atualizar plano');
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

      if (!res.ok) throw new Error('Falha ao aplicar cupom');
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
          <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '8px', display: 'flex', gap: '10px' }}>
            <span>PRO: <strong>{financialMetrics.proCount}</strong></span>
            <span>•</span>
            <span>VIP: <strong>{financialMetrics.vipCount}</strong></span>
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
            Margem de Lucro: {((financialMetrics.profit / (financialMetrics.mrr || 1)) * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Navegação por Abas (Tab Selector) */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #222', paddingBottom: '8px' }}>
        {[
          { id: 'dashboard', name: 'Dashboard Geral', icon: BarChart2 },
          { id: 'finance', name: 'Gastos & Clientes', icon: Users },
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
                  { label: 'Jan', val: 8100, pct: 64 },
                  { label: 'Fev', val: 9300, pct: 73 },
                  { label: 'Mar', val: 10200, pct: 81 },
                  { label: 'Abr', val: 11100, pct: 88 },
                  { label: 'Mai', val: 12100, pct: 96 },
                  { label: 'Jun', val: Math.round(financialMetrics.mrr), pct: 100 }
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
                      
                      return (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '10px 4px' }}>
                          <div style={{ fontWeight: 'bold' }}>{u.name}</div>
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

            {/* 4. Métricas do Funil do SaaS */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px 0', borderBottom: '1px dashed #222', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={16} color="#00d2ff" /> Tráfego & Funil do SaaS
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#888', lineHeight: 1.4, marginBottom: '16px' }}>
                Ajuste os números globais de visitas e trials convertidos exibidos no funil de vendas do painel geral.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>Visitantes Únicos</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="number"
                      value={funnelMetrics.visitors}
                      onChange={(e) => setFunnelMetrics(prev => ({ ...prev, visitors: parseInt(e.target.value) || 0 }))}
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
                    <button 
                      onClick={async () => {
                        try {
                          const res = await adminFetch('/api/admin/settings', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ key: 'visitors_count', value: funnelMetrics.visitors })
                          });
                          if (res.ok) {
                            showNotification('Métrica de visitantes atualizada no banco!');
                          } else {
                            showNotification('Erro ao atualizar métrica', 'error');
                          }
                        } catch (err) {
                          console.error(err);
                          showNotification('Erro ao atualizar métrica de visitantes: ' + err.message, 'error');
                        }
                      }}
                      style={{
                        background: '#00d2ff',
                        color: '#000',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.82rem'
                      }}
                    >
                      Salvar
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>Trials Ativados</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="number"
                      value={funnelMetrics.trials}
                      onChange={(e) => setFunnelMetrics(prev => ({ ...prev, trials: parseInt(e.target.value) || 0 }))}
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
                    <button 
                      onClick={async () => {
                        try {
                          const res = await adminFetch('/api/admin/settings', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ key: 'trial_count', value: funnelMetrics.trials })
                          });
                          if (res.ok) {
                            showNotification('Métrica de trials atualizada no banco!');
                          } else {
                            showNotification('Erro ao atualizar métrica', 'error');
                          }
                        } catch (err) {
                          console.error(err);
                          showNotification('Erro ao atualizar métrica de trials: ' + err.message, 'error');
                        }
                      }}
                      style={{
                        background: '#00d2ff',
                        color: '#000',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.82rem'
                      }}
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
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
