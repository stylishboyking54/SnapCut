'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BellIcon, AlertTriangleIcon } from '@/components/ui/Icons';

export type ThemeType = 'paper' | 'ink';

interface NavbarProps {
  currentRole: 'customer' | 'barber' | 'admin';
  onRoleChange?: (role: 'customer' | 'barber' | 'admin') => void;
  notificationCount?: number;
}

export default function Navbar({
  currentRole,
  onRoleChange,
  notificationCount = 2,
}: NavbarProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('paper');
  const isInk = currentTheme === 'ink';

  useEffect(() => {
    const saved = localStorage.getItem('qb_theme_v3') as ThemeType | null;
    const theme: ThemeType = saved === 'ink' ? 'ink' : 'paper';
    setCurrentTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  const toggleTheme = () => {
    const nextTheme: ThemeType = currentTheme === 'paper' ? 'ink' : 'paper';
    setCurrentTheme(nextTheme);
    localStorage.setItem('qb_theme_v3', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', minWidth: 0 }}>
        <span className="topbar-wordmark" style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, letterSpacing: '-0.02em' }}>
          Snapcut
        </span>
        <span
          className="live-sync-pill"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--brand-success)',
          }}
        >
          <span className="status-dot live" />
          Live
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <button
          type="button"
          role="switch"
          className={`theme-switch ${isInk ? 'on' : ''}`}
          aria-checked={isInk}
          aria-label={isInk ? 'Dark mode on' : 'Dark mode off'}
          title={isInk ? 'Ink' : 'Paper'}
          onClick={toggleTheme}
        >
          <span className="theme-switch-knob" />
        </button>

        {onRoleChange && (
          <select
            className="role-select"
            value={currentRole === 'admin' ? 'customer' : currentRole}
            onChange={(e) => onRoleChange(e.target.value as 'customer' | 'barber')}
            aria-label="Switch role"
          >
            <option value="customer">Customer</option>
            <option value="barber">Barber</option>
          </select>
        )}

        {currentRole === 'barber' && (
          <Link
            href="/barber/emergency"
            className="btn-secondary"
            style={{
              minHeight: 30,
              padding: '4px 10px',
              fontSize: '11.5px',
              borderColor: 'var(--brand-danger-soft)',
              color: 'var(--brand-danger)',
            }}
          >
            <AlertTriangleIcon size={12} color="var(--brand-danger)" />
            Shift
          </Link>
        )}

        <Link href="/notifications" className="icon-btn" title="Notifications">
          <BellIcon size={14} />
          {notificationCount > 0 && <span className="notif-dot">{notificationCount}</span>}
        </Link>
      </div>
    </header>
  );
}
