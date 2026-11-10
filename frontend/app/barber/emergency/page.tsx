'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getMyShop, getShopLiveQueue, toggleShopEmergency } from '@/lib/api';
import { QueueItem, Shop } from '@/lib/types';
import { getSession } from '@/lib/auth';
import { timeGreeting, todayLabel } from '@/lib/greeting';
import { proCopy, useProKind } from '@/lib/proRole';

type PauseDuration = 15 | 30 | 60 | 120 | 'custom' | 'day';

const PRESETS: { label: string; value: PauseDuration; desc: string }[] = [
  { value: 15,  label: '15 min',       desc: 'Quick break' },
  { value: 30,  label: '30 min',       desc: 'Half hour' },
  { value: 60,  label: '1 hour',       desc: 'Lunch break' },
  { value: 120, label: '2 hours',      desc: 'Long break' },
  { value: 'custom', label: 'Custom',  desc: 'Set your own time' },
  { value: 'day',    label: 'Rest of day', desc: 'Closed until tomorrow' },
];

function minutesUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(23, 59, 59, 999);
  return Math.ceil((midnight.getTime() - now.getTime()) / 60000);
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function BarberEmergencyPage() {
  const copy = proCopy(useProKind());

  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [affectedBookings, setAffectedBookings] = useState<QueueItem[]>([]);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Pause duration state
  const [selected, setSelected] = useState<PauseDuration>(30);
  const [customMinutes, setCustomMinutes] = useState('45');
  const [resumeAt, setResumeAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mine = await getMyShop();
        if (cancelled) return;
        setShop(mine);
        if (mine) {
          setIsEmergency(mine.isEmergency);
          setEmergencyReason(mine.emergencyReason || '');
          const live = await getShopLiveQueue(mine.id);
          if (!cancelled) setAffectedBookings(live.queue);
        }
      } catch {
        if (!cancelled) setShop(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Countdown ticker
  useEffect(() => {
    if (!resumeAt || !isEmergency) {
      if (timerRef.current) clearInterval(timerRef.current);
      setCountdown('');
      return;
    }
    const tick = () => {
      const diff = resumeAt.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('');
        if (timerRef.current) clearInterval(timerRef.current);
        // Auto-resume
        if (shop) {
          toggleShopEmergency(shop.id, false)
            .then(() => { setIsEmergency(false); setResumeAt(null); })
            .catch(() => {});
        }
      } else {
        setCountdown(formatCountdown(diff));
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resumeAt, isEmergency, shop]);

  const showAlert = (msg: string) => {
    setAlertMessage(msg);
    setTimeout(() => setAlertMessage(null), 4500);
  };

  const getDurationMinutes = (): number => {
    if (selected === 'day') return minutesUntilMidnight();
    if (selected === 'custom') return Math.max(1, Math.min(480, Number(customMinutes) || 30));
    return selected;
  };

  const buildReason = (): string => {
    if (emergencyReason.trim()) return emergencyReason.trim();
    if (selected === 'day') return 'Closed for the rest of the day';
    const mins = getDurationMinutes();
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `Back in ${h}h ${m}m` : `Back in ${h} hour${h > 1 ? 's' : ''}`;
    }
    return `Back in ${mins} minutes`;
  };

  const handlePause = async () => {
    if (!shop || busy) return;
    setBusy(true);
    try {
      const mins = getDurationMinutes();
      const reason = buildReason();
      await toggleShopEmergency(shop.id, true, reason);
      setIsEmergency(true);
      setEmergencyReason(reason);
      const at = new Date(Date.now() + mins * 60 * 1000);
      setResumeAt(at);
      const timeStr = at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      showAlert(
        selected === 'day'
          ? 'Line paused for the rest of the day. See you tomorrow!'
          : `Line paused. Auto-resumes at ${timeStr}.`
      );
    } catch (err) {
      showAlert(err instanceof Error ? err.message : 'Could not pause the line. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleResume = async () => {
    if (!shop || busy) return;
    setBusy(true);
    try {
      await toggleShopEmergency(shop.id, false);
      setIsEmergency(false);
      setResumeAt(null);
      setEmergencyReason('');
      showAlert('You are open again. People can join the line.');
    } catch (err) {
      showAlert(err instanceof Error ? err.message : 'Could not resume the line. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="page-enter" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="page-enter" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: '48px 20px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 600 }}>Set up your {copy.shopTitle.toLowerCase()} first</h1>
        <p className="secondary" style={{ marginTop: 10, fontSize: 14, lineHeight: 1.45 }}>
          Add your shop first. Then you can pause the line if something goes wrong.
        </p>
        <Link href="/barber/shop?setup=1" className="btn-primary" style={{ marginTop: 20, display: 'inline-flex' }}>
          Set up my shop
        </Link>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="page-header-row">
        <div>
          <div className="date-pill"><span className="status-dot live" />{todayLabel()}</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 10 }}>{timeGreeting(getSession()?.profile.full_name)}</h1>
          <p className="secondary" style={{ marginTop: 6, fontSize: 14, maxWidth: 460, lineHeight: 1.45 }}>
            Pause {shop.name}&apos;s line. Choose how long and the line will auto-resume — no need to come back and unpause.
          </p>
        </div>
        <Link href="/barber/dashboard" className="btn-secondary" style={{ fontSize: 12.5 }}>
          {copy.backQueue}
        </Link>
      </div>

      {alertMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: isEmergency ? 'var(--brand-danger-soft)' : 'var(--brand-success-soft)',
            color: isEmergency ? 'var(--brand-danger)' : 'var(--brand-success)',
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          {alertMessage}
        </div>
      )}

      {/* Status + countdown */}
      <section
        className="panel"
        style={{ borderColor: isEmergency ? 'var(--brand-danger)' : 'var(--bg-border)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className={`status-mark ${isEmergency ? 'emergency' : 'open'}`}>
              <span className={`status-dot ${!isEmergency ? 'live' : ''}`} />
              {isEmergency ? 'Line is paused' : 'You are open'}
            </div>
            {isEmergency && emergencyReason && (
              <p style={{ fontSize: 13.5, marginTop: 6, color: 'var(--text-secondary)' }}>
                Showing customers: <strong>&ldquo;{emergencyReason}&rdquo;</strong>
              </p>
            )}
            {countdown && (
              <p style={{ fontSize: 13, marginTop: 6, color: 'var(--brand-danger)', fontWeight: 600 }}>
                ⏱ Auto-resumes in {countdown}
              </p>
            )}
          </div>

          {isEmergency && (
            <button
              type="button"
              onClick={() => void handleResume()}
              disabled={busy}
              className="btn-secondary"
              style={{ color: 'var(--brand-success)', borderColor: 'rgba(22,163,74,0.35)' }}
            >
              {busy ? 'Saving…' : '✓ Open the line now'}
            </button>
          )}
        </div>
      </section>

      {/* Pause controls — only show when not already paused */}
      {!isEmergency && (
        <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <h2 className="panel-title">How long do you need?</h2>
            <p className="panel-sub">
              Pick a duration. The line will pause and automatically open again when the time is up.
            </p>
          </div>

          {/* Duration presets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setSelected(p.value)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid',
                  borderColor: selected === p.value ? 'var(--brand-danger)' : 'var(--border)',
                  background: selected === p.value ? 'var(--brand-danger-soft)' : 'var(--surface-1)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 14, color: selected === p.value ? 'var(--brand-danger)' : 'var(--text-primary)' }}>
                  {p.label}
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{p.desc}</span>
              </button>
            ))}
          </div>

          {/* Custom minutes input */}
          {selected === 'custom' && (
            <div className="field" style={{ maxWidth: 220 }}>
              <label>How many minutes?</label>
              <input
                type="number"
                min={5}
                max={480}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                placeholder="e.g. 45"
              />
              <span className="muted" style={{ fontSize: 12 }}>Between 5 and 480 minutes</span>
            </div>
          )}

          {/* Optional message */}
          <div className="field">
            <label>Message for customers <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
            <input
              type="text"
              placeholder={
                selected === 'day'
                  ? 'e.g. See you tomorrow!'
                  : selected === 'custom'
                  ? 'e.g. Equipment repair, back soon'
                  : 'e.g. Lunch break, back shortly'
              }
              value={emergencyReason}
              onChange={(e) => setEmergencyReason(e.target.value)}
            />
            <span className="muted" style={{ fontSize: 12 }}>
              Leave blank and we&apos;ll write one for you based on the time.
            </span>
          </div>

          <button
            type="button"
            className="btn-danger"
            disabled={busy || (selected === 'custom' && (!customMinutes || Number(customMinutes) < 1))}
            onClick={() => void handlePause()}
            style={{ alignSelf: 'flex-start' }}
          >
            {busy ? 'Pausing…' : selected === 'day' ? 'Pause for the rest of the day' : `Pause for ${selected === 'custom' ? (customMinutes || '?') + ' min' : PRESETS.find(p => p.value === selected)?.label}`}
          </button>
        </section>
      )}

      {/* People waiting */}
      <section className="panel">
        <h2 className="panel-title">People already waiting ({affectedBookings.length})</h2>
        <p className="panel-sub">Pausing stops new joins. These people are still on today&apos;s line.</p>
        {affectedBookings.length === 0 ? (
          <p className="muted" style={{ fontSize: 13.5, padding: '12px 0' }}>Nobody is waiting right now.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            {affectedBookings.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontWeight: 650, fontSize: 13.5 }}>{item.customerName}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {item.serviceName} · around {item.scheduledTime}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
