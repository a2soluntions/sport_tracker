'use client';

import React from 'react';
import Sidebar from '../../components/Sidebar';
import { BookOpen, Zap, DollarSign, ShieldAlert, Award, ChevronRight, Calculator, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';

export default function TutorialPage() {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#09090b',
      color: '#fff',
      fontFamily: 'Outfit, system-ui, sans-serif'
    }}>
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        padding: '40px 24px',
        maxWidth: '1200px',
        margin: '0 auto',
        paddingBottom: '100px'
      }}>
        {/* Header Section */}
        <div style={{ marginBottom: '40px', borderBottom: '1px solid #1f1f2e', paddingBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--brand-neon)', marginBottom: '12px' }}>
            <BookOpen size={28} />
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' }}>Central de Aprendizado</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.2 }}>
            Como Entender Odds e Proteger seu Dinheiro
          </h1>
          <p style={{ color: '#888', marginTop: '12px', fontSize: '1.1rem', maxWidth: '800px', lineHeight: 1.6 }}>
            Evolua de um apostador recreativo para um investidor esportivo profissional. Aprenda a pensar de forma lógica, dominar a matemática do mercado e utilizar o nosso sistema da maneira mais lucrativa possível.
          </p>
        </div>

        {/* Introduction Warning Banner */}
        <div style={{
          background: 'rgba(204, 255, 0, 0.03)',
          border: '1px solid rgba(204, 255, 0, 0.2)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '40px',
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-start'
        }}>
          <Award size={32} style={{ color: 'var(--brand-neon)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#fff', marginBottom: '8px' }}>MINDSET PROFISSIONAL</h3>
            <p style={{ color: '#aaa', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
              Casas de apostas lucram com a emoção e com a falta de método dos usuários. O segredo para vencer no longo prazo não é adivinhar placares por intuição, mas sim encontrar <strong>desajustes matemáticos</strong> e aplicar uma gestão de capital blindada contra a ruína.
            </p>
          </div>
        </div>

        {/* Tutorial Chapters Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          
          {/* 1. O que realmente são as odds? */}
          <section style={{ scrollMarginTop: '80px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#1c1c24', color: 'var(--brand-neon)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
                <Calculator size={22} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase' }}>1. O que Realmente são as Odds?</h2>
            </div>
            
            <p style={{ color: '#aaa', lineHeight: 1.6, marginBottom: '20px' }}>
              As odds não são apenas multiplicadores de lucro definidos ao acaso. Elas representam a <strong>Probabilidade Implícita</strong> que a casa de apostas calculou para aquele resultado acontecer. A fórmula matemática para extrair essa porcentagem é:
            </p>

            <div style={{
              background: '#141416',
              border: '1px solid #222',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              margin: '24px 0',
              fontFamily: 'monospace'
            }}>
              <span style={{ fontSize: '1.4rem', color: 'var(--brand-neon)', fontWeight: 'bold' }}>
                Probabilidade Implícita (%) = (1 / Odd) × 100
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div style={{ background: '#141416', padding: '16px', border: '1px solid #222', borderRadius: '8px' }}>
                <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>Odd de 1.60</span>
                <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '6px', margin: 0 }}>(1 / 1.60) × 100 = <strong>62,5%</strong> de chance implícita.</p>
              </div>
              <div style={{ background: '#141416', padding: '16px', border: '1px solid #222', borderRadius: '8px' }}>
                <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>Odd de 2.00</span>
                <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '6px', margin: 0 }}>(1 / 2.00) × 100 = <strong>50,0%</strong> de chance implícita.</p>
              </div>
              <div style={{ background: '#141416', padding: '16px', border: '1px solid #222', borderRadius: '8px' }}>
                <span style={{ color: '#ff5555', fontWeight: 'bold' }}>Odd de 35.00 (Múltipla Pronta)</span>
                <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '6px', margin: 0 }}>(1 / 35.00) × 100 = apenas <strong>2,85%</strong> de chance real de acerto.</p>
              </div>
            </div>

            <div style={{ background: 'rgba(255, 152, 0, 0.03)', border: '1px dashed rgba(255, 152, 0, 0.3)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: '#ff9800', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                <AlertTriangle size={16} />
                <span>O LUCRO OCULTO (JUICE / VIG)</span>
              </div>
              <p style={{ color: '#bbb', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
                Se você somar as probabilidades implícitas de todos os resultados possíveis de um jogo (Casa + Empate + Fora), a soma nunca dará 100%, mas sim 104%, 106% ou mais. Essa diferença é a taxa de corretagem invisível que a casa retém de você.
              </p>
            </div>
          </section>

          {/* 2. O Maior Mito: Aposta Acima de 50% */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#1c1c24', color: 'var(--brand-neon)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
                <ShieldAlert size={22} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase' }}>2. O Mito da Alta Probabilidade</h2>
            </div>

            <p style={{ color: '#aaa', lineHeight: 1.6, marginBottom: '20px' }}>
              O maior erro do apostador iniciante é buscar jogos em que a chance de vencer seja alta (ex: 90%). A matemática prova que a melhor aposta não é a mais provável, mas sim a que tem <strong>Valor Esperado Positivo (+EV)</strong>.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              <div style={{ background: '#141416', border: '1px solid rgba(255, 68, 68, 0.2)', padding: '20px', borderRadius: '12px' }}>
                <h4 style={{ color: '#ff4444', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase', fontSize: '0.95rem' }}>❌ Exemplo de Aposta Ruim</h4>
                <p style={{ color: '#bbb', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                  Um super favorito tem 90% de chance de ganhar, mas a odd oferecida é <strong>1.05</strong>. O risco de 10% de zebra (que destrói todo o seu dinheiro) não compensa o retorno minúsculo de apenas 5 centavos por real apostado.
                </p>
              </div>

              <div style={{ background: '#141416', border: '1px solid rgba(204, 255, 0, 0.3)', padding: '20px', borderRadius: '12px' }}>
                <h4 style={{ color: 'var(--brand-neon)', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase', fontSize: '0.95rem' }}>✅ Exemplo de Aposta de Valor (+EV)</h4>
                <p style={{ color: '#bbb', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                  A casa de apostas oferece uma odd de <strong>3.30</strong> para um time (probabilidade implícita de 30%). No entanto, após analisar escalações e histórico, você calcula que a probabilidade real é de <strong>40%</strong>. Essa distorção é um palpite de valor (+EV).
                </p>
              </div>
            </div>
          </section>

          {/* 3. A Faixa de Odd Ideal */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#1c1c24', color: 'var(--brand-neon)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
                <TrendingUp size={22} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase' }}>3. A Faixa de Odd Ideal (Fator Emocional)</h2>
            </div>

            <p style={{ color: '#aaa', lineHeight: 1.6, marginBottom: '20px' }}>
              Na teoria, qualquer odd desajustada tem valor. Na prática, a nossa psicologia dita qual faixa de cotação devemos buscar para não quebrar a nossa banca ou nossa disciplina emocional:
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#141416', borderRadius: '12px', overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: '#1c1c24', textTransform: 'uppercase', fontSize: '0.85rem', color: '#888' }}>
                    <th style={{ padding: '16px', textAlign: 'left' }}>Faixa de Odd</th>
                    <th style={{ padding: '16px', textAlign: 'left' }}>Classificação</th>
                    <th style={{ padding: '16px', textAlign: 'left' }}>Razão Prática & Comportamental</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.9rem', color: '#ccc' }}>
                  <tr style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--brand-neon)' }}>1.60 a 2.00</td>
                    <td style={{ padding: '16px', fontWeight: 'bold' }}>⭐ Zona de Equilíbrio (Ideal)</td>
                    <td style={{ padding: '16px', color: '#aaa', lineHeight: 1.4 }}>
                      Possui taxa de acerto de ~50% ou mais. Garante constância e permite recuperar uma perda com apenas um ou dois acertos, mantendo seu psicológico estável.
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '16px', fontWeight: 'bold', color: '#ff9800' }}>Abaixo de 1.60</td>
                    <td style={{ padding: '16px', fontWeight: 'bold' }}>⚠️ Perigosa (Longo Prazo)</td>
                    <td style={{ padding: '16px', color: '#aaa', lineHeight: 1.4 }}>
                      Embora acerte mais, o retorno é baixo. Um único erro (red) destrói o lucro de 4 ou 5 acertos seguidos, exigindo taxas de acerto surreais para ser lucrativo no longo prazo.
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '16px', fontWeight: 'bold', color: '#ff4444' }}>Acima de 3.00</td>
                    <td style={{ padding: '16px', fontWeight: 'bold' }}>❌ Risco Psicológico Alto</td>
                    <td style={{ padding: '16px', color: '#aaa', lineHeight: 1.4 }}>
                      A variância é extrema. Poucos investidores têm controle emocional e banca para aguentar sequências de 10 a 20 perdas consecutivas antes de conseguir o acerto compensador.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 4. Gestão de Banca */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#1c1c24', color: 'var(--brand-neon)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
                <DollarSign size={22} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase' }}>4. Gestão de Banca: O Escudo Contra a Ruína</h2>
            </div>

            <p style={{ color: '#aaa', lineHeight: 1.6, marginBottom: '20px' }}>
              O método infalível para não quebrar a banca é parar de pensar no saldo em reais e passar a pensar em <strong>Unidades (U)</strong>. 
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div style={{ background: '#141416', border: '1px solid #222', padding: '20px', borderRadius: '12px' }}>
                <h4 style={{ fontWeight: 'bold', color: '#fff', marginBottom: '10px' }}>O Conceito de Unidades</h4>
                <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                  Divida sua banca total em 100 partes iguais. Se você tem R$ 200,00, você possui 100 unidades de R$ 2,00. Cada aposta deve ser medida por quantas unidades (U) você irá investir.
                </p>
              </div>

              <div style={{ background: '#141416', border: '1px solid #222', padding: '20px', borderRadius: '12px' }}>
                <h4 style={{ fontWeight: 'bold', color: '#fff', marginBottom: '10px' }}>Regra de Ouro (1% a 2%)</h4>
                <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                  A regra mais segura é nunca expor mais de <strong>1% (Conservador)</strong> ou <strong>2% (Moderado)</strong> da sua banca em um único jogo. Isso te protege de sequências ruins inevitáveis.
                </p>
              </div>

              <div style={{ background: '#141416', border: '1px solid #222', padding: '20px', borderRadius: '12px' }}>
                <h4 style={{ fontWeight: 'bold', color: '#ff4444', marginBottom: '10px' }}>Evite Apostas Múltiplas</h4>
                <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                  A cada partida adicionada no seu bilhete de aposta, as taxas invisíveis da casa de apostas (juice) multiplicam-se de forma brutal. Múltiplas são loteria, não investimento.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Proteções e Handicaps */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#1c1c24', color: 'var(--brand-neon)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
                <Zap size={22} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase' }}>5. Utilizando Proteções (Handicaps Asiáticos)</h2>
            </div>

            <p style={{ color: '#aaa', lineHeight: 1.6, marginBottom: '20px' }}>
              Apostadores experientes evitam focar apenas na vitória simples de um time. Eles buscam margens de segurança através dos <strong>Handicaps Asiáticos</strong>:
            </p>

            <div style={{ background: '#141416', border: '1px solid #222', padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <CheckCircle2 size={20} style={{ color: 'var(--brand-neon)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#fff' }}>Handicap Asiático +0.25 (ou 0, +0.5):</strong>
                  <p style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '4px', margin: 0 }}>
                    Excelente proteção para azarões subestimados. Se o seu time ganhar, você recebe o lucro total. Se o jogo empatar, sua aposta é dividida: metade é devolvida e metade é ganha (Lucro Parcial). Você só perde o investimento se o seu time perder o jogo.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <CheckCircle2 size={20} style={{ color: 'var(--brand-neon)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#fff' }}>Handicap Asiático 0.0 (DNB - Draw No Bet):</strong>
                  <p style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '4px', margin: 0 }}>
                    Caso ocorra o empate, o valor total apostado é devolvido para a sua carteira, eliminando o risco do empate.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 6. Como nosso sistema ajuda você? */}
          <section style={{ borderTop: '1px solid #1f1f2e', paddingTop: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#1c1c24', color: 'var(--brand-neon)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
                <Award size={22} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase' }}>6. Como nos destacamos e ajudamos você</h2>
            </div>

            <p style={{ color: '#aaa', lineHeight: 1.6, marginBottom: '24px' }}>
              Nosso sistema trabalha 24 horas por dia rodando simulações matemáticas para te entregar as melhores cotações sem que você precise fazer contas complexas manualmente:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div style={{ background: '#141419', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--brand-neon)' }}>01</span>
                <h4 style={{ fontWeight: 'bold', color: '#fff', marginTop: '12px', marginBottom: '8px' }}>Monitoramento de Ligas em Tempo Real</h4>
                <p style={{ color: '#888', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                  Acompanhamos as partidas das principais ligas e calculamos odds reais por Poisson para cruzar com as cotações oferecidas nas maiores casas de apostas.
                </p>
              </div>

              <div style={{ background: '#141419', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--brand-neon)' }}>02</span>
                <h4 style={{ fontWeight: 'bold', color: '#fff', marginTop: '12px', marginBottom: '8px' }}>Fórmula de Kelly Personalizada</h4>
                <p style={{ color: '#888', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                  Com base no tamanho da sua banca configurada no painel, nossos alertas no Telegram calculam de forma dinâmica a porcentagem ideal de investimento (stake) para cada dica.
                </p>
              </div>

              <div style={{ background: '#141419', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--brand-neon)' }}>03</span>
                <h4 style={{ fontWeight: 'bold', color: '#fff', marginTop: '12px', marginBottom: '8px' }}>Histórico 100% Transparente</h4>
                <p style={{ color: '#888', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                  Todas as oportunidades geradas são confrontadas automaticamente contra placares reais. Você acompanha ROI, taxa de acerto e resultados passados de forma transparente no painel.
                </p>
              </div>
            </div>
          </section>

          {/* Quick Summary list */}
          <div style={{
            background: '#141416',
            border: '1px solid #222',
            borderRadius: '16px',
            padding: '28px',
            marginTop: '20px'
          }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#fff', marginBottom: '16px', textTransform: 'uppercase' }}>📝 Checklist Rápido de Proteção:</h3>
            <ul style={{ color: '#aaa', fontSize: '0.95rem', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li><strong>Pare de adivinhar resultados:</strong> Busque apenas odds com desajuste de valor (+EV).</li>
              <li><strong>Opere na zona ideal:</strong> Dê preferência a odds entre 1.60 e 2.00 para conter a variância.</li>
              <li><strong>Proteja sua banca:</strong> Nunca aposte mais que 1% a 2% do seu saldo total por jogo.</li>
              <li><strong>Anote tudo:</strong> Use nossa Central e a aba Carteira para catalogar seus resultados e acompanhar seus ganhos.</li>
            </ul>
          </div>

        </div>
      </main>
    </div>
  );
}
