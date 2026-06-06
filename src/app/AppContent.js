'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import LoginPage from './login/page';
import CookieConsent from '../components/CookieConsent';
import { Loader2 } from 'lucide-react';

export default function AppContent({ children }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

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
      <CookieConsent />
    </div>
  );
}
