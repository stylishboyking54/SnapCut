'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session || session.profile?.role !== 'admin') {
      setAuthorized(false);
      setChecking(false);
      const timer = setTimeout(() => {
        router.replace('/');
      }, 3500);
      return () => clearTimeout(timer);
    } else {
      setAuthorized(true);
      setChecking(false);
    }
  }, [router]);

  if (checking) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="muted" style={{ fontSize: 14 }}>Verifying administrator credentials…</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="page-enter" style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center', padding: '0 16px' }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.12)',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: 28,
        }}>
          🛡️
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Administrator Access Only</h1>
        <p className="secondary" style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          This control panel is strictly restricted. Admin status cannot be chosen during signup and must be explicitly assigned by the Super Admin.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="btn-primary" style={{ minWidth: 140 }}>
            Return Home
          </Link>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('snapcut-signin', { detail: { reason: 'Sign in with an admin account' } }));
            }}
          >
            Switch Account
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 24 }}>
          Redirecting to home in a moment…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
