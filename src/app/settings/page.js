'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, BellRing, ShieldCheck, Zap, CheckCircle2, Info, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const [config, setConfig] = useState({
    autoBroadcast: false,
    alertBrasileirao: true,
    alertPrematch: true,
    alertLive: false,
    minEV: 5
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedConfig = localStorage.getItem('ev_tracker_settings');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('ev_tracker_settings', JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleToggle = (key) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

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

      <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          onClick={handleSave}
          style={{ 
            background: saved ? '#4CAF50' : 'var(--brand-neon)', 
            color: '#000', 
            padding: '16px 40px', 
            borderRadius: '8px', 
            fontSize: '1.1rem', 
            fontWeight: 'bold', 
            border: 'none', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            boxShadow: saved ? 'none' : '0 4px 15px rgba(0, 255, 170, 0.3)',
            transition: 'all 0.3s'
          }}
        >
          {saved ? (
            <><CheckCircle2 size={24} /> Configurações Salvas!</>
          ) : (
            <><Save size={24} /> Salvar Preferências</>
          )}
        </button>
      </div>

    </div>
  );
}
