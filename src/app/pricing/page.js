'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Zap, CheckCircle2, ShieldCheck, CreditCard, QrCode, Clipboard, ClipboardCheck, Loader2, ArrowLeft } from 'lucide-react';
import AlertModal from '../../components/AlertModal';

const translateError = (message) => {
  if (!message) return '';
  const lower = message.toLowerCase();
  if (lower.includes('unauthorized') || lower.includes('policy returned')) {
    return 'Credenciais do Mercado Pago inválidas ou não autorizadas. Verifique as configurações do Token de Acesso no seu arquivo .env ou painel da Vercel.';
  }
  if (lower.includes('access token') || lower.includes('token_invalid')) {
    return 'Token de acesso inválido ou expirado. Por favor, verifique as configurações.';
  }
  return message;
};

export default function PricingPage() {
  const router = useRouter();
  const { user, upgradePlan, getTrialDaysLeft } = useAuth();
  
  const [selectedPlan, setSelectedPlan] = useState(null); // 'pro' ou 'vip'
  const [showCheckout, setShowCheckout] = useState(false);
  const [activeTab, setActiveTab] = useState('pix'); // 'pix' ou 'card'
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle'); // 'idle' | 'processing' | 'success'
  
  // Controle de Cupons
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  // Estados de Pagamento do Mercado Pago
  const [realPixCode, setRealPixCode] = useState('');
  const [realPixQrCodeBase64, setRealPixQrCodeBase64] = useState('');
  const [realPaymentId, setRealPaymentId] = useState(null);
  const [loadingPix, setLoadingPix] = useState(false);
  const [errorPix, setErrorPix] = useState('');
  const [loadingPreference, setLoadingPreference] = useState(false);
  const [alertState, setAlertState] = useState({ show: false, title: 'Erro', message: '', type: 'error' });

  const plans = {
    gratis: { name: 'Grátis (Trial)', price: 'R$ 0,00', days: 7 },
    pro: { name: 'PRO', price: 'R$ 19,90', priceVal: 19.90 },
    telegram: { name: 'Telegram VIP', price: 'R$ 9,90', priceVal: 9.90 }
  };

  // Efeito para tratar o retorno do Checkout Pro (Mercado Pago)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const status = searchParams.get('status');
    const paymentId = searchParams.get('payment_id');

    if ((status === 'success' || status === 'approved') && paymentId) {
      setPaymentStatus('success');
      
      // Forçar atualização via status API no backend
      fetch(`/api/payments/mercadopago/status?id=${paymentId}`)
        .then(res => res.json())
        .then(data => {
          console.log('[Checkout Pro Return] Sincronização:', data.status);
        })
        .catch(err => console.error(err));
      
      setSelectedPlan('pro'); // Valor fictício para renderizar o modal
      setShowCheckout(true);
    }
  }, []);

  // Abrir checkout automaticamente se a rota contiver o parâmetro 'plan' (ex: ?plan=pro)
  useEffect(() => {
    if (user) {
      const searchParams = new URLSearchParams(window.location.search);
      const planParam = searchParams.get('plan');
      if (planParam && (planParam === 'pro' || planParam === 'vip')) {
        // Atrasar levemente para garantir a inicialização correta dos estados do Mercado Pago
        const timer = setTimeout(() => {
          handleOpenCheckout(planParam);
        }, 100);
        
        // Limpar query param para não reabrir se atualizar a página
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  // Polling para checar status do pagamento Pix
  useEffect(() => {
    let interval;
    if (showCheckout && realPaymentId && paymentStatus === 'idle') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/payments/mercadopago/status?id=${realPaymentId}`);
          const data = await res.json();
          if (data.status === 'approved') {
            clearInterval(interval);
            handlePaymentSuccess();
          }
        } catch (err) {
          console.warn('Erro ao consultar status do Pix:', err);
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showCheckout, realPaymentId, paymentStatus]);

  // Calcular preço final com desconto
  const basePrice = plans[selectedPlan]?.priceVal || 0;
  const discountPercent = appliedCoupon ? appliedCoupon.discount : 0;
  const discountVal = (basePrice * discountPercent) / 100;
  const finalPrice = Math.max(0, basePrice - discountVal);

  const handleOpenCheckout = (planKey) => {
    if (!user) {
      router.push('/login');
      return;
    }
    setSelectedPlan(planKey);
    setShowCheckout(true);
    setPaymentStatus('idle');
    setCopied(false);
    // Resetar cupom
    setCouponInput('');
    setAppliedCoupon(null);
    setCouponError('');
    
    // Resetar dados do Mercado Pago
    setRealPixCode('');
    setRealPixQrCodeBase64('');
    setRealPaymentId(null);
    setErrorPix('');
  };

  // Carregar Pix Real do Mercado Pago
  useEffect(() => {
    let active = true;
    if (showCheckout && selectedPlan && activeTab === 'pix' && !realPaymentId && !loadingPix && finalPrice > 0) {
      async function generatePix() {
        setLoadingPix(true);
        setErrorPix('');
        try {
          const res = await fetch('/api/payments/mercadopago/pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              planKey: selectedPlan,
              couponCode: appliedCoupon?.code || null,
              email: user.email,
              name: user.name || '',
              userId: user.id
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Erro ao gerar Pix.');
          
          if (active) {
            setRealPixCode(data.qrCode);
            setRealPixQrCodeBase64(data.qrCodeBase64);
            setRealPaymentId(data.paymentId);
          }
        } catch (err) {
          console.error(err);
          if (active) {
            setErrorPix(translateError(err.message) || 'Erro de conexão.');
          }
        } finally {
          if (active) {
            setLoadingPix(false);
          }
        }
      }
      generatePix();
    }
    return () => { active = false; };
  }, [showCheckout, selectedPlan, activeTab, realPaymentId, appliedCoupon, finalPrice, user]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const { supabase } = await import('../../lib/supabaseClient');
      const { data, error } = await supabase
        .from('saas_coupons')
        .select('*')
        .eq('code', couponInput.trim().toUpperCase())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAppliedCoupon(data);
        // Limpar o ID do Pix para forçar a geração de um novo Pix com o desconto aplicado
        setRealPaymentId(null);
        setRealPixCode('');
        setRealPixQrCodeBase64('');
      } else {
        setCouponError('Cupom inválido ou expirado');
      }
    } catch (err) {
      console.error(err);
      setCouponError('Erro ao validar cupom.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCopyPix = () => {
    if (!realPixCode) return;
    navigator.clipboard.writeText(realPixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCheckoutProRedirect = async () => {
    if (!selectedPlan || !user) return;
    setLoadingPreference(true);
    try {
      const res = await fetch('/api/payments/mercadopago/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planKey: selectedPlan,
          couponCode: appliedCoupon?.code || null,
          email: user.email,
          name: user.name || '',
          userId: user.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar link de pagamento.');

      // Redireciona o usuário para o Mercado Pago
      window.location.href = data.init_point;
    } catch (err) {
      console.error(err);
      setAlertState({
        show: true,
        title: 'Falha no Pagamento',
        message: translateError(err.message) || 'Erro ao redirecionar para o Mercado Pago.',
        type: 'error'
      });
    } finally {
      setLoadingPreference(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPaymentStatus('success');
    // Efetivar plano localmente
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
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

        {/* Telegram VIP */}
        <div style={{
          background: '#111116',
          border: '1px solid #0088cc',
          boxShadow: '0 0 15px rgba(0, 136, 204, 0.05)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative'
        }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#0088cc' }}>Telegram VIP</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '16px 0' }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: '#0088cc' }}>R$ 9,90</span>
              <span style={{ color: '#888', fontSize: '0.85rem' }}>/ mês</span>
            </div>
            <p style={{ color: '#aaa', fontSize: '0.82rem', lineHeight: 1.4, marginBottom: '24px' }}>
              Receba todos os alertas de valor (+EV) diretamente no seu celular via bot oficial.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #222', paddingTop: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.82rem', color: '#ccc' }}>
                <CheckCircle2 size={16} color="#0088cc" style={{ flexShrink: 0 }} />
                <span>Alertas direto no celular via bot</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.82rem', color: '#ccc' }}>
                <CheckCircle2 size={16} color="#0088cc" style={{ flexShrink: 0 }} />
                <span>Link direto para colocar a aposta</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.82rem', color: '#ccc' }}>
                <CheckCircle2 size={16} color="#0088cc" style={{ flexShrink: 0 }} />
                <span>Avisos sonoros de odds desreguladas</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.82rem', color: '#ccc' }}>
                <CheckCircle2 size={16} color="#0088cc" style={{ flexShrink: 0 }} />
                <span>Acesso imediato pós-pagamento</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '30px' }}>
            <a 
              href="https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=2276008902-619a6fe2-dd52-42e1-9564-fd3ecbd75935"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: '#0088cc',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'block',
                textAlign: 'center',
                textDecoration: 'none',
                boxShadow: '0 4px 15px rgba(0, 136, 204, 0.2)',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Assinar Telegram VIP 💎
            </a>
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
                    window.location.href = '/';
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
                    <span style={{ fontWeight: '900', fontSize: '1.1rem', color: '#009ee3' }}>
                      {appliedCoupon ? (
                        <>
                          <span style={{ textDecoration: 'line-through', color: '#aaa', marginRight: '8px', fontSize: '0.9rem' }}>
                            {plans[selectedPlan]?.price}
                          </span>
                          <span>
                            {finalPrice === 0 ? 'Grátis' : finalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </>
                      ) : (
                        plans[selectedPlan]?.price
                      )}
                    </span>
                  </div>
                </div>

                {/* Campo de Cupom */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', fontWeight: 'bold', marginBottom: '6px' }}>
                    Possui um cupom de desconto?
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="Código do cupom"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      disabled={appliedCoupon || couponLoading}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #e1e1e5',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        color: '#333',
                        outline: 'none',
                        background: appliedCoupon ? '#f5f5f7' : '#fff'
                      }}
                    />
                    {appliedCoupon ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCoupon(null);
                          setCouponInput('');
                        }}
                        style={{
                          padding: '8px 14px',
                          background: '#f44336',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '0.8rem'
                        }}
                      >
                        Remover
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponInput.trim()}
                        style={{
                          padding: '8px 14px',
                          background: '#009ee3',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '0.8rem',
                          opacity: (!couponInput.trim() || couponLoading) ? 0.5 : 1
                        }}
                      >
                        {couponLoading ? 'Validando...' : 'Aplicar'}
                      </button>
                    )}
                  </div>
                  {couponError && (
                    <div style={{ color: '#f44336', fontSize: '0.75rem', marginTop: '4px', fontWeight: '500' }}>
                      ❌ {couponError}
                    </div>
                  )}
                  {appliedCoupon && (
                    <div style={{ color: '#4CAF50', fontSize: '0.75rem', marginTop: '4px', fontWeight: 'bold' }}>
                      ✓ Cupom aplicado: {appliedCoupon.code} (-{appliedCoupon.discount}%)
                    </div>
                  )}
                </div>
                {finalPrice === 0 ? (
                  /* Checkout de 100% de Desconto (Liberar Acesso Direto) */
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '10px 0 20px 0' }}>
                    <div style={{
                      background: 'rgba(76, 175, 80, 0.08)',
                      border: '1px solid rgba(76, 175, 80, 0.2)',
                      padding: '16px',
                      borderRadius: '8px',
                      textAlign: 'center',
                      color: '#2e7d32',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      width: '100%',
                      lineHeight: 1.4
                    }}>
                      🎉 Cupom de 100% de desconto aplicado com sucesso! O valor da sua assinatura foi zerado e nenhum pagamento será cobrado.
                    </div>
                    
                    <button
                      type="button"
                      onClick={handlePaymentSuccess}
                      style={{
                        background: '#4CAF50',
                        color: '#fff',
                        border: 'none',
                        padding: '14px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        width: '100%',
                        boxShadow: '0 4px 15px rgba(76, 175, 80, 0.25)',
                        transition: 'transform 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      Liberar Acesso Grátis Agora! 🚀
                    </button>
                  </div>
                ) : (
                  /* Checkout Comum (Pix ou Cartão) */
                  <>
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
                        {loadingPix ? (
                          <div style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <Loader2 className="spin" size={36} color="#009ee3" />
                            <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: '500' }}>Gerando QR Code Pix...</span>
                          </div>
                        ) : errorPix ? (
                          <div style={{ padding: '20px', textAlign: 'center', color: '#f44336', fontSize: '0.85rem', fontWeight: '500' }}>
                            ❌ {errorPix}
                            <button
                              onClick={() => {
                                setRealPaymentId(null);
                                setRealPixCode('');
                                setRealPixQrCodeBase64('');
                              }}
                              style={{
                                display: 'block',
                                margin: '10px auto 0 auto',
                                background: '#009ee3',
                                color: '#fff',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                              }}
                            >
                              Tentar Novamente
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* QR Code Real */}
                            {realPixQrCodeBase64 && (
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
                                <img 
                                  src={`data:image/png;base64,${realPixQrCodeBase64}`} 
                                  alt="Pix QR Code" 
                                  style={{ width: '180px', height: '180px' }} 
                                />
                                <span style={{ fontSize: '0.72rem', color: '#666', fontWeight: 'bold' }}>Sports EV Tracker - Mercado Pago</span>
                              </div>
                            )}

                            <p style={{ color: '#666', fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.4, margin: '0 10px' }}>
                              Escaneie o QR Code acima usando o aplicativo do seu banco ou copie a chave Pix abaixo.
                            </p>

                            {/* Copia e Cola */}
                            <div style={{ width: '100%', display: 'flex', gap: '8px' }}>
                              <input 
                                type="text" 
                                readOnly 
                                value={realPixCode} 
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
                                type="button"
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
                              <span>Aguardando pagamento Pix... (Confirmação automática instantânea)</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Conteúdo Aba Cartão */}
                    {activeTab === 'card' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
                        <div style={{
                          background: 'rgba(0, 158, 227, 0.04)',
                          border: '1px solid rgba(0, 158, 227, 0.15)',
                          padding: '16px',
                          borderRadius: '8px',
                          color: '#555',
                          fontSize: '0.85rem',
                          lineHeight: 1.4
                        }}>
                          💳 **Checkout Seguro via Mercado Pago**<br />
                          Ao clicar no botão abaixo, você será redirecionado para a página oficial do Mercado Pago para realizar o pagamento com total segurança via **Cartão de Crédito, Pix ou Boleto**.
                        </div>

                        <button
                          type="button"
                          onClick={handleCheckoutProRedirect}
                          disabled={loadingPreference}
                          style={{
                            background: '#009ee3',
                            color: '#fff',
                            border: 'none',
                            padding: '14px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            boxShadow: '0 4px 10px rgba(0, 158, 227, 0.2)',
                            transition: 'opacity 0.2s',
                            opacity: loadingPreference ? 0.7 : 1
                          }}
                        >
                          {loadingPreference ? (
                            <>
                              <Loader2 className="spin" size={18} />
                              <span>Redirecionando...</span>
                            </>
                          ) : (
                            <>
                              <CreditCard size={18} />
                              <span>Pagar com Mercado Pago {finalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
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

      {/* Modal de Alerta Customizado */}
      <AlertModal
        isOpen={alertState.show}
        onClose={() => setAlertState({ ...alertState, show: false })}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />

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
