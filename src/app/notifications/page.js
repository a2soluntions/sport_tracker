'use client';

import React, { useState, useEffect } from 'react';
import { Bell, AlertCircle, CheckCircle2, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

export default function NotificationsPage() {
  const { user, isTrialActive } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasUpdate, setHasUpdate] = useState(false);

  // Formata o timestamp de criação da oportunidade
  const formatTimeAgo = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffMins < 1) return 'Agora mesmo';
      if (diffMins < 60) return `Há ${diffMins} min`;
      if (diffHours < 24) return `Há ${diffHours} h`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Ontem';
      return `Há ${diffDays} dias`;
    } catch (e) {
      return '';
    }
  };

  // Carregar oportunidades reais do Supabase e ler o estado de atualização local
  useEffect(() => {
    let active = true;
    let timedOut = false;

    // Safety timeout to prevent stuck loading screen
    const safetyTimeout = setTimeout(() => {
      if (active) {
        timedOut = true;
        console.warn("[Notifications] Timeout de segurança carregando notificações. Forçando exibição.");
        setLoading(false);
      }
    }, 4500);

    // 1. Tentar carregar do cache local imediatamente para evitar tela de loading
    const cachedOppKey = 'ev_tracker_cached_opportunities';
    try {
      const cached = localStorage.getItem(cachedOppKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const todayStr = new Date().toDateString();
        const filteredCached = parsed.filter(opp => {
          if (!opp.created_at) return false;
          return new Date(opp.created_at).toDateString() === todayStr;
        });
        const mapped = filteredCached.map((opp) => ({
          id: opp.id,
          type: 'alert',
          title: `Assimetria Encontrada: ${opp.confronto}`,
          message: `O robô identificou valor no mercado "${opp.mercado}" com vantagem matemática de +${parseFloat(opp.vantagem_ev_porcentagem).toFixed(1)}% EV. Cotação recomendada na Betano: @${opp.odd_oferecida} (Odd justa calculada: @${opp.odd_justa}).`,
          time: formatTimeAgo(opp.created_at),
          rawDate: opp.created_at
        }));
        setNotifications(mapped);
        setLoading(false); // Instante!
      }
    } catch (e) {
      console.warn("Erro ao ler cache local de oportunidades nas notificações:", e);
    }

    if (typeof window !== 'undefined') {
      const updateState = localStorage.getItem('ev_tracker_update_available');
      if (updateState === 'true' || updateState === 'dismissed') {
        setHasUpdate(true);
      }
    }

    const fetchNotifications = async () => {
      if (!supabase) {
        clearTimeout(safetyTimeout);
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('ev_opportunities')
          .select('*')
          .order('id', { ascending: false })
          .limit(100); // Pegar mais registros para garantir que cobrimos o dia de hoje caso haja muitos

        if (error) throw error;

        if (active && data) {
          // Converter oportunidades em formato de notificação mantendo apenas as de hoje
          const todayStr = new Date().toDateString();
          const filteredData = data.filter(opp => {
            if (!opp.created_at) return false;
            return new Date(opp.created_at).toDateString() === todayStr;
          });

          const mapped = filteredData.map((opp) => ({
            id: opp.id,
            type: 'alert',
            title: `Assimetria Encontrada: ${opp.confronto}`,
            message: `O robô identificou valor no mercado "${opp.mercado}" com vantagem matemática de +${parseFloat(opp.vantagem_ev_porcentagem).toFixed(1)}% EV. Cotação recomendada na Betano: @${opp.odd_oferecida} (Odd justa calculada: @${opp.odd_justa}).`,
            time: formatTimeAgo(opp.created_at),
            rawDate: opp.created_at
          }));
          setNotifications(mapped);
          if (data.length > 0) {
            localStorage.setItem('ev_tracker_last_viewed_notification', String(data[0].id));
            window.dispatchEvent(new Event('notifications_read'));
          }
          try {
            localStorage.setItem(cachedOppKey, JSON.stringify(data));
          } catch (e) {}
        }
      } catch (err) {
        console.warn("[Notifications] Erro ao carregar alertas reais:", err);
      } finally {
        if (active) {
          clearTimeout(safetyTimeout);
          if (!timedOut) {
            setLoading(false);
          }
        }
      }
    };

    fetchNotifications();

    // Inscrever em atualizações em tempo real das oportunidades
    const channel = supabase.channel('notifications-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ev_opportunities' }, 
        (payload) => {
          if (active) {
            const opp = payload.new;
            const newNotif = {
              id: opp.id,
              type: 'alert',
              title: `Assimetria Encontrada: ${opp.confronto}`,
              message: `O robô identificou valor no mercado "${opp.mercado}" com vantagem matemática de +${parseFloat(opp.vantagem_ev_porcentagem).toFixed(1)}% EV. Cotação recomendada na Betano: @${opp.odd_oferecida} (Odd justa calculada: @${opp.odd_justa}).`,
              time: 'Agora mesmo',
              rawDate: opp.created_at
            };
            setNotifications(curr => {
              const updated = [newNotif, ...curr].slice(0, 30);
              localStorage.setItem('ev_tracker_last_viewed_notification', String(opp.id));
              window.dispatchEvent(new Event('notifications_read'));
              return updated;
            });
          }
        }
      ).subscribe();

    return () => {
      active = false;
      clearTimeout(safetyTimeout);
      supabase.removeChannel(channel);
    };
  }, []);

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateCheckMessage, setUpdateCheckMessage] = useState('');

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateCheckMessage('');
    try {
      const res = await fetch('/api/version');
      const data = await res.json();
      if (data && data.version) {
        const currentVersion = localStorage.getItem('ev_tracker_current_version');
        if (currentVersion && currentVersion !== data.version) {
          setHasUpdate(true);
          localStorage.setItem('ev_tracker_update_available', 'true');
          localStorage.setItem('ev_tracker_latest_version', data.version);
        } else {
          setHasUpdate(false);
          localStorage.removeItem('ev_tracker_update_available');
          setUpdateCheckMessage('Seu aplicativo está na versão mais recente! ✅');
        }
      }
    } catch (e) {
      console.warn("Erro ao buscar versão para atualização:", e);
      setUpdateCheckMessage('Falha ao conectar. Tente novamente.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleUpdateApp = () => {
    if (typeof window !== 'undefined') {
      const latest = localStorage.getItem('ev_tracker_latest_version');
      if (latest) {
        localStorage.setItem('ev_tracker_current_version', latest);
      }
      localStorage.removeItem('ev_tracker_update_available');
      localStorage.removeItem('ev_tracker_latest_version');
      window.location.reload();
    }
  };

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
          O período de avaliação gratuita da sua Central de Alertas +EV acabou. Assine agora o plano PRO por apenas **R$ 19,90/mês** para liberar acesso instantâneo e ilimitado.
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
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <header style={{ marginBottom: '30px', borderBottom: '1px solid #222', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px', color: '#fff', textTransform: 'uppercase', margin: 0 }}>
            <Bell color="var(--brand-neon)" size={28} />
            Central de Alertas +EV
          </h1>
          <p style={{ color: '#888', marginTop: '8px', fontSize: '0.9rem', margin: '8px 0 0 0' }}>
            Histórico de assimetrias de odds identificadas em tempo real pelo modelo matemático.
          </p>
        </div>
        
        {/* Botão de Verificação Manual de Atualização */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <button
            onClick={handleCheckUpdate}
            disabled={checkingUpdate}
            style={{
              background: 'transparent',
              border: '1px solid var(--brand-neon)',
              color: 'var(--brand-neon)',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 'bold',
              cursor: checkingUpdate ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => { if (!checkingUpdate) e.currentTarget.style.background = 'rgba(204, 255, 0, 0.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {checkingUpdate ? (
              <>
                <Loader2 className="spin" size={14} />
                <span>Verificando...</span>
              </>
            ) : (
              <span>Verificar Atualização 🔄</span>
            )}
          </button>
          {updateCheckMessage && (
            <span style={{ fontSize: '0.75rem', color: updateCheckMessage.includes('Erro') || updateCheckMessage.includes('Falha') ? '#ff4d4d' : 'var(--brand-neon)', fontWeight: 'bold' }}>
              {updateCheckMessage}
            </span>
          )}
        </div>
      </header>

      {/* Banner de Atualização do PWA se disponível */}
      {hasUpdate && (
        <div className="glass-panel" style={{
          background: 'linear-gradient(135deg, rgba(204, 255, 0, 0.08) 0%, rgba(0,0,0,0) 80%)',
          border: '1px solid var(--brand-neon)',
          borderRadius: '100px',
          padding: '20px 40px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 8px 32px rgba(204, 255, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '44px', height: '44px', background: 'rgba(204, 255, 0, 0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-neon)', flexShrink: 0 }}>
              <Zap size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>Nova Versão Disponível</h3>
              <p style={{ margin: '4px 0 0 0', color: '#aaa', fontSize: '0.82rem', lineHeight: '1.4' }}>
                Há uma atualização do aplicativo com correções nos gráficos e melhorias de performance.
              </p>
            </div>
          </div>
          <button 
            onClick={handleUpdateApp}
            style={{
              background: 'var(--brand-neon)',
              border: 'none',
              color: '#000',
              padding: '10px 24px',
              borderRadius: '24px',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 15px rgba(204, 255, 0, 0.25)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span>Instalar Atualização</span>
            <ArrowRight size={15} />
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'var(--brand-neon)' }}>
          <Loader2 className="spin" size={36} />
          <span style={{ marginTop: '16px', fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'monospace' }}>CARREGANDO ALERTAS...</span>
          <style jsx>{`
            .spin { animation: spin 1s linear infinite; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}</style>
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#888', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <AlertCircle size={32} color="#555" />
          </div>
          <h3 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: '1.1rem' }}>Nenhum Alerta Recente</h3>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Nenhum sinal matemático foi registrado no sistema nas últimas horas. Fique de olho!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {notifications.map((notif) => (
            <div 
              key={notif.id} 
              className="glass-panel" 
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '20px', 
                padding: '16px 32px', 
                border: '1px solid rgba(204, 255, 0, 0.15)',
                borderRadius: '100px',
                background: '#111115',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ 
                width: '40px', 
                height: '40px', 
                background: 'rgba(204, 255, 0, 0.1)', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexShrink: 0 
              }}>
                <CheckCircle2 color="var(--brand-neon)" size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notif.title}</h3>
                  <span style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'monospace', flexShrink: 0 }}>{notif.time}</span>
                </div>
                <p style={{ margin: 0, color: '#aaa', fontSize: '0.82rem', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {notif.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '40px', textAlign: 'center', color: '#555', fontSize: '0.8rem', borderTop: '1px solid #1f1f2e', paddingTop: '20px' }}>
        <p>Os sinais matemáticos também são disparados instantaneamente via robô integrado no canal VIP do Telegram.</p>
      </div>
    </div>
  );
}
