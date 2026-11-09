'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AuthSession,
  getSession,
  logout,
  requestSignIn,
} from '@/lib/auth';

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setSession(getSession());
    sync();
    window.addEventListener('snapcut-auth', sync);
    return () => window.removeEventListener('snapcut-auth', sync);
  }, []);

  const handleLogout = async () => {
    await logout();
    setSession(null);
    setNote('Signed out.');
    router.replace('/');
  };

  if (!session) {
    return (
      <div className="page-enter" style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <div className="eyebrow">Account</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>Profile</h1>
          <p className="secondary" style={{ fontSize: 14, marginTop: 6 }}>
            Sign in to manage your account and tickets.
          </p>
        </div>

        <div className="panel" style={{ textAlign: 'center', padding: '36px 24px' }}>
          <p className="secondary" style={{ fontSize: 14, lineHeight: 1.5, maxWidth: 320, margin: '0 auto 18px' }}>
            You&apos;re browsing as a guest. Create an account to save your spot across devices.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => requestSignIn('Sign in to manage your Snapcut account.')}
          >
            Sign in
          </button>
        </div>
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
