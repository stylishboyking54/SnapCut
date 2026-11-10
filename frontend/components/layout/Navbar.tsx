'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BellIcon, AlertTriangleIcon, SearchIcon, UserIcon } from '@/components/ui/Icons';
import { AuthSession, getSession, logout, requestSignIn } from '@/lib/auth';
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
  const [accountOpen, setAccountOpen] = useState(false);
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
    const close = () => setAccountOpen(false);
    window.addEventListener('snapcut-auth', close);
    return () => {
      window.removeEventListener('snapcut-auth', sync);
      window.removeEventListener('snapcut-auth', close);
      window.removeEventListener('snapcut-search', onSearch);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (!accountOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('.account-wrap')) setAccountOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [accountOpen]);

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
      <Link href="/" className="top-brand" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src="/logo.png"
          alt="Snapcut"
          width={32}
          height={32}
          style={{ borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
        />
        <span>
          <strong className="topbar-wordmark">Snapcut</strong>
          <em className="live-sync-pill">Live line</em>
        </span>
      </Link>

      <div className="top-tools">
        <button type="button" className="icon-btn" title="Search" aria-label="Search" onClick={() => setSearchOpen(true)}>
          <SearchIcon size={16} />
        </button>
        <button
          type="button"
          className={`icon-btn theme-orb ${isInk ? '' : 'on'}`}
          aria-label="Light theme"
          onClick={() => isInk && toggleTheme()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </button>
        <button
          type="button"
          className={`icon-btn theme-orb ${isInk ? 'on' : ''}`}
          aria-label="Dark theme"
          onClick={() => !isInk && toggleTheme()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M16 13.2A6.2 6.2 0 0 1 10.8 8 6.2 6.2 0 1 0 16 13.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
        </button>

        {(currentRole === 'barber' || currentRole === 'salon') && (
          <Link
            href="/barber/emergency"
            className="btn-secondary top-shift"
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

        <Link href="/notifications" className="icon-btn" title="Notifications" style={{ marginLeft: 4 }}>
          <BellIcon size={14} />
          {notificationCount > 0 && <span className="notif-dot">{notificationCount}</span>}
        </Link>
        {session ? (
        <div className="account-wrap">
          <button
            type="button"
            className="avatar-chip"
            title={name || 'Account'}
            aria-label={name ? `${name} — account` : 'Account'}
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((v) => !v)}
          >
            {session.profile.avatar_url ? (
              <img src={session.profile.avatar_url} alt="" />
            ) : (
              initials || 'SC'
            )}
            <span className="avatar-live" />
          </button>
          {accountOpen && (
            <div className="account-menu" role="menu">
              <div className="account-menu-head">
                <span className="avatar-chip">
                  {session.profile.avatar_url ? <img src={session.profile.avatar_url} alt="" /> : initials || 'SC'}
                </span>
                <div>
                  <strong>{name}</strong>
                  <em>{session.email}</em>
                </div>
              </div>
              <Link href="/profile" role="menuitem" onClick={() => setAccountOpen(false)}>My profile</Link>
              <Link href="/bookings" role="menuitem" onClick={() => setAccountOpen(false)}>My ticket</Link>
              <Link href="/notifications" role="menuitem" onClick={() => setAccountOpen(false)}>Updates</Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAccountOpen(false);
                  void logout();
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
        ) : (
          <button
            type="button"
            className="btn-primary top-signin"
            onClick={() => requestSignIn('Sign in to your Snapcut account.')}
          >
            <UserIcon size={14} />
            Sign in
          </button>
        )}
      </div>
      {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
    </header>
  );
}
