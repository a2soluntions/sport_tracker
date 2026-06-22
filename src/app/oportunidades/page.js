'use client';

import React from 'react';
import OpportunityTable from "@/components/OpportunityTable";
import { useAuth } from "../../context/AuthContext";

export default function OportunidadesPage() {
  const { user, isTrialActive } = useAuth();

  if (!user) {
    return null;
  }

  if (!isTrialActive()) {
    return (
      <div style={{
        padding: '40px 24px',
        textAlign: 'center',
        background: '#111116',
        border: '2px solid rgba(255, 68, 68, 0.3)',
        borderRadius: '16px',
        maxWidth: '600px',
        margin: '60px auto',
        boxShadow: '0 0 30px rgba(255, 68, 68, 0.05)',
        fontFamily: 'system-ui, sans-serif',
        color: '#fff'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', textTransform: 'uppercase' }}>
          Seu Teste Grátis de 7 Dias Expirou!
        </h3>
        <p style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '12px', lineHeight: 1.5 }}>
          O período de avaliação gratuita do seu painel de inteligência +EV acabou. Assine agora o plano PRO por apenas **R$ 19,90/mês** para liberar acesso instantâneo e contínuo a todas as assimetrias matemáticas.
        </p>
        
        <div style={{ margin: '30px 0', borderTop: '1px dashed #222', borderBottom: '1px dashed #222', padding: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: 'var(--brand-neon)', fontSize: '1.8rem', fontWeight: 900 }}>PRO</div>
              <div style={{ color: '#888', fontSize: '0.78rem', marginTop: '4px' }}>R$ 19,90 / mês</div>
            </div>
            <div>
              <div style={{ color: '#0088cc', fontSize: '1.8rem', fontWeight: 900 }}>TELEGRAM VIP</div>
              <div style={{ color: '#888', fontSize: '0.78rem', marginTop: '4px' }}>R$ 9,90 / mês</div>
            </div>
          </div>
        </div>
        <button
          onClick={() => window.location.href = '/pricing'}
          style={{
            background: 'var(--brand-neon)',
            color: '#000',
            border: 'none',
            padding: '14px 28px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(204, 255, 0, 0.2)'
          }}
        >
          Assinar Agora
        </button>
      </div>
    );
  }

  return (
    <>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Oportunidades +EV</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.95rem', lineHeight: '1.4' }}>
            As odds abaixo foram identificadas pelo Motor de Poisson como de Valor Esperado Positivo.
          </p>
        </div>
        <div className="badge-neon" style={{ flexShrink: 0 }}>
          Motor Online • 2 Alertas
        </div>
      </header>

      <section className="glass-panel" style={{ padding: '16px' }}>
        <OpportunityTable />
      </section>
    </>
  );
}
