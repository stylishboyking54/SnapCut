'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { QueueItem } from '@/lib/types';
import { cancelBooking, getMyBookings } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { subscribeBookings } from '@/lib/realtime';
import { ClockIcon, MapPinIcon, ScissorsIcon } from '@/components/ui/Icons';
import { timeGreeting, todayLabel } from '@/lib/greeting';
import CountUp from '@/components/ui/CountUp';

export default function BookingsPage() {
  const [activeBookings, setActiveBookings] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [hasNotifiedArrival, setHasNotifiedArrival] = useState(false);
  const [graceMinutesAdded, setGraceMinutesAdded] = useState(0);
  const [needsAuth, setNeedsAuth] = useState(false);

  const showNotification = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const loadBookings = useCallback(async () => {
    const session = getSession();
    if (!session) {
      setNeedsAuth(true);
      setActiveBookings([]);
      setLoading(false);
      return;
    }
    setNeedsAuth(false);
    try {
      const items = await getMyBookings();
      setActiveBookings((prev) => {
        // Toast when position / status changes while watching
        if (prev.length && items.length) {
          const before = prev[0];
          const after = items.find((i) => i.id === before.id);
          if (after && after.queuePosition !== before.queuePosition) {
            showNotification(`You're now #${after.queuePosition} in line.`);
          } else if (after && after.status === 'in_progress' && before.status !== 'in_progress') {
            showNotification("You're up — head over now.");
          } else if (!after && before) {
            showNotification('Your ticket was updated.');
          }
        }
        return items;
      });
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Could not load tickets');
      setActiveBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let unsub: () => void = () => {};

    const connect = () => {
      unsub();
      unsub = () => {};
      void loadBookings();
      const session = getSession();
      if (!session?.profile.id) return;
      unsub = subscribeBookings({
        customerId: session.profile.id,
        onChange: () => {
          void loadBookings();
        },
      });
    };

    connect();
    const onAuth = () => connect();
    window.addEventListener('snapcut-auth', onAuth);
    const poll = window.setInterval(() => {
      void loadBookings();
    }, 10000);

    return () => {
      window.removeEventListener('snapcut-auth', onAuth);
      unsub();
      window.clearInterval(poll);
    };
  }, [loadBookings]);

  const handleCancelBooking = async (id: string) => {
    try {
      await cancelBooking(id);
      setActiveBookings((prev) => prev.filter((b) => b.id !== id));
      showNotification('Spot released. The line moved up.');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Cancel failed');
    }
  };

  const handleArrivalCheckIn = () => {
    setHasNotifiedArrival(true);
    showNotification("Shop knows you're here.");
  };

  const handleRequestGrace = () => {
    setGraceMinutesAdded((prev) => prev + 10);
    showNotification('Asked for +10 minutes. Shop was told.');
  };

  return (
    <div className="page-enter" style={{ maxWidth: 720, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header-row">
        <div>
          <div className="date-pill"><span className="status-dot live" />{todayLabel()}</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 10 }}>{timeGreeting(getSession()?.profile.full_name)}</h1>
          <p className="secondary" style={{ marginTop: 6, fontSize: 14, maxWidth: 420, lineHeight: 1.45 }}>
            This is your place in line. Stay nearby, then walk in when it is your turn.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          style={{ fontSize: 12, minHeight: 34, padding: '6px 12px' }}
          onClick={() => loadBookings()}
        >
          Refresh
        </button>
      </div>

      {toast && (
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
          {toast}
        </div>
      )}

      {loading ? (
        <div className="panel" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading ticket…
        </div>
      ) : needsAuth ? (
        <div className="panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Sign in to see your ticket</h2>
          <p className="secondary" style={{ fontSize: 14, maxWidth: 340, margin: '8px auto 0', lineHeight: 1.5 }}>
            Your place in line, wait time, and updates show up here after you join a shop.
          </p>
        </div>
      ) : activeBookings.length > 0 ? (
        <div className="list-stack">
          {activeBookings.map((booking) => {
            const currentWait = booking.estimatedWaitMinutes + graceMinutesAdded;
            const ahead = Math.max(0, booking.queuePosition - 1);
            return (
              <div key={booking.id} className="queue-ticket">
                <div className="queue-ticket-header">
                  <div>
                    <div className="eyebrow">Ticket {booking.id.slice(0, 8).toUpperCase()}</div>
                    <div className="status-mark wait" style={{ marginTop: 6 }}>
                      <span className="status-dot live" />
                      Position #<CountUp value={booking.queuePosition} />
                      {ahead === 0 ? ' · you\'re next' : ` · ${ahead} ahead`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="eyebrow">Seat around</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600 }}>
                      {booking.scheduledTime || '—'}
                    </div>
                    <div className="muted" style={{ fontSize: 12.5 }}>~<CountUp value={currentWait} /> min left</div>
                  </div>
                </div>

                <div className="queue-ticket-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 600 }}>{booking.shopName}</h2>
                    <p style={{ fontSize: 14.5, fontWeight: 600, marginTop: 4, color: 'var(--brand-primary)' }}>
                      {booking.serviceName} · GHS {booking.price} · {booking.serviceDuration} min
                    </p>
                    <p className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13 }}>
                      <MapPinIcon size={14} color="var(--text-muted)" />
                      Live queue spot
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5 }}>
                    <ClockIcon size={16} color="var(--brand-primary)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <p className="secondary">
                      Keep this screen handy. We’ll update as the line moves.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleArrivalCheckIn}
                      disabled={hasNotifiedArrival}
                      className={hasNotifiedArrival ? 'btn-secondary' : 'btn-primary'}
                      style={{ fontSize: 12.5, minHeight: 36, padding: '8px 12px' }}
                    >
                      {hasNotifiedArrival ? 'Checked in' : "I'm here"}
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestGrace}
                      className="btn-secondary"
                      style={{ fontSize: 12.5, minHeight: 36, padding: '8px 12px' }}
                    >
                      +10 min
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', paddingTop: 4 }}>
                    <Link href={`/shops/${booking.shopId}`} className="btn-secondary" style={{ fontSize: 13 }}>
                      Watch the queue
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleCancelBooking(booking.id)}
                      style={{
                        background: 'transparent',
                        color: 'var(--brand-danger)',
                        fontSize: 13,
                        fontWeight: 600,
                        padding: '8px 4px',
                      }}
                    >
                      Cancel spot
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--bg-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
            }}
          >
            <ScissorsIcon size={22} color="var(--brand-primary)" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>No ticket yet</h2>
          <p className="secondary" style={{ fontSize: 14, maxWidth: 340, margin: '8px auto 20px', lineHeight: 1.5 }}>
            Find a shop nearby, check the wait, and hold a spot before you walk over.
          </p>
          <Link href="/" className="btn-primary">
            Find a shop
          </Link>
        </div>
      )}
    </div>
  );
}
