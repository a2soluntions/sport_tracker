'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Zap, Mail, Lock, User, ArrowRight, ShieldAlert, Loader2, Play, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, signUp, loginWithGoogle, loading: authLoading } = useAuth();
  
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isOver18, setIsOver18] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (user) {
      const searchParams = new URLSearchParams(window.location.search);
      const redirect = searchParams.get('redirect') || '/dashboard';
      router.push(redirect);
    }
  }, [user, router]);

  // Checar se deve abrir diretamente na tela de cadastro
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('register') === 'true') {
      setIsRegister(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    if (!email || !password) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      setLoading(false);
      return;
    }

    if (isRegister && !name) {
      setError('Por favor, insira o seu nome.');
      setLoading(false);
      return;
    }

    if (isRegister) {
      if (!isOver18) {
        setError('Você precisa confirmar que é maior de 18 anos.');
        setLoading(false);
        return;
      }
      if (!acceptTerms) {
        setError('Você precisa aceitar os Termos de Uso e Políticas de Privacidade (LGPD).');
        setLoading(false);
        return;
      }
    }

    try {
      if (isRegister) {
        const res = await signUp(email, password, name);
        if (res.success) {
          setSuccessMsg(res.message || 'Cadastro realizado com sucesso! Entrando...');
          setTimeout(() => {
            const searchParams = new URLSearchParams(window.location.search);
            const redirect = searchParams.get('redirect') || '/dashboard';
            router.push(redirect);
          }, 2000);
        } else {
          setError(res.error || 'Falha no cadastro.');
        }
      } else {
        const res = await login(email, password);
        if (res.success) {
          const searchParams = new URLSearchParams(window.location.search);
          const redirect = searchParams.get('redirect') || '/dashboard';
          router.push(redirect);
        } else {
          setError(res.error || 'Credenciais inválidas.');
        }
      }
    } catch (err) {
      setError('Ocorreu um erro no servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    if (!email) {
      setError('Por favor, insira o seu e-mail.');
      setLoading(false);
      return;
    }

    try {
      if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });
        if (error) throw error;
        setSuccessMsg('Um link de redefinição de senha foi enviado para o seu e-mail.');
      } else {
        setSuccessMsg('E-mail de recuperação de senha enviado com sucesso!');
      }
    } catch (err) {
      setError(err.message || 'Falha ao enviar e-mail de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setError('');
    setLoading(true);
    try {
      const demoEmail = 'demo@a2sporttrackers.com';
      const demoPassword = 'demopassword123';
      const demoName = 'Investidor PRO (Demo)';

      await signUp(demoEmail, demoPassword, demoName, true);
      await login(demoEmail, demoPassword, true);
      const searchParams = new URLSearchParams(window.location.search);
      const redirect = searchParams.get('redirect') || '/dashboard';
      router.push(redirect);
    } catch (err) {
      setError('Não foi possível inicializar a demonstração.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#09090b', color: 'var(--brand-neon)' }}>
        <Loader2 className="spin" size={40} />
        <span style={{ marginTop: '16px', fontWeight: 'bold', fontFamily: 'monospace' }}>CARREGANDO SEGURANÇA...</span>
      </div>
    );
  }

  // RECUPERAÇÃO DE SENHA
  if (isForgotPassword) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#09090b',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
        padding: '20px'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '40px',
          maxWidth: '460px',
          width: '100%',
          background: '#111115',
          border: '1px solid #222',
          borderRadius: '12px',
          zIndex: 2
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
            <div style={{ background: 'var(--brand-neon)', padding: '8px', borderRadius: '8px', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={24} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.5px' }}>a2sport<span style={{ color: 'var(--brand-neon)' }}>trackers</span></span>
          </div>

          <h2 style={{ fontSize: '2.0rem', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
            Recuperar Senha
          </h2>
          <p style={{ color: '#888', fontSize: '0.95rem', marginBottom: '32px' }}>
            Insira o seu e-mail cadastrado e enviaremos as instruções para redefinir sua senha.
          </p>

          {error && (
            <div style={{
              background: 'rgba(255, 68, 68, 0.1)',
              border: '1px solid #ff4444',
              color: '#ff4444',
              padding: '14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShieldAlert size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              background: 'rgba(76, 175, 80, 0.1)',
              border: '1px solid #4CAF50',
              color: '#4CAF50',
              padding: '14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '20px'
            }}>
              {successMsg}
            </div>
          )}

          <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.78rem', color: '#888', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>E-mail</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                <input 
                  type="email" 
                  placeholder="nome@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    background: '#141416',
                    border: '1px solid #222',
                    borderRadius: '8px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--brand-neon)'}
                  onBlur={(e) => e.target.style.borderColor = '#222'}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'var(--brand-neon)',
                color: '#000',
                border: 'none',
                padding: '14px',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '0.95rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(204, 255, 0, 0.15)',
                marginTop: '10px',
                transition: 'all 0.2s'
              }}
            >
              {loading ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <>
                  <span>Enviar Chave de Recuperação</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <button 
            onClick={() => {
              setIsForgotPassword(false);
              setError('');
              setSuccessMsg('');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--brand-neon)',
              fontWeight: 'bold',
              cursor: 'pointer',
              textDecoration: 'underline',
              marginTop: '30px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={16} />
            <span>Voltar para o Login</span>
          </button>
        </div>
      </div>
    );
  }

  // DEFAULT LOGIN/CADASTRO
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#09090b',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '40px',
        maxWidth: '460px',
        width: '100%',
        background: '#111115',
        border: '1px solid #222',
        borderRadius: '12px',
        zIndex: 2
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <div style={{ background: 'var(--brand-neon)', padding: '8px', borderRadius: '8px', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={24} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.5px' }}>a2sport<span style={{ color: 'var(--brand-neon)' }}>trackers</span></span>
        </div>

        {/* Header de Boas Vindas */}
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
          {isRegister ? 'Crie sua conta' : 'Entrar na Plataforma'}
        </h2>
        <p style={{ color: '#888', fontSize: '0.95rem', marginBottom: '32px' }}>
          {isRegister 
            ? 'Tenha 7 dias de acesso total grátis a todos os palpites e alertas matemáticos.' 
            : 'Faça login para gerenciar sua banca e conferir os alertas +EV de hoje.'}
        </p>

        {/* Mensagens de Alerta */}
        {error && (
          <div style={{
            background: 'rgba(255, 68, 68, 0.1)',
            border: '1px solid #ff4444',
            color: '#ff4444',
            padding: '14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            background: 'rgba(76, 175, 80, 0.1)',
            border: '1px solid #4CAF50',
            color: '#4CAF50',
            padding: '14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '20px'
          }}>
            {successMsg}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isRegister && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.78rem', color: '#888', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>Seu Nome</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                <input 
                  type="text" 
                  placeholder="Ex: João Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    background: '#141416',
                    border: '1px solid #222',
                    borderRadius: '8px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--brand-neon)'}
                  onBlur={(e) => e.target.style.borderColor = '#222'}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.78rem', color: '#888', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>E-mail</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
              <input 
                type="email" 
                placeholder="nome@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  background: '#141416',
                  border: '1px solid #222',
                  borderRadius: '8px',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--brand-neon)'}
                onBlur={(e) => e.target.style.borderColor = '#222'}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.78rem', color: '#888', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>Senha</label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setError('');
                    setSuccessMsg('');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#888',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-neon)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
                >
                  Esqueceu a senha?
                </button>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Sua senha secreta"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 42px',
                  background: '#141416',
                  border: '1px solid #222',
                  borderRadius: '8px',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--brand-neon)'}
                onBlur={(e) => e.target.style.borderColor = '#222'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#555',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#aaa'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#555'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px', padding: '12px', background: '#141416', border: '1px solid #222', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  id="over18"
                  checked={isOver18}
                  onChange={(e) => setIsOver18(e.target.checked)}
                  style={{ marginTop: '4px', cursor: 'pointer', accentColor: 'var(--brand-neon)' }}
                />
                <label htmlFor="over18" style={{ fontSize: '0.8rem', color: '#ccc', cursor: 'pointer', lineHeight: '1.4' }}>
                  Declaro que sou <strong>maior de 18 anos</strong> e estou ciente de que apostas esportivas envolvem risco financeiro.
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  id="acceptTerms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  style={{ marginTop: '4px', cursor: 'pointer', accentColor: 'var(--brand-neon)' }}
                />
                <label htmlFor="acceptTerms" style={{ fontSize: '0.8rem', color: '#ccc', cursor: 'pointer', lineHeight: '1.4' }}>
                  Aceito as <strong>Políticas de Privacidade (LGPD)</strong> e Termos de Uso, ciente de que a ferramenta é um sistema de análise estatística <strong>sem garantia de ganhos ou lucros</strong>.
                </label>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'var(--brand-neon)',
              color: '#000',
              border: 'none',
              padding: '14px',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(204, 255, 0, 0.15)',
              marginTop: '10px',
              transition: 'all 0.2s'
            }}
          >
            {loading ? (
              <Loader2 className="spin" size={18} />
            ) : (
              <>
                <span>{isRegister ? 'Criar Minha Conta' : 'Entrar na Central'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Botão Google Login */}
        <button
          type="button"
          onClick={async () => {
            setError('');
            setLoading(true);
            try {
              const res = await loginWithGoogle();
              if (res.success) {
                const searchParams = new URLSearchParams(window.location.search);
                const redirect = searchParams.get('redirect') || '/dashboard';
                router.push(redirect);
              } else {
                setError(res.error || 'Falha ao entrar com o Google.');
              }
            } catch (err) {
              setError('Erro de autenticação com o Google.');
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          style={{
            background: '#fff',
            color: '#000',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '12px',
            boxShadow: '0 4px 15px rgba(255, 255, 255, 0.05)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f1f1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Entrar com Conta Google</span>
        </button>

        {/* Divisor */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '30px 0', color: '#444' }}>
          <div style={{ flex: 1, height: '1px', background: '#222' }}></div>
          <span style={{ padding: '0 10px', fontSize: '0.8rem', fontWeight: 'bold', fontFamily: 'monospace' }}>OU</span>
          <div style={{ flex: 1, height: '1px', background: '#222' }}></div>
        </div>

        {/* Login de demonstração rápido */}
        <button
          onClick={handleQuickDemo}
          disabled={loading}
          style={{
            background: 'transparent',
            color: 'var(--brand-neon)',
            border: '1px solid rgba(204, 255, 0, 0.3)',
            padding: '12px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(204, 255, 0, 0.05)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Play size={15} fill="var(--brand-neon)" />
          <span>Experimentar Modo de Demonstração (7 dias Grátis)</span>
        </button>

        {/* Toggle Modo */}
        <p style={{ color: '#888', fontSize: '0.9rem', textAlign: 'center', marginTop: '30px', marginBlockEnd: 0 }}>
          {isRegister ? 'Já possui conta?' : 'Não tem conta ainda?'} &nbsp;
          <button 
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setSuccessMsg('');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--brand-neon)',
              fontWeight: 'bold',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isRegister ? 'Faça login aqui' : 'Cadastre-se para teste grátis'}
          </button>
        </p>
      </div>

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
