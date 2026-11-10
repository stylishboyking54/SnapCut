'use client';

import React, { useEffect, useState } from 'react';
import { WorkingHour } from '@/lib/types';
import { saveShopHours } from '@/lib/api';

const DAY_FULL: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  0: 'Sunday',
};

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0');
  const label = i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`;
  return { value: `${h}:00`, label };
});

interface HoursEditorProps {
  shopId: string;
  initialHours: WorkingHour[];
  onSaved: () => void;
}

export default function HoursEditor({ shopId, initialHours, onSaved }: HoursEditorProps) {
  const [hours, setHours] = useState<WorkingHour[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Ensure all 7 days are present in order Mon→Sun
    const byDay = new Map(initialHours.map((h) => [h.dayOfWeek, h]));
    setHours(
      [1, 2, 3, 4, 5, 6, 0].map((day) => ({
        dayOfWeek: day,
        dayName: DAY_FULL[day],
        startTime: byDay.get(day)?.startTime || '09:00',
        endTime: byDay.get(day)?.endTime || '18:00',
        isOpen: byDay.get(day)?.isOpen ?? day !== 0,
      }))
    );
  }, [initialHours]);

  const toggle = (day: number) =>
    setHours((prev) =>
      prev.map((h) => (h.dayOfWeek === day ? { ...h, isOpen: !h.isOpen } : h))
    );

  const setTime = (day: number, field: 'startTime' | 'endTime', value: string) =>
    setHours((prev) =>
      prev.map((h) => (h.dayOfWeek === day ? { ...h, [field]: value } : h))
    );

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveShopHours(shopId, hours);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save hours');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 className="panel-title">Opening days &amp; hours</h2>
        <p className="panel-sub">
          Tick the days you are open. Then set when you open and close each day.
          Customers will only see your shop as open on these days.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {hours.map((h) => (
          <div
            key={h.dayOfWeek}
            style={{
              display: 'grid',
              gridTemplateColumns: '36px 110px 1fr',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              background: h.isOpen ? 'var(--surface-2)' : 'transparent',
              border: '1.5px solid',
              borderColor: h.isOpen ? 'var(--brand-primary)' : 'var(--border)',
              transition: 'all 0.15s',
              opacity: h.isOpen ? 1 : 0.55,
            }}
          >
            {/* Toggle checkbox */}
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={h.isOpen}
                onChange={() => toggle(h.dayOfWeek)}
                style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--brand-primary)' }}
              />
            </label>

            {/* Day name */}
            <span style={{ fontWeight: h.isOpen ? 600 : 400, fontSize: 14 }}>{h.dayName}</span>

            {/* Time pickers or "Closed" label */}
            {h.isOpen ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <select
                  value={h.startTime}
                  onChange={(e) => setTime(h.dayOfWeek, 'startTime', e.target.value)}
                  style={{
                    padding: '5px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    background: 'var(--surface-1)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  {HOURS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>to</span>
                <select
                  value={h.endTime}
                  onChange={(e) => setTime(h.dayOfWeek, 'endTime', e.target.value)}
                  style={{
                    padding: '5px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    background: 'var(--surface-1)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  {HOURS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Closed</span>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div
          className="alert-banner"
          style={{ background: 'var(--brand-danger-soft)', color: 'var(--brand-danger)' }}
        >
          {error}
        </div>
      )}

      {saved && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--brand-success-soft)',
            color: 'var(--brand-success)',
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          ✓ Hours saved!
        </div>
      )}

      <button
        type="button"
        className="btn-primary"
        disabled={busy}
        onClick={handleSave}
        style={{ alignSelf: 'flex-start' }}
      >
        {busy ? 'Saving…' : 'Save hours'}
      </button>
    </section>
  );
}
