'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AuthSession,
  getSession,
  logout,
} from '@/lib/auth';

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const sync = () => setSession(getSession());
    sync();
    window.addEventListener('snapcut-auth', sync);
    return () => window.removeEventListener('snapcut-auth', sync);
  }, []);

  const handleLogout = async () => {
    await logout();
    setSession(null);
    router.replace('/');
  };

  // Guest path is handled by the sign-in popup — keep this blank while redirecting
  if (!session) {
    return null;
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
        <h1 style={{ fontSize: 28, fontWeight: 600 }}>Profile</h1>
        <p className="secondary" style={{ fontSize: 14, marginTop: 6 }}>
          {session.email}
        </p>
      </div>

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

        <button type="button" className="btn-secondary" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </div>
  );
}
