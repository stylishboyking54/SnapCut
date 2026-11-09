'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { INITIAL_QUEUE } from '@/lib/mockData';
import { QueueItem } from '@/lib/types';
import { proCopy, useProKind } from '@/lib/proRole';

export default function BarberBookingsPage() {
  const copy = proCopy(useProKind());

  const [bookings, setBookings] = useState<QueueItem[]>(INITIAL_QUEUE);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'in_progress' | 'shifted'>('all');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

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

        <div className="search-bar" style={{ minWidth: 200, flex: '0 1 240px', padding: '8px 12px' }}>
          <input
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
            No bookings match.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((b) => (
              <div
                key={b.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1.2fr) auto auto',
                  gap: 12,
                  padding: '14px 18px',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--bg-border-subtle)',
                  fontSize: 13.5,
                }}
                className="booking-row"
              >
                <div>
                  <div style={{ fontWeight: 650 }}>
                    #{b.queuePosition} · {b.customerName}
                  </div>
                  {b.notes && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{b.notes}</div>}
                </div>
                <div>
                  <div>{b.serviceName}</div>
                  <div className="muted" style={{ fontSize: 12 }}>GHS {b.price} · {b.serviceDuration}m · {b.scheduledTime}</div>
                </div>
                <div
                  className={`status-mark ${
                    b.status === 'in_progress' ? 'open' : b.status === 'shifted' ? 'emergency' : 'wait'
                  }`}
                  style={{ fontSize: 12 }}
                >
                  <span className="status-dot" />
                  {b.status === 'in_progress' ? copy.inServiceFilter : b.status === 'shifted' ? 'Shifted' : 'Waiting'}
                </div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => handleShiftTime(b.id, 15)} className="btn-secondary" style={{ fontSize: 11.5, minHeight: 30, padding: '4px 8px' }}>
                    +15m
                  </button>
                  <button type="button" onClick={() => handleShiftTime(b.id, 30)} className="btn-secondary" style={{ fontSize: 11.5, minHeight: 30, padding: '4px 8px' }}>
                    +30m
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
