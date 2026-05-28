'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, TrendingUp, Settings, Bell, Calculator, Zap, Trophy, PiggyBank } from 'lucide-react';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Top Header (only visible on mobile) */}
      <div className={styles.mobileHeader}>
        <div className={styles.mobileLogo}>
          <Zap size={20} className={styles.logoIcon} strokeWidth={2.5} />
          <span className={styles.logoText}>EV Tracker <span style={{ color: 'var(--brand-neon)' }}>PRO</span></span>
        </div>
      </div>

      {/* Sidebar Container (Desktop only) */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoIconWrapper}>
            <Zap size={24} className={styles.logoIcon} strokeWidth={2.5} />
          </div>
          <span className={styles.logoText}>EV Tracker <span style={{ color: 'var(--brand-neon)' }}>PRO</span></span>
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
        </nav>
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
