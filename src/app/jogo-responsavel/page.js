'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { 
  HeartHandshake, 
  ShieldAlert, 
  BookOpen, 
  Compass, 
  Brain, 
  HelpCircle, 
  Calculator, 
  History, 
  TrendingUp, 
  CheckCircle, 
  AlertOctagon, 
  CheckSquare, 
  PhoneCall,
  ArrowLeft
} from 'lucide-react';

export default function JogoResponsavelPage() {
  const { user } = useAuth();
  const backHref = user ? '/dashboard' : '/';
  const backLabel = user ? 'Voltar ao Dashboard' : 'Voltar à Página Inicial';

  return (
    <div style={{
      padding: '20px',
      maxWidth: '1000px',
      margin: '0 auto',
      width: '100%',
      fontFamily: 'Outfit, system-ui, sans-serif',
      color: '#fff',
      lineHeight: 1.6
    }}>
      {/* Header Section */}
      <div style={{ marginBottom: '40px', borderBottom: '1px solid #1f1f2e', paddingBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--brand-neon)', marginBottom: '12px' }}>
          <HeartHandshake size={28} />
          <span style={{ fontSize: '0.9rem', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Saúde & Educação Financeira
          </span>
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.2 }}>
          Guia Operacional & Jogo Responsável
        </h1>
        <p style={{ color: '#888', marginTop: '12px', fontSize: '1.1rem', maxWidth: '800px', lineHeight: 1.6 }}>
          Entenda como utilizar cada ferramenta da nossa plataforma de forma profissional e conheça os limites psicológicos e matemáticos necessários para manter as apostas como uma atividade saudável e sob controle.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
        
        {/* SECTION 1: GUIA OPERACIONAL */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: '#1c1c24', color: 'var(--brand-neon)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
              <Compass size={22} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
              1. Guia de Operação do Aplicativo
            </h2>
          </div>
          <p style={{ color: '#aaa', marginBottom: '24px' }}>
            Nosso aplicativo foi desenvolvido como um software de análise estatística esportiva. Ele não realiza apostas diretamente, mas sim extrai desajustes nas probabilidades. Abaixo está o funcionamento de cada módulo principal:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{ background: '#141419', border: '1px solid #222', padding: '20px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Calculator size={18} color="var(--brand-neon)" />
                <h4 style={{ fontWeight: 'bold', color: '#fff', margin: 0 }}>Calculadora de Poisson</h4>
              </div>
              <p style={{ color: '#888', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
                Simula o número esperado de gols (xG) de cada equipe com base no ataque/defesa histórico e no momentum ao vivo. Gera as probabilidades exatas para mercados como 1X2, Dupla Chance, Ambas Marcam e Over/Under de gols.
              </p>
            </div>

            <div style={{ background: '#141419', border: '1px solid #222', padding: '20px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <TrendingUp size={18} color="var(--brand-neon)" />
                <h4 style={{ fontWeight: 'bold', color: '#fff', margin: 0 }}>Filtros & Oportunidades</h4>
              </div>
              <p style={{ color: '#888', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
                Cruza em tempo real a probabilidade matemática gerada por nosso algoritmo com as cotações (odds) oferecidas pelas casas de apostas. Identifica e sinaliza quando a odd da casa é maior do que a probabilidade real (+EV).
              </p>
            </div>

            <div style={{ background: '#141419', border: '1px solid #222', padding: '20px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <History size={18} color="var(--brand-neon)" />
                <h4 style={{ fontWeight: 'bold', color: '#fff', margin: 0 }}>Backtest de Estratégias</h4>
              </div>
              <p style={{ color: '#888', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
                Permite testar regras de entradas em jogos passados (ex: entrar em Over 1.5 se o xG for maior que X aos Y minutos). Ajuda a provar estatisticamente se um método é vencedor a longo prazo antes de colocar dinheiro real.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: COMO ESTUDAR OS JOGOS */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: '#1c1c24', color: 'var(--brand-neon)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
              <BookOpen size={22} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
              2. Como Estudar os Jogos de Forma Científica
            </h2>
          </div>
          <p style={{ color: '#aaa', marginBottom: '20px' }}>
            Apostadores recreativos confiam na "intuição", no "amor ao time" ou em sentimentos subjetivos. O verdadeiro investidor esportivo estuda os jogos de forma fria e metódica:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#141416', borderLeft: '4px solid var(--brand-neon)', padding: '16px', borderRadius: '0 8px 8px 0' }}>
              <strong style={{ color: '#fff', display: 'block', marginBottom: '6px' }}>Análise PrPré-Live Avançada</strong>
              <span style={{ color: '#888', fontSize: '0.9rem' }}>
                Antes do jogo começar, verifique desfalques de última hora, motivação da tabela (ex: times brigando por rebaixamento ou poupando para copas) e as condições climáticas. Utilize nossa calculadora para ver se a cotação oferecida pré-live tem real valor esperado (+EV).
              </span>
            </div>

            <div style={{ background: '#141416', borderLeft: '4px solid var(--brand-neon)', padding: '16px', borderRadius: '0 8px 8px 0' }}>
              <strong style={{ color: '#fff', display: 'block', marginBottom: '6px' }}>Volume e Pressão no Live</strong>
              <span style={{ color: '#888', fontSize: '0.9rem' }}>
                No live, observe os gráficos de pressão. A posse de bola estéril no meio de campo é muito diferente de um time com alto índice de ataques perigosos e finalizações dentro da área. Nosso indicador live ajuda a filtrar a pressão real.
              </span>
            </div>

            <div style={{ background: '#141416', borderLeft: '4px solid var(--brand-neon)', padding: '16px', borderRadius: '0 8px 8px 0' }}>
              <strong style={{ color: '#fff', display: 'block', marginBottom: '6px' }}>Anotação e Amostragem</strong>
              <span style={{ color: '#888', fontSize: '0.9rem' }}>
                Uma amostra de 10 ou 20 jogos não diz nada sobre seu desempenho. Registre rigorosamente todas as entradas no histórico ou carteira pessoal. A consistência matemática só se revela após 200 a 500 entradas padronizadas.
              </span>
            </div>
          </div>
        </section>

        {/* SECTION 3: VÍCIO EM JOGOS (LUDOPATIA) */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: '#1c1c24', color: '#ff4d4d', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
              <ShieldAlert size={22} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', margin: 0, color: '#ff4d4d' }}>
              3. O Perigo e os Sinais do Vício em Jogos de Azar
            </h2>
          </div>
          <p style={{ color: '#aaa', marginBottom: '20px' }}>
            O transtorno do jogo (ludopatia) é uma doença reconhecida clinicamente pela Organização Mundial da Saúde. A excitação de ganhar ou a pressa para recuperar o dinheiro perdido causam picos de dopamina no cérebro similares ao uso de substâncias químicas.
          </p>

          <div style={{ background: 'rgba(255, 77, 77, 0.04)', border: '1px solid rgba(255, 77, 77, 0.2)', padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#ff4d4d', fontWeight: 'bold', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertOctagon size={18} /> SINAIS DE ALERTA (FAÇA UMA AUTO-AVALIAÇÃO)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', fontSize: '0.92rem', color: '#ccc' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <CheckSquare size={16} style={{ color: '#ff4d4d', flexShrink: 0, marginTop: '3px' }} />
                <span>Sentir necessidade de apostar valores cada vez maiores para obter a mesma emoção.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <CheckSquare size={16} style={{ color: '#ff4d4d', flexShrink: 0, marginTop: '3px' }} />
                <span>Ficar irritado, impaciente ou ansioso quando tenta reduzir ou parar de apostar.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <CheckSquare size={16} style={{ color: '#ff4d4d', flexShrink: 0, marginTop: '3px' }} />
                <span>Apostar para fugir de problemas, estresse, ansiedade, depressão ou solidão.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <CheckSquare size={16} style={{ color: '#ff4d4d', flexShrink: 0, marginTop: '3px' }} />
                <span>Tentar recuperar imediatamente as perdas do dia fazendo novas apostas impulsivas (perseguição de perdas).</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <CheckSquare size={16} style={{ color: '#ff4d4d', flexShrink: 0, marginTop: '3px' }} />
                <span>Mentir para familiares, amigos ou parceiros sobre o tempo e o dinheiro gastos com jogo.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <CheckSquare size={16} style={{ color: '#ff4d4d', flexShrink: 0, marginTop: '3px' }} />
                <span>Usar dinheiro destinado a contas essenciais (aluguel, alimentação, saúde) para apostar.</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: CONTROLE PSICOLÓGICO */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: '#1c1c24', color: 'var(--brand-neon)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
              <Brain size={22} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
              4. Cuidado Psicológico e Blindagem Emocional
            </h2>
          </div>
          <p style={{ color: '#aaa', marginBottom: '24px' }}>
            Operar nos mercados esportivos exige o mesmo preparo mental de um operador de bolsa de valores ou cirurgião. A ganância e o medo são seus maiores inimigos. Siga estas diretrizes de ouro:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{ background: '#111116', border: '1px solid #222', padding: '20px', borderRadius: '12px' }}>
              <h4 style={{ color: 'var(--brand-neon)', fontWeight: 'bold', fontSize: '1rem', marginTop: 0, marginBottom: '10px' }}>O Dinheiro do Jogo Não Existe</h4>
              <p style={{ color: '#888', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                Só deposite valores que você esteja 100% confortável em perder. Se a perda desse dinheiro causar qualquer impacto na sua vida pessoal ou familiar, retire-o imediatamente. Considere-o um custo de entretenimento ou estudo.
              </p>
            </div>

            <div style={{ background: '#111116', border: '1px solid #222', padding: '20px', borderRadius: '12px' }}>
              <h4 style={{ color: 'var(--brand-neon)', fontWeight: 'bold', fontSize: '1rem', marginTop: 0, marginBottom: '10px' }}>Aceite o Red (Dia de Perda)</h4>
              <p style={{ color: '#888', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                A estatística garante que haverá dias ruins consecutivos (bad runs). Tentar "recuperar o red" é o atalho mais rápido para quebrar sua banca. Aceite o resultado ruim do dia, desligue o computador e volte apenas no dia seguinte com a mente fria.
              </p>
            </div>

            <div style={{ background: '#111116', border: '1px solid #222', padding: '20px', borderRadius: '12px' }}>
              <h4 style={{ color: 'var(--brand-neon)', fontWeight: 'bold', fontSize: '1rem', marginTop: 0, marginBottom: '10px' }}>Crie Regras Limite e Pare</h4>
              <p style={{ color: '#888', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                Estabeleça um limite diário de stop-loss (ex: máximo de 3 unidades perdidas no dia) e de stop-win (ex: parar após bater 2 unidades de lucro). A disciplina de saber a hora de parar garante sua sobrevivência no mercado.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 5: ONDE BUSCAR AJUDA */}
        <section style={{
          background: 'linear-gradient(135deg, rgba(204, 255, 0, 0.02) 0%, rgba(255, 77, 77, 0.03) 100%)',
          border: '1px solid rgba(255, 77, 77, 0.15)',
          borderRadius: '16px',
          padding: '28px'
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <PhoneCall size={32} style={{ color: '#ff4d4d', flexShrink: 0, marginTop: '4px' }} />
            <div>
              <h3 style={{ fontWeight: 800, fontSize: '1.25rem', color: '#ff4d4d', margin: '0 0 10px 0', textTransform: 'uppercase' }}>
                Precisa de Conversar ou de Ajuda Gratuita?
              </h3>
              <p style={{ color: '#ccc', fontSize: '0.92rem', lineHeight: 1.6, margin: 0, marginBottom: '16px' }}>
                Se você ou alguém que você conhece perdeu o controle das apostas, sente angústia, ansiedade ou está passando por problemas financeiros decorrentes do jogo, lembre-se que você não está sozinho e há ajuda gratuita, anônima e acolhedora disponível:
              </p>
              
              <ul style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: 1.7, paddingLeft: '20px', margin: 0 }}>
                <li>
                  <strong style={{ color: '#fff' }}>Jogadores Anônimos do Brasil:</strong> Reuniões presenciais e online gratuitas em todo o país. Acesse o site oficial: <a href="https://jogadoresanonimos.com.br" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-neon)', textDecoration: 'underline' }}>jogadoresanonimos.com.br</a>.
                </li>
                <li>
                  <strong style={{ color: '#fff' }}>PRO-AMJO (Instituto de Psiquiatria do HC-USP):</strong> Programa ambulatorial especializado em jogo patológico.
                </li>
                <li>
                  <strong style={{ color: '#fff' }}>CVV (Centro de Valorização da Vida):</strong> Apoio emocional gratuito e sigiloso 24 horas por dia por telefone ligando <strong style={{ color: '#fff' }}>188</strong> ou através do chat online em <a href="https://www.cvv.org.br" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-neon)', textDecoration: 'underline' }}>cvv.org.br</a>.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Back Button */}
        <div style={{ marginTop: '20px' }}>
          <Link 
            href={backHref}
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
            <span>{backLabel}</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
