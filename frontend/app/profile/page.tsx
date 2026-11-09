'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AuthSession,
  getSession,
  logout,
} from '@/lib/auth';

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSession(getSession());
      setReady(true);
    };
    sync();
    window.addEventListener('snapcut-auth', sync);
    return () => window.removeEventListener('snapcut-auth', sync);
  }, []);

  const handleLogout = async () => {
    await logout();
    setSession(null);
    router.replace('/');
  };

  if (!ready) {
    return (
      <div className="page-enter" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="page-enter" style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600 }}>Profile</h1>
          <p className="secondary" style={{ fontSize: 14, marginTop: 6 }}>
            Your account and role live here once you sign in.
          </p>
        </div>
        <div className="panel" style={{ textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ fontSize: 15, fontWeight: 650 }}>Not signed in</div>
          <p className="muted" style={{ fontSize: 13.5, marginTop: 8, lineHeight: 1.45 }}>
            Use the sign-in popup to continue, or browse shops first.
          </p>
          <Link href="/" className="btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
            Explore shops
          </Link>
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

  const role = session.profile.role;
  const isPro = role === 'barber' || role === 'salon';

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
            <div className="muted" style={{ fontSize: 12.5, textTransform: 'capitalize' }}>{role}</div>
          </div>
        </div>

        <button type="button" className="btn-secondary" onClick={handleLogout}>
          Sign out
        </button>
      </div>

      <div className="panel">
        <h2 className="panel-title" style={{ marginBottom: 6 }}>Next</h2>
        {isPro ? (
          <>
            <p className="panel-sub">Run your floor from the queue dashboard, or update how customers find you.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <Link href="/barber/dashboard" className="btn-primary" style={{ fontSize: 13 }}>
                Open queue
              </Link>
              <Link href="/barber/shop" className="btn-secondary" style={{ fontSize: 13 }}>
                Edit {role === 'salon' ? 'salon' : 'shop'}
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="panel-sub">Join a line from Explore, then watch your turn on Ticket.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <Link href="/" className="btn-primary" style={{ fontSize: 13 }}>
                Find a shop
              </Link>
              <Link href="/bookings" className="btn-secondary" style={{ fontSize: 13 }}>
                My ticket
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
