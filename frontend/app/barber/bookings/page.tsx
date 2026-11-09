'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMyShop, getShopLiveQueue } from '@/lib/api';
import { QueueItem } from '@/lib/types';
import { proCopy, useProKind } from '@/lib/proRole';

export default function BarberBookingsPage() {
  const copy = proCopy(useProKind());

  const [bookings, setBookings] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasShop, setHasShop] = useState(true);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'in_progress' | 'shifted'>('all');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mine = await getMyShop();
        if (cancelled) return;
        if (!mine) {
          setHasShop(false);
          setBookings([]);
          return;
        }
        setHasShop(true);
        const live = await getShopLiveQueue(mine.id);
        if (!cancelled) setBookings(live.queue);
      } catch {
        if (!cancelled) setBookings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = bookings.filter((b) => {
    if (filter !== 'all' && b.status !== filter) return false;
    if (search.trim() && !b.customerName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleShiftTime = (id: string, mins: number) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          return {
            ...b,
            estimatedWaitMinutes: b.estimatedWaitMinutes + mins,
            status: 'shifted',
          };
        }
        return b;
      })
    );
    showToast(`Moved booking by +${mins} minutes.`);
  };

  if (loading) {
    return (
      <div className="page-enter" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading bookings…
      </div>
    );
  }

  if (!hasShop) {
    return (
      <div className="page-enter" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: '48px 20px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 600 }}>Set up your {copy.shopTitle.toLowerCase()} first</h1>
        <p className="secondary" style={{ marginTop: 10, fontSize: 14, lineHeight: 1.45 }}>
          Bookings appear once customers can join your line.
        </p>
        <Link href="/barber/shop?setup=1" className="btn-primary" style={{ marginTop: 20, display: 'inline-flex' }}>
          Continue
        </Link>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="page-header-row">
        <div>
          <div className="eyebrow">Everyone on the books</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>Bookings</h1>
        </div>
        <Link href="/barber/dashboard" className="btn-secondary" style={{ fontSize: 12.5 }}>
          {copy.backQueue}
        </Link>
      </div>

      {toast && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--brand-success-soft)',
            color: 'var(--brand-success)',
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="filter-pills-row" style={{ width: 'auto', flex: 1, minWidth: 200 }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'in_progress', label: copy.inServiceFilter },
            { id: 'waiting', label: 'Waiting' },
            { id: 'shifted', label: 'Shifted' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`filter-seg ${filter === item.id ? 'active' : ''}`}
              onClick={() => setFilter(item.id as typeof filter)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Search name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            minWidth: 160,
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--bg-border)',
            background: 'var(--bg-surface)',
            fontSize: 13,
          }}
        />
      </div>

      {bookings.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ fontSize: 15, fontWeight: 650 }}>Line is empty</div>
          <p className="muted" style={{ fontSize: 13.5, marginTop: 8, lineHeight: 1.45 }}>
            Share your shop so walk-ins can join. Live tickets will show up here.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
            <Link href="/barber/shop" className="btn-secondary" style={{ fontSize: 12.5 }}>
              Shop details
            </Link>
            <Link href="/barber/dashboard" className="btn-primary" style={{ fontSize: 12.5 }}>
              Open queue
            </Link>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, padding: '20px' }}>
          No bookings match that filter.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((b) => (
            <div
              key={b.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--bg-border)',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontWeight: 650, fontSize: 14 }}>{b.customerName}</div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                  #{b.queuePosition} · {b.serviceName} · {b.scheduledTime} · {b.status}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => handleShiftTime(b.id, 15)}
                  className="btn-secondary"
                  style={{ fontSize: 11.5, minHeight: 30, padding: '4px 8px' }}
                >
                  +15m
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
