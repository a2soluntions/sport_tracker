'use client';

import React from 'react';
import { Bell, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function NotificationsPage() {
  // Dados mockados para simular notificações do robô
  const mockNotifications = [
    {
      id: 1,
      type: 'success',
      title: 'Aposta Encontrada: Flamengo x Palmeiras',
      message: 'O modelo identificou uma oportunidade de Over 2.5 gols com 5% de EV+.',
      time: 'Há 5 minutos',
      read: false
    },
    {
      id: 2,
      type: 'system',
      title: 'Integração Telegram Ativa',
      message: 'Sua conta do Telegram foi vinculada com sucesso. Você passará a receber alertas em tempo real.',
      time: 'Há 2 horas',
      read: true
    },
    {
      id: 3,
      type: 'success',
      title: 'Aposta Encontrada: Real Madrid x Barcelona',
      message: 'O modelo identificou uma vitória do Real Madrid (Casa) com 8% de EV+ contra a Pinnacle.',
      time: 'Ontem',
      read: true
    }
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '40px', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Bell color="var(--brand-neon)" size={36} />
          Central de Notificações
        </h1>
        <p style={{ color: '#888', marginTop: '8px', fontSize: '1.1rem' }}>
          Histórico de alertas emitidos pelo Robô e mensagens do sistema.
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {mockNotifications.map((notif) => (
          <div 
            key={notif.id} 
            className="glass-panel" 
            style={{ 
              display: 'flex', 
              gap: '16px', 
              padding: '20px', 
              borderLeft: notif.read ? '4px solid #333' : '4px solid var(--brand-neon)',
              background: notif.read ? '#0a0a0a' : '#111',
              opacity: notif.read ? 0.7 : 1
            }}
          >
            <div style={{ paddingTop: '4px' }}>
              {notif.type === 'success' ? (
                <CheckCircle2 color="var(--brand-neon)" size={24} />
              ) : (
                <AlertCircle color="#00d2ff" size={24} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: notif.read ? '#aaa' : '#fff' }}>{notif.title}</h3>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>{notif.time}</span>
              </div>
              <p style={{ margin: 0, color: notif.read ? '#666' : '#aaa', lineHeight: '1.5' }}>
                {notif.message}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '40px', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
        <p>Atualmente os alertas em tempo real estão sendo enviados diretamente para o seu Telegram.</p>
        <p>No futuro, eles também aparecerão nesta central.</p>
      </div>
    </div>
  );
}
