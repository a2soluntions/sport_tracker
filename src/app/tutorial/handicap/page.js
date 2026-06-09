'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Shield, Sword, SplitSquareVertical, Wallet, BrainCircuit, 
  ArrowLeft, CheckCircle2, AlertTriangle, Info, ChevronRight,
  Target, TrendingUp
} from 'lucide-react';

// ─── Reusable Styled Components ─────────────────────────────────────────────

const FormulaBox = ({ children }) => (
  <div style={{
    background: '#0d0d12',
    border: '1px solid rgba(204, 255, 0, 0.2)',
    borderRadius: '12px',
    padding: '20px 24px',
    textAlign: 'center',
    margin: '24px 0',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
  }}>
    <span style={{ fontSize: '1.2rem', color: 'var(--brand-neon)', fontWeight: 'bold', lineHeight: 1.8 }}>
      {children}
    </span>
  </div>
);

const ScenarioRow = ({ emoji, label, description, color = '#ccc' }) => (
  <div style={{
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    padding: '10px 0',
    borderBottom: '1px solid #1a1a24'
  }}>
    <span style={{ fontSize: '1.3rem', flexShrink: 0, lineHeight: 1 }}>{emoji}</span>
    <div>
      <strong style={{ color, fontSize: '0.92rem' }}>{label}</strong>
      <p style={{ color: '#999', fontSize: '0.85rem', marginTop: '4px', margin: 0, lineHeight: 1.5 }}>
        {description}
      </p>
    </div>
  </div>
);

const LineCard = ({ icon, title, subtitle, meaning, children, borderColor = '#222' }) => (
  <div style={{
    background: '#111118',
    border: `1px solid ${borderColor}`,
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
    transition: 'border-color 0.3s ease',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
      <span style={{ fontSize: '1.4rem' }}>{icon}</span>
      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>{title}</h3>
    </div>
    {subtitle && (
      <p style={{ 
        color: 'var(--brand-neon)', 
        fontSize: '0.8rem', 
        fontWeight: 700, 
        textTransform: 'uppercase', 
        letterSpacing: '1.5px',
        marginBottom: '12px',
        marginTop: '0'
      }}>
        {subtitle}
      </p>
    )}
    <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '16px' }}>
      <strong style={{ color: '#ddd' }}>O que significa:</strong> {meaning}
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {children}
    </div>
  </div>
);

const ModuleHeader = ({ icon: Icon, number, title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
    <div style={{
      background: 'linear-gradient(135deg, #1c1c24, #252530)',
      color: 'var(--brand-neon)',
      padding: '12px',
      borderRadius: '14px',
      display: 'flex',
      alignItems: 'center',
      border: '1px solid rgba(204,255,0,0.1)',
      boxShadow: '0 0 20px rgba(204,255,0,0.05)'
    }}>
      <Icon size={24} />
    </div>
    <div>
      <span style={{ 
        fontSize: '0.7rem', 
        fontWeight: 700, 
        color: 'var(--brand-neon)', 
        textTransform: 'uppercase', 
        letterSpacing: '2px',
        opacity: 0.7
      }}>
        Módulo {number}
      </span>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, textTransform: 'uppercase', margin: 0, lineHeight: 1.2 }}>{title}</h2>
    </div>
  </div>
);

// ─── Main Page Component ────────────────────────────────────────────────────

