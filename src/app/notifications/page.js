'use client';

import React, { useState, useEffect } from 'react';
import { Bell, AlertCircle, CheckCircle2, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

export default function NotificationsPage() {
  const { user } = useAuth();
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

    // 1. Tentar carregar do cache local imediatamente para evitar tela de loading
    const cachedOppKey = 'ev_tracker_cached_opportunities';
    try {
      const cached = localStorage.getItem(cachedOppKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const mapped = parsed.map((opp) => ({
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
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('ev_opportunities')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);

        if (error) throw error;

        if (active && data) {
          // Converter oportunidades em formato de notificação
          const mapped = data.map((opp) => ({
            id: opp.id,
            type: 'alert',
            title: `Assimetria Encontrada: ${opp.confronto}`,
            message: `O robô identificou valor no mercado "${opp.mercado}" com vantagem matemática de +${parseFloat(opp.vantagem_ev_porcentagem).toFixed(1)}% EV. Cotação recomendada na Betano: @${opp.odd_oferecida} (Odd justa calculada: @${opp.odd_justa}).`,
            time: formatTimeAgo(opp.created_at),
            rawDate: opp.created_at
          }));
          setNotifications(mapped);
          try {
            localStorage.setItem(cachedOppKey, JSON.stringify(data));
          } catch (e) {}
        }
      } catch (err) {
        console.warn("[Notifications] Erro ao carregar alertas reais:", err);
      } finally {
        if (active) {
          setLoading(false);
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
            setNotifications(curr => [newNotif, ...curr].slice(0, 30));
          }
        }
      ).subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateApp = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ev_tracker_update_available');
      window.location.reload();
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <header style={{ marginBottom: '30px', borderBottom: '1px solid #222', paddingBottom: '20px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px', color: '#fff', textTransform: 'uppercase', margin: 0 }}>
          <Bell color="var(--brand-neon)" size={28} />
          Central de Alertas +EV
        </h1>
        <p style={{ color: '#888', marginTop: '8px', fontSize: '0.9rem', margin: '8px 0 0 0' }}>
          Histórico de assimetrias de odds identificadas em tempo real pelo modelo matemático.
        </p>
      </header>

      {/* Banner de Atualização do PWA se disponível */}
      {hasUpdate && (
        <div className="glass-panel" style={{
          background: 'linear-gradient(135deg, rgba(204, 255, 0, 0.08) 0%, rgba(0,0,0,0) 80%)',
          border: '1px solid var(--brand-neon)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 8px 32px rgba(204, 255, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', background: 'rgba(204, 255, 0, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-neon)' }}>
              <Zap size={20} />
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
              padding: '10px 20px',
              borderRadius: '8px',
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
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
          <AlertCircle size={40} color="#555" style={{ marginBottom: '16px' }} />
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
                gap: '16px', 
                padding: '20px', 
                borderLeft: '4px solid var(--brand-neon)',
                background: '#111115',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ paddingTop: '2px' }}>
                <CheckCircle2 color="var(--brand-neon)" size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>{notif.title}</h3>
                  <span style={{ fontSize: '0.78rem', color: '#666', fontFamily: 'monospace' }}>{notif.time}</span>
                </div>
                <p style={{ margin: 0, color: '#aaa', fontSize: '0.85rem', lineHeight: '1.5' }}>
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
