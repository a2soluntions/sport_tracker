'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, BellRing, ShieldCheck, Zap, CheckCircle2, Info, HelpCircle, Loader2, PiggyBank } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

export default function SettingsPage() {
  const { user, loading: loadingAuth } = useAuth();
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
    telegramChatId: ''
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
            telegramChatId: data.telegram_chat_id || ''
          });
        } else if (savedBanca) {
          setUserConfig(prev => ({ ...prev, banca: parseFloat(savedBanca) }));
        }
      } catch (err) {
        console.warn("Erro ao carregar configurações pessoais:", err);
        setLoadError(err.message || 'Erro ao carregar configurações do perfil.');
      } finally {
        setLoadingConfig(false);
      }
    }

    const isAdminUser = user && (user.role === 'admin' || user.role === 'super_admin' || user.email === 'a2soluntions@gmail.com' || user.email === 'araujoexcel@gmail.com');
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

    const isAdminUser = user && (user.role === 'admin' || user.role === 'super_admin' || user.email === 'a2soluntions@gmail.com' || user.email === 'araujoexcel@gmail.com');

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

  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin' || user.email === 'a2soluntions@gmail.com' || user.email === 'araujoexcel@gmail.com');

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

  // --- SE FOR CLIENTE COMUM (EXIBE CONFIGURAÇÕES PESSOAIS DE ALERTAS) ---
  if (!isAdmin) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <header style={{ marginBottom: '40px', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Settings color="var(--brand-neon)" size={36} />
            Configurações de Alertas
          </h1>
          <p style={{ color: '#888', marginTop: '8px', fontSize: '1.1rem' }}>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Card 1: Banca e EV Mínimo */}
          <div className="glass-panel" style={{ borderLeft: '4px solid var(--brand-neon)' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <PiggyBank color="var(--brand-neon)" size={24} />
              Gestão de Banca & Valor (+EV)
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: '#111', padding: '20px', borderRadius: '12px', border: '1px solid #222' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>Sua Banca de Referência (R$)</label>
                <input 
                  type="number" 
                  value={userConfig.banca}
                  onChange={(e) => setUserConfig(prev => ({ ...prev, banca: parseFloat(e.target.value) || 0 }))}
                  style={{
                    width: '100%',
                    background: '#1c1c24',
                    border: '1px solid #333',
                    color: '#fff',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  placeholder="Ex: 1000.00"
                />
                <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                  Esta banca será utilizada para calcular o valor sugerido de aposta (Stake) usando o Critério de Kelly.
                </small>
              </div>

              <hr style={{ border: '0', borderTop: '1px solid #222' }} />

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontWeight: 'bold', color: '#fff' }}>Valor Esperado Mínimo Pessoal (EV%)</label>
                  <span style={{ background: 'var(--brand-neon)', color: '#000', padding: '2px 10px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem' }}>
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
                <small style={{ color: '#666', marginTop: '8px', display: 'block' }}>
                  Você só receberá alertas de palpites que tenham uma vantagem matemática de pelo menos {userConfig.minEV}%.
                </small>
              </div>
            </div>
          </div>

          {/* Card 2: Filtro de Tipos de Entrada */}
          <div className="glass-panel" style={{ borderLeft: '4px solid #00d2ff' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <BellRing color="#00d2ff" size={24} />
              Preferências de Notificações
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', background: '#111', borderRadius: '8px' }}>
                <input 
                  type="checkbox" 
                  checked={userConfig.alertPrematch} 
                  onChange={() => setUserConfig(prev => ({ ...prev, alertPrematch: !prev.alertPrematch }))} 
                  style={{ width: '20px', height: '20px', accentColor: '#00d2ff' }} 
                />
                <div>
                  <div style={{ fontWeight: 'bold' }}>Alertas Pré-Jogo</div>
                  <div style={{ color: '#888', fontSize: '0.85rem' }}>Receber palpites enviados horas antes das partidas começarem.</div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', background: '#111', borderRadius: '8px' }}>
                <input 
                  type="checkbox" 
                  checked={userConfig.alertLive} 
                  onChange={() => setUserConfig(prev => ({ ...prev, alertLive: !prev.alertLive }))} 
                  style={{ width: '20px', height: '20px', accentColor: '#00d2ff' }} 
                />
                <div>
                  <div style={{ fontWeight: 'bold' }}>Alertas Ao Vivo</div>
                  <div style={{ color: '#888', fontSize: '0.85rem' }}>Receber palpites em tempo real conforme as oportunidades surgem durante os jogos.</div>
                </div>
              </label>
            </div>
          </div>

          {/* Card 3: Conexão com o Telegram */}
          <div className="glass-panel" style={{ borderLeft: '4px solid #3897f0' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Zap color="#3897f0" size={24} />
              Vincular seu Telegram Pessoal
            </h2>
            
            <div style={{ background: '#111', padding: '20px', borderRadius: '12px', border: '1px solid #222', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={{ color: '#aaa', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>
                Siga os passos abaixo para conectar o robô e receber seus palpites diretamente no seu chat privado do Telegram:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ background: '#3897f0', color: '#000', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '0.8rem' }}>1</div>
                  <span>Acesse o nosso Bot clicando no botão abaixo e clique em <b>Iniciar</b> (ou envie <code>/start</code>):</span>
                </div>
                <div style={{ paddingLeft: '30px' }}>
                  <a 
                    href={`https://t.me/${botUsername}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      background: '#3897f0',
                      color: '#fff',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      marginTop: '4px',
                      boxShadow: '0 4px 10px rgba(56, 151, 240, 0.2)'
                    }}
                  >
                    Abrir Chat com o Bot @{botUsername} 📲
                  </a>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <div style={{ background: '#3897f0', color: '#000', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '0.8rem' }}>2</div>
                  <span>O bot enviará uma mensagem de boas-vindas com o seu <b>ID de Usuário (Chat ID)</b>. Copie esse número.</span>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <div style={{ background: '#3897f0', color: '#000', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '0.8rem' }}>3</div>
                  <span>Cole o número no campo abaixo para salvar no seu perfil:</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>Seu Chat ID do Telegram</label>
                <input 
                  type="text" 
                  value={userConfig.telegramChatId}
                  onChange={(e) => setUserConfig(prev => ({ ...prev, telegramChatId: e.target.value }))}
                  style={{
                    width: '100%',
                    background: '#1c1c24',
                    border: '1px solid #333',
                    color: '#fff',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none',
                    fontFamily: 'monospace'
                  }}
                  placeholder="Ex: 7155613423"
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginTop: '10px' }}>
                <input 
                  type="checkbox" 
                  checked={userConfig.receiveTelegram} 
                  onChange={() => setUserConfig(prev => ({ ...prev, receiveTelegram: !prev.receiveTelegram }))} 
                  style={{ width: '18px', height: '18px', accentColor: '#3897f0' }} 
                />
                <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Ativar envio de notificações automáticas via Telegram</span>
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

  // --- SE FOR ADMINISTRADOR (EXIBE CONFIGURAÇÕES SAAS DO ROBÔ) ---
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '40px', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Settings color="var(--brand-neon)" size={36} />
          Configurações do Robô
        </h1>
        <p style={{ color: '#888', marginTop: '8px', fontSize: '1.1rem' }}>
          Gerencie as regras de automação e decida quais alertas seus clientes irão receber no Telegram.
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
          fontSize: '0.95rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Info color="#ff4d4d" size={24} />
          <div>
            <strong style={{ fontSize: '1.05rem' }}>Aviso de Sincronização:</strong> Não foi possível sincronizar as configurações com o banco de dados.
            <div style={{ fontSize: '0.85rem', marginTop: '4px', opacity: 0.9 }}>Motivo: {loadError}</div>
            <div style={{ fontSize: '0.85rem', marginTop: '2px', opacity: 0.9 }}>
              {loadError.includes('SUPABASE_SERVICE_ROLE_KEY') 
                ? 'A variável de ambiente SUPABASE_SERVICE_ROLE_KEY está ausente no servidor. Configure-a no painel de controle do Vercel.' 
                : 'Verifique sua conexão ou tente recarregar a página.'}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Bloco 1: Automação Global */}
        <div className="glass-panel" style={{ borderLeft: '4px solid var(--brand-neon)' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Zap color="var(--brand-neon)" size={24} />
            Piloto Automático
          </h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '16px 20px', borderRadius: '12px', border: '1px solid #222' }}>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>Disparo Automático de Palpites</div>
              <div style={{ color: '#888', fontSize: '0.9rem', maxWidth: '400px' }}>
                Quando ativado, o servidor irá varrer os jogos do dia e disparar automaticamente no Telegram os palpites matematicamente validados sem que você precise apertar o botão.
              </div>
            </div>
            
            {/* Toggle Switch UI */}
            <div 
              onClick={() => handleToggle('autoBroadcast')}
              style={{
                width: '60px', height: '32px', background: config.autoBroadcast ? 'var(--brand-neon)' : '#333',
                borderRadius: '16px', position: 'relative', cursor: 'pointer', transition: '0.3s'
              }}
            >
              <div style={{
                width: '26px', height: '26px', background: '#fff', borderRadius: '50%',
                position: 'absolute', top: '3px', left: config.autoBroadcast ? '31px' : '3px',
                transition: '0.3s', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
              }} />
            </div>
          </div>
        </div>

        {/* Bloco 2: Filtros de Ligas e Mercados */}
        <div className="glass-panel" style={{ borderLeft: '4px solid #00d2ff' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BellRing color="#00d2ff" size={24} />
            Preferências de Alertas
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', background: '#111', borderRadius: '8px' }}>
              <input type="checkbox" checked={config.alertBrasileirao} onChange={() => handleToggle('alertBrasileirao')} style={{ width: '20px', height: '20px', accentColor: '#00d2ff' }} />
              <div>
                <div style={{ fontWeight: 'bold' }}>Campeonato Brasileiro (Série A)</div>
                <div style={{ color: '#888', fontSize: '0.85rem' }}>Receber sinais filtrados do algoritmo de Poisson para jogos do Brasileirão.</div>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', background: '#111', borderRadius: '8px' }}>
              <input type="checkbox" checked={config.alertPrematch} onChange={() => handleToggle('alertPrematch')} style={{ width: '20px', height: '20px', accentColor: '#00d2ff' }} />
              <div>
                <div style={{ fontWeight: 'bold' }}>Alertas Pré-Jogo (Pré-Match)</div>
                <div style={{ color: '#888', fontSize: '0.85rem' }}>Enviar palpites com horas de antecedência.</div>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', background: '#111', borderRadius: '8px' }}>
              <input type="checkbox" checked={config.alertLive} onChange={() => handleToggle('alertLive')} style={{ width: '20px', height: '20px', accentColor: '#00d2ff' }} />
              <div>
                <div style={{ fontWeight: 'bold' }}>Alertas Ao Vivo (Live Bot)</div>
                <div style={{ color: '#888', fontSize: '0.85rem' }}>Monitorar pressão em tempo real e enviar entradas relâmpago.</div>
              </div>
            </label>

          </div>
        </div>

        {/* Bloco 3: Régua de Valor (EV) */}
        <div className="glass-panel" style={{ borderLeft: '4px solid #ff9800' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldCheck color="#ff9800" size={24} />
            Filtro de Qualidade (+EV)
          </h2>
          
          <div style={{ background: '#111', padding: '20px', borderRadius: '12px', border: '1px solid #222' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <label style={{ fontWeight: 'bold', color: '#fff' }}>Exigência Mínima de Valor Esperado (EV%)</label>
              <span style={{ background: '#ff9800', color: '#000', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold' }}>
                {config.minEV}% ou mais
              </span>
            </div>
            
            <input 
              type="range" 
              min="1" 
              max="20" 
              value={config.minEV} 
              onChange={(e) => setConfig(prev => ({ ...prev, minEV: Number(e.target.value) }))}
              style={{ width: '100%', accentColor: '#ff9800', cursor: 'pointer' }} 
            />
            
            <div style={{ color: '#888', fontSize: '0.9rem', marginTop: '16px' }}>
              O robô só enviará alertas automatizados para os clientes se a ODD da casa de apostas for pelo menos <strong>{config.minEV}%</strong> maior que a ODD Justa calculada pelo nosso modelo.
            </div>
          </div>
        </div>

        {/* Bloco 4: Informações Institucionais */}
        <div className="glass-panel" style={{ borderLeft: '4px solid #b339ff' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Info color="#b339ff" size={24} />
            Sobre a Plataforma
          </h2>
          <p style={{ color: '#aaa', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
            Esta plataforma é desenvolvida e gerida integralmente pela <strong>A2 Solutions</strong>.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
            <Link href="/quem-somos" style={{ background: '#1c1c24', border: '1px solid #333', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Info size={16} color="var(--brand-neon)" /> Quem Somos
            </Link>
            <Link href="/faq" style={{ background: '#1c1c24', border: '1px solid #333', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <HelpCircle size={16} color="var(--brand-neon)" /> Central de FAQ
            </Link>
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
            <><Save size={24} /> Salvar Preferências</>
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
            borderRadius: '6px',
            maxWidth: '450px'
          }}>
            Erro ao salvar no servidor: {saveError}
            {saveError.includes('SUPABASE_SERVICE_ROLE_KEY') && (
              <div style={{ fontSize: '0.8rem', fontWeight: 'normal', opacity: 0.8, marginTop: '4px' }}>
                Defina a variável SUPABASE_SERVICE_ROLE_KEY no painel de controle do servidor ou Vercel.
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
