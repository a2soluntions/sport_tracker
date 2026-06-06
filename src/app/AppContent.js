'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import LoginPage from './login/page';
import CookieConsent from '../components/CookieConsent';
import { Loader2 } from 'lucide-react';

export default function AppContent({ children }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const currentVersion = useRef(null);

  useEffect(() => {
    // 1. Capturar versão inicial
    fetch('/api/version')
      .then(res => res.json())
      .then(data => {
        if (data && data.version) {
          currentVersion.current = data.version;
        }
      })
      .catch(err => console.warn('Erro ao checar versão inicial:', err));

    // 2. Checar atualizações periodicamente (a cada 2 minutos)
    const interval = setInterval(() => {
      fetch('/api/version')
        .then(res => res.json())
        .then(data => {
          if (data && data.version && currentVersion.current) {
            if (data.version !== currentVersion.current) {
              console.log('[PWA Manager] Nova versão disponível:', data.version);
              setUpdateAvailable(true);
            }
          }
        })
        .catch(err => console.warn('Erro ao buscar versão no intervalo:', err));
    }, 120000); // 2 minutos

    return () => clearInterval(interval);
  }, []);

  // Se estiver carregando a sessão, mostra spinner brutalista
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        background: '#09090b',
        color: 'var(--brand-neon)',
        fontFamily: 'monospace',
        zIndex: 999999
      }}>
        <Loader2 className="spin" size={40} />
        <span style={{ marginTop: '16px', fontWeight: 'bold' }}>CONECTANDO A CENTRAL...</span>
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

  // Páginas sem Sidebar (Login e Redefinir Senha)
  if (pathname === '/login' || pathname === '/redefinir-senha') {
    return (
      <>
        {children}
        <CookieConsent />
      </>
    );
  }

  // Se não estiver logado, força a renderização da tela de login para qualquer outra rota
  if (!user) {
    return (
      <>
        <LoginPage />
        <CookieConsent />
      </>
    );
  }

  // Interface Autenticada com Sidebar
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>

      {/* Alerta de Atualização PWA */}
      {updateAvailable && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '420px',
          background: 'rgba(15, 15, 20, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--brand-neon)',
          borderRadius: '12px',
          padding: '18px 24px',
          zIndex: 9999999,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(204, 255, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem' }}>🚀</span>
            <h4 style={{ margin: 0, color: '#fff', fontSize: '0.95rem', fontWeight: 'bold' }}>
              Nova atualização disponível!
            </h4>
          </div>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#ccc', lineHeight: 1.4 }}>
            Uma nova versão do aplicativo está disponível com correções e melhorias. Deseja atualizar agora?
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
            <button 
              onClick={() => setUpdateAvailable(false)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#aaa',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Depois
            </button>
            <button 
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }}
              style={{
                background: 'var(--brand-neon)',
                border: 'none',
                color: '#000',
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(204, 255, 0, 0.2)'
              }}
            >
              Atualizar
            </button>
          </div>
        </div>
      )}

      <CookieConsent />
    </div>
  );
}
