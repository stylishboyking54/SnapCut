'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthSession, getSession, logout } from '@/lib/auth';
import { getBookingRows } from '@/lib/api';
import { summarizeWeek } from '@/lib/weekStats';
import CountUp from '@/components/ui/CountUp';

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);
  const [visits, setVisits] = useState(0);
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    const sync = () => {
      setSession(getSession());
      setReady(true);
    };
    sync();
    window.addEventListener('snapcut-auth', sync);
    return () => window.removeEventListener('snapcut-auth', sync);
  }, []);

  useEffect(() => {
    if (!session) return;
    getBookingRows()
      .then((rows) => {
        const week = summarizeWeek(rows);
        setVisits(week.visits);
        setMinutes(week.minutes);
      })
      .catch(() => undefined);
  }, [session]);

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
      <div className="page-enter" style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1 style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.03em' }}>Profile</h1>
        <div className="panel profile-hero" style={{ marginTop: 16 }}>
          <span className="avatar-chip lg">·</span>
          <h2>Not signed in</h2>
          <p className="muted">Tap the round photo at the top, then Sign in.</p>
          <Link href="/" className="btn-primary" style={{ marginTop: 8 }}>Find a shop</Link>
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
    <div className="page-enter" style={{ maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.03em' }}>Profile</h1>

      <div className="profile-grid">
        <section className="panel profile-hero">
          <span className="avatar-chip lg">
            {session.profile.avatar_url ? <img src={session.profile.avatar_url} alt="" /> : initials || 'SC'}
          </span>
          <h2>{session.profile.full_name}</h2>
          <p className="muted" style={{ fontSize: 13.5 }}>
            {session.email} · <span style={{ textTransform: 'capitalize' }}>{role}</span>
          </p>
          <div className="profile-stats">
            <div className="profile-stat">
              <b><CountUp value={visits} /></b>
              <span>Visits this week</span>
            </div>
            <div className="profile-stat">
              <b><CountUp value={minutes} /></b>
              <span>Minutes in a chair</span>
            </div>
            <div className="profile-stat">
              <b style={{ fontSize: 16 }}>{role === 'barber' ? 'Barber' : role === 'salon' ? 'Salon' : role === 'admin' ? 'Admin' : 'Customer'}</b>
              <span>You are</span>
            </div>
          </div>
        </section>

        <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <h2 className="panel-title">About you</h2>
            <p className="panel-sub">Shops see this name when you join. You cannot change it on this screen yet.</p>
          </div>
          <div className="field">
            <label>Full name</label>
            <input readOnly value={session.profile.full_name} />
          </div>
          <div className="field">
            <label>Email</label>
            <input readOnly value={session.email} />
          </div>
          <div className="field">
            <label>Phone</label>
            <input readOnly value={session.profile.phone || 'Not added'} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {isPro ? (
              <Link href="/barber/shop" className="btn-primary">Edit my shop</Link>
            ) : (
              <Link href="/bookings" className="btn-primary">See my ticket</Link>
            )}
            <button type="button" className="btn-secondary" onClick={handleLogout}>Sign out</button>
          </div>
        </section>
      </div>
    </div>
  );
}
