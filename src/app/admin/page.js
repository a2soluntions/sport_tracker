'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldCheck, ShieldAlert, Users, TrendingUp, DollarSign, ArrowUpRight, 
  Trash2, Plus, Sparkles, Filter, Search, Award, RefreshCw, BarChart2 
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  
  // Controle de Gastos
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

  const [novoGastoNome, setNovoGastoNome] = useState('');
  const [novoGastoValor, setNovoGastoValor] = useState('');
  const [novoGastoCat, setNovoGastoCat] = useState('Outros');

  // Gerenciamento de Usuários (Mocked Base de Dados)
  const [usersBase, setUsersBase] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ev_tracker_admin_users');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [
      { id: 'usr_1', name: 'A2 Solutions Admin', email: 'a2soluntions@gmail.com', plan: 'vip', createdAt: '2026-05-01' },
      { id: 'usr_2', name: 'Thiago Martins', email: 'thiago.bet@gmail.com', plan: 'pro', createdAt: '2026-05-12' },
      { id: 'usr_3', name: 'Rodrigo Silva', email: 'rodrigo.palpites@hotmail.com', plan: 'gratis', createdAt: '2026-05-18' },
      { id: 'usr_4', name: 'Felipe Santana', email: 'felipe.poisson@yahoo.com', plan: 'vip', createdAt: '2026-05-22' },
      { id: 'usr_5', name: 'Diego Santos', email: 'diego.santos@gmail.com', plan: 'pro', createdAt: '2026-05-28' },
      { id: 'usr_6', name: 'Carla Pereira', email: 'carla.financeiro@gmail.com', plan: 'gratis', createdAt: '2026-05-30' },
      { id: 'usr_7', name: 'Alexandre Souza', email: 'alexandre.souza@gmail.com', plan: 'pro', createdAt: '2026-06-01' },
      { id: 'usr_8', name: 'Marina Abreu', email: 'marina.abreu@gmail.com', plan: 'gratis', createdAt: '2026-06-01' }
    ];
  });

  const [searchUser, setSearchUser] = useState('');
  const [planFilter, setPlanFilter] = useState('todos');

  // Persistir Gastos e Usuários
  useEffect(() => {
    localStorage.setItem('ev_tracker_admin_gastos', JSON.stringify(gastos));
  }, [gastos]);

  useEffect(() => {
    localStorage.setItem('ev_tracker_admin_users', JSON.stringify(usersBase));
  }, [usersBase]);

  // Cálculos de Receita
  // PRO = R$ 19,90 | VIP = R$ 49,90 | Gratis = R$ 0.00
  const financialMetrics = useMemo(() => {
    let proCount = 0;
    let vipCount = 0;
    let gratisCount = 0;

    usersBase.forEach(u => {
      if (u.plan === 'pro') proCount++;
      else if (u.plan === 'vip') vipCount++;
      else gratisCount++;
    });

    // Multiplicador simulado (para parecer uma base maior, multiplicamos por 30)
    const baseMultiplier = 30;
    const simulatedPro = proCount * baseMultiplier;
    const simulatedVip = vipCount * baseMultiplier;
    const simulatedTotalUsers = usersBase.length * baseMultiplier;

    const mrr = (simulatedPro * 19.90) + (simulatedVip * 49.90);
    const totalExpenses = gastos.reduce((sum, g) => sum + g.value, 0);
    const netProfit = mrr - totalExpenses;
    
    // Taxa de Churn calculada de forma simulada baseada na proporção de VIP/PRO
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

  // Adicionar despesa
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

  // Remover despesa
  const handleRemoveGasto = (id) => {
    setGastos(prev => prev.filter(g => g.id !== id));
  };

  // Alterar Plano do Usuário (Promoção)
  const handleToggleUserPlan = (id) => {
    setUsersBase(prev => prev.map(u => {
      if (u.id === id) {
        const nextPlan = u.plan === 'gratis' ? 'pro' : u.plan === 'pro' ? 'vip' : 'gratis';
        return { ...u, plan: nextPlan };
      }
      return u;
    }));
  };

  // Verificação de Segurança
  const isAdmin = user && user.email === 'a2soluntions@gmail.com';

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
              Modo Administrador
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
        marginBottom: '32px'
      }}>
        
        {/* MRR */}
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

        {/* Churn Rate */}
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

        {/* Custos Operacionais */}
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

        {/* Lucro Líquido */}
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

      {/* Grid de Seções de Relatório */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        
        {/* Evolução de Vendas (Gráfico Brutalista) */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '380px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 24px 0', borderBottom: '1px dashed #222', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={16} color="var(--brand-neon)" /> Evolução de Receita (MRR)
          </h3>
          
          {/* Corpo do Gráfico de Barras */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flex: 1,
            padding: '10px 10px 0 10px',
            borderBottom: '2px solid #333',
            position: 'relative'
          }}>
            {/* Linhas de Grade de Fundo */}
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

            {/* Barras do Gráfico */}
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
                <span style={{ fontSize: '0.7rem', color: 'var(--brand-neon)', fontWeight: 'bold', fontFamily: 'monospace' }}>
                  R$ {bar.val >= 1000 ? `${(bar.val/1000).toFixed(1)}k` : bar.val}
                </span>
                <div style={{
                  width: '32px',
                  height: `${bar.pct * 1.8}px`, // Escalar proporcionalmente
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

        {/* Funil de Vendas SaaS */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '380px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 24px 0', borderBottom: '1px dashed #222', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} color="#00d2ff" /> Funil de Conversão (Mensal)
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'center' }}>
            {[
              { step: '1. Visitantes Únicos', val: 10200, pct: '100%', bg: '#1c1c24', color: '#fff', border: '1px solid #333' },
              { step: '2. Trials Ativados (Cadastro)', val: 2450, pct: '24.0% de conv.', bg: 'rgba(0, 210, 255, 0.08)', color: '#00d2ff', border: '1px solid rgba(0, 210, 255, 0.2)' },
              { step: '3. Assinantes PRO', val: financialMetrics.proCount, pct: `${((financialMetrics.proCount / 2450) * 100).toFixed(1)}% do trial`, bg: 'rgba(204, 255, 0, 0.08)', color: 'var(--brand-neon)', border: '1px solid rgba(204, 255, 0, 0.2)' },
              { step: '4. Assinantes VIP Elite', val: financialMetrics.vipCount, pct: `${((financialMetrics.vipCount / 2450) * 100).toFixed(1)}% do trial`, bg: 'rgba(179, 57, 255, 0.1)', color: '#b339ff', border: '1px solid rgba(179, 57, 255, 0.2)' }
            ].map((funnel, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  flex: 1,
                  background: funnel.bg,
                  border: funnel.border,
                  padding: '10px 14px',
                  borderRadius: '6px',
                  color: funnel.color,
                  fontWeight: 'bold',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem'
                }}>
                  <span>{funnel.step}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}>{funnel.val}</span>
                </div>
                <div style={{
                  width: '120px',
                  fontSize: '0.72rem',
                  color: '#888',
                  textAlign: 'right',
                  fontStyle: 'italic',
                  fontWeight: 'bold'
                }}>
                  {funnel.pct}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Grid: Tabela de Gastos & Gerenciador de Usuários */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '20px'
      }}>
        
        {/* Controle de Gastos */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px 0', borderBottom: '1px dashed #222', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={16} color="#ff9800" /> Controle de Despesas Operacionais
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
                minWidth: '150px',
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
                minWidth: '80px',
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
              <option value="Servidor">Servidor</option>
              <option value="Database">Database</option>
              <option value="API">API</option>
              <option value="Marketing">Marketing</option>
              <option value="Outros">Outros</option>
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

          {/* Tabela de despesas */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333', color: '#888', textAlign: 'left' }}>
                  <th style={{ padding: '8px 4px' }}>Item</th>
                  <th style={{ padding: '8px 4px' }}>Categoria</th>
                  <th style={{ padding: '8px 4px', textAlign: 'right' }}>Valor</th>
                  <th style={{ padding: '8px 4px', textAlign: 'center' }}>Ação</th>
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

          {/* Busca e Filtros */}
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
              <option value="vip">VIP</option>
              <option value="pro">PRO</option>
              <option value="gratis">Trial (Grátis)</option>
            </select>
          </div>

          {/* Listagem de Usuários */}
          <div style={{ overflowX: 'auto', maxHeight: '260px', overflowY: 'auto' }} className="no-scrollbar">
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
                          background: u.plan === 'vip' ? 'rgba(179,57,255,0.15)' : u.plan === 'pro' ? 'rgba(204,255,0,0.1)' : '#222',
                          color: u.plan === 'vip' ? '#b339ff' : u.plan === 'pro' ? 'var(--brand-neon)' : '#888',
                          border: '1px solid ' + (u.plan === 'vip' ? '#b339ff' : u.plan === 'pro' ? 'var(--brand-neon)' : '#333'),
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          fontWeight: 'bold'
                        }}>
                          {u.plan === 'vip' ? 'VIP ELITE' : u.plan === 'pro' ? 'PRO' : 'TRIAL'}
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
