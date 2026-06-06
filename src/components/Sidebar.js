'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Activity, TrendingUp, Settings, Bell, Calculator, Zap, Trophy, PiggyBank, LogOut, ArrowUpCircle, Info, HelpCircle, ShieldCheck } from 'lucide-react';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, getTrialDaysLeft } = useAuth();

  const handleLogout = async () => {
    await logout();
    if (typeof window !== 'undefined') {
      window.close();
    }
    router.push('/login');
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

  return (
    <>
      {/* Mobile Top Header (only visible on mobile) */}
      <div className={styles.mobileHeader}>
        <div className={styles.mobileLogo}>
          <Zap size={20} className={styles.logoIcon} strokeWidth={2.5} />
          <span className={styles.logoText}>a2sport<span style={{ color: 'var(--brand-neon)' }}>trackers</span></span>
        </div>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {(user.role === 'super_admin' || user.role === 'admin') && (
              <Link href="/admin" style={{
                color: 'var(--brand-neon)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'none',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                marginRight: '8px',
                background: 'rgba(204, 255, 0, 0.05)',
                border: '1px solid rgba(204, 255, 0, 0.2)',
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                <ShieldCheck size={12} /> Admin
              </Link>
            )}
            <Link href="/pricing" style={{
              background: planStyle.bg,
              color: planStyle.color,
              border: planStyle.border,
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.65rem',
              fontWeight: 'bold',
              textDecoration: 'none'
            }}>
              {planStyle.label}
            </Link>
            <button 
              onClick={handleLogout}
              style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: '4px' }}
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Sidebar Container (Desktop only) */}
      <aside className={styles.sidebar}>
        <div className={styles.logo} style={{ marginBottom: '32px' }}>
          <div className={styles.logoIconWrapper}>
            <Zap size={24} className={styles.logoIcon} strokeWidth={2.5} />
          </div>
          <span className={styles.logoText}>a2sport<span style={{ color: 'var(--brand-neon)' }}>trackers</span></span>
        </div>
        
        <nav className={styles.nav}>
          <Link href="/" className={`${styles.navItem} ${pathname === '/' ? styles.navItemActive : ''}`}>
            <Zap size={20} className={styles.navIcon} /> 
            <span>Alertas +EV</span>
          </Link>
          <Link href="/calculator" className={`${styles.navItem} ${pathname === '/calculator' ? styles.navItemActive : ''}`}>
            <Calculator size={20} className={styles.navIcon} /> 
            <span>Análise</span>
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
            <Bell size={20} className={styles.navIcon} /> 
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
          <Link href="/faq" className={`${styles.navItem} ${pathname === '/faq' ? styles.navItemActive : ''}`}>
            <HelpCircle size={20} className={styles.navIcon} /> 
            <span>FAQ</span>
          </Link>
        </nav>

        {/* Rodapé: Perfil e Sessão SaaS */}
        {user && (
          <div style={{
            marginTop: 'auto',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {/* Bloco de Info do Usuário */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Avatar Redondo */}
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: (user.plan === 'vip' || user.plan === 'vitalicio' || user.role === 'super_admin') ? '#b339ff' : user.plan === 'pro' ? 'var(--brand-neon)' : '#222',
                color: (user.plan === 'gratis' && user.role !== 'admin' && user.role !== 'super_admin') ? '#888' : '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                border: '1px solid ' + ((user.plan === 'vip' || user.plan === 'vitalicio' || user.role === 'super_admin') ? '#b339ff' : user.plan === 'pro' ? 'var(--brand-neon)' : '#333'),
                flexShrink: 0
              }}>
                {user.name ? user.name.substring(0, 2).toUpperCase() : 'US'}
              </div>
              {/* Nome e Plano */}
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </span>
                <span style={{
                  background: planStyle.bg,
                  color: planStyle.color,
                  border: planStyle.border,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.62rem',
                  fontWeight: 'bold',
                  alignSelf: 'flex-start',
                  marginTop: '4px'
                }}>
                  {planStyle.label}
                </span>
              </div>
            </div>

             {/* Contador de Trial */}
            {user.plan === 'gratis' && !user.coupon_code && user.role !== 'admin' && user.role !== 'super_admin' && (
              <div style={{
                background: 'rgba(255, 152, 0, 0.05)',
                border: '1px dashed rgba(255, 152, 0, 0.2)',
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '0.75rem',
                color: '#ff9800',
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                Trial: {trialDays} {trialDays === 1 ? 'dia restante' : 'dias restantes'}
              </div>
            )}

            {/* Ações */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {user.plan === 'gratis' && !user.coupon_code && user.role !== 'admin' && user.role !== 'super_admin' && (
                <Link href="/pricing" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: 'var(--brand-neon)',
                  color: '#000',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  textDecoration: 'none',
                  textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(204, 255, 0, 0.1)'
                }}>
                  <ArrowUpCircle size={14} />
                  <span>Fazer Upgrade</span>
                </Link>
              )}

              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'transparent',
                  border: 'none',
                  color: '#888',
                  padding: '6px 0',
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

      {/* Mobile Bottom Navigation Bar */}
      <nav className={styles.bottomNav}>
        <Link href="/" className={`${styles.bottomNavItem} ${pathname === '/' ? styles.bottomNavItemActive : ''}`}>
          <Zap size={18} className={styles.bottomNavIcon} />
          <span>Alertas</span>
        </Link>
        <Link href="/calculator" className={`${styles.bottomNavItem} ${pathname === '/calculator' ? styles.bottomNavItemActive : ''}`}>
          <Calculator size={18} className={styles.bottomNavIcon} />
          <span>Análise</span>
        </Link>
        <Link href="/palpites" className={`${styles.bottomNavItem} ${pathname === '/palpites' ? styles.bottomNavItemActive : ''}`}>
          <Trophy size={18} className={styles.bottomNavIcon} />
          <span>Palpites</span>
        </Link>
        <Link href="/backtest" className={`${styles.bottomNavItem} ${pathname === '/backtest' ? styles.bottomNavItemActive : ''}`}>
          <TrendingUp size={18} className={styles.bottomNavIcon} />
          <span>Relatório</span>
        </Link>
        <Link href="/banca" className={`${styles.bottomNavItem} ${pathname === '/banca' ? styles.bottomNavItemActive : ''}`}>
          <PiggyBank size={18} className={styles.bottomNavIcon} />
          <span>Carteira</span>
        </Link>
        <Link href="/notifications" className={`${styles.bottomNavItem} ${pathname === '/notifications' ? styles.bottomNavItemActive : ''}`}>
          <Bell size={18} className={styles.bottomNavIcon} />
          <span>Notif.</span>
        </Link>
        <Link href="/settings" className={`${styles.bottomNavItem} ${pathname === '/settings' ? styles.bottomNavItemActive : ''}`}>
          <Settings size={18} className={styles.bottomNavIcon} />
          <span>Config.</span>
        </Link>
      </nav>
    </>
  );
}
