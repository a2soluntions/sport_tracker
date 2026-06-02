'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldCheck, ShieldAlert, Users, TrendingUp, DollarSign, ArrowUpRight, 
  Trash2, Plus, Sparkles, Filter, Search, Award, RefreshCw, BarChart2,
  Settings, Key, Tag, Layers, HelpCircle, Edit
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'finance' | 'settings'

  // --- ESTADOS PERSISTIDOS EM LOCALSTORAGE ---
  
  // 1. Controle de Gastos
  const [gastos, setGastos] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ev_tracker_admin_gastos');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [
      { id: 1, name: 'API-Football (api-sports.io)', value: 450.00, category: 'API' },
      { id: 2, name: 'Supabase Database & Auth', value: 150.00, category: 'Database' },
      { id: 3, name: 'Vercel Serverless Hosting', value: 100.00, category: 'Hosting' },
      { id: 4, name: 'Telegram Bot (VPS)', value: 50.00, category: 'Server' },
      { id: 5, name: 'Marketing & Anúncios (Meta/Google)', value: 1200.00, category: 'Marketing' }
    ];
  });

  // 2. Base de Usuários (Simulação)
  const [usersBase, setUsersBase] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ev_tracker_admin_users');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [
      { id: 'usr_1', name: 'A2 Solutions Admin', email: 'a2soluntions@gmail.com', plan: 'vitalicio', createdAt: '2026-05-01' },
      { id: 'usr_2', name: 'Thiago Martins', email: 'thiago.bet@gmail.com', plan: 'pro', createdAt: '2026-05-12' },
      { id: 'usr_3', name: 'Rodrigo Silva', email: 'rodrigo.palpites@hotmail.com', plan: 'gratis', createdAt: '2026-05-18' },
      { id: 'usr_4', name: 'Felipe Santana', email: 'felipe.poisson@yahoo.com', plan: 'vip', createdAt: '2026-05-22' },
      { id: 'usr_5', name: 'Diego Santos', email: 'diego.santos@gmail.com', plan: 'pro', createdAt: '2026-05-28' },
      { id: 'usr_6', name: 'Carla Pereira', email: 'carla.financeiro@gmail.com', plan: 'gratis', createdAt: '2026-05-30' },
      { id: 'usr_7', name: 'Alexandre Souza', email: 'alexandre.souza@gmail.com', plan: 'pro', createdAt: '2026-06-01' },
      { id: 'usr_8', name: 'Marina Abreu', email: 'marina.abreu@gmail.com', plan: 'gratis', createdAt: '2026-06-01' }
    ];
  });

  // 3. Sub-Administradores autorizados
  const [subAdmins, setSubAdmins] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ev_tracker_admin_emails');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return ['admin.suporte@gmail.com', 'parceiro.a2@gmail.com'];
  });

  // 4. Categorias Futuras
  const [categorias, setCategorias] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ev_tracker_admin_categorias');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [
      { id: 1, name: 'Basquete NBA (Poisson)', description: 'Alertas de Handicap e Over/Under para NBA.', active: true },
      { id: 2, name: 'E-sports (Counter-Strike/LoL)', description: 'True Odds de vencedor e total de mapas.', active: false },
      { id: 3, name: 'Mercado de Cartões (Poisson Live)', description: 'Sinais +EV ao vivo para cartões amarelos.', active: true },
      { id: 4, name: 'WhatsApp Push Notifications', description: 'Disparo de oportunidades diretamente no celular.', active: true }
    ];
  });

  // 5. Cupons de Promoção
  const [cupons, setCupons] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ev_tracker_admin_cupons');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [
      { id: 1, code: 'BRUTAL20', discount: 20, description: '20% OFF na primeira mensalidade do plano PRO/VIP' },
      { id: 2, code: 'VIPFIRST', discount: 40, description: '40% OFF no primeiro mês do plano VIP' },
      { id: 3, code: 'A2SOLUTIONS', discount: 100, description: 'Acesso vitalício gratuito para parceiros' }
    ];
  });

  // 6. Categorias de Gastos/Despesas
  const [gastosCategorias, setGastosCategorias] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ev_tracker_admin_gastos_categorias');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return ['Servidor', 'Database', 'API', 'Marketing', 'Outros'];
  });

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
  const [novoGastoCat, setNovoGastoCat] = useState(() => {
    return gastosCategorias && gastosCategorias.length > 0 ? gastosCategorias[0] : 'Outros';
  });

  const [searchUser, setSearchUser] = useState('');
  const [planFilter, setPlanFilter] = useState('todos');

  const [novoAdminEmail, setNovoAdminEmail] = useState('');
  const [novaCatNome, setNovaCatNome] = useState('');
  const [novaCatDesc, setNovaCatDesc] = useState('');

  const [novoCupomCode, setNovoCupomCode] = useState('');
  const [novoCupomDesc, setNovoCupomDesc] = useState('');
  const [novoCupomDisc, setNovoCupomDisc] = useState('');

  // Persistir Estados
  useEffect(() => {
    localStorage.setItem('ev_tracker_admin_gastos', JSON.stringify(gastos));
  }, [gastos]);

  useEffect(() => {
    localStorage.setItem('ev_tracker_admin_gastos_categorias', JSON.stringify(gastosCategorias));
  }, [gastosCategorias]);

  useEffect(() => {
    localStorage.setItem('ev_tracker_admin_users', JSON.stringify(usersBase));
  }, [usersBase]);

  useEffect(() => {
    localStorage.setItem('ev_tracker_admin_emails', JSON.stringify(subAdmins));
  }, [subAdmins]);

  useEffect(() => {
    localStorage.setItem('ev_tracker_admin_categorias', JSON.stringify(categorias));
  }, [categorias]);

  useEffect(() => {
    localStorage.setItem('ev_tracker_admin_cupons', JSON.stringify(cupons));
  }, [cupons]);

  // --- CÁLCULO DE MÉTRICAS SaaS ---
  const financialMetrics = useMemo(() => {
    let proCount = 0;
    let vipCount = 0;
    let gratisCount = 0;

    usersBase.forEach(u => {
      if (u.plan === 'pro') proCount++;
      else if (u.plan === 'vip' || u.plan === 'vitalicio') vipCount++;
      else gratisCount++;
    });

    const baseMultiplier = 30;
    const simulatedPro = proCount * baseMultiplier;
    const simulatedVip = vipCount * baseMultiplier;
    const simulatedTotalUsers = usersBase.length * baseMultiplier;

    const mrr = (simulatedPro * 19.90) + (simulatedVip * 49.90);
    const totalExpenses = gastos.reduce((sum, g) => sum + g.value, 0);
    const netProfit = mrr - totalExpenses;
    const baseChurn = 2.4; 
    const dynamicChurn = Math.max(1.2, parseFloat((baseChurn + (totalExpenses / 5000) - (simulatedVip / 500)).toFixed(1)));

    return {
      mrr,
      expenses: totalExpenses,
      profit: netProfit,
      churn: dynamicChurn,
      proCount: simulatedPro,
      vipCount: simulatedVip,
      totalUsers: simulatedTotalUsers
    };
  }, [usersBase, gastos]);

  // Filtragem de Usuários
  const filteredUsers = useMemo(() => {
    return usersBase.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(searchUser.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchUser.toLowerCase());
      const matchPlan = planFilter === 'todos' || u.plan === planFilter;
      return matchSearch && matchPlan;
    });
  }, [usersBase, searchUser, planFilter]);

  // --- MANIPULADORES DE SUB-ADMINS ---
  const handleAddAdmin = (e) => {
    e.preventDefault();
    if (!novoAdminEmail || !novoAdminEmail.includes('@')) return;
    const email = novoAdminEmail.trim().toLowerCase();
    if (subAdmins.includes(email) || email === 'a2soluntions@gmail.com') return;

    setSubAdmins(prev => [...prev, email]);
    setNovoAdminEmail('');
  };

  const handleRemoveAdmin = (email) => {
    setSubAdmins(prev => prev.filter(adm => adm !== email));
  };

  // --- MANIPULADORES DE CATEGORIAS ---
  const handleAddCategoria = (e) => {
    e.preventDefault();
    if (!novaCatNome) return;

    const newCat = {
      id: Date.now(),
      name: novaCatNome.trim(),
      description: novaCatDesc.trim() || 'Sem descrição cadastrada.',
      active: true
    };

    setCategorias(prev => [...prev, newCat]);
    setNovaCatNome('');
    setNovaCatDesc('');
  };

  const handleToggleCategoria = (id) => {
    setCategorias(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };

  const handleRemoveCategoria = (id) => {
    setCategorias(prev => prev.filter(c => c.id !== id));
  };

  // --- MANIPULADORES DE CUPONS ---
  const handleAddCupom = (e) => {
    e.preventDefault();
    if (!novoCupomCode || !novoCupomDisc || isNaN(parseInt(novoCupomDisc))) return;

    const newCup = {
      id: Date.now(),
      code: novoCupomCode.trim().toUpperCase(),
      discount: parseInt(novoCupomDisc),
      description: novoCupomDesc.trim() || 'Sem descrição.'
    };

    setCupons(prev => [...prev, newCup]);
    setNovoCupomCode('');
    setNovoCupomDisc('');
    setNovoCupomDesc('');
  };

  const handleRemoveCupom = (id) => {
    setCupons(prev => prev.filter(c => c.id !== id));
  };

  // --- OUTROS DIRETOS ---
  const handleAddGasto = (e) => {
    e.preventDefault();
    if (!novoGastoNome || !novoGastoValor || isNaN(parseFloat(novoGastoValor))) return;
    
    const newG = {
      id: Date.now(),
      name: novoGastoNome.trim(),
      value: parseFloat(novoGastoValor),
      category: novoGastoCat
    };

    setGastos(prev => [...prev, newG]);
    setNovoGastoNome('');
    setNovoGastoValor('');
  };

  const handleRemoveGasto = (id) => {
    setGastos(prev => prev.filter(g => g.id !== id));
  };

  const handleUpdateGasto = (e) => {
    e.preventDefault();
    if (!editingExpense || !editExpenseName || !editExpenseValue || isNaN(parseFloat(editExpenseValue))) return;

    const updated = {
      ...editingExpense,
      name: editExpenseName.trim(),
      value: parseFloat(editExpenseValue),
      category: editExpenseCategory
    };

    setGastos(prev => prev.map(g => g.id === editingExpense.id ? updated : g));
    setShowEditExpenseModal(false);
    setEditingExpense(null);
  };

  const handleAddGastoCategory = (e) => {
    e.preventDefault();
    if (!newExpenseCatName) return;
    const clean = newExpenseCatName.trim();
    if (gastosCategorias.includes(clean)) return;
    setGastosCategorias(prev => [...prev, clean]);
    setNewExpenseCatName('');
  };

  const handleRemoveGastoCategory = (catName) => {
    if (catName === 'Outros') return;
    setGastosCategorias(prev => prev.filter(c => c !== catName));
    setGastos(prev => prev.map(g => g.category === catName ? { ...g, category: 'Outros' } : g));
  };

  const handleSaveGastoCategoryName = (index, newName) => {
    if (!newName) return;
    const clean = newName.trim();
    const oldName = gastosCategorias[index];
    if (oldName === 'Outros') return;
    if (gastosCategorias.includes(clean) && clean !== oldName) return;

    setGastosCategorias(prev => prev.map((c, i) => i === index ? clean : c));
    setGastos(prev => prev.map(g => g.category === oldName ? { ...g, category: clean } : g));
    setEditingExpenseCatIndex(null);
    setEditingExpenseCatName('');
  };

  const handleToggleUserPlan = (id) => {
    setUsersBase(prev => prev.map(u => {
      if (u.id === id) {
        const nextPlan = u.plan === 'gratis' ? 'pro' : u.plan === 'pro' ? 'vip' : u.plan === 'vip' ? 'vitalicio' : 'gratis';
        return { ...u, plan: nextPlan };
      }
      return u;
    }));
  };

  // Verificação de Segurança (Super Admin ou Admin Secundário)
  const isSuperAdmin = user && user.email === 'a2soluntions@gmail.com';
  const isSubAdmin = user && subAdmins.includes(user.email);
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

  if (!isAdmin) {
    return (
      <div style={{
        maxWidth: '550px',
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
                    val: '10.200', 
                    subtext: '100% de tráfego',
                    width: '320px', 
                    polygon: 'polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)',
                    bg: 'linear-gradient(90deg, #1c1c24, #2d2d38)',
                    color: '#fff'
                  },
                  { 
                    label: '2. Trials Ativados', 
                    val: '2.450', 
                    subtext: '24% conversão',
                    width: '272px', // 85% de 320
                    polygon: 'polygon(0% 0%, 100% 0%, 82% 100%, 18% 100%)',
                    bg: 'linear-gradient(90deg, rgba(0,210,255,0.15), rgba(0,150,220,0.3))',
                    color: '#00d2ff'
                  },
                  { 
                    label: '3. Assinantes PRO', 
                    val: String(financialMetrics.proCount), 
                    subtext: `${((financialMetrics.proCount/2450)*100).toFixed(1)}% do trial`,
                    width: '223px', // 82% de 272
                    polygon: 'polygon(0% 0%, 100% 0%, 78% 100%, 22% 100%)',
                    bg: 'linear-gradient(90deg, rgba(204,255,0,0.15), rgba(150,200,0,0.3))',
                    color: 'var(--brand-neon)'
                  },
                  { 
                    label: '4. Assinantes VIP Elite', 
                    val: String(financialMetrics.vipCount), 
                    subtext: `${((financialMetrics.vipCount/2450)*100).toFixed(1)}% do trial`,
                    width: '174px', // 78% de 223
                    polygon: 'polygon(0% 0%, 100% 0%, 50% 100%, 50% 100%)', // Triângulo invertido!
                    bg: 'linear-gradient(to bottom, rgba(179,57,255,0.2), rgba(100,20,150,0.45))',
                    color: '#b339ff',
                    height: '60px' // Um pouco mais alto para o triângulo fechar legal
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
                      justifyContent: 'center',
                      color: level.color,
                      fontSize: '0.78rem',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                      padding: '2px 20px',
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
                        R$ {g.value.toFixed(2)}
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

            <div style={{ overflowX: 'auto', maxHeight: '270px', overflowY: 'auto' }} className="no-scrollbar">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333', color: '#888', textAlign: 'left' }}>
                    <th style={{ padding: '8px 4px' }}>Nome / E-mail</th>
                    <th style={{ padding: '8px 4px' }}>Plano</th>
                    <th style={{ padding: '8px 4px', textAlign: 'center' }}>Promover</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '10px 4px' }}>
                          <div style={{ fontWeight: 'bold' }}>{u.name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '2px' }}>{u.email}</div>
                        </td>
                        <td style={{ padding: '10px 4px' }}>
                          <span style={{
                            background: u.plan === 'vitalicio' ? 'rgba(204,255,0,0.15)' : u.plan === 'vip' ? 'rgba(179,57,255,0.15)' : u.plan === 'pro' ? 'rgba(204,255,0,0.1)' : '#222',
                            color: u.plan === 'vitalicio' ? 'var(--brand-neon)' : u.plan === 'vip' ? '#b339ff' : u.plan === 'pro' ? 'var(--brand-neon)' : '#888',
                            border: '1px solid ' + (u.plan === 'vitalicio' ? 'var(--brand-neon)' : u.plan === 'vip' ? '#b339ff' : u.plan === 'pro' ? 'var(--brand-neon)' : '#333'),
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 'bold'
                          }}>
                            {u.plan === 'vitalicio' ? 'VITALÍCIO' : u.plan === 'vip' ? 'VIP ELITE' : u.plan === 'pro' ? 'PRO' : 'TRIAL'}
                          </span>
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
                    ))
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

      <style jsx>{`
        .glass-panel {
          background: #111116;
          border: 1px solid #222;
          border-radius: 12px;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
        }
        
        .spin {
          animation: spin 1s linear infinite;
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
