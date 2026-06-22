'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, BellRing, ShieldCheck, Zap, CheckCircle2, Info, HelpCircle, Loader2, PiggyBank } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

export default function SettingsPage() {
  const { user, loading: loadingAuth, isTrialActive } = useAuth();
  const [config, setConfig] = useState({
    autoBroadcast: false,
    alertBrasileirao: true,
    alertPrematch: true,
    alertLive: false,
    minEV: 5
  });

  const [userConfig, setUserConfig] = useState({
    banca: 1000,
    minEV: 5,
    alertPrematch: true,
    alertLive: true,
    receiveTelegram: true,
    telegramChatId: '',
    riskPct: 5
  });

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saveError, setSaveError] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [botUsername, setBotUsername] = useState('OddsSentryProBot');

  // Carregar nome de usuário do bot do Telegram de bot_info.json
  useEffect(() => {
    fetch('/bot_info.json')
      .then(res => res.json())
      .then(data => {
        if (data.bot_username) setBotUsername(data.bot_username);
      })
      .catch(() => {});
  }, []);

  // Carregar configurações do cache e do banco de dados (SWR)
  useEffect(() => {
    // 1. Tentar ler do cache local de configurações administrativas imediatamente
    try {
      const savedConfig = localStorage.getItem('ev_tracker_settings');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    } catch (e) {
      console.warn("Erro ao ler cache local de configurações:", e);
    }

    // 2. Carregar dados reais do Supabase via API administrativa (para Admins)
    async function loadDatabaseSettings() {
      if (!supabase) {
        setLoadingConfig(false);
        return;
      }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const res = await fetch('/api/admin/settings', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            const dbSettings = data.settings || {};
            if (dbSettings.ev_tracker_settings) {
              setConfig(dbSettings.ev_tracker_settings);
              localStorage.setItem('ev_tracker_settings', JSON.stringify(dbSettings.ev_tracker_settings));
            }
          } else {
            const data = await res.json().catch(() => ({}));
            setLoadError(data.error || `Erro HTTP ${res.status}`);
          }
        }
      } catch (err) {
        console.warn("Erro ao carregar configurações do banco:", err);
        setLoadError(err.message || 'Erro de conexão.');
      } finally {
        setLoadingConfig(false);
      }
    }

    // 3. Carregar configurações pessoais da tabela user_settings (para Clientes normais)
    async function loadUserSettings() {
      if (!supabase || !user) {
        setLoadingConfig(false);
        return;
      }
      try {
        const userBancaKey = `ev_tracker_banca_initial_value_${user.id}`;
        const savedBanca = localStorage.getItem(userBancaKey);
        const userRiskKey = `ev_tracker_max_risk_pct_${user.id}`;
        const savedRisk = localStorage.getItem(userRiskKey);

        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setUserConfig({
            banca: parseFloat(data.banca || savedBanca || 1000),
            minEV: parseFloat(data.min_ev || 5),
            alertPrematch: data.alert_prematch !== false,
            alertLive: data.alert_live !== false,
            receiveTelegram: data.receive_telegram !== false,
            telegramChatId: data.telegram_chat_id || '',
            riskPct: savedRisk ? parseFloat(savedRisk) * 100 : 5
          });
        } else {
          setUserConfig(prev => ({
            ...prev,
            banca: parseFloat(savedBanca || 1000),
            riskPct: savedRisk ? parseFloat(savedRisk) * 100 : 5
          }));
        }
      } catch (err) {
        console.warn("Erro ao carregar configurações pessoais:", err);
        setLoadError(err.message || 'Erro ao carregar configurações do perfil.');
      } finally {
        setLoadingConfig(false);
      }
    }

    const isAdminUser = user && (user.role === 'admin' || user.role === 'super_admin' || user.email === 'a2soluntions@gmail.com');
    if (user) {
      if (isAdminUser) {
        loadDatabaseSettings();
      } else {
        loadUserSettings();
      }
    } else {
      setLoadingConfig(false);
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);

    let fetchSuccess = false;
    let errorMsg = 'Erro desconhecido';

    const isAdminUser = user && (user.role === 'admin' || user.role === 'super_admin' || user.email === 'a2soluntions@gmail.com');

    if (isAdminUser) {
      // Salvar localmente
      try {
        localStorage.setItem('ev_tracker_settings', JSON.stringify(config));
      } catch (e) {}

      // Salvar no Supabase via API administrativa
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const res = await fetch('/api/admin/settings', {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({ key: 'ev_tracker_settings', value: config })
            });
            if (res.ok) {
              fetchSuccess = true;
            } else {
              const data = await res.json().catch(() => ({}));
              errorMsg = data.error || `Erro HTTP ${res.status}`;
            }
          } else {
            errorMsg = 'Nenhuma sessão ativa encontrada. Faça login novamente.';
          }
        } catch (err) {
          console.warn("Erro ao salvar configurações no banco:", err);
          errorMsg = err.message || 'Erro de rede/servidor.';
        }
      } else {
        errorMsg = 'Cliente do banco de dados não inicializado.';
      }
    } else {
      // Salvar configurações pessoais do usuário comum no Supabase
      if (supabase && user) {
        try {
          const { error } = await supabase
            .from('user_settings')
            .upsert({
              id: user.id,
              banca: parseFloat(userConfig.banca),
              min_ev: parseFloat(userConfig.minEV),
              alert_prematch: userConfig.alertPrematch,
              alert_live: userConfig.alertLive,
              receive_telegram: userConfig.receiveTelegram,
              telegram_chat_id: userConfig.telegramChatId.trim(),
              updated_at: new Date().toISOString()
            });

          if (error) throw error;

          // Sincronizar cache local da banca
          const userBancaKey = `ev_tracker_banca_initial_value_${user.id}`;
          localStorage.setItem(userBancaKey, userConfig.banca.toString());
          
          // Sincronizar cache local da porcentagem de risco
          const userRiskKey = `ev_tracker_max_risk_pct_${user.id}`;
          localStorage.setItem(userRiskKey, (userConfig.riskPct / 100).toString());
          
          fetchSuccess = true;
        } catch (err) {
          console.warn("Erro ao salvar configurações pessoais no banco:", err);
          errorMsg = err.message || 'Erro ao salvar no banco de dados.';
        }
      } else {
        errorMsg = 'Você precisa estar logado para salvar as configurações.';
      }
    }

    setSaving(false);
    if (fetchSuccess) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setSaveError(errorMsg);
    }
  };

  const handleToggle = (key) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin' || user.email === 'a2soluntions@gmail.com');

  if (loadingAuth || (loadingConfig && !loadError)) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '80vh',
        fontFamily: 'monospace',
        color: 'var(--brand-neon)'
      }}>
        <Loader2 size={32} className="spin" style={{ marginBottom: '16px' }} />
        <span>CARREGANDO CONFIGURAÇÕES...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        margin: '100px auto 40px auto',
        padding: '32px',
        textAlign: 'center',
        background: '#121216',
        border: '2px solid #ff4444',
        boxShadow: '0 0 30px rgba(255, 68, 68, 0.08)',
        borderRadius: '12px',
        fontFamily: 'system-ui, sans-serif',
        color: '#fff',
        maxWidth: '600px'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: 'rgba(255, 68, 68, 0.1)',
          border: '1px solid rgba(255, 68, 68, 0.3)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto',
          color: '#ff4444'
        }}>
          <ShieldCheck size={36} color="#ff4444" />
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, textTransform: 'uppercase', color: '#ff4444' }}>Acesso não autenticado</h2>
        <p style={{ color: '#aaa', fontSize: '0.92rem', marginTop: '16px', lineHeight: 1.6 }}>
          Por favor, faça login no sistema para poder configurar seus alertas de palpites e gerenciar sua banca.
        </p>
        <button onClick={() => window.location.href = '/login'} style={{ marginTop: '28px', background: '#ff4444', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', transition: 'background 0.2s' }}>
          Fazer Login
        </button>
      </div>
    );
  }

  if (!isAdmin && !isTrialActive()) {
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
          O período de avaliação gratuita das suas Configurações de Alertas acabou. Assine agora o plano PRO por apenas **R$ 19,90/mês** para liberar acesso instantâneo e ilimitado.
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

  // --- RETORNA CONFIGURAÇÕES PESSOAIS DE ALERTAS PARA TODOS OS USUÁRIOS ---
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .settings-layout-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          align-items: stretch;
        }
        @media (max-width: 1000px) {
          .settings-layout-grid {
            grid-template-columns: 1fr;
          }
        }
      `}} />
      <header style={{ marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '15px' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Settings color="var(--brand-neon)" size={32} />
          Configurações de Alertas
        </h1>
        <p style={{ color: '#888', marginTop: '6px', fontSize: '1rem' }}>
          Personalize quais palpites e alertas +EV você deseja receber no seu Telegram e ajuste sua banca de cálculo.
        </p>
      </header>

      {loadError && (
        <div style={{ 
          background: 'rgba(255, 77, 77, 0.1)', 
          border: '1px solid #ff4d4d', 
          color: '#ff4d4d', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '32px',
          fontSize: '0.95rem'
        }}>
          <strong>Erro ao carregar dados:</strong> {loadError}
        </div>
      )}

      <div className="settings-layout-grid">
        
        {/* Card 1: Banca e EV Mínimo */}
        <div className="glass-panel" style={{ borderLeft: '4px solid var(--brand-neon)', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PiggyBank color="var(--brand-neon)" size={22} />
            Gestão de Banca & Valor (+EV)
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: '#111', padding: '14px', borderRadius: '12px', border: '1px solid #222', flex: 1 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', color: '#fff', marginBottom: '6px', fontSize: '0.9rem' }}>Sua Banca de Referência (R$)</label>
              <input 
                type="number" 
                value={userConfig.banca}
                onChange={(e) => setUserConfig(prev => ({ ...prev, banca: parseFloat(e.target.value) || 0 }))}
                style={{
                  width: '100%',
                  background: '#1c1c24',
                  border: '1px solid #333',
                  color: '#fff',
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
                placeholder="Ex: 1000.00"
              />
              <small style={{ color: '#666', marginTop: '4px', display: 'block', fontSize: '0.75rem' }}>
                Esta banca será utilizada para calcular o valor sugerido de aposta (Stake) usando o Critério de Kelly.
              </small>
            </div>

            <hr style={{ border: '0', borderTop: '1px solid #222' }} />

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>Valor Esperado Mínimo Pessoal (EV%)</label>
                <span style={{ background: 'var(--brand-neon)', color: '#000', padding: '2px 8px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.75rem' }}>
                  +{userConfig.minEV}% ou mais
                </span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="20" 
                value={userConfig.minEV} 
                onChange={(e) => setUserConfig(prev => ({ ...prev, minEV: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: 'var(--brand-neon)', cursor: 'pointer' }} 
              />
              <small style={{ color: '#666', marginTop: '4px', display: 'block', fontSize: '0.75rem' }}>
                Você só receberá alertas de palpites que tenham uma vantagem matemática de pelo menos {userConfig.minEV}%.
              </small>
            </div>

            <hr style={{ border: '0', borderTop: '1px solid #222' }} />

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>Porcentagem de Risco Máximo da Banca</label>
                <span style={{ background: 'var(--brand-neon)', color: '#000', padding: '2px 8px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.75rem' }}>
                  {userConfig.riskPct}% por aposta
                </span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                step="0.5"
                value={userConfig.riskPct} 
                onChange={(e) => setUserConfig(prev => ({ ...prev, riskPct: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: 'var(--brand-neon)', cursor: 'pointer' }} 
              />
              <div style={{ background: 'rgba(204, 255, 0, 0.05)', border: '1px solid rgba(204, 255, 0, 0.2)', padding: '8px 10px', borderRadius: '8px', marginTop: '8px', fontSize: '0.75rem', color: '#ccc', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <Info size={14} color="var(--brand-neon)" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Sugestão do Sistema:</strong> O valor ideal recomendado é <strong>5.0% (Half-Kelly)</strong> para otimizar o crescimento de banca com risco controlado de quebra.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Filtro de Tipos de Entrada */}
        <div className="glass-panel" style={{ borderLeft: '4px solid #00d2ff', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BellRing color="#00d2ff" size={22} />
            Preferências de Notificações
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#111', padding: '14px', borderRadius: '12px', border: '1px solid #222', flex: 1 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px', background: '#1c1c24', borderRadius: '8px', border: '1px solid #222' }}>
              <input 
                type="checkbox" 
                checked={userConfig.alertPrematch} 
                onChange={() => setUserConfig(prev => ({ ...prev, alertPrematch: !prev.alertPrematch }))} 
                style={{ width: '18px', height: '18px', accentColor: '#00d2ff', flexShrink: 0 }} 
              />
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Alertas Pré-Jogo</div>
                <div style={{ color: '#888', fontSize: '0.75rem', marginTop: '2px' }}>Receber palpites enviados horas antes das partidas começarem.</div>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px', background: '#1c1c24', borderRadius: '8px', border: '1px solid #222' }}>
              <input 
                type="checkbox" 
                checked={userConfig.alertLive} 
                onChange={() => setUserConfig(prev => ({ ...prev, alertLive: !prev.alertLive }))} 
                style={{ width: '18px', height: '18px', accentColor: '#00d2ff', flexShrink: 0 }} 
              />
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Alertas Ao Vivo</div>
                <div style={{ color: '#888', fontSize: '0.75rem', marginTop: '2px' }}>Receber palpites em tempo real conforme as oportunidades surgem durante os jogos.</div>
              </div>
            </label>
          </div>
        </div>

        {/* Card 3: Conexão com o Telegram */}
        <div className="glass-panel" style={{ borderLeft: '4px solid #3897f0', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap color="#3897f0" size={22} />
            Vincular seu Telegram Pessoal
          </h2>
          
          <div style={{ background: '#111', padding: '14px', borderRadius: '12px', border: '1px solid #222', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
            <p style={{ color: '#aaa', fontSize: '0.82rem', margin: 0, lineHeight: '1.4' }}>
              Siga os passos abaixo para conectar o robô e receber seus palpites diretamente no seu chat privado do Telegram:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ background: '#3897f0', color: '#000', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '0.7rem' }}>1</div>
                <span>Acesse o Bot clicando abaixo e clique em <b>Iniciar</b> (ou envie <code>/start</code>):</span>
              </div>
              <div style={{ paddingLeft: '24px' }}>
                <a 
                  href={`https://t.me/${botUsername}`} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: '#3897f0',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: '0.75rem',
                    boxShadow: '0 4px 10px rgba(56, 151, 240, 0.2)'
                  }}
                >
                  Abrir Chat @{botUsername} 📲
                </a>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                <div style={{ background: '#3897f0', color: '#000', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '0.7rem' }}>2</div>
                <span>O bot enviará uma mensagem com o seu <b>ID de Usuário (Chat ID)</b>. Copie esse número.</span>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                <div style={{ background: '#3897f0', color: '#000', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '0.7rem' }}>3</div>
                <span>Cole o número no campo abaixo:</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', color: '#fff', marginBottom: '6px', fontSize: '0.9rem' }}>Seu Chat ID do Telegram</label>
              <input 
                type="text" 
                value={userConfig.telegramChatId}
                onChange={(e) => setUserConfig(prev => ({ ...prev, telegramChatId: e.target.value }))}
                style={{
                  width: '100%',
                  background: '#1c1c24',
                  border: '1px solid #333',
                  color: '#fff',
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  outline: 'none',
                  fontFamily: 'monospace'
                }}
                placeholder="Ex: 7155613423"
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '4px' }}>
              <input 
                type="checkbox" 
                checked={userConfig.receiveTelegram} 
                onChange={() => setUserConfig(prev => ({ ...prev, receiveTelegram: !prev.receiveTelegram }))} 
                style={{ width: '16px', height: '16px', accentColor: '#3897f0', flexShrink: 0 }} 
              />
              <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Ativar notificações automáticas via Telegram</span>
            </label>
          </div>
        </div>

      </div>

      <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
        <button 
          onClick={handleSave}
          disabled={saving}
          style={{ 
            background: saved ? '#4CAF50' : 'var(--brand-neon)', 
            color: '#000', 
            padding: '16px 40px', 
            borderRadius: '8px', 
            fontSize: '1.1rem', 
            fontWeight: 'bold', 
            border: 'none', 
            cursor: saving ? 'not-allowed' : 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            boxShadow: saved ? 'none' : '0 4px 15px rgba(0, 255, 170, 0.3)',
            transition: 'all 0.3s',
            opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? (
            <><Loader2 size={24} className="spin" /> Salvando...</>
          ) : saved ? (
            <><CheckCircle2 size={24} /> Configurações Salvas!</>
          ) : (
            <><Save size={24} /> Salvar Configurações</>
          )}
        </button>

        {saveError && (
          <div style={{ 
            color: '#ff4d4d', 
            fontSize: '0.92rem', 
            fontWeight: 'bold', 
            textAlign: 'right',
            background: 'rgba(255, 77, 77, 0.05)',
            border: '1px solid rgba(255, 77, 77, 0.2)',
            padding: '8px 16px',
            borderRadius: '6px'
          }}>
            Erro ao salvar: {saveError}
          </div>
        )}
      </div>
    </div>
  );
}
