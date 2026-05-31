'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, MessageCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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

  const faqData = [
    {
      question: "O que significa Valor Esperado (+EV) nas apostas?",
      answer: "O Valor Esperado positivo (+EV) indica que uma determinada ODD oferecida pela casa de apostas está pagando mais do que deveria com base na probabilidade real calculada pelo modelo matemático. A longo prazo, focar em apostas +EV garante retorno financeiro positivo, pois você está comprando probabilidades com desconto."
    },
    {
      question: "Como funciona a modelagem matemática baseada em Poisson?",
      answer: "A Distribuição de Poisson é uma fórmula estatística usada para prever a probabilidade de um número específico de eventos ocorrer em um intervalo de tempo. No futebol, calculamos a força de ataque e defesa de cada equipe para descobrir a média esperada de gols (xG) para o mandante e o visitante. Com isso, simulamos a probabilidade exata de vitória, empate, derrota ou quantidade de gols e comparamos com as cotações das casas em busca de valor."
    },
    {
      question: "O robô de odds atualiza os alertas em tempo real?",
      answer: "Sim. Nossos coletores varrem de forma contínua as atualizações de cotações das principais casas mundiais (como Betano e Betfair) e cruzam na hora com a nossa central de processamento matemático. Quando detectada uma assimetria superior à margem configurada, o sinal é gerado na dashboard e transmitido para os canais."
    },
    {
      question: "Como funciona o método de gestão de banca Kelly?",
      answer: "O Critério de Kelly é uma fórmula matemática que determina o valor ideal a ser investido em cada aposta para maximizar o crescimento da banca a longo prazo, considerando o tamanho da vantagem e a probabilidade de acerto. Para maior segurança e proteção contra variações negativas (reds), o sistema implementa o Half-Kelly limitado a no máximo 5% do capital por entrada."
    },
    {
      question: "Quem é responsável pelo desenvolvimento e administração do portal?",
      answer: (
        <div>
          Todo o portal, banco de dados, scrapers e motores matemáticos foram desenvolvidos e são geridos integralmente pela <strong>A2 Solutions</strong>.
          Se você tiver alguma dúvida técnica, problema de acesso ou sugestão de melhoria, entre em contato direto pelo suporte no WhatsApp: <strong>(34) 99840-8962</strong>.
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
            Nossa equipe técnica da A2 Solutions está disponível para atendimento no WhatsApp.
          </p>
        </div>

        <a 
          href="https://wa.me/5534998408962"
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
          <span>WhatsApp (34) 99840-8962</span>
        </a>
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
