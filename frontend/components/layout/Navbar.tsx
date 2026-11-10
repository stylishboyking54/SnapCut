'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BellIcon, AlertTriangleIcon, SearchIcon } from '@/components/ui/Icons';
import { AuthSession, getSession } from '@/lib/auth';
import SearchPalette from '@/components/layout/SearchPalette';

export type ThemeType = 'paper' | 'ink';

interface NavbarProps {
  currentRole: 'customer' | 'barber' | 'salon' | 'admin';
  notificationCount?: number;
}

export default function Navbar({
  currentRole,
  notificationCount = 0,
}: NavbarProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('paper');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const isInk = currentTheme === 'ink';

  useEffect(() => {
    const saved = localStorage.getItem('qb_theme_v3') as ThemeType | null;
    const theme: ThemeType = saved === 'ink' ? 'ink' : 'paper';
    setCurrentTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
    const sync = () => setSession(getSession());
    sync();
    window.addEventListener('snapcut-auth', sync);
    const onSearch = () => setSearchOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('snapcut-search', onSearch);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('snapcut-auth', sync);
      window.removeEventListener('snapcut-search', onSearch);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const name = session?.profile.full_name || '';
  const initials = name
    ? name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
    : '';

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
        <button type="button" className="icon-btn" title="Search" aria-label="Search" onClick={() => setSearchOpen(true)}>
          <SearchIcon size={16} />
        </button>
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

        {(currentRole === 'barber' || currentRole === 'salon') && (
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
        <Link
          href="/profile"
          className="avatar-chip"
          title={name || 'Profile'}
          aria-label={name ? `${name} — account` : 'Account'}
        >
          {session?.profile.avatar_url ? (
            <img src={session.profile.avatar_url} alt="" />
          ) : (
            initials || '·'
          )}
          {session && <span className="avatar-live" />}
        </Link>
      </div>
      {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
    </header>
  );
}
