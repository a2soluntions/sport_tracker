'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import LoginPage from './login/page';
import CookieConsent from '../components/CookieConsent';
import { Loader2 } from 'lucide-react';

export default function AppContent({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Capturar e salvar versão atual no localStorage se for a primeira carga
    fetch('/api/version')
      .then(res => res.json())
      .then(data => {
        if (data && data.version) {
          if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('ev_tracker_current_version');
            if (!saved) {
              localStorage.setItem('ev_tracker_current_version', data.version);
            }
          }
        }
      })
      .catch(err => console.warn('Erro ao checar versão inicial:', err));

    // Rastreamento automático de visitante único (Baseado em localStorage)
    if (typeof window !== 'undefined') {
      const isUnique = !localStorage.getItem('ev_tracker_unique_visited');
      if (isUnique) {
        fetch('/api/track-visit', { method: 'POST' })
          .then(res => {
            if (res.ok) {
              localStorage.setItem('ev_tracker_unique_visited', 'true');
            }
          })
          .catch(err => console.warn('Erro ao registrar visita:', err));
      }
    }
  }, []);

  // Redirecionar usuário logado da raiz '/' para o dashboard
  useEffect(() => {
    if (!loading && user && pathname === '/') {
      router.push('/dashboard');
    }
  }, [user, loading, pathname, router]);

  // Se estiver carregando a sessão, mostra spinner de carregamento
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

  // Lista de rotas públicas
  const publicPaths = ['/', '/login', '/redefinir-senha', '/faq', '/quem-somos', '/pricing', '/jogo-responsavel'];
  const isPublicPath = publicPaths.includes(pathname);

  // Páginas públicas para usuários NÃO logados (sem sidebar)
  if (!user && isPublicPath) {
    return (
      <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {children}
        <CookieConsent />
      </div>
    );
  }

  // Se tentar acessar página privada sem estar logado, renderiza tela de login
  if (!user && !isPublicPath) {
    return (
      <>
        <LoginPage />
        <CookieConsent />
      </>
    );
  }

  // Páginas sem Sidebar (Login e Redefinir Senha) para usuários autenticados
  if (pathname === '/login' || pathname === '/redefinir-senha') {
    return (
      <>
        {children}
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
