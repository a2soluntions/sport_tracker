'use client';

import React from 'react';
import { Calculator, Wrench } from 'lucide-react';

export default function CalculatorPage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '40px 20px',
      textAlign: 'center',
      gap: '24px'
    }}>
      {/* Animated Icon */}
      <div style={{
        position: 'relative',
        width: '120px',
        height: '120px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '2px solid rgba(204, 255, 0, 0.15)',
          animation: 'pulseRing 2.5s ease-in-out infinite'
        }}></div>
        <div style={{
          position: 'absolute',
          inset: '8px',
          borderRadius: '50%',
          border: '2px dashed rgba(204, 255, 0, 0.1)',
          animation: 'spinSlow 12s linear infinite'
        }}></div>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(204, 255, 0, 0.08), rgba(204, 255, 0, 0.02))',
          border: '1px solid rgba(204, 255, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Wrench size={32} color="var(--brand-neon)" style={{ opacity: 0.8 }} />
        </div>
      </div>

      {/* Title */}
      <div>
        <h1 style={{
          fontSize: '1.8rem',
          fontWeight: '800',
          color: '#fff',
          margin: '0 0 8px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px'
        }}>
          <Calculator size={24} color="var(--brand-neon)" />
          Análise
        </h1>
        <div style={{
          background: 'var(--brand-neon)',
          color: '#000',
          padding: '4px 16px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          display: 'inline-block',
          letterSpacing: '1px',
          textTransform: 'uppercase'
        }}>
          Em Construção
        </div>
      </div>

      {/* Description */}
      <p style={{
        color: '#888',
        fontSize: '0.95rem',
        lineHeight: '1.6',
        maxWidth: '420px',
        margin: 0
      }}>
        Estamos trabalhando em uma nova experiência de análise ainda mais poderosa. 
        Em breve, novas ferramentas de simulação e projeção estarão disponíveis aqui.
      </p>

      {/* Progress Bar */}
      <div style={{
        width: '240px',
        height: '6px',
        background: '#1c1c24',
        borderRadius: '3px',
        overflow: 'hidden',
        border: '1px solid #222'
      }}>
        <div style={{
          width: '35%',
          height: '100%',
          background: 'linear-gradient(90deg, var(--brand-neon), #b3e600)',
          borderRadius: '3px',
          animation: 'progressPulse 2s ease-in-out infinite'
        }}></div>
      </div>
      <span style={{ color: '#555', fontSize: '0.72rem', fontWeight: 'bold' }}>
        Progresso: 35%
      </span>

      <style>{`
        @keyframes pulseRing {
          0% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 0.5; }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes progressPulse {
          0% { opacity: 0.7; }
          50% { opacity: 1; }
          100% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
