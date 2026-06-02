'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [userState, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  // Computa o usuário com role e plan dinâmicos em cada renderização
  const user = userState ? (() => {
    let adminEmails = [];
    if (typeof window !== 'undefined') {
      try {
        const savedAdmins = localStorage.getItem('ev_tracker_admin_emails');
        if (savedAdmins) {
          adminEmails = JSON.parse(savedAdmins);
        }
      } catch (e) {}
    }

    const isSuperAdmin = userState.email === 'a2soluntions@gmail.com';
    const isSubAdmin = adminEmails.includes(userState.email);
    
    let role = 'user';
    let plan = userState.plan || 'gratis';
    
    if (isSuperAdmin) {
      role = 'super_admin';
      plan = 'vitalicio';
    } else if (isSubAdmin) {
      role = 'admin';
    } else {
      role = userState.role || 'user';
    }

    return {
      ...userState,
      plan,
      role
    };
  })() : null;

  const setUser = (val) => {
    setUserState(val);
  };

  // Carregar sessão inicial
  useEffect(() => {
    async function loadSession() {
      // 1. Tentar Supabase Auth se ativo
      if (supabase) {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (!error && session?.user) {
            // Buscar perfil estendido ou criar mock
            const profile = await fetchOrCreateProfile(session.user);
            setUser(profile);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn("Supabase Auth falhou, usando LocalStorage fallback:", e);
        }
      }

      // 2. Fallback para LocalStorage
      const savedUser = localStorage.getItem('ev_tracker_user_session');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          console.error("Falha ao ler sessão local:", e);
        }
      }
      setLoading(false);
    }

    loadSession();
  }, []);

  // Monitorar mudanças de auth no Supabase
  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        const profile = await fetchOrCreateProfile(session.user);
        setUser(profile);
        localStorage.setItem('ev_tracker_user_session', JSON.stringify(profile));
        window.location.href = '/redefinir-senha';
        return;
      }
      if (session?.user) {
        const profile = await fetchOrCreateProfile(session.user);
        setUser(profile);
        localStorage.setItem('ev_tracker_user_session', JSON.stringify(profile));
      } else {
        setUser(null);
        localStorage.removeItem('ev_tracker_user_session');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Helper para buscar perfil ou gerar mock
  async function fetchOrCreateProfile(supabaseUser) {
    const metadata = supabaseUser.user_metadata || {};
    const createdAt = supabaseUser.created_at || new Date().toISOString();
    
    // Tenta ler plano salvo localmente para manter consistência
    const localPlanKey = `ev_tracker_plan_${supabaseUser.id}`;
    let savedPlan = localStorage.getItem(localPlanKey) || 'gratis';

    // Lista de administradores secundários cadastrados localmente
    let adminEmails = [];
    try {
      const savedAdmins = localStorage.getItem('ev_tracker_admin_emails');
      if (savedAdmins) {
        adminEmails = JSON.parse(savedAdmins);
      }
    } catch (e) {}

    const isSuperAdmin = supabaseUser.email === 'a2soluntions@gmail.com';
    const isSubAdmin = adminEmails.includes(supabaseUser.email);
    
    let role = 'user';
    if (isSuperAdmin) {
      role = 'super_admin';
      savedPlan = 'vitalicio';
    } else if (isSubAdmin) {
      role = 'admin';
    }

    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: metadata.name || supabaseUser.email.split('@')[0],
      plan: savedPlan, // 'gratis' | 'pro' | 'vip' | 'vitalicio'
      role: role,      // 'user' | 'admin' | 'super_admin'
      createdAt: createdAt
    };
  }

  // Ações de Autenticação
  const login = async (email, password, forceLocal = false) => {
    setLoading(true);
    if (supabase && !forceLocal) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data?.user) {
          const profile = await fetchOrCreateProfile(data.user);
          setUser(profile);
          localStorage.setItem('ev_tracker_user_session', JSON.stringify(profile));
        }
        setLoading(false);
        return { success: true };
      } catch (err) {
        console.warn("Login via Supabase falhou, tentando Mock local:", err.message);
      }
    }

    // Login Mock Fallback
    const localAccounts = JSON.parse(localStorage.getItem('ev_tracker_mock_accounts') || '[]');
    const existing = localAccounts.find(acc => acc.email === email && acc.password === password);
    
    if (existing) {
      const activeUser = {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        plan: existing.plan || 'gratis',
        createdAt: existing.createdAt
      };
      setUser(activeUser);
      localStorage.setItem('ev_tracker_user_session', JSON.stringify(activeUser));
      setLoading(false);
      return { success: true };
    } else {
      setLoading(false);
      return { success: false, error: 'Credenciais inválidas ou usuário não cadastrado localmente.' };
    }
  };

  const signUp = async (email, password, name, forceLocal = false) => {
    setLoading(true);
    const createdAt = new Date().toISOString();

    let supabaseUserId = null;
    let supabaseSuccess = false;
    let supabaseMsg = '';

    if (supabase && !forceLocal) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name }
          }
        });
        if (error) throw error;
        if (data?.user) {
          supabaseUserId = data.user.id;
          supabaseSuccess = true;
          supabaseMsg = 'Confirme seu e-mail cadastrado no Supabase.';
        }
      } catch (err) {
        console.warn("Cadastro via Supabase falhou, criando Mock local:", err.message);
      }
    }

    // ALWAYS save to Local Mock as fallback database
    const localAccounts = JSON.parse(localStorage.getItem('ev_tracker_mock_accounts') || '[]');
    const existingIndex = localAccounts.findIndex(acc => acc.email === email);
    
    const newMockUser = {
      id: supabaseUserId || 'mock_' + Math.random().toString(36).substr(2, 9),
      email,
      password,
      name,
      plan: 'gratis',
      createdAt
    };

    if (existingIndex === -1) {
      localAccounts.push(newMockUser);
      localStorage.setItem('ev_tracker_mock_accounts', JSON.stringify(localAccounts));
    } else {
      localAccounts[existingIndex].password = password;
      localAccounts[existingIndex].name = name;
      localStorage.setItem('ev_tracker_mock_accounts', JSON.stringify(localAccounts));
    }

    setUser(newMockUser);
    localStorage.setItem('ev_tracker_user_session', JSON.stringify(newMockUser));
    setLoading(false);
    return { success: true, message: supabaseSuccess ? supabaseMsg : null };
  };

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('ev_tracker_user_session');
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    if (supabase) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });
        if (error) throw error;
        return { success: true };
      } catch (err) {
        console.warn("Google Login via Supabase falhou, tentando Mock local:", err.message);
      }
    }

    const mockUser = {
      id: 'mock_google_' + Math.random().toString(36).substr(2, 9),
      email: 'usuario.google@gmail.com',
      name: 'Usuário Google (Mock)',
      plan: 'gratis',
      createdAt: new Date().toISOString()
    };
    setUser(mockUser);
    localStorage.setItem('ev_tracker_user_session', JSON.stringify(mockUser));
    setLoading(false);
    return { success: true };
  };

  const upgradePlan = (newPlan) => {
    if (!user) return;
    const updatedUser = { ...user, plan: newPlan };
    setUser(updatedUser);
    localStorage.setItem('ev_tracker_user_session', JSON.stringify(updatedUser));
    localStorage.setItem(`ev_tracker_plan_${user.id}`, newPlan);
    
    // Atualizar no banco mock se local
    const localAccounts = JSON.parse(localStorage.getItem('ev_tracker_mock_accounts') || '[]');
    const idx = localAccounts.findIndex(acc => acc.id == user.id);
    if (idx !== -1) {
      localAccounts[idx].plan = newPlan;
      localStorage.setItem('ev_tracker_mock_accounts', JSON.stringify(localAccounts));
    }
  };

  // Função auxiliar para simulação de testes (avançar tempo)
  const simulateExpiredTrial = () => {
    if (!user) return;
    // Setar cadastro para 8 dias atrás
    const date = new Date();
    date.setDate(date.getDate() - 8);
    const updated = { ...user, createdAt: date.toISOString() };
    setUser(updated);
    localStorage.setItem('ev_tracker_user_session', JSON.stringify(updated));
    
    // Atualizar no banco mock se local
    const localAccounts = JSON.parse(localStorage.getItem('ev_tracker_mock_accounts') || '[]');
    const idx = localAccounts.findIndex(acc => acc.id === user.id);
    if (idx !== -1) {
      localAccounts[idx].createdAt = date.toISOString();
      localStorage.setItem('ev_tracker_mock_accounts', JSON.stringify(localAccounts));
    }
  };

  // Cálculo de dias de trial restantes
  const getTrialDaysLeft = () => {
    if (!user || user.plan !== 'gratis') return 0;
    const createdDate = new Date(user.createdAt);
    const now = new Date();
    const diffTime = now.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const remaining = 7 - diffDays;
    return remaining < 0 ? 0 : remaining;
  };

  const isTrialActive = () => {
    if (!user) return false;
    if (user.plan === 'pro' || user.plan === 'vip') return true;
    return getTrialDaysLeft() > 0;
  };

  const updatePassword = async (newPassword) => {
    if (supabase) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { success: true };
    }

    // Mock update
    if (user) {
      const localAccounts = JSON.parse(localStorage.getItem('ev_tracker_mock_accounts') || '[]');
      const idx = localAccounts.findIndex(acc => acc.id === user.id);
      if (idx !== -1) {
        localAccounts[idx].password = newPassword;
        localStorage.setItem('ev_tracker_mock_accounts', JSON.stringify(localAccounts));
      }
      return { success: true };
    }
    throw new Error('Nenhum usuário logado.');
  };

  const value = {
    user,
    loading,
    login,
    signUp,
    logout,
    upgradePlan,
    getTrialDaysLeft,
    isTrialActive,
    simulateExpiredTrial,
    loginWithGoogle,
    updatePassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
