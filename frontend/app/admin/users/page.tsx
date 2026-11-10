'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdminUsers } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { timeGreeting, todayLabel } from '@/lib/greeting';

function roleWord(role?: string) {
  if (role === 'barber') return 'Barber';
  if (role === 'salon') return 'Salon';
  if (role === 'admin') return 'Admin';
  return 'Customer';
}

export default function AdminPeoplePage() {
  const [people, setPeople] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminUsers()
      .then(setPeople)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load people'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-enter" style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="page-header-row">
        <div>
          <div className="date-pill"><span className="status-dot live" />{todayLabel()}</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 10 }}>{timeGreeting(getSession()?.profile.full_name)}</h1>
          <p className="secondary" style={{ marginTop: 6, fontSize: 14, maxWidth: 480, lineHeight: 1.45 }}>
            Everyone who has signed in. Customer means they join a line. Barber or Salon means they run a shop.
          </p>
        </div>
        <Link href="/admin" className="btn-secondary">← Home</Link>
      </div>

      {error && <div className="alert-banner">{error}</div>}

      <section className="panel">
        {loading ? (
          <p className="muted">Loading people…</p>
        ) : people.length === 0 ? (
          <p className="muted">No accounts yet.</p>
        ) : (
          people.map((person) => (
            <div key={person.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--bg-border-subtle)', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 650 }}>{person.full_name || 'No name yet'}</div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>{person.email || person.phone || 'No email on file'}</div>
              </div>
              <span className="status-mark open">{roleWord(person.role)}</span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