export default function HandicapMasterclassPage() {
  return (
    <div style={{
      padding: '20px',
      maxWidth: '1000px',
      margin: '0 auto',
      width: '100%',
      fontFamily: 'Outfit, system-ui, sans-serif'
    }}>

      {/* ── Back Navigation ── */}
      <Link href="/tutorial" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        color: '#888',
        textDecoration: 'none',
        fontSize: '0.85rem',
        marginBottom: '24px',
        padding: '8px 14px',
        borderRadius: '8px',
        background: '#141419',
        border: '1px solid #222',
        transition: 'all 0.2s ease',
      }}>
        <ArrowLeft size={16} />
        Voltar ao Tutorial Principal
      </Link>

      {/* ── Hero Header ── */}
      <div style={{ marginBottom: '40px', borderBottom: '1px solid #1f1f2e', paddingBottom: '28px' }}>
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '10px', 
          background: 'rgba(204,255,0,0.06)', 
          border: '1px solid rgba(204,255,0,0.15)',
          padding: '8px 16px', 
          borderRadius: '99px', 
          marginBottom: '16px' 
        }}>
          <Target size={16} style={{ color: 'var(--brand-neon)' }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--brand-neon)' }}>
            Masterclass Avançada
          </span>
        </div>
        <h1 style={{ 
          fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', 
          fontWeight: 900, 
          textTransform: 'uppercase', 
          lineHeight: 1.15,
          background: 'linear-gradient(135deg, #fff 30%, var(--brand-neon))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Dominando o Handicap Asiático
        </h1>
        <p style={{ color: '#888', marginTop: '14px', fontSize: '1.05rem', maxWidth: '820px', lineHeight: 1.7 }}>
          O Handicap Asiático não é um jogo de adivinhação — é a <strong style={{ color: '#ccc' }}>ferramenta matemática mais poderosa</strong> para 
          ajustar o risco, encontrar valor esperado positivo (+EV) e proteger o seu capital contra a variância do mercado esportivo.
        </p>
      </div>

      {/* ── Content Modules ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '52px' }}>

        {/* ═══════════════════════════════════════════════════════════════════
            MÓDULO 1: O Conceito Matemático Primordial
        ═══════════════════════════════════════════════════════════════════ */}
        <section>
          <ModuleHeader icon={BrainCircuit} number="1" title="O Conceito Matemático Primordial" />

          <p style={{ color: '#aaa', lineHeight: 1.7, marginBottom: '16px' }}>
            As casas de apostas adoram o mercado tradicional (<strong style={{ color: '#fff' }}>1×2</strong>) porque existem <strong style={{ color: '#fff' }}>três desfechos possíveis</strong>: 
            Vitória da Casa, Empate ou Vitória do Visitante. Isso estatisticamente joga a vantagem para eles, pois podem embalar margem (juice) em cada um dos três resultados.
          </p>

          <div style={{
            background: 'rgba(204, 255, 0, 0.03)',
            border: '1px solid rgba(204, 255, 0, 0.15)',
            borderRadius: '14px',
            padding: '20px 24px',
            marginBottom: '20px',
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start'
          }}>
            <Info size={22} style={{ color: 'var(--brand-neon)', flexShrink: 0, marginTop: '2px' }} />
            <p style={{ color: '#bbb', fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
              O <strong style={{ color: '#fff' }}>Handicap Asiático (HA)</strong> elimina o empate comercial. 
              Ele redefine as regras do jogo ao dar uma <strong style={{ color: 'var(--brand-neon)' }}>vantagem teórica (+)</strong> ou 
              uma <strong style={{ color: '#ff6b6b' }}>desvantagem teórica (-)</strong> de gols a uma das equipes <em>antes do primeiro minuto de partida</em>.
            </p>
          </div>

          <p style={{ color: '#aaa', lineHeight: 1.7, marginBottom: '8px' }}>
            Quando o juiz apita o fim do jogo, você aplica uma equação simples para saber o resultado do seu investimento:
          </p>

          <FormulaBox>
            Placar Simulado = Placar Real do Jogo ± Linha de Handicap Escolhida
          </FormulaBox>

          {/* Visual example */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '14px', 
            marginTop: '16px' 
          }}>
            <div style={{ background: '#111118', border: '1px solid #222', borderRadius: '10px', padding: '16px' }}>
              <span style={{ color: '#888', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Exemplo Prático</span>
              <p style={{ color: '#ccc', fontSize: '0.9rem', marginTop: '8px', margin: 0, lineHeight: 1.5 }}>
                Jogo: <strong>Flamengo 1 × 0 Vasco</strong><br/>
                Aposta: Vasco <strong style={{ color: 'var(--brand-neon)' }}>HA +1.5</strong><br/>
                Placar Simulado: 1 × <strong style={{ color: 'var(--brand-neon)' }}>1.5</strong> → 🟩 <strong>Ganha</strong>
              </p>
            </div>
            <div style={{ background: '#111118', border: '1px solid #222', borderRadius: '10px', padding: '16px' }}>
              <span style={{ color: '#888', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Exemplo Prático</span>
              <p style={{ color: '#ccc', fontSize: '0.9rem', marginTop: '8px', margin: 0, lineHeight: 1.5 }}>
                Jogo: <strong>Palmeiras 2 × 0 Santos</strong><br/>
                Aposta: Palmeiras <strong style={{ color: '#ff6b6b' }}>HA -1.5</strong><br/>
                Placar Simulado: <strong style={{ color: 'var(--brand-neon)' }}>0.5</strong> × 0 → 🟩 <strong>Ganha</strong>
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            MÓDULO 2: O Lado Defensivo — Linhas Positivas (+)
        ═══════════════════════════════════════════════════════════════════ */}
        <section>
          <ModuleHeader icon={Shield} number="2" title="O Lado Defensivo — Linhas Positivas (+)" />

          <p style={{ color: '#aaa', lineHeight: 1.7, marginBottom: '24px' }}>
            As linhas positivas são os <strong style={{ color: '#4ecdc4' }}>escudos de proteção</strong> da sua gestão de banca. 
            Elas servem para apoiar equipes subestimadas (underdogs) aproveitando-se de erros de precificação do mercado.
          </p>

          {/* HA +0.5 */}
          <LineCard 
            icon="🛡️" 
            title="HA +0.5" 
            subtitle="A Dupla Hipótese Profissional"
            meaning="O seu time começa o jogo com meio gol de vantagem."
            borderColor="rgba(78, 205, 196, 0.25)"
          >
            <ScenarioRow 
              emoji="🟩" 
              label="Vitória do seu time" 
              description="Ganha (Lucro total)." 
              color="#4ecdc4" 
            />
            <ScenarioRow 
              emoji="🟩" 
              label="Empate" 
              description="Ganha (Lucro total). Placar real 0×0 + 0.5 = Seu time lidera 0 × 0.5." 
              color="#4ecdc4" 
            />
            <ScenarioRow 
              emoji="🟥" 
              label="Derrota do seu time" 
              description="Perdida." 
              color="#ff6b6b" 
            />
          </LineCard>

          {/* HA +1.0 */}
          <LineCard 
            icon="🛡️" 
            title="HA +1.0" 
            subtitle="O Escudo de Reembolso"
            meaning="O seu time tem um gol de vantagem inicial."
            borderColor="rgba(78, 205, 196, 0.25)"
          >
            <ScenarioRow 
              emoji="🟩" 
              label="Vitória ou Empate do seu time" 
              description="Ganha (Lucro total)." 
              color="#4ecdc4" 
            />
            <ScenarioRow 
              emoji="🟨" 
              label="Derrota por exatamente 1 gol (ex: 1×0, 2×1)" 
              description="Devolvida (Void). O seu capital retorna 100% para a banca. O placar simulado empata em 1×1." 
              color="#ffd93d" 
            />
            <ScenarioRow 
              emoji="🟥" 
              label="Derrota por 2 ou mais gols" 
              description="Perdida." 
              color="#ff6b6b" 
            />
          </LineCard>

          {/* HA +1.5 */}
          <LineCard 
            icon="🛡️" 
            title="HA +1.5" 
            subtitle="Segurança Máxima"
            meaning="Uma vantagem esmagadora de um gol e meio."
            borderColor="rgba(78, 205, 196, 0.25)"
          >
            <ScenarioRow 
              emoji="🟩" 
              label="Vitória, Empate ou Derrota por apenas 1 gol" 
              description="Ganha (Lucro total). Mesmo perdendo o jogo real por 1×0, o placar simulado é seu por 1 × 1.5." 
              color="#4ecdc4" 
            />
            <ScenarioRow 
              emoji="🟥" 
              label="Derrota por 2 ou mais gols" 
              description="Perdida." 
              color="#ff6b6b" 
            />
          </LineCard>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            MÓDULO 3: O Lado Agressivo — Linhas Negativas (-)
        ═══════════════════════════════════════════════════════════════════ */}
        <section>
          <ModuleHeader icon={Sword} number="3" title="O Lado Agressivo — Linhas Negativas (-)" />

          <p style={{ color: '#aaa', lineHeight: 1.7, marginBottom: '24px' }}>
            As linhas negativas são <strong style={{ color: '#ff6b6b' }}>martelos de valor</strong>. 
            Elas são utilizadas quando um favorito vai vencer com autoridade e a odd da vitória simples está muito esmagada e sem valor matemático.
          </p>

          {/* HA -0.5 */}
          <LineCard 
            icon="⚔️" 
            title="HA -0.5" 
            subtitle="A Vitória Seca"
            meaning="É matematicamente idêntico ao mercado de vitória simples (Moneyline). Seu time começa com meio gol negativo."
            borderColor="rgba(255, 107, 107, 0.2)"
          >
            <ScenarioRow 
              emoji="🟩" 
              label="Vitória por qualquer placar" 
              description="Ganha (Lucro total)." 
              color="#4ecdc4" 
            />
            <ScenarioRow 
              emoji="🟥" 
              label="Empate ou Derrota" 
              description="Perdida." 
              color="#ff6b6b" 
            />
          </LineCard>

          {/* HA -1.0 */}
          <LineCard 
            icon="⚔️" 
            title="HA -1.0" 
            subtitle="Busca por Margem"
            meaning="Seu time precisa vencer e superar a desvantagem de um gol."
            borderColor="rgba(255, 107, 107, 0.2)"
          >
            <ScenarioRow 
              emoji="🟩" 
              label="Vitória por 2 ou mais gols (ex: 2×0, 3×1)" 
              description="Ganha (Lucro total)." 
              color="#4ecdc4" 
            />
            <ScenarioRow 
              emoji="🟨" 
              label="Vitória por exatamente 1 gol (ex: 1×0, 2×1)" 
              description="Devolvida (Void). Reembolso total do dinheiro." 
              color="#ffd93d" 
            />
            <ScenarioRow 
              emoji="🟥" 
              label="Empate ou Derrota" 
              description="Perdida." 
              color="#ff6b6b" 
            />
          </LineCard>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            MÓDULO 4: As Linhas de Quarto (±0.25 e ±0.75)
        ═══════════════════════════════════════════════════════════════════ */}
        <section>
          <ModuleHeader icon={SplitSquareVertical} number="4" title="As Linhas de Quarto (±0.25 e ±0.75)" />

          <div style={{
            background: 'rgba(255, 217, 61, 0.04)',
            border: '1px solid rgba(255, 217, 61, 0.2)',
            borderRadius: '14px',
            padding: '20px 24px',
            marginBottom: '28px',
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start'
          }}>
            <AlertTriangle size={22} style={{ color: '#ffd93d', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontWeight: 800, color: '#ffd93d', margin: 0, marginBottom: '6px', fontSize: '0.95rem', textTransform: 'uppercase' }}>
                Regra de Ouro da Gestão
              </h4>
              <p style={{ color: '#bbb', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                Viu finais com <strong style={{ color: '#fff' }}>,25</strong> ou <strong style={{ color: '#fff' }}>,75</strong>? 
                Significa que o sistema está <strong style={{ color: '#ffd93d' }}>dividindo a sua aposta em duas partes iguais</strong> para 
                pulverizar o risco de mercado.
              </p>
            </div>
          </div>

          {/* Table of quarter lines */}
          <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              background: '#111118', 
              borderRadius: '14px', 
              overflow: 'hidden',
              fontSize: '0.88rem'
            }}>
              <thead>
                <tr style={{ 
                  background: 'linear-gradient(135deg, #1c1c28, #222233)', 
                  textTransform: 'uppercase', 
                  fontSize: '0.73rem', 
                  color: '#999',
                  letterSpacing: '0.5px'
                }}>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: 700 }}>Linha</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: 700 }}>Como o Sistema Divide</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: 700 }}>Se EMPATAR</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: 700 }}>Se VENCER por 1 gol</th>
                </tr>
              </thead>
              <tbody style={{ color: '#ccc' }}>
                {/* HA -0.25 */}
                <tr style={{ borderBottom: '1px solid #1a1a28' }}>
                  <td style={{ padding: '16px', fontWeight: 800, color: '#ff6b6b' }}>HA -0.25</td>
                  <td style={{ padding: '16px', color: '#aaa' }}>
                    <span style={{ color: '#ddd' }}>50%</span> no HA 0.0 + <span style={{ color: '#ddd' }}>50%</span> no HA -0.5
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span style={{ background: 'rgba(255,217,61,0.1)', color: '#ffd93d', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                      🟨🟥 Meia Perda
                    </span>
                    <br/>
                    <span style={{ fontSize: '0.75rem', color: '#777', marginTop: '4px', display: 'inline-block' }}>Metade volta, metade perde</span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span style={{ background: 'rgba(78,205,196,0.1)', color: '#4ecdc4', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                      🟩 Ganha
                    </span>
                    <br/>
                    <span style={{ fontSize: '0.75rem', color: '#777', marginTop: '4px', display: 'inline-block' }}>Lucro total</span>
                  </td>
                </tr>
                {/* HA +0.25 */}
                <tr style={{ borderBottom: '1px solid #1a1a28' }}>
                  <td style={{ padding: '16px', fontWeight: 800, color: '#4ecdc4' }}>HA +0.25</td>
                  <td style={{ padding: '16px', color: '#aaa' }}>
                    <span style={{ color: '#ddd' }}>50%</span> no HA 0.0 + <span style={{ color: '#ddd' }}>50%</span> no HA +0.5
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span style={{ background: 'rgba(78,205,196,0.1)', color: '#4ecdc4', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                      🟩🟨 Meio Ganho
                    </span>
                    <br/>
                    <span style={{ fontSize: '0.75rem', color: '#777', marginTop: '4px', display: 'inline-block' }}>Metade volta, metade lucra</span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span style={{ background: 'rgba(78,205,196,0.1)', color: '#4ecdc4', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                      🟩 Ganha
                    </span>
                    <br/>
                    <span style={{ fontSize: '0.75rem', color: '#777', marginTop: '4px', display: 'inline-block' }}>Lucro total</span>
                  </td>
                </tr>
                {/* HA -0.75 */}
                <tr style={{ borderBottom: '1px solid #1a1a28' }}>
                  <td style={{ padding: '16px', fontWeight: 800, color: '#ff6b6b' }}>HA -0.75</td>
                  <td style={{ padding: '16px', color: '#aaa' }}>
                    <span style={{ color: '#ddd' }}>50%</span> no HA -0.5 + <span style={{ color: '#ddd' }}>50%</span> no HA -1.0
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span style={{ background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                      🟥 Perdida
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span style={{ background: 'rgba(78,205,196,0.1)', color: '#4ecdc4', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                      🟩🟨 Meio Ganho
                    </span>
                    <br/>
                    <span style={{ fontSize: '0.75rem', color: '#777', marginTop: '4px', display: 'inline-block' }}>Metade lucra, metade volta</span>
                  </td>
                </tr>
                {/* HA +0.75 */}
                <tr>
                  <td style={{ padding: '16px', fontWeight: 800, color: '#4ecdc4' }}>HA +0.75</td>
                  <td style={{ padding: '16px', color: '#aaa' }}>
                    <span style={{ color: '#ddd' }}>50%</span> no HA +0.5 + <span style={{ color: '#ddd' }}>50%</span> no HA +1.0
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span style={{ background: 'rgba(78,205,196,0.1)', color: '#4ecdc4', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                      🟩 Ganha
                    </span>
                    <br/>
                    <span style={{ fontSize: '0.75rem', color: '#777', marginTop: '4px', display: 'inline-block' }}>Lucro total</span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span style={{ background: 'rgba(78,205,196,0.1)', color: '#4ecdc4', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                      🟩 Ganha
                    </span>
                    <br/>
                    <span style={{ fontSize: '0.75rem', color: '#777', marginTop: '4px', display: 'inline-block' }}>Lucro total</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Extra info for +0.75 loss by 1 */}
          <div style={{
            background: '#111118',
            border: '1px solid rgba(255,217,61,0.15)',
            borderRadius: '10px',
            padding: '14px 18px',
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}>
            <Info size={18} style={{ color: '#ffd93d', flexShrink: 0 }} />
            <p style={{ color: '#aaa', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
              <strong style={{ color: '#ffd93d' }}>HA +0.75</strong> — Se o seu time <strong>perder por 1 gol</strong>: 
              🟨🟥 <strong>Meia Perda</strong> (metade da aposta no +0.5 perde, metade no +1.0 é devolvida).
            </p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            MÓDULO 5: Integração com Gestão de Unidades
        ═══════════════════════════════════════════════════════════════════ */}
        <section>
          <ModuleHeader icon={Wallet} number="5" title="Integrando o Handicap com a Gestão de Unidades" />

          <p style={{ color: '#aaa', lineHeight: 1.7, marginBottom: '24px' }}>
            Não adianta dominar as linhas se você não souber calibrar o tamanho da sua aposta (stake). 
            O seu diário de apostas deve seguir esta estrutura profissional:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            {/* Safety Lines */}
            <div style={{
              background: '#111118',
              border: '1px solid rgba(78,205,196,0.2)',
              borderRadius: '14px',
              padding: '22px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Shield size={20} style={{ color: '#4ecdc4' }} />
                <h4 style={{ fontWeight: 800, color: '#4ecdc4', margin: 0, fontSize: '0.95rem', textTransform: 'uppercase' }}>
                  Linhas de Segurança Máxima
                </h4>
              </div>
              <p style={{ color: '#aaa', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '12px' }}>
                Exemplos: <strong style={{ color: '#ddd' }}>HA +1.5</strong> com probabilidade <strong style={{ color: 'var(--brand-neon)' }}>&gt;80%</strong>
              </p>
              <div style={{
                background: 'rgba(78,205,196,0.06)',
                borderRadius: '8px',
                padding: '12px 16px',
                textAlign: 'center'
              }}>
                <span style={{ color: '#4ecdc4', fontWeight: 800, fontSize: '1.1rem' }}>1.5 a 2.0 Unidades</span>
                <p style={{ color: '#888', fontSize: '0.78rem', margin: 0, marginTop: '4px' }}>Topo da gestão de risco</p>
              </div>
            </div>

            {/* Aggressive Lines */}
            <div style={{
              background: '#111118',
              border: '1px solid rgba(255,107,107,0.2)',
              borderRadius: '14px',
              padding: '22px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Sword size={20} style={{ color: '#ff6b6b' }} />
                <h4 style={{ fontWeight: 800, color: '#ff6b6b', margin: 0, fontSize: '0.95rem', textTransform: 'uppercase' }}>
                  Linhas Negativas Agressivas
                </h4>
              </div>
              <p style={{ color: '#aaa', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '12px' }}>
                Exemplos: <strong style={{ color: '#ddd' }}>HA -1.0</strong> ou <strong style={{ color: '#ddd' }}>HA -1.5</strong>
              </p>
              <div style={{
                background: 'rgba(255,107,107,0.06)',
                borderRadius: '8px',
                padding: '12px 16px',
                textAlign: 'center'
              }}>
                <span style={{ color: '#ff6b6b', fontWeight: 800, fontSize: '1.1rem' }}>0.5 a 1.0 Unidade</span>
                <p style={{ color: '#888', fontSize: '0.78rem', margin: 0, marginTop: '4px' }}>Proteger — maior variância no longo prazo</p>
              </div>
            </div>
          </div>

          {/* +EV Rule */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(204,255,0,0.04), rgba(78,205,196,0.04))',
            border: '1px solid rgba(204,255,0,0.2)',
            borderRadius: '16px',
            padding: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <TrendingUp size={22} style={{ color: 'var(--brand-neon)' }} />
              <h4 style={{ fontWeight: 800, color: 'var(--brand-neon)', margin: 0, fontSize: '1rem', textTransform: 'uppercase' }}>
                Regra Final: Cálculo de +EV
              </h4>
            </div>
            <p style={{ color: '#bbb', fontSize: '0.92rem', lineHeight: 1.7, margin: 0 }}>
              Só confirme o clique se a <strong style={{ color: '#fff' }}>odd oferecida pela casa</strong> for 
              <strong style={{ color: 'var(--brand-neon)' }}> maior</strong> do que a <strong style={{ color: '#fff' }}>Odd Justa</strong> calculada 
              pela probabilidade do seu algoritmo. Essa diferença é a sua <strong style={{ color: 'var(--brand-neon)' }}>margem de valor (+EV)</strong> — 
              o fator que separa apostadores recreativos de investidores esportivos profissionais.
            </p>

            <FormulaBox>
              +EV = (Prob. Real × Odd Casa) - 1 &gt; 0 → ✅ Apostar
            </FormulaBox>
          </div>
        </section>

        {/* ── Quick Visual Summary ── */}
        <div style={{
          background: '#111118',
          border: '1px solid #222',
          borderRadius: '16px',
          padding: '28px',
          marginTop: '8px'
        }}>
          <h3 style={{ fontWeight: 800, fontSize: '1.15rem', color: '#fff', marginBottom: '20px', textTransform: 'uppercase' }}>
            📋 Resumo Rápido das Linhas
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {[
              { line: '+1.5', desc: 'Proteção máxima', color: '#4ecdc4', risk: 'Baixo' },
              { line: '+1.0', desc: 'Escudo c/ reembolso', color: '#4ecdc4', risk: 'Baixo' },
              { line: '+0.5', desc: 'Dupla chance', color: '#4ecdc4', risk: 'Médio' },
              { line: '0.0', desc: 'Draw No Bet', color: '#ffd93d', risk: 'Médio' },
              { line: '-0.5', desc: 'Vitória seca', color: '#ff6b6b', risk: 'Alto' },
              { line: '-1.0', desc: 'Margem de gols', color: '#ff6b6b', risk: 'Alto' },
            ].map(item => (
              <div key={item.line} style={{
                background: '#0d0d12',
                border: `1px solid ${item.color}22`,
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <span style={{ fontWeight: 900, fontSize: '1.2rem', color: item.color }}>HA {item.line}</span>
                <span style={{ color: '#aaa', fontSize: '0.82rem' }}>{item.desc}</span>
                <span style={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 700, 
                  textTransform: 'uppercase', 
                  color: '#666',
                  letterSpacing: '1px',
                  marginTop: '4px'
                }}>
                  Risco: {item.risk}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Back to Tutorial CTA ── */}
        <div style={{ textAlign: 'center', paddingTop: '12px', paddingBottom: '20px' }}>
          <Link href="/tutorial" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--brand-neon)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 700,
            padding: '12px 24px',
            borderRadius: '10px',
            background: 'rgba(204,255,0,0.06)',
            border: '1px solid rgba(204,255,0,0.15)',
            transition: 'all 0.2s ease',
          }}>
            <ArrowLeft size={18} />
            Voltar ao Tutorial Principal
          </Link>
        </div>

      </div>
    </div>
  );
}
