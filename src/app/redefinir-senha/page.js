'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Zap, Lock, ShieldAlert, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const { updatePassword, logout } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem. Verifique a digitação.');
      setLoading(false);
      return;
    }

    try {
      const res = await updatePassword(password);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 2500);
      }
    } catch (err) {
      setError(err.message || 'Erro ao redefinir a senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#09090b',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: '#0c0c0f',
        border: '1px solid rgba(204, 255, 0, 0.2)',
        borderTop: '4px solid var(--brand-neon)',
        borderRadius: '8px',
        padding: '32px 24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', alignSelf: 'center' }}>
          <div style={{ background: 'var(--brand-neon)', padding: '6px', borderRadius: '6px', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={20} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.5px' }}>OddsSentry <span style={{ color: 'var(--brand-neon)' }}>PRO</span></span>
        </div>

        {success ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', padding: '16px 0' }}>
            <div style={{ background: 'rgba(204, 255, 0, 0.1)', border: '1px solid rgba(204, 255, 0, 0.2)', borderRadius: '50%', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyEncoding: 'center', color: 'var(--brand-neon)', justifyContent: 'center' }}>
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>Senha Redefinida!</h3>
              <p style={{ color: '#888', fontSize: '0.88rem', marginTop: '8px', lineHeight: '1.5' }}>
                Sua senha foi redefinida com sucesso. Redirecionando para a Dashboard...
              </p>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
                Definir Nova Senha
              </h2>
              <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '6px' }}>
                Insira sua nova senha de acesso seguro abaixo.
              </p>
            </div>

            {error && (
              <div style={{
                background: 'rgba(255, 68, 68, 0.1)',
                border: '1px solid #ff4444',
                color: '#ff4444',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>Nova Senha</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                  <input 
                    type="password" 
                    placeholder="Mínimo 6 caracteres"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      background: '#141416',
                      border: '1px solid #222',
                      borderRadius: '6px',
                      color: '#fff',
                      outline: 'none',
                      fontSize: '0.9rem',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--brand-neon)'}
                    onBlur={(e) => e.target.style.borderColor = '#222'}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>Confirmar Senha</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                  <input 
                    type="password" 
                    placeholder="Repita a nova senha"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      background: '#141416',
                      border: '1px solid #222',
                      borderRadius: '6px',
                      color: '#fff',
                      outline: 'none',
                      fontSize: '0.9rem',
                      transition: 'border-color 0.2s'
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
                  padding: '12px',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(204, 255, 0, 0.15)',
                  marginTop: '8px',
                  transition: 'all 0.2s'
                }}
              >
                {loading ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  <>
                    <span>Confirmar Redefinição</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            <button 
              onClick={handleCancel}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#666',
                fontWeight: 'bold',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '0.82rem',
                alignSelf: 'center'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#888'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
            >
              Cancelar e Sair
            </button>
          </>
        )}
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
