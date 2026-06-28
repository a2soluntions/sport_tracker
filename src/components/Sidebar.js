'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Activity, TrendingUp, Settings, Bell, Calculator, Zap, Trophy, PiggyBank, LogOut, ArrowUpCircle, Info, HelpCircle, ShieldCheck, BookOpen, HeartHandshake } from 'lucide-react';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, getTrialDaysLeft } = useAuth();

  const [hasUpdate, setHasUpdate] = React.useState(false);
  const [hasNewAlert, setHasNewAlert] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkUpdate = () => {
        const updateState = localStorage.getItem('ev_tracker_update_available');
        setHasUpdate(updateState === 'true');
      };
      
      checkUpdate();
      window.addEventListener('storage', checkUpdate);
      const interval = setInterval(checkUpdate, 5000);

      return () => {
        window.removeEventListener('storage', checkUpdate);
        clearInterval(interval);
      };
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkNewAlerts = async () => {
      if (!supabase) return;
      try {
        const lastViewedId = localStorage.getItem('ev_tracker_last_viewed_notification');
        const { data, error } = await supabase
          .from('ev_opportunities')
          .select('id')
          .order('id', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const latestId = data[0].id;
          if (!lastViewedId) {
            // Se nunca visualizou, salva o id atual
            localStorage.setItem('ev_tracker_last_viewed_notification', String(latestId));
          } else if (String(latestId) !== lastViewedId && window.location.pathname !== '/notifications') {
            setHasNewAlert(true);
          }
        }
      } catch (err) {
        console.warn('[Sidebar] Erro ao checar novos alertas:', err);
      }
    };

    // Checagem inicial
    checkNewAlerts();

    // Ouvir evento de leitura
    const handleRead = () => {
      setHasNewAlert(false);
    };
    window.addEventListener('notifications_read', handleRead);

    // Ouvir novas inserções no Supabase em tempo real
    let channel;
    if (supabase) {
      channel = supabase.channel('sidebar-live-alerts')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ev_opportunities' }, 
          (payload) => {
            if (window.location.pathname !== '/notifications') {
              setHasNewAlert(true);
            } else {
              localStorage.setItem('ev_tracker_last_viewed_notification', String(payload.new.id));
            }
          }
        ).subscribe();
    }

    return () => {
      window.removeEventListener('notifications_read', handleRead);
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const getPlanStyles = (plan, role, couponCode) => {
    if (role === 'super_admin') {
      return {
        bg: 'rgba(179, 57, 255, 0.15)',
        color: '#b339ff',
        border: '1px solid #b339ff',
        label: 'SUPER ADMIN 👑'
      };
    }
    if (role === 'admin') {
      return {
        bg: 'rgba(0, 210, 255, 0.15)',
        color: '#00d2ff',
        border: '1px solid #00d2ff',
        label: 'ADMINISTRADOR ⚙️'
      };
    }
    if (couponCode) {
      return {
        bg: 'rgba(0, 210, 255, 0.15)',
        color: '#00d2ff',
        border: '1px solid #00d2ff',
        label: 'PLANO GRATUITO ★'
      };
    }
    switch (plan) {
      case 'pro':
        return {
          bg: 'rgba(204, 255, 0, 0.1)',
          color: 'var(--brand-neon)',
          border: '1px solid rgba(204, 255, 0, 0.2)',
          label: 'PRO'
        };
      case 'vip':
        return {
          bg: 'rgba(179, 57, 255, 0.15)',
          color: '#b339ff',
          border: '1px solid rgba(179, 57, 255, 0.3)',
          label: 'VIP ELITE'
        };
      case 'vitalicio':
        return {
          bg: 'rgba(204, 255, 0, 0.15)',
          color: 'var(--brand-neon)',
          border: '1px solid var(--brand-neon)',
          label: 'ACESSO VITALÍCIO'
        };
      default:
        return {
          bg: '#1c1c24',
          color: '#888',
          border: '1px solid #333',
          label: 'TRIAL GRÁTIS'
        };
    }
  };

  const planStyle = getPlanStyles(user?.plan, user?.role, user?.coupon_code);
  const trialDays = getTrialDaysLeft();
  const isTrialActive = user?.plan === 'gratis' && !user?.coupon_code && user?.role !== 'admin' && user?.role !== 'super_admin';

  return (
    <>
      <div className={styles.mobileHeader}>
        <div className={styles.mobileLogo}>
          <Zap size={20} className={styles.logoIcon} strokeWidth={2.5} />
          <span className={styles.logoText}>a2sport<span style={{ color: 'var(--brand-neon)' }}>trackers</span></span>
        </div>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {(user.role === 'super_admin' || user.role === 'admin') && (
              <Link href="/admin" title="Administração" style={{
                color: 'var(--brand-neon)',
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
                background: 'rgba(204, 255, 0, 0.05)',
                border: '1px solid rgba(204, 255, 0, 0.2)',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>
                <ShieldCheck size={16} />
              </Link>
            )}
            <Link href="/pricing" title={planStyle.label} style={{
              background: planStyle.bg,
              color: planStyle.color,
              border: planStyle.border,
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.65rem',
              fontWeight: 'bold',
              textDecoration: 'none',
              textTransform: 'uppercase'
            }}>
              ★ PRO
            </Link>
            <button 
              onClick={handleLogout}
              style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>

      <aside className={styles.sidebar}>
        <div className={styles.logo} style={{ marginBottom: '32px' }}>
          <div className={styles.logoIconWrapper}>
            <Zap size={24} className={styles.logoIcon} strokeWidth={2.5} />
          </div>
          <span className={styles.sidebarLogoText} style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
            a2sport<span style={{ color: 'var(--brand-neon)' }}>trackers</span>
          </span>
        </div>
        
        <nav className={styles.nav}>
          <Link href="/dashboard" className={`${styles.navItem} ${pathname === '/dashboard' ? styles.navItemActive : ''}`}>
            <Zap size={20} className={styles.navIcon} /> 
            <span>Alertas +EV</span>
          </Link>
          <Link href="/calculator" className={`${styles.navItem} ${pathname === '/calculator' ? styles.navItemActive : ''}`}>
            <img 
              src="/a2logo.jpg" 
              alt="" 
              style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover', marginRight: '12px' }} 
            />
            <span>A2score</span>
          </Link>
          <Link href="/backtest" className={`${styles.navItem} ${pathname === '/backtest' ? styles.navItemActive : ''}`}>
            <TrendingUp size={20} className={styles.navIcon} /> 
            <span>Resultados</span>
          </Link>
          <Link href="/palpites" className={`${styles.navItem} ${pathname === '/palpites' ? styles.navItemActive : ''}`}>
            <Trophy size={20} className={styles.navIcon} /> 
            <span>Palpites</span>
          </Link>
          <Link href="/banca" className={`${styles.navItem} ${pathname === '/banca' ? styles.navItemActive : ''}`}>
            <PiggyBank size={20} className={styles.navIcon} /> 
            <span>Carteira (Banca)</span>
          </Link>
          <Link href="/notifications" className={`${styles.navItem} ${pathname === '/notifications' ? styles.navItemActive : ''}`}>
            <Bell size={20} className={`${styles.navIcon} ${hasUpdate || hasNewAlert ? 'bell-blink' : ''}`} /> 
            <span>Notificações</span>
          </Link>
          <Link href="/settings" className={`${styles.navItem} ${pathname === '/settings' ? styles.navItemActive : ''}`}>
            <Settings size={20} className={styles.navIcon} /> 
            <span>Configurações</span>
          </Link>
          {user && (user.role === 'super_admin' || user.role === 'admin') && (
            <Link href="/admin" className={`${styles.navItem} ${pathname === '/admin' ? styles.navItemActive : ''}`}>
              <ShieldCheck size={20} className={styles.navIcon} color="var(--brand-neon)" /> 
              <span style={{ color: 'var(--brand-neon)', fontWeight: 'bold' }}>Administração</span>
            </Link>
          )}
          <Link href="/quem-somos" className={`${styles.navItem} ${pathname === '/quem-somos' ? styles.navItemActive : ''}`}>
            <Info size={20} className={styles.navIcon} /> 
            <span>Quem Somos</span>
          </Link>
          <Link href="/tutorial" className={`${styles.navItem} ${pathname === '/tutorial' ? styles.navItemActive : ''}`}>
            <BookOpen size={20} className={styles.navIcon} /> 
            <span>Tutorial</span>
          </Link>
          <Link href="/jogo-responsavel" className={`${styles.navItem} ${pathname === '/jogo-responsavel' ? styles.navItemActive : ''}`}>
            <HeartHandshake size={20} className={styles.navIcon} /> 
            <span>Jogo Responsável</span>
          </Link>
          <Link href="/faq" className={`${styles.navItem} ${pathname === '/faq' ? styles.navItemActive : ''}`}>
            <HelpCircle size={20} className={styles.navIcon} /> 
            <span>FAQ</span>
          </Link>
        </nav>

        {user && (
          <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--brand-neon) 0%, #00ff88 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                color: '#000',
                fontSize: '1rem',
                boxShadow: '0 4px 10px rgba(0, 255, 170, 0.2)'
              }}>
                {user.email ? user.email.substring(0, 2).toUpperCase() : 'U'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </span>
                <span style={{ 
                  fontSize: '0.68rem', 
                  color: planStyle.color, 
                  fontWeight: 'bold',
                  display: 'inline-block',
                  marginTop: '2px'
                }}>
                  {planStyle.label}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {isTrialActive && trialDays !== null && (
                <div style={{ fontSize: '0.75rem', color: '#888', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--brand-neon)' }}></span>
                  <span>Período de teste: <strong>{trialDays} {trialDays === 1 ? 'dia' : 'dias'} restante(s)</strong></span>
                </div>
              )}
              <button 
                onClick={handleLogout}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: '#888', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  fontSize: '0.78rem', 
                  fontWeight: 'bold', 
                  cursor: 'pointer', 
                  alignSelf: 'flex-start', 
                  transition: 'color 0.2s' 
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ff4d4d'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
              >
                <LogOut size={14} />
                <span>Encerrar Sessão</span>
              </button>
            </div>
          </div>
        )}
      </aside>

      <nav className={styles.bottomNav}>
        {user && (user.role === 'admin' || user.role === 'super_admin') ? (
          <Link href="/admin" className={`${styles.bottomNavItem} ${pathname === '/admin' ? styles.bottomNavItemActive : ''}`} title="Admin">
            <ShieldCheck size={20} className={styles.bottomNavIcon} color="var(--brand-neon)" />
          </Link>
        ) : (
          <Link href="/dashboard" className={`${styles.bottomNavItem} ${pathname === '/dashboard' ? styles.bottomNavItemActive : ''}`} title="Alertas">
            <Zap size={20} className={styles.bottomNavIcon} />
          </Link>
        )}
        <Link href="/calculator" className={`${styles.bottomNavItem} ${pathname === '/calculator' ? styles.bottomNavItemActive : ''}`} title="A2score">
          <img 
            src="/a2logo.jpg" 
            alt="A2score" 
            style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover' }} 
          />
        </Link>
        <Link href="/palpites" className={`${styles.bottomNavItem} ${pathname === '/palpites' ? styles.bottomNavItemActive : ''}`} title="Palpites">
          <Trophy size={20} className={styles.bottomNavIcon} />
        </Link>
        <Link href="/backtest" className={`${styles.bottomNavItem} ${pathname === '/backtest' ? styles.bottomNavItemActive : ''}`} title="Relatório">
          <TrendingUp size={20} className={styles.bottomNavIcon} />
        </Link>
        <Link href="/banca" className={`${styles.bottomNavItem} ${pathname === '/banca' ? styles.bottomNavItemActive : ''}`} title="Carteira">
          <PiggyBank size={20} className={styles.bottomNavIcon} />
        </Link>
        <Link href="/notifications" className={`${styles.bottomNavItem} ${pathname === '/notifications' ? styles.bottomNavItemActive : ''}`} title="Notificações">
          <Bell size={20} className={`${styles.bottomNavIcon} ${hasUpdate || hasNewAlert ? 'bell-blink' : ''}`} />
        </Link>
        <Link href="/settings" className={`${styles.bottomNavItem} ${pathname === '/settings' ? styles.bottomNavItemActive : ''}`} title="Configurações">
          <Settings size={20} className={styles.bottomNavIcon} />
        </Link>
      </nav>
    </>
  );
}
