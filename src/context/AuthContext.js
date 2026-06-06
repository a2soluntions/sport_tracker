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
    let active = true;

    // Safety timeout to prevent infinite loading screen (e.g. if getSession hangs)
    const safetyTimeout = setTimeout(() => {
      if (active) {
        console.warn("[AuthContext] Timeout de segurança carregando sessão. Forçando carregamento do app.");
        try {
          const savedUser = localStorage.getItem('ev_tracker_user_session');
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
        } catch (err) {
          console.error("Falha ao ler sessão local no timeout:", err);
        }
        setLoading(false);
      }
    }, 4500);

    async function loadSession() {
      console.log("[AuthContext] loadSession iniciou");
      // 1. Tentar Supabase Auth se ativo
      if (supabase) {
        try {
          console.log("[AuthContext] getSession iniciando...");
          const { data: { session }, error } = await supabase.auth.getSession();
          console.log("[AuthContext] getSession finalizado, error:", error, "user:", session?.user?.email);
          if (active) {
            clearTimeout(safetyTimeout);
          }
          if (!error && session?.user) {
            // Buscar perfil estendido ou criar mock
            console.log("[AuthContext] Usuário logado encontrado via getSession. Carregando profile...");
            const profile = await fetchOrCreateProfile(session.user);
            console.log("[AuthContext] Profile carregado com sucesso:", profile.email);
            if (active) {
              setUser(profile);
              setLoading(false);
            }
            return;
          }
        } catch (e) {
          console.warn("Supabase Auth falhou, usando LocalStorage fallback:", e);
        }
      }

      // 2. Fallback para LocalStorage
      console.log("[AuthContext] Sem sessão ativa no Supabase, tentando fallback LocalStorage");
      const savedUser = localStorage.getItem('ev_tracker_user_session');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          console.log("[AuthContext] Usuário carregado do LocalStorage:", parsed.email);
          if (active) {
            setUser(parsed);
          }
        } catch (e) {
          console.error("Falha ao ler sessão local:", e);
        }
      }
      console.log("[AuthContext] loadSession encerrado (setLoading(false))");
      if (active) {
        clearTimeout(safetyTimeout);
        setLoading(false);
      }
    }

    loadSession();

    return () => {
      active = false;
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Monitorar mudanças de auth no Supabase
  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthContext] onAuthStateChange disparado, evento:", event, "user:", session?.user?.email);
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

  // Helper para buscar perfil do Supabase ou criar se não existir
  async function fetchOrCreateProfile(supabaseUser) {
    const metadata = supabaseUser.user_metadata || {};
    const createdAt = supabaseUser.created_at || new Date().toISOString();
    const userName = metadata.name || supabaseUser.email.split('@')[0];

    // Determinar role baseado no e-mail
    let adminEmails = [];
    try {
      const savedAdmins = localStorage.getItem('ev_tracker_admin_emails');
      if (savedAdmins) {
        adminEmails = JSON.parse(savedAdmins);
      }
    } catch (e) {}

    const isSuperAdmin = supabaseUser.email === 'a2soluntions@gmail.com';
    const isSubAdmin = adminEmails.includes(supabaseUser.email);
    let role = isSuperAdmin ? 'super_admin' : isSubAdmin ? 'admin' : 'user';

    // Tentar buscar perfil existente no Supabase
    let plan = 'gratis';
    let couponCode = null;
    if (supabase) {
      try {
        console.log("[AuthContext] fetchOrCreateProfile consultando banco para:", supabaseUser.id);
        const { data: existingProfile, error: selectError } = await supabase
          .from('profiles')
          .select('plan, role, name')
          .eq('id', supabaseUser.id)
          .maybeSingle();

        console.log("[AuthContext] fetchOrCreateProfile consulta finalizada, error:", selectError, "data:", existingProfile);
        if (!selectError && existingProfile) {
          // Perfil já existe — usar dados do Supabase
          plan = existingProfile.plan || 'gratis';
          // Super admin sempre vitalicio
          if (isSuperAdmin) plan = 'vitalicio';
          // Recuperar coupon_code do perfil
          couponCode = existingProfile.coupon_code || null;
        } else {
          // Perfil não existe — criar
          if (isSuperAdmin) plan = 'vitalicio';
          
          // Tentar migrar plano do localStorage (legado)
          const localPlanKey = `ev_tracker_plan_${supabaseUser.id}`;
          const localPlan = localStorage.getItem(localPlanKey);
          if (localPlan && localPlan !== 'gratis' && !isSuperAdmin) {
            plan = localPlan;
          }

          const { error: insertError } = await supabase
            .from('profiles')
            .upsert({
              id: supabaseUser.id,
              email: supabaseUser.email,
              name: userName,
              plan: plan,
              role: role,
              created_at: createdAt
            });
          if (insertError) {
            console.warn('Erro ao criar perfil no Supabase:', insertError.message);
          }
        }
      } catch (e) {
        console.warn('Erro ao acessar profiles no Supabase:', e);
        // Fallback: ler do localStorage
        const localPlanKey = `ev_tracker_plan_${supabaseUser.id}`;
        plan = localStorage.getItem(localPlanKey) || 'gratis';
        if (isSuperAdmin) plan = 'vitalicio';
      }
    } else {
      // Sem Supabase — fallback localStorage
      const localPlanKey = `ev_tracker_plan_${supabaseUser.id}`;
      plan = localStorage.getItem(localPlanKey) || 'gratis';
      if (isSuperAdmin) plan = 'vitalicio';
    }

    // Cache local
    localStorage.setItem(`ev_tracker_plan_${supabaseUser.id}`, plan);

    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: userName,
      plan: plan,
      role: role,
      coupon_code: couponCode,
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

  const upgradePlan = async (newPlan) => {
    if (!user) return;
    const updatedUser = { ...user, plan: newPlan };
    setUser(updatedUser);
    localStorage.setItem('ev_tracker_user_session', JSON.stringify(updatedUser));
    localStorage.setItem(`ev_tracker_plan_${user.id}`, newPlan);
    
    // Atualizar no Supabase profiles
    if (supabase) {
      try {
        await supabase
          .from('profiles')
          .update({ plan: newPlan })
          .eq('id', user.id);
      } catch (e) {
        console.warn('Erro ao atualizar plano no Supabase:', e);
      }
    }
    
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
    if (user.plan === 'pro' || user.plan === 'vip' || user.plan === 'vitalicio') return true;
    // Cupom de acesso total (100%) libera todas as funcionalidades
    if (user.coupon_code) return true;
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
