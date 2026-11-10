'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMyShop, getShopLiveQueue } from '@/lib/api';
import { QueueItem } from '@/lib/types';
import { getSession } from '@/lib/auth';
import { timeGreeting, todayLabel } from '@/lib/greeting';
import { proCopy, useProKind } from '@/lib/proRole';

function placeWord(status: string) {
  if (status === 'in_progress') return 'Being served';
  if (status === 'waiting') return 'Waiting';
  if (status === 'completed') return 'Finished';
  if (status === 'cancelled') return 'Cancelled';
  return 'On the list';
}

export default function BarberBookingsPage() {
  const copy = proCopy(useProKind());

  const [bookings, setBookings] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasShop, setHasShop] = useState(true);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'in_progress'>('all');
  const [search, setSearch] = useState('');

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

  const filtered = bookings.filter((b) => {
    if (filter !== 'all' && b.status !== filter) return false;
    if (search.trim() && !b.customerName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

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
          Add your shop first. People show up here after they join your line.
        </p>
        <Link href="/barber/shop?setup=1" className="btn-primary" style={{ marginTop: 20, display: 'inline-flex' }}>
          Set up my shop
        </Link>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="page-header-row">
        <div>
          <div className="date-pill"><span className="status-dot live" />{todayLabel()}</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 10 }}>{timeGreeting(getSession()?.profile.full_name)}</h1>
          <p className="secondary" style={{ marginTop: 6, fontSize: 14, maxWidth: 460, lineHeight: 1.45 }}>
            Everyone booked with you today. Open today&apos;s line when you are ready to call the next person.
          </p>
        </div>
        <Link href="/barber/dashboard" className="btn-secondary" style={{ fontSize: 12.5 }}>
          {copy.backQueue}
        </Link>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="filter-pills-row" style={{ width: 'auto', flex: 1, minWidth: 200 }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'in_progress', label: copy.inServiceFilter },
            { id: 'waiting', label: 'Waiting' },
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
          placeholder="Find a name"
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
            When someone joins, their name shows here. Share your shop so people can find you.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
            <Link href="/barber/shop" className="btn-secondary" style={{ fontSize: 12.5 }}>
              Edit my shop
            </Link>
            <Link href="/barber/dashboard" className="btn-primary" style={{ fontSize: 12.5 }}>
              Open today&apos;s line
            </Link>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, padding: '20px' }}>
          Nobody matches that. Try All, or clear the name.
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
                  Place {b.queuePosition} · {b.serviceName} · {b.scheduledTime} · {placeWord(b.status)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
