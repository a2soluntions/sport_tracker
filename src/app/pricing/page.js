'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Zap, CheckCircle2, ShieldCheck, CreditCard, QrCode, Clipboard, ClipboardCheck, Loader2, ArrowLeft } from 'lucide-react';

export default function PricingPage() {
  const router = useRouter();
  const { user, upgradePlan, getTrialDaysLeft } = useAuth();
  
  const [selectedPlan, setSelectedPlan] = useState(null); // 'pro' ou 'vip'
  const [showCheckout, setShowCheckout] = useState(false);
  const [activeTab, setActiveTab] = useState('pix'); // 'pix' ou 'card'
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle'); // 'idle' | 'processing' | 'success'
  
  // Dados de cartão fictícios
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');

  const plans = {
    gratis: { name: 'Grátis (Trial)', price: 'R$ 0,00', days: 7 },
    pro: { name: 'PRO', price: 'R$ 19,90', priceVal: 19.90 },
    vip: { name: 'VIP Elite', price: 'R$ 49,90', priceVal: 49.90 }
  };

  // Simular contagem regressiva para confirmação automática do Pix (7 segundos)
  useEffect(() => {
    let timer;
    if (showCheckout && activeTab === 'pix' && paymentStatus === 'idle') {
      timer = setTimeout(() => {
        handlePaymentSuccess();
      }, 7000);
    }
    return () => clearTimeout(timer);
  }, [showCheckout, activeTab, paymentStatus]);

  const handleOpenCheckout = (planKey) => {
    if (!user) {
      router.push('/login');
      return;
    }
    setSelectedPlan(planKey);
    setShowCheckout(true);
    setPaymentStatus('idle');
    setCopied(false);
  };

  const handleCopyPix = () => {
    const pixCode = `00020101021226870014br.gov.bcb.pix2565mercadopago.pix.oddssentry.com/checkout/pay?ref=ev_prod_${selectedPlan}_${Date.now()}`;
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCardSubmit = (e) => {
    e.preventDefault();
    if (!cardNumber || !cardName || !cardExpiry || !cardCVV) return;

    setPaymentStatus('processing');
    setTimeout(() => {
      handlePaymentSuccess();
    }, 2500);
  };

  const handlePaymentSuccess = () => {
    setPaymentStatus('success');
    // Efetivar plano
    upgradePlan(selectedPlan);
  };

  return (
    <div style={{ padding: '24px', color: '#fff', fontFamily: 'system-ui, sans-serif', maxWidth: '1000px', margin: '0 auto', paddingBottom: '80px' }}>
      
      {/* Botão de Voltar */}
      <button 
        onClick={() => router.push('/')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'transparent',
          border: 'none',
          color: '#aaa',
          cursor: 'pointer',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          marginBottom: '30px',
          transition: 'color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#aaa'}
      >
        <ArrowLeft size={16} />
        <span>Voltar ao Painel</span>
      </button>

      {/* Título */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <span style={{
          background: 'rgba(204, 255, 0, 0.1)',
          color: 'var(--brand-neon)',
          border: '1px solid rgba(204, 255, 0, 0.2)',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          letterSpacing: '1px',
          textTransform: 'uppercase'
        }}>
          Assinaturas & Upgrade
        </span>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, marginTop: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Escolha seu Plano de Acesso
        </h1>
        <p style={{ color: '#aaa', fontSize: '1rem', marginTop: '10px', maxWidth: '600px', margin: '10px auto 0 auto', lineHeight: 1.5 }}>
          Desbloqueie o máximo poder do modelo de Poisson com sinais instantâneos +EV, calculadora automatizada e envio automático no Telegram.
        </p>
      </div>

      {/* Grid de Planos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        marginTop: '20px'
      }}>
        
        {/* Plano Grátis */}
        <div style={{
          background: '#111116',
          border: '1px solid #222',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          opacity: 0.8
        }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Grátis (Trial)</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '16px 0' }}>
              <span style={{ fontSize: '2rem', fontWeight: 900 }}>R$ 0,00</span>
              <span style={{ color: '#888', fontSize: '0.85rem' }}>/ 7 dias</span>
            </div>
            <p style={{ color: '#888', fontSize: '0.82rem', lineHeight: 1.4, marginBottom: '24px' }}>
              Período de testes completo para conhecer o sistema, coletar odds e testar os alertas.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #222', paddingTop: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.82rem', color: '#ccc' }}>
                <CheckCircle2 size={16} color="var(--brand-neon)" style={{ flexShrink: 0 }} />
                <span>Acesso total por 7 dias</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.82rem', color: '#ccc' }}>
                <CheckCircle2 size={16} color="var(--brand-neon)" style={{ flexShrink: 0 }} />
                <span>Alertas +EV de alta e baixa margem</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.82rem', color: '#ccc' }}>
                <CheckCircle2 size={16} color="var(--brand-neon)" style={{ flexShrink: 0 }} />
                <span>Acompanhamento da rodada</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '30px' }}>
            {user?.plan === 'gratis' ? (
              <div style={{
                textAlign: 'center',
                padding: '12px',
                background: '#161622',
                border: '1px dashed #333',
                borderRadius: '8px',
                color: 'var(--brand-neon)',
                fontWeight: 'bold',
                fontSize: '0.85rem'
              }}>
                Trial Ativo ({getTrialDaysLeft()} dias restantes)
              </div>
            ) : (
              <button 
                disabled 
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #222',
                  background: 'transparent',
                  color: '#666',
                  fontWeight: 'bold',
                  cursor: 'not-allowed',
                  fontSize: '0.9rem'
                }}
              >
                Trial Concluído
              </button>
            )}
          </div>
        </div>

        {/* Plano PRO (Recomendado Neon) */}
        <div style={{
          background: '#111116',
          border: '2px solid var(--brand-neon)',
          boxShadow: '0 0 20px rgba(204, 255, 0, 0.08)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          transform: 'scale(1.02)'
        }}>
          {/* Badge Popular */}
          <div style={{
            position: 'absolute',
            top: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--brand-neon)',
            color: '#000',
            fontSize: '0.68rem',
            fontWeight: '900',
            padding: '4px 14px',
            borderRadius: '20px',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            boxShadow: '0 2px 10px rgba(204, 255, 0, 0.3)'
          }}>
            MAIS POPULAR
          </div>

          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>PRO</span>
              <Zap size={16} color="var(--brand-neon)" fill="var(--brand-neon)" />
            </h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '16px 0' }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--brand-neon)' }}>R$ 19,90</span>
              <span style={{ color: '#888', fontSize: '0.85rem' }}>/ mês</span>
            </div>
            <p style={{ color: '#aaa', fontSize: '0.82rem', lineHeight: 1.4, marginBottom: '24px' }}>
              O melhor custo-benefício. Acesso ilimitado às True Odds e sinais contínuos +EV.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #222', paddingTop: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.82rem', color: '#ccc' }}>
                <CheckCircle2 size={16} color="var(--brand-neon)" style={{ flexShrink: 0 }} />
                <strong>Acesso Vitalício/Ilimitado</strong>
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.82rem', color: '#ccc' }}>
                <CheckCircle2 size={16} color="var(--brand-neon)" style={{ flexShrink: 0 }} />
                <span>Todos os Alertas +EV de Valor Real</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.82rem', color: '#ccc' }}>
                <CheckCircle2 size={16} color="var(--brand-neon)" style={{ flexShrink: 0 }} />
                <span>Calculadora de Banca Kelly/Stake Exata</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.82rem', color: '#ccc' }}>
                <CheckCircle2 size={16} color="var(--brand-neon)" style={{ flexShrink: 0 }} />
                <span>Filtro de Ligas Premium Dinâmico</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '30px' }}>
            {user?.plan === 'pro' ? (
              <button 
                disabled 
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(76, 175, 80, 0.4)',
                  background: 'rgba(76, 175, 80, 0.1)',
                  color: '#4CAF50',
                  fontWeight: 'bold',
                  cursor: 'not-allowed',
                  fontSize: '0.9rem'
                }}
              >
                ✓ Plano Atual Ativo
              </button>
            ) : (
              <button 
                onClick={() => handleOpenCheckout('pro')}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--brand-neon)',
                  color: '#000',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  boxShadow: '0 4px 15px rgba(204, 255, 0, 0.25)',
                  transition: 'transform 0.2s'
                }}
                className="btn-pulse"
              >
                Assinar Plano PRO ⚡
              </button>
            )}
          </div>
        </div>

        {/* Plano VIP Elite */}
        <div style={{
          background: '#111116',
          border: '1px solid #b339ff',
          boxShadow: '0 0 15px rgba(179, 57, 255, 0.05)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative'
        }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#b339ff' }}>VIP Elite</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '16px 0' }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: '#b339ff' }}>R$ 49,90</span>
              <span style={{ color: '#888', fontSize: '0.85rem' }}>/ mês</span>
            </div>
            <p style={{ color: '#aaa', fontSize: '0.82rem', lineHeight: 1.4, marginBottom: '24px' }}>
              Para consultorias e integradores de canais de tipster. Notificações automáticas irrestritas.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #222', paddingTop: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.82rem', color: '#ccc' }}>
                <CheckCircle2 size={16} color="#b339ff" style={{ flexShrink: 0 }} />
                <strong>Funcionalidades PRO inclusas</strong>
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.82rem', color: '#ccc' }}>
                <CheckCircle2 size={16} color="#b339ff" style={{ flexShrink: 0 }} />
                <span>Integração de Bot e Notificações via Telegram</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.82rem', color: '#ccc' }}>
                <CheckCircle2 size={16} color="#b339ff" style={{ flexShrink: 0 }} />
                <span>Canal VIP com 100% de automação de sinais</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.82rem', color: '#ccc' }}>
                <CheckCircle2 size={16} color="#b339ff" style={{ flexShrink: 0 }} />
                <span>Suporte prioritário e chave API para desenvolvedores</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '30px' }}>
            {user?.plan === 'vip' ? (
              <button 
                disabled 
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(76, 175, 80, 0.4)',
                  background: 'rgba(76, 175, 80, 0.1)',
                  color: '#4CAF50',
                  fontWeight: 'bold',
                  cursor: 'not-allowed',
                  fontSize: '0.9rem'
                }}
              >
                ✓ Plano VIP Ativo
              </button>
            ) : (
              <button 
                onClick={() => handleOpenCheckout('vip')}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#b339ff',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  boxShadow: '0 4px 15px rgba(179, 57, 255, 0.2)',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                Assinar Plano VIP 💎
              </button>
            )}
          </div>
        </div>

      </div>

      {/* MODAL DE CHECKOUT MERCADO PAGO SIMULADO */}
      {showCheckout && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000
        }}>
          
          <div style={{
            width: '90%',
            maxWidth: '460px',
            background: '#fff',
            color: '#333',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            
            {/* Header Mercado Pago */}
            <div style={{
              background: '#009ee3',
              color: '#fff',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} />
                <span style={{ fontWeight: 'bold', fontSize: '1rem', letterSpacing: '0.5px' }}>MERCADO PAGO</span>
              </div>
              <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                Ambiente Seguro
              </span>
            </div>

            {/* Corpo do Checkout */}
            {paymentStatus === 'success' ? (
              /* Sucesso */
              <div style={{ padding: '40px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: '#4CAF50', color: '#fff', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(76,175,80,0.3)', marginBottom: '8px' }}>
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#2e7d32', margin: 0 }}>Pagamento Aprovado!</h3>
                <p style={{ color: '#666', fontSize: '0.9rem', margin: 0, lineHeight: 1.4 }}>
                  Assinatura do plano **{plans[selectedPlan]?.name}** ativada instantaneamente. O motor +EV agora está 100% liberado para você!
                </p>
                
                <button
                  onClick={() => {
                    setShowCheckout(false);
                    router.push('/');
                  }}
                  style={{
                    background: '#009ee3',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    width: '100%',
                    marginTop: '20px',
                    boxShadow: '0 4px 10px rgba(0, 158, 227, 0.2)'
                  }}
                >
                  Ir para o Painel Principal 🚀
                </button>
              </div>
            ) : paymentStatus === 'processing' ? (
              /* Processando */
              <div style={{ padding: '60px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <Loader2 className="spin" size={40} color="#009ee3" />
                <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333', margin: 0 }}>Processando Pagamento...</h4>
                <p style={{ color: '#888', fontSize: '0.82rem', margin: 0 }}>
                  Aguarde, estamos validando a transação junto à operadora do cartão.
                </p>
              </div>
            ) : (
              /* Idle - Seleção de Pagamento */
              <div style={{ padding: '20px' }}>
                {/* Info do Produto */}
                <div style={{ background: '#f5f5f7', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', border: '1px solid #e1e1e5' }}>
                  <div style={{ fontSize: '0.78rem', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>Produto selecionado:</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#111' }}>Assinatura {plans[selectedPlan]?.name}</span>
                    <span style={{ fontWeight: '900', fontSize: '1.1rem', color: '#009ee3' }}>{plans[selectedPlan]?.price}</span>
                  </div>
                </div>

                {/* Seletor de abas de pagamento */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e1e1e5', marginBottom: '20px' }}>
                  <button 
                    onClick={() => setActiveTab('pix')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: activeTab === 'pix' ? '3px solid #009ee3' : 'none',
                      color: activeTab === 'pix' ? '#009ee3' : '#666',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <QrCode size={18} />
                    <span>Pix Instantâneo</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('card')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: activeTab === 'card' ? '3px solid #009ee3' : 'none',
                      color: activeTab === 'card' ? '#009ee3' : '#666',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <CreditCard size={18} />
                    <span>Cartão de Crédito</span>
                  </button>
                </div>

                {/* Conteúdo Aba Pix */}
                {activeTab === 'pix' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    {/* QR Code Fake */}
                    <div style={{ 
                      background: '#fff', 
                      border: '1px solid #e1e1e5', 
                      borderRadius: '8px', 
                      padding: '12px', 
                      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {/* SVG representativo do QR Code com logo do Mercado Pago e Pix */}
                      <svg width="150" height="150" viewBox="0 0 150 150">
                        {/* Fundo Branco */}
                        <rect width="150" height="150" fill="#fff" />
                        {/* Simulação de QR Code Pix */}
                        <rect x="10" y="10" width="35" height="35" fill="#000" />
                        <rect x="15" y="15" width="25" height="25" fill="#fff" />
                        <rect x="20" y="20" width="15" height="15" fill="#000" />
                        
                        <rect x="105" y="10" width="35" height="35" fill="#000" />
                        <rect x="110" y="15" width="25" height="25" fill="#fff" />
                        <rect x="115" y="20" width="15" height="15" fill="#000" />
                        
                        <rect x="10" y="105" width="35" height="35" fill="#000" />
                        <rect x="15" y="110" width="25" height="25" fill="#fff" />
                        <rect x="20" y="115" width="15" height="15" fill="#000" />
                        
                        {/* Detalhes aleatórios simulando QR code */}
                        <rect x="55" y="15" width="10" height="20" fill="#000" />
                        <rect x="75" y="10" width="15" height="10" fill="#000" />
                        <rect x="55" y="45" width="25" height="15" fill="#000" />
                        <rect x="90" y="35" width="10" height="25" fill="#000" />
                        <rect x="15" y="55" width="20" height="10" fill="#000" />
                        <rect x="10" y="75" width="30" height="15" fill="#000" />
                        
                        <rect x="55" y="70" width="40" height="20" fill="#32b5ad" /> {/* Cor Pix */}
                        <rect x="105" y="55" width="30" height="10" fill="#000" />
                        <rect x="115" y="75" width="15" height="25" fill="#000" />
                        <rect x="55" y="105" width="15" height="15" fill="#000" />
                        <rect x="80" y="100" width="20" height="35" fill="#000" />
                        <rect x="110" y="115" width="25" height="20" fill="#000" />

                        {/* Logo Centralizado Pix */}
                        <rect x="62" y="62" width="26" height="26" rx="4" fill="#32b5ad" />
                        <polygon points="75,66 82,75 75,84 68,75" fill="#fff" />
                      </svg>
                      <span style={{ fontSize: '0.72rem', color: '#666', fontWeight: 'bold' }}>Chave Pix ID: oddssentry_mp_prod</span>
                    </div>

                    <p style={{ color: '#666', fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.4, margin: '0 10px' }}>
                      Escaneie o QR Code acima usando o aplicativo do seu banco ou copie a chave Pix abaixo.
                    </p>

                    {/* Copia e Cola */}
                    <div style={{ width: '100%', display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        readOnly 
                        value="oddssentry_mp_checkout_code_98374987239847239" 
                        style={{
                          flex: 1,
                          padding: '10px',
                          border: '1px solid #e1e1e5',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          background: '#f5f5f7',
                          color: '#555',
                          outline: 'none',
                          fontFamily: 'monospace'
                        }}
                      />
                      <button 
                        onClick={handleCopyPix}
                        style={{
                          padding: '10px 14px',
                          background: copied ? '#4CAF50' : '#009ee3',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontWeight: 'bold',
                          fontSize: '0.8rem',
                          transition: 'background 0.2s',
                          minWidth: '100px'
                        }}
                      >
                        {copied ? <ClipboardCheck size={16} /> : <Clipboard size={16} />}
                        <span>{copied ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>

                    {/* Info de Aguardando */}
                    <div style={{ 
                      width: '100%', 
                      background: 'rgba(0, 158, 227, 0.05)', 
                      border: '1px solid rgba(0, 158, 227, 0.15)', 
                      borderRadius: '8px', 
                      padding: '10px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      fontSize: '0.78rem',
                      color: '#009ee3',
                      fontWeight: '500'
                    }}>
                      <Loader2 className="spin" size={14} />
                      <span>Aguardando sinal Pix... (Confirma automaticamente em 7s)</span>
                    </div>

                  </div>
                )}

                {/* Conteúdo Aba Cartão */}
                {activeTab === 'card' && (
                  <form onSubmit={handleCardSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', color: '#666', fontWeight: 'bold' }}>Número do Cartão</label>
                      <input 
                        type="text" 
                        placeholder="0000 0000 0000 0000"
                        required
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                        maxLength="19"
                        style={{ padding: '10px 14px', border: '1px solid #e1e1e5', borderRadius: '6px', fontSize: '0.9rem', color: '#333', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', color: '#666', fontWeight: 'bold' }}>Nome Impresso no Cartão</label>
                      <input 
                        type="text" 
                        placeholder="Ex: JOÃO SILVA"
                        required
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value.toUpperCase())}
                        style={{ padding: '10px 14px', border: '1px solid #e1e1e5', borderRadius: '6px', fontSize: '0.9rem', color: '#333', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <label style={{ fontSize: '0.75rem', color: '#666', fontWeight: 'bold' }}>Vencimento (MM/AA)</label>
                        <input 
                          type="text" 
                          placeholder="MM/AA"
                          required
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          maxLength="5"
                          style={{ padding: '10px 14px', border: '1px solid #e1e1e5', borderRadius: '6px', fontSize: '0.9rem', color: '#333', outline: 'none', textAlign: 'center' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <label style={{ fontSize: '0.75rem', color: '#666', fontWeight: 'bold' }}>CVV (Segurança)</label>
                        <input 
                          type="text" 
                          placeholder="123"
                          required
                          value={cardCVV}
                          onChange={(e) => setCardCVV(e.target.value)}
                          maxLength="4"
                          style={{ padding: '10px 14px', border: '1px solid #e1e1e5', borderRadius: '6px', fontSize: '0.9rem', color: '#333', outline: 'none', textAlign: 'center' }}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      style={{
                        background: '#009ee3',
                        color: '#fff',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        marginTop: '10px',
                        boxShadow: '0 4px 10px rgba(0, 158, 227, 0.2)'
                      }}
                    >
                      Pagar com Cartão {plans[selectedPlan]?.price}
                    </button>
                  </form>
                )}

                {/* Rodapé Fechar */}
                <button 
                  onClick={() => setShowCheckout(false)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: '#888',
                    padding: '8px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    marginTop: '16px',
                    textDecoration: 'underline'
                  }}
                >
                  Voltar e escolher outro plano
                </button>

              </div>
            )}

          </div>

        </div>
      )}

      {/* Animações CSS */}
      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .btn-pulse {
          animation: pulseShadow 2.5s infinite;
        }
        @keyframes pulseShadow {
          0% { box-shadow: 0 0 0 0 rgba(204, 255, 0, 0.5); }
          70% { box-shadow: 0 0 0 10px rgba(204, 255, 0, 0); }
          100% { box-shadow: 0 0 0 0 rgba(204, 255, 0, 0); }
        }
      `}</style>

    </div>
  );
}
