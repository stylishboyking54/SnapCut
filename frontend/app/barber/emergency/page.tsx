'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { INITIAL_QUEUE, INITIAL_SHOPS } from '@/lib/mockData';
import { QueueItem } from '@/lib/types';

export default function BarberEmergencyPage() {
  const [shop] = useState(INITIAL_SHOPS[0]);
  const [isEmergency, setIsEmergency] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState(
    'Equipment repair. Queue shifted by about 30 minutes.'
  );
  const [affectedBookings, setAffectedBookings] = useState<QueueItem[]>(
    INITIAL_QUEUE.filter((q) => q.shopId === 'shop-1')
  );
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const showAlert = (msg: string) => {
    setAlertMessage(msg);
    setTimeout(() => setAlertMessage(null), 4000);
  };

  const handleToggleEmergency = () => {
    const nextState = !isEmergency;
    setIsEmergency(nextState);
    if (nextState) {
      showAlert('Emergency on. New bookings paused; clients will see the notice.');
    } else {
      showAlert('Back to normal. Queue is open again.');
    }
  };

  const handleBulkShift = (minutes: number) => {
    setAffectedBookings((prev) =>
      prev.map((item) => {
        const [hh, mm] = item.scheduledTime.split(':').map(Number);
        const date = new Date();
        date.setHours(hh);
        date.setMinutes(mm + minutes);
        const newTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        return {
          ...item,
          scheduledTime: newTime,
          estimatedWaitMinutes: item.estimatedWaitMinutes + minutes,
          status: 'shifted',
        };
      })
    );
    showAlert(`Moved ${affectedBookings.length} clients by +${minutes}m.`);
  };

  const handleShiftSingle = (id: string, mins: number) => {
    setAffectedBookings((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            estimatedWaitMinutes: item.estimatedWaitMinutes + mins,
            status: 'shifted',
          };
        }
        return item;
      })
    );
    showAlert(`Moved booking by +${mins}m.`);
  };

  return (
    <div className="page-enter" style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="page-header-row">
        <div>
          <div className="eyebrow">{shop.name}</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>Emergency</h1>
          <p className="secondary" style={{ marginTop: 6, fontSize: 14 }}>
            Pause walk-ins and push the line when something goes wrong.
          </p>
        </div>
        <Link href="/barber/dashboard" className="btn-secondary" style={{ fontSize: 12.5 }}>
          ← Queue
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
              {isEmergency ? 'Emergency on' : 'Running normally'}
            </div>
            <p className="secondary" style={{ fontSize: 13.5, marginTop: 8, maxWidth: 420 }}>
              {isEmergency
                ? 'New bookings are paused. Your storefront shows the notice below.'
                : 'Queue is open. Use this when you need to stop the line fast.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleEmergency}
            className={isEmergency ? 'btn-secondary' : 'btn-danger'}
            style={isEmergency ? { color: 'var(--brand-danger)', borderColor: 'rgba(180, 35, 24, 0.35)' } : undefined}
          >
            {isEmergency ? 'Turn emergency off' : 'Turn emergency on'}
          </button>
        </div>

        <div className="field" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--bg-border)' }}>
          <label>Message to clients</label>
          <input
            type="text"
            value={emergencyReason}
            onChange={(e) => setEmergencyReason(e.target.value)}
          />
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Shift everyone</h2>
        <p className="panel-sub">Running behind? Move the whole line at once.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[15, 30, 45].map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => handleBulkShift(mins)}
              className="btn-secondary"
              style={{ fontSize: 12.5 }}
            >
              +{mins} min all
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Clients to notify ({affectedBookings.length})</h2>
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
                  {item.status === 'shifted' && (
                    <span className="status-mark emergency" style={{ fontSize: 11 }}>shifted</span>
                  )}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {item.serviceName} · {item.scheduledTime}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" onClick={() => handleShiftSingle(item.id, 15)} className="btn-secondary" style={{ fontSize: 11.5, minHeight: 30, padding: '4px 8px' }}>
                  +15m
                </button>
                <button type="button" onClick={() => handleShiftSingle(item.id, 30)} className="btn-secondary" style={{ fontSize: 11.5, minHeight: 30, padding: '4px 8px' }}>
                  +30m
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
