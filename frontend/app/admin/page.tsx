'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdminShops, sendAdminBroadcast } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { timeGreeting, todayLabel } from '@/lib/greeting';

export default function AdminDashboardPage() {
  const [shops, setShops] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Broadcast state
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'barbers' | 'customers'>('all');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastBusy, setBroadcastBusy] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);

  useEffect(() => {
    getAdminShops()
      .then(setShops)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load shops'))
      .finally(() => setLoading(false));
  }, []);

  const pendingCount = shops.filter((s) => !s.is_verified).length;
  const verifiedCount = shops.filter((s) => s.is_verified).length;
  const pausedCount = shops.filter((s) => s.is_emergency).length;
  const peopleWaiting = shops.reduce((sum, shop) => sum + Number(shop.current_queue_count || 0), 0);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    setBroadcastBusy(true);
    setBroadcastResult(null);
    setError(null);
    try {
      const res = await sendAdminBroadcast(
        broadcastTarget,
        broadcastTitle.trim(),
        broadcastMessage.trim(),
      );
      setBroadcastResult(
        `✓ Broadcast successfully sent to ${res.recipientCount || 'all'} member(s)!`,
      );
      setBroadcastTitle('');
      setBroadcastMessage('');
      setTimeout(() => setBroadcastResult(null), 6000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not dispatch broadcast');
    } finally {
      setBroadcastBusy(false);
    }
  };

  return (
    <div
      className="page-enter"
      style={{
        maxWidth: 960,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
      }}
    >
      <div>
        <div className="date-pill">
          <span className="status-dot live" />
          {todayLabel()}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 10 }}>
          {timeGreeting(getSession()?.profile?.full_name)} · Control Center
        </h1>
        <p className="secondary" style={{ fontSize: 14, marginTop: 6, maxWidth: 520, lineHeight: 1.45 }}>
          Platform-wide controls, store moderation, queue management, and system announcements.
        </p>
      </div>

      {error && <div className="alert-banner">{error}</div>}

      {/* Pending Review Alert Banner */}
      {pendingCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(234, 179, 8, 0.14)',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            color: '#b45309',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>⏳</span>
            <div>
              <strong style={{ fontSize: 14, color: '#92400e' }}>
                {pendingCount} store{pendingCount === 1 ? '' : 's'} waiting for approval
              </strong>
              <div style={{ fontSize: 12.5, color: '#78350f', marginTop: 2 }}>
                These stores remain hidden from customers until verified.
              </div>
            </div>
          </div>
          <Link
            href="/admin/shops"
            className="btn-primary"
            style={{
              background: '#ca8a04',
              color: '#ffffff',
              fontSize: 12.5,
              padding: '6px 14px',
              textDecoration: 'none',
            }}
          >
            Review Stores →
          </Link>
        </div>
      )}

      {/* Metric Chips */}
      <div className="stat-row">
        <Link href="/admin/shops" className="stat-chip" style={{ textDecoration: 'none' }}>
          <div>
            <b>{loading ? '…' : shops.length}</b>
            <small>Total Shops</small>
          </div>
        </Link>
        <Link href="/admin/shops" className="stat-chip" style={{ textDecoration: 'none' }}>
          <div>
            <b style={{ color: pendingCount > 0 ? '#ca8a04' : undefined }}>
              {loading ? '…' : pendingCount}
            </b>
            <small>Pending Approval</small>
          </div>
        </Link>
        <div className="stat-chip">
          <div>
            <b>{loading ? '…' : peopleWaiting}</b>
            <small>People in Line</small>
          </div>
        </div>
        <Link href="/admin/shops" className="stat-chip" style={{ textDecoration: 'none' }}>
          <div>
            <b style={{ color: pausedCount > 0 ? 'var(--brand-danger)' : undefined }}>
              {loading ? '…' : pausedCount}
            </b>
            <small>Paused Lines</small>
          </div>
        </Link>
      </div>

      {/* Broadcast System Announcement Panel */}
      <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📢</span> System Broadcast Announcement
          </h2>
          <p className="panel-sub">
            Send real-time alerts or platform announcements directly to user notification inboxes.
          </p>
        </div>

        {broadcastResult && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--brand-success-soft)',
              color: 'var(--brand-success)',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {broadcastResult}
          </div>
        )}

        <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                Target Recipients
              </label>
              <select
                value={broadcastTarget}
                onChange={(e) => setBroadcastTarget(e.target.value as any)}
                style={{
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              >
                <option value="all">Everyone (All Customers &amp; Barbers)</option>
                <option value="barbers">Barbers &amp; Salons Only</option>
                <option value="customers">Customers Only</option>
              </select>
            </div>

            <div style={{ flex: 2, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                Announcement Subject / Headline (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Server Maintenance or Holiday Schedule"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
              Message
            </label>
            <textarea
              rows={3}
              placeholder="Type your announcement here. It will appear immediately in the Updates tab of targeted users…"
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--bg-border)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={broadcastBusy || !broadcastMessage.trim()}
              className="btn-primary"
              style={{ fontSize: 13 }}
            >
              {broadcastBusy ? 'Sending Broadcast…' : '🚀 Send Announcement'}
            </button>
          </div>
        </form>
      </section>

      {/* Stores Overview Panel */}
      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2 className="panel-title">Stores Overview</h2>
            <p className="panel-sub">Recent stores and verification status.</p>
          </div>
          <Link href="/admin/shops" className="btn-secondary" style={{ fontSize: 12.5 }}>
            Manage All Stores ({shops.length})
          </Link>
        </div>

        {loading ? (
          <p className="muted">Loading shops…</p>
        ) : shops.length === 0 ? (
          <p className="muted">No shops yet. They appear here when created by a barber or salon.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shops.slice(0, 6).map((shop) => (
              <div
                key={shop.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 0',
                  borderBottom: '1px solid var(--bg-border-subtle)',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 650 }}>{shop.name}</span>
                    {shop.is_verified ? (
                      <span
                        style={{
                          fontSize: 11,
                          padding: '1px 7px',
                          borderRadius: 99,
                          background: 'var(--brand-success-soft)',
                          color: 'var(--brand-success)',
                          fontWeight: 650,
                        }}
                      >
                        Verified
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          padding: '1px 7px',
                          borderRadius: 99,
                          background: 'rgba(234, 179, 8, 0.18)',
                          color: '#ca8a04',
                          fontWeight: 650,
                        }}
                      >
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>
                    {shop.city || 'Accra'} · {shop.profiles?.full_name || 'Owner'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <Link
                    href={`/shops/${shop.id}`}
                    className="btn-secondary"
                    style={{ fontSize: 12, minHeight: 32 }}
                  >
                    View
                  </Link>
                  <Link
                    href="/admin/shops"
                    className="btn-primary"
                    style={{ fontSize: 12, minHeight: 32 }}
                  >
                    Moderate
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
