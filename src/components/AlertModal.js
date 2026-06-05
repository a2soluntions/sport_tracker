'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export default function AlertModal({
  isOpen,
  onClose,
  title = 'Aviso',
  message = '',
  type = 'error', // 'error' | 'warning' | 'success' | 'info'
  confirmText = 'Entendido'
}) {
  if (!isOpen) return null;

  // Color schemes based on alert type
  const schemes = {
    error: {
      color: 'var(--alert-red)',
      dimBg: 'var(--alert-red-dim)',
      border: 'rgba(242, 63, 66, 0.3)',
      icon: <AlertCircle size={22} />,
      shadow: '0 20px 40px rgba(242, 63, 66, 0.1), 0 10px 30px rgba(0, 0, 0, 0.7)'
    },
    warning: {
      color: '#FF9800',
      dimBg: 'rgba(255, 152, 0, 0.15)',
      border: 'rgba(255, 152, 0, 0.3)',
      icon: <AlertTriangle size={22} />,
      shadow: '0 20px 40px rgba(255, 152, 0, 0.08), 0 10px 30px rgba(0, 0, 0, 0.7)'
    },
    success: {
      color: '#4CAF50',
      dimBg: 'rgba(76, 175, 80, 0.15)',
      border: 'rgba(76, 175, 80, 0.3)',
      icon: <CheckCircle2 size={22} />,
      shadow: '0 20px 40px rgba(76, 175, 80, 0.08), 0 10px 30px rgba(0, 0, 0, 0.7)'
    },
    info: {
      color: '#00d2ff',
      dimBg: 'rgba(0, 210, 255, 0.15)',
      border: 'rgba(0, 210, 255, 0.3)',
      icon: <Info size={22} />,
      shadow: '0 20px 40px rgba(0, 210, 255, 0.08), 0 10px 30px rgba(0, 0, 0, 0.7)'
    }
  };

  const scheme = schemes[type] || schemes.info;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(5, 5, 8, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 30000,
      animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
    }}>
      <div style={{
        width: '92%',
        maxWidth: '420px',
        background: 'linear-gradient(135deg, #111116, #14141f)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderTop: `4px solid ${scheme.color}`,
        borderRadius: '12px',
        padding: '24px',
        boxShadow: scheme.shadow,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'relative',
        animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
      }}>
        {/* Botão Fechar no Canto */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'background-color 0.2s, color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <X size={18} />
        </button>

        {/* Cabeçalho com Ícone */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: scheme.dimBg,
            border: `1px solid ${scheme.border}`,
            color: scheme.color
          }}>
            {scheme.icon}
          </div>
          <h3 style={{
            margin: 0,
            fontSize: '1.15rem',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '0.3px'
          }}>
            {title}
          </h3>
        </div>

        {/* Mensagem descritiva */}
        <p style={{
          margin: 0,
          fontSize: '0.92rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          fontWeight: 400
        }}>
          {message}
        </p>

        {/* Footer com Ação */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: '8px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          paddingTop: '16px'
        }}>
          <button
            onClick={onClose}
            style={{
              background: type === 'error' ? 'var(--alert-red)' : 'var(--brand-neon)',
              border: 'none',
              color: type === 'error' ? '#fff' : '#000',
              padding: '8px 24px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: type === 'error'
                ? '0 4px 12px rgba(242, 63, 66, 0.25)'
                : '0 4px 12px rgba(204, 255, 0, 0.25)',
              transition: 'transform 0.1s, opacity 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {confirmText}
          </button>
        </div>

        <style jsx global>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleIn {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}
