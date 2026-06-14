'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Target, TrendingUp, Sparkles, MessageCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function QuemSomosPage() {
  const [companyInfo, setCompanyInfo] = useState({
    cnpj_cpf: '',
    razao_social: 'A2 Solutions',
    endereco: '',
    contato: '(34) 99840-8962',
    instagram: '',
    telegram: '',
    facebook: '',
    email_suporte: ''
  });

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('saas_settings')
          .select('*')
          .eq('key', 'company_info')
          .single();
        if (data && data.value) {
          setCompanyInfo(prev => ({ ...prev, ...data.value }));
        }
      } catch (err) {
        console.warn("Erro ao buscar dados da empresa:", err);
      }
    };
    fetchCompanyInfo();
  }, []);

  const cleanPhone = companyInfo.contato.replace(/\D/g, '');
  const waLink = cleanPhone ? `https://wa.me/55${cleanPhone.startsWith('55') ? cleanPhone.slice(2) : cleanPhone}` : '#';

  return (
    <div style={{ padding: '0 20px', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '60px' }}>
      
      {/* Header institucional */}
      <header style={{ marginBottom: '8px', paddingTop: '32px', borderBottom: '1px solid #222', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--brand-neon)', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: 900, letterSpacing: '1.5px' }}>
          <Sparkles size={16} /> INSTITUCIONAL
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '8px 0 0 0', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
          Quem Somos
        </h1>
        <p style={{ color: '#888', marginTop: '8px', fontSize: '1.1rem', lineHeight: 1.5 }}>
          Conheça a inteligência matemática e o desenvolvimento por trás do <strong>a2sporttrackers</strong>.
        </p>
      </header>

      {/* Grid de Conteúdo Principal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* Card 1: O Propósito */}
        <div className="glass-panel" style={{ borderLeft: '4px solid var(--brand-neon)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <Target size={20} color="var(--brand-neon)" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>Nossa Missão</h3>
          </div>
          <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
            O <strong>a2sporttrackers</strong> nasceu para nivelar o campo de jogo entre investidores esportivos e as casas de apostas. Não acreditamos em "sorte" ou "palpites intuitivos". Acreditamos na estatística pura e no cálculo preciso de <strong>Valor Esperado (+EV)</strong>.
          </p>
        </div>

        {/* Card 2: A Tecnologia */}
        <div className="glass-panel" style={{ borderLeft: '4px solid #00d2ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <TrendingUp size={20} color="#00d2ff" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>Modelo de Poisson 2D</h3>
          </div>
          <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
            Nossa engine processa milhares de dados de gols previstos e sofridos (Expected Goals - xG) das equipes em campo. Utilizando distribuições probabilísticas bidimensionais de Poisson, calculamos a chance matemática real do evento ocorrer e a comparamos contra as cotações das principais casas mundiais.
          </p>
        </div>

      </div>

      {/* Card Horizontal Premium de Desenvolvimento e Gestão */}
      <div className="glass-panel" style={{
        background: 'linear-gradient(135deg, #111115 0%, #161622 100%)',
        border: '1px solid rgba(179, 57, 255, 0.2)',
        borderLeft: '4px solid #b339ff',
        padding: '30px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(179, 57, 255, 0.1)', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(179, 57, 255, 0.2)' }}>
            <ShieldCheck size={26} color="#b339ff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#fff', textTransform: 'uppercase' }}>
              Desenvolvimento & Gestão
            </h2>
            <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold' }}>PARCEIRO TECNOLÓGICO OFICIAL</span>
          </div>
        </div>

        <p style={{ color: '#ccc', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
          Todo o desenvolvimento de software, hospedagem, integrações de APIs, inteligência artificial de modelagem e sustentação técnica do portal <strong>a2sporttrackers</strong> é gerido e mantido de ponta a ponta pela <strong>{companyInfo.razao_social}</strong>.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', background: '#09090b', padding: '20px', borderRadius: '12px', border: '1px solid #222' }}>
          <div style={{ flex: '1 1 200px' }}>
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.95rem' }}>{companyInfo.razao_social}</div>
            <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '4px' }}>
              {companyInfo.cnpj_cpf ? `CNPJ: ${companyInfo.cnpj_cpf}` : 'CNPJ e Operações sob regulação e segurança.'}
            </div>
            <div style={{ color: 'var(--brand-neon)', fontSize: '0.9rem', fontWeight: 'bold', marginTop: '6px', fontFamily: 'monospace' }}>
              Suporte: {companyInfo.contato}
            </div>
          </div>

          <a 
            href={waLink} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              background: '#25D366',
              color: '#fff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <MessageCircle size={18} fill="#fff" />
            <span>Falar com o Suporte A2</span>
          </a>
        </div>
      </div>

      {/* Botão Voltar */}
      <div style={{ marginTop: '10px' }}>
        <Link 
          href="/" 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'transparent',
            border: '1px solid #333',
            color: '#aaa',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: 'bold',
            textDecoration: 'none',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#555'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.borderColor = '#333'; }}
        >
          <ArrowLeft size={16} />
          <span>Voltar ao Dashboard</span>
        </Link>
      </div>

    </div>
  );
}
