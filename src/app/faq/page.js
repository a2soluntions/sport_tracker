'use client';

import React, { useState, useEffect } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, MessageCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

function AccordionItem({ question, answer, isOpen, onToggle }) {
  return (
    <div style={{
      background: '#111115',
      border: '1px solid #222',
      borderRadius: '8px',
      overflow: 'hidden',
      transition: 'border-color 0.2s'
    }}>
      <button 
        onClick={onToggle}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: '20px',
          color: '#fff',
          textAlign: 'left',
          fontSize: '1.02rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <span>{question}</span>
        {isOpen ? <ChevronUp size={18} color="var(--brand-neon)" /> : <ChevronDown size={18} color="#666" />}
      </button>

      {isOpen && (
        <div style={{
          padding: '0 20px 20px 20px',
          color: '#aaa',
          fontSize: '0.9rem',
          lineHeight: '1.6',
          borderTop: '1px solid #1c1c24',
          paddingTop: '16px'
        }}>
          {answer}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState(0);
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

  const faqData = [
    {
      question: "Como funcionam os palpites e a modelagem matemática?",
      answer: "Nossos palpites não são baseados em intuição ou achismos. Nós utilizamos modelagem matemática estatística avançada (incluindo Distribuição de Poisson e análise de Gols Esperados - xG). O algoritmo analisa dados históricos de ataque, defesa, confrontos diretos e o momento atual das equipes para calcular a probabilidade real de cada evento (vitória, gols, etc.). Quando essa probabilidade é maior do que a odd oferecida pela casa de apostas, um alerta é gerado."
    },
    {
      question: "O que é Valor Esperado (+EV) e por que ele é mais importante que a Taxa de Assertividade?",
      answer: "O Valor Esperado positivo (+EV) indica que uma cotação paga mais do que a probabilidade real do evento acontecer. Um erro comum é focar apenas na taxa de assertividade (quantidade de acertos). Um robô que acerta 80% das vezes pode ser perdedor se as odds médias forem de 1.10. Em contrapartida, acertar apenas 40% das vezes com odds médias de 3.00 gera um lucro extraordinário a longo prazo. O foco absoluto deve ser encontrar valor (+EV), e não apenas 'acertar' palpites individuais."
    },
    {
      question: "Quais são os riscos de jogar sem Gestão de Banca ou com valores altos?",
      answer: "Apostar sem uma gestão de banca rigorosa ou expor valores altos em poucas apostas é o maior erro de qualquer apostador. O esporte é imprevisível e sujeito a variabilidade estatística (sequências inevitáveis de perdas, os chamados 'reds'). A gestão de banca protege seu capital limitando o investimento a uma porcentagem pequena (por exemplo, 1% a 3% do capital total por entrada, no máximo 5% sob o Critério de Kelly). Isso permite que você absorva as oscilações naturais e permaneça lucrativo a longo prazo."
    },
    {
      question: "Como meus dados estão protegidos perante a LGPD (Lei Geral de Proteção de Dados)?",
      answer: (
        <div>
          Levamos a sua privacidade extremamente a sério. Em total conformidade com a LGPD, todos os dados coletados na plataforma são criptografados de ponta a ponta e armazenados em servidores altamente protegidos. Garantimos que suas informações pessoais nunca serão compartilhadas com terceiros sob qualquer pretexto. Você tem o direito assegurado de consultar, alterar ou solicitar a exclusão de seus dados a qualquer momento.
          <div style={{ marginTop: '12px' }}>
            <a 
              href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                color: 'var(--brand-neon)', 
                textDecoration: 'underline', 
                fontWeight: 'bold',
                fontSize: '0.85rem'
              }}
            >
              Clique aqui para ler o texto completo da Lei nº 13.709 (LGPD) ↗
            </a>
          </div>
        </div>
      )
    },
    {
      question: "Como funciona o método de gestão de banca Kelly?",
      answer: "O Critério de Kelly é uma fórmula matemática que determina o tamanho ideal de uma aposta para maximizar o crescimento da banca a longo prazo. Ele balanceia a probabilidade calculada e a cotação oferecida. Para garantir a segurança dos nossos usuários contra variações negativas, sugerimos trabalhar com frações (como Half-Kelly ou Quarter-Kelly), limitando rigidamente a stake para proteger seu capital."
    },
    {
      question: "Quem é responsável pelo desenvolvimento e administração do portal?",
      answer: (
        <div>
          Todo o portal, banco de dados, scrapers e motores matemáticos foram desenvolvidos e são geridos integralmente pela <strong>{companyInfo.razao_social}</strong>.
          Se você tiver alguma dúvida técnica, problema de acesso ou sugestão de melhoria, entre em contato direto pelo suporte no WhatsApp: <strong>{companyInfo.contato}</strong>.
        </div>
      )
    }
  ];

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <div style={{ padding: '0 20px', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '60px' }}>
      
      {/* Header Central de Ajuda */}
      <header style={{ marginBottom: '8px', paddingTop: '32px', borderBottom: '1px solid #222', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--brand-neon)', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: 900, letterSpacing: '1.5px' }}>
          <HelpCircle size={16} /> CENTRAL DE AJUDA
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '8px 0 0 0', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
          Perguntas Frequentes
        </h1>
        <p style={{ color: '#888', marginTop: '8px', fontSize: '1.1rem', lineHeight: 1.5 }}>
          Esclareça suas dúvidas técnicas sobre o funcionamento do modelo matemático e a gestão da plataforma.
        </p>
      </header>

      {/* Accordion list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {faqData.map((item, index) => (
          <AccordionItem
            key={index}
            question={item.question}
            answer={item.answer}
            isOpen={openIndex === index}
            onToggle={() => handleToggle(index)}
          />
        ))}
      </div>

      {/* CTA para suporte no whatsapp */}
      <div className="glass-panel" style={{
        background: 'linear-gradient(135deg, #111115 0%, #161622 100%)',
        borderLeft: '4px solid #25D366',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        padding: '24px'
      }}>
        <div>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>Ainda com dúvidas?</h3>
          <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: '0.85rem' }}>
            Nossa equipe técnica da {companyInfo.razao_social} está disponível para atendimento no WhatsApp.
          </p>
        </div>

        <a 
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: '#25D366',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            transition: 'transform 0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <MessageCircle size={16} fill="#fff" />
          <span>WhatsApp {companyInfo.contato}</span>
        </a>
      </div>

      {/* Botão Voltar */}
      <div style={{ marginTop: '10px' }}>
        <Link 
          href="/dashboard" 
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
