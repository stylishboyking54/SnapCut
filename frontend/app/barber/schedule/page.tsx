'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMyShop } from '@/lib/api';
import { BreakBlock, Shop, WorkingHour } from '@/lib/types';
import { CoffeeIcon } from '@/components/ui/Icons';
import { proCopy, useProKind } from '@/lib/proRole';

const DEFAULT_HOURS: WorkingHour[] = [
  { dayOfWeek: 1, dayName: 'Mon', startTime: '09:00', endTime: '19:00', isOpen: true },
  { dayOfWeek: 2, dayName: 'Tue', startTime: '09:00', endTime: '19:00', isOpen: true },
  { dayOfWeek: 3, dayName: 'Wed', startTime: '09:00', endTime: '19:00', isOpen: true },
  { dayOfWeek: 4, dayName: 'Thu', startTime: '09:00', endTime: '20:00', isOpen: true },
  { dayOfWeek: 5, dayName: 'Fri', startTime: '08:30', endTime: '20:00', isOpen: true },
  { dayOfWeek: 6, dayName: 'Sat', startTime: '08:00', endTime: '18:00', isOpen: true },
  { dayOfWeek: 0, dayName: 'Sun', startTime: '10:00', endTime: '16:00', isOpen: false },
];

export default function BarberSchedulePage() {
  const copy = proCopy(useProKind());

  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [breaks, setBreaks] = useState<BreakBlock[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>(DEFAULT_HOURS);

  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('15:00');
  const [reason, setReason] = useState('Lunch');
  const [isRecurring, setIsRecurring] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mine = await getMyShop();
        if (cancelled) return;
        setShop(mine);
        if (mine) {
          setBreaks(mine.breaks || []);
          setWorkingHours(mine.workingHours?.length ? mine.workingHours : DEFAULT_HOURS);
        }
      } catch {
        if (!cancelled) setShop(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const showNotification = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleAddBreak = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime || !reason) return;

    const newBreak: BreakBlock = {
      id: `b-${Date.now()}`,
      startTime,
      endTime,
      reason,
      isRecurring,
    };

    setBreaks((prev) => [...prev, newBreak]);
    showNotification(`Break saved: ${reason} (${startTime}–${endTime}).`);
  };

  const handleRemoveBreak = (id: string, breakReason: string) => {
    setBreaks((prev) => prev.filter((b) => b.id !== id));
    showNotification(`Removed “${breakReason}”.`);
  };

  const handleToggleDay = (dayOfWeek: number) => {
    setWorkingHours((prev) =>
      prev.map((wh) =>
        wh.dayOfWeek === dayOfWeek ? { ...wh, isOpen: !wh.isOpen } : wh
      )
    );
  };

  if (loading) {
    return (
      <div className="page-enter" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading hours…
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="page-enter" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: '48px 20px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 600 }}>Set up your {copy.shopTitle.toLowerCase()} first</h1>
        <p className="secondary" style={{ marginTop: 10, fontSize: 14, lineHeight: 1.45 }}>
          Hours and breaks live on your shop profile.
        </p>
        <Link href="/barber/shop?setup=1" className="btn-primary" style={{ marginTop: 20, display: 'inline-flex' }}>
          Continue
        </Link>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="page-header-row">
        <div>
          <div className="eyebrow">When you&apos;re available</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>Hours</h1>
        </div>
        <Link href="/barber/dashboard" className="btn-secondary" style={{ fontSize: 12.5 }}>
          {copy.backQueue}
        </Link>
      </div>

      {notice && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--bg-border)',
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          {notice}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
        <section className="panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <CoffeeIcon size={16} />
            <h2 className="panel-title" style={{ marginBottom: 0 }}>Add a break</h2>
          </div>
          <p className="panel-sub">Walk-ins and bookings pause during these windows.</p>

          <form onSubmit={handleAddBreak} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label>Label</label>
              <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="field">
                <label>Start</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              </div>
              <div className="field">
                <label>End</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
              />
              Repeat on workdays
            </label>

            <button type="submit" className="btn-primary">
              Save break
            </button>
          </form>
        </section>

        <section className="panel">
          <h2 className="panel-title">Breaks ({breaks.length})</h2>
          <p className="panel-sub">Blocked on the booking calendar.</p>

          {breaks.length === 0 ? (
            <p className="muted" style={{ fontSize: 13.5, padding: '12px 0', lineHeight: 1.45 }}>
              No breaks yet — walk-ins run through your open hours.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {breaks.map((b) => (
                <div
                  key={b.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--bg-border)',
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 650, fontSize: 13.5 }}>{b.reason}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {b.startTime}–{b.endTime}{b.isRecurring ? ' · daily' : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBreak(b.id, b.reason)}
                    className="btn-secondary"
                    style={{ fontSize: 11.5, minHeight: 30, padding: '4px 8px' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <h2 className="panel-title">Week</h2>
        <p className="panel-sub">Tap a day to open or close.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
          {workingHours.map((wh) => (
            <div
              key={wh.dayOfWeek}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--bg-border)',
                opacity: wh.isOpen ? 1 : 0.55,
              }}
            >
              <div>
                <div style={{ fontWeight: 650, fontSize: 13.5 }}>{wh.dayName}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {wh.isOpen ? `${wh.startTime}–${wh.endTime}` : 'Closed'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggleDay(wh.dayOfWeek)}
                className="btn-secondary"
                style={{
                  fontSize: 11,
                  minHeight: 28,
                  padding: '3px 8px',
                  color: wh.isOpen ? 'var(--brand-success)' : 'var(--text-muted)',
                }}
              >
                {wh.isOpen ? 'Open' : 'Closed'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
