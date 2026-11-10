'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMyShop, getShopLiveQueue, toggleShopEmergency } from '@/lib/api';
import { QueueItem, Shop } from '@/lib/types';
import { getSession } from '@/lib/auth';
import { timeGreeting, todayLabel } from '@/lib/greeting';
import { proCopy, useProKind } from '@/lib/proRole';

export default function BarberEmergencyPage() {
  const copy = proCopy(useProKind());

  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [affectedBookings, setAffectedBookings] = useState<QueueItem[]>([]);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

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
    return () => {
      cancelled = true;
    };
  }, []);

  const showAlert = (msg: string) => {
    setAlertMessage(msg);
    setTimeout(() => setAlertMessage(null), 4000);
  };

  const handleToggleEmergency = async () => {
    if (!shop || busy) return;
    const nextState = !isEmergency;
    setBusy(true);
    try {
      await toggleShopEmergency(shop.id, nextState, emergencyReason.trim() || undefined);
      setIsEmergency(nextState);
      if (nextState) {
        showAlert('The line is paused. New people cannot join, and they will see your message.');
      } else {
        showAlert('You are open again. People can join the line.');
      }
    } catch (err) {
      showAlert(err instanceof Error ? err.message : 'Could not pause the line. Try again.');
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
            Pause {shop.name} if you have to stop. Write a short reason so people know why.
          </p>
        </div>
        <Link href="/barber/dashboard" className="btn-secondary" style={{ fontSize: 12.5 }}>
          {copy.backQueue}
        </Link>
      </div>

      {alertMessage && (
        <div
          className={isEmergency ? 'alert-banner' : undefined}
          style={
            isEmergency
              ? undefined
              : {
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--bg-border)',
                  fontSize: 13.5,
                  fontWeight: 600,
                }
          }
        >
          {alertMessage}
        </div>
      )}

      <section
        className="panel"
        style={{
          borderColor: isEmergency ? 'var(--brand-danger)' : 'var(--bg-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className={`status-mark ${isEmergency ? 'emergency' : 'open'}`}>
              <span className={`status-dot ${!isEmergency ? 'live' : ''}`} />
              {isEmergency ? 'Line is paused' : 'You are open'}
            </div>
            <p className="secondary" style={{ fontSize: 13.5, marginTop: 8, maxWidth: 420 }}>
              {isEmergency
                ? 'New people cannot join. Your shop page shows the message below.'
                : 'People can join. Tap the red button only when you need to stop.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleToggleEmergency()}
            disabled={busy}
            className={isEmergency ? 'btn-secondary' : 'btn-danger'}
            style={isEmergency ? { color: 'var(--brand-danger)', borderColor: 'rgba(180, 35, 24, 0.35)' } : undefined}
          >
            {busy ? 'Saving…' : isEmergency ? 'Open the line again' : 'Pause the line'}
          </button>
        </div>

        <div className="field" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--bg-border)' }}>
          <label>What should people see?</label>
          <input
            type="text"
            placeholder="e.g. Equipment repair — line paused ~30 min"
            value={emergencyReason}
            onChange={(e) => setEmergencyReason(e.target.value)}
          />
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">People already waiting ({affectedBookings.length})</h2>
        <p className="panel-sub">Pausing stops new joins. These people are still on today&apos;s line.</p>
        {affectedBookings.length === 0 ? (
          <p className="muted" style={{ fontSize: 13.5, padding: '12px 0' }}>
            Nobody is waiting right now.
          </p>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 650, fontSize: 13.5 }}>{item.customerName}</span>
                  </div>
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
