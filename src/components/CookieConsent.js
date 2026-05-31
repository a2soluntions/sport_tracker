'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Info, X } from 'lucide-react';

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('ev_tracker_cookie_consent');
    if (!consent) {
      // Pequeno delay para a animação de slide-in
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('ev_tracker_cookie_consent', 'accepted');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: '650px',
      background: 'rgba(9, 9, 11, 0.98)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(204, 255, 0, 0.3)',
      borderLeft: '4px solid var(--brand-neon)',
      borderRadius: '8px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 15px rgba(204, 255, 0, 0.05)',
      padding: '16px 20px',
      zIndex: 20000,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={22} color="var(--brand-neon)" />
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Privacidade & LGPD
          </h3>
        </div>
        <button 
          onClick={() => setShow(false)}
          style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
          title="Fechar temporariamente"
        >
          <X size={16} />
        </button>
      </div>

      <p style={{ margin: 0, fontSize: '0.78rem', color: '#ccc', lineHeight: 1.5 }}>
        Este portal utiliza cookies essenciais para salvar suas preferências de gestão de banca, parâmetros de filtro e persistência de login. Ao navegar, você concorda com nossos termos em total conformidade com a <strong>LGPD (Lei Geral de Proteção de Dados)</strong>.
      </p>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        flexWrap: 'wrap', 
        gap: '12px', 
        borderTop: '1px solid #1a1a24', 
        paddingTop: '10px', 
        marginTop: '2px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#888', fontSize: '0.7rem' }}>
          <Info size={12} color="#00d2ff" />
          <span>Gestão & Desenvolvimento: <strong>A2 Solutions</strong> (Contato: 34 99840-8962)</span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={handleAccept}
            style={{
              background: 'var(--brand-neon)',
              border: 'none',
              color: '#000',
              padding: '6px 14px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(204, 255, 0, 0.2)',
              transition: 'transform 0.1s'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Aceitar & Continuar
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translate(-50%, 100px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
