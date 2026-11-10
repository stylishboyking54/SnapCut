'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdminShops } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { timeGreeting, todayLabel } from '@/lib/greeting';

export default function AdminDashboardPage() {
  const [shops, setShops] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminShops()
      .then(setShops)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load shops'))
      .finally(() => setLoading(false));
  }, []);

  const peopleWaiting = shops.reduce((sum, shop) => sum + Number(shop.current_queue_count || 0), 0);
  const paused = shops.filter((shop) => shop.is_emergency).length;
  const waits = shops.map((shop) => Number(shop.estimated_wait_minutes || 0));
  const avgWait = waits.length ? Math.round(waits.reduce((sum, n) => sum + n, 0) / waits.length) : 0;

  return (
    <div className="page-enter" style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <div className="date-pill"><span className="status-dot live" />{todayLabel()}</div>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 10 }}>{timeGreeting(getSession()?.profile.full_name)}</h1>
        <p className="secondary" style={{ fontSize: 14, marginTop: 6, maxWidth: 480, lineHeight: 1.45 }}>
          This is the whole app at a glance. Open a shop if someone needs help. Check People if an account looks wrong.
        </p>
      </div>

      {error && <div className="alert-banner">{error}</div>}

      <div className="stat-row">
        <div className="stat-chip">
          <div><b>{loading ? '…' : shops.length}</b><small>Shops on SnapCut</small></div>
        </div>
        <div className="stat-chip">
          <div><b>{loading ? '…' : peopleWaiting}</b><small>People waiting</small></div>
        </div>
        <div className="stat-chip">
          <div><b>{loading ? '…' : paused}</b><small>Lines paused</small></div>
        </div>
        <div className="stat-chip">
          <div><b>{loading ? '…' : `~${avgWait}m`}</b><small>Typical wait</small></div>
        </div>
      </div>

      <section className="panel">
        <h2 className="panel-title">Shops</h2>
        <p className="panel-sub">Tap Open to see the same page a customer sees.</p>
        {loading ? (
          <p className="muted">Loading shops…</p>
        ) : shops.length === 0 ? (
          <p className="muted">No shops yet. They appear here after a barber or salon finishes setup.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shops.slice(0, 6).map((shop) => (
              <div key={shop.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--bg-border-subtle)', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 650 }}>{shop.name}</div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>{shop.address}</div>
                </div>
                <Link href={`/shops/${shop.id}`} className="btn-secondary" style={{ fontSize: 12.5, minHeight: 34 }}>Open</Link>
              </div>
            ))}
          </div>
        )}
        <Link href="/admin/shops" className="btn-primary" style={{ marginTop: 16 }}>See every shop</Link>
      </section>
    </div>
  );
}
