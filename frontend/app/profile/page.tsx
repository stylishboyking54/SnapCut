'use client';

import React, { useEffect, useState } from 'react';
import {
  AuthSession,
  clearSession,
  getSession,
  login,
  logout,
  register,
} from '@/lib/auth';

export default function ProfilePage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setSession(getSession());
    sync();
    window.addEventListener('snapcut-auth', sync);
    return () => window.removeEventListener('snapcut-auth', sync);
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const next =
        mode === 'login'
          ? await login(email.trim(), password)
          : await register(email.trim(), password, fullName.trim() || 'Customer', 'customer');
      setSession(next);
      setPassword('');
      setNote(mode === 'login' ? 'Signed in.' : 'Account created.');
      setTimeout(() => setNote(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auth failed');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setSession(null);
    clearSession();
    setNote('Signed out.');
    setTimeout(() => setNote(null), 3000);
  };

  if (!session) {
    return (
      <div className="page-enter" style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <div className="eyebrow">Account</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h1>
          <p className="secondary" style={{ fontSize: 14, marginTop: 6 }}>
            Sign in so your Ticket stays linked to you across devices.
          </p>
        </div>

        {error && (
          <div className="alert-banner" style={{ background: 'var(--brand-danger-soft)', color: 'var(--brand-danger)' }}>
            {error}
          </div>
        )}
        {note && (
          <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--brand-success-soft)', color: 'var(--brand-success)', fontWeight: 600, fontSize: 13.5 }}>
            {note}
          </div>
        )}

        <form onSubmit={handleAuth} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'register' && (
            <div className="field">
              <label>Full name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Alex Johnson" required />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          </div>
          <button type="submit" className="btn-primary" disabled={busy} style={{ marginTop: 4 }}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
          >
            {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
          </button>
        </form>
      </div>
    );
  }

  const initials = session.profile.full_name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="page-enter" style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <div className="eyebrow">Account</div>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>Profile</h1>
        <p className="secondary" style={{ fontSize: 14, marginTop: 6 }}>
          Signed in as {session.email}
        </p>
      </div>

      {note && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--brand-success-soft)', color: 'var(--brand-success)', fontWeight: 600, fontSize: 13.5 }}>
          {note}
        </div>
      )}

      <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--bg-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--brand-primary)',
            }}
          >
            {initials || 'SC'}
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 650 }}>{session.profile.full_name}</div>
            <div className="muted" style={{ fontSize: 12.5, textTransform: 'capitalize' }}>{session.profile.role}</div>
          </div>
        </div>

        <div className="field">
          <label>Email</label>
          <input type="email" value={session.email} readOnly />
        </div>

        <button type="button" className="btn-secondary" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </div>
  );
}
