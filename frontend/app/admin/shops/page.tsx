'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdminShops, verifyAdminShop } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { timeGreeting, todayLabel } from '@/lib/greeting';

export default function AdminShopsPage() {
  const [shops, setShops] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getAdminShops()
      .then(setShops)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load shops'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const markChecked = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await verifyAdminShop(id);
      setShops((rows) => rows.map((shop) => (shop.id === id ? { ...shop, is_verified: true } : shop)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark that shop');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page-enter" style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="page-header-row">
        <div>
          <div className="date-pill"><span className="status-dot live" />{todayLabel()}</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 10 }}>{timeGreeting(getSession()?.profile.full_name)}</h1>
          <p className="secondary" style={{ marginTop: 6, fontSize: 14, maxWidth: 480, lineHeight: 1.45 }}>
            Every shop on Snapcut. Mark one as checked when you have looked it over. Open shows the customer page.
          </p>
        </div>
        <Link href="/admin" className="btn-secondary">← Home</Link>
      </div>

      {error && <div className="alert-banner">{error}</div>}

      <section className="panel">
        {loading ? (
          <p className="muted">Loading shops…</p>
        ) : shops.length === 0 ? (
          <p className="muted">No shops yet.</p>
        ) : (
          shops.map((shop) => (
            <div key={shop.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--bg-border-subtle)', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 650 }}>{shop.name}</div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>
                  {shop.profiles?.full_name || 'Owner'} · {shop.city || shop.address} · {shop.is_emergency ? 'Line paused' : 'Open'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {!shop.is_verified && (
                  <button type="button" className="btn-secondary" disabled={busyId === shop.id} onClick={() => void markChecked(shop.id)}>
                    {busyId === shop.id ? 'Saving…' : 'Mark as checked'}
                  </button>
                )}
                {shop.is_verified && <span className="status-mark open"><span className="status-dot" />Checked</span>}
                <Link href={`/shops/${shop.id}`} className="btn-primary" style={{ minHeight: 34 }}>Open</Link>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
