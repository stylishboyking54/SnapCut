'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { QueueItem } from '@/lib/types';
import { askShopForMoreTime, cancelBooking, getMyBookings, getAllMyBookings, tellShopIAmHere, ticketSaysHere, getCompletedUnratedBooking } from '@/lib/api';
import RatingModal from '@/components/reviews/RatingModal';
import { getSession, requestSignIn } from '@/lib/auth';
import { subscribeBookings } from '@/lib/realtime';
import { ClockIcon, MapPinIcon, ScissorsIcon } from '@/components/ui/Icons';
import { timeGreeting, todayLabel } from '@/lib/greeting';
import CountUp from '@/components/ui/CountUp';

const RouteMap = dynamic(() => import('@/components/map/RouteMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: 240,
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-elevated)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontSize: 13,
      }}
    >
      Loading route map…
    </div>
  ),
});

export default function BookingsPage() {
  const [activeBookings, setActiveBookings] = useState<QueueItem[]>([]);
  const [pastBookings, setPastBookings] = useState<QueueItem[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [openRouteId, setOpenRouteId] = useState<string | null>(null);
  const [unratedBooking, setUnratedBooking] = useState<QueueItem | null>(null);
  const [targetRatingBooking, setTargetRatingBooking] = useState<QueueItem | null>(null);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);

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
      const { active, past } = await getAllMyBookings();
      setPastBookings(past);
      void getCompletedUnratedBooking().then((unr) => setUnratedBooking(unr));
      setActiveBookings((prev) => {
        // Toast when position / status changes while watching
        if (prev.length && active.length) {
          const before = prev[0];
          const after = active.find((i) => i.id === before.id);
          if (after && after.queuePosition !== before.queuePosition) {
            showNotification(`You're now #${after.queuePosition} in line.`);
          } else if (after && after.status === 'in_progress' && before.status !== 'in_progress') {
            showNotification("You're up — head over now.");
          } else if (!after && before) {
            showNotification('Your ticket was updated.');
          }
        }
        return active;
      });
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Could not load tickets');
      setActiveBookings([]);
      setPastBookings([]);
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

  const handleArrivalCheckIn = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await tellShopIAmHere(id);
      await loadBookings();
      showNotification('The shop can see that you are here.');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Could not tell the shop');
    } finally {
      setBusyId(null);
    }
  };

  const handleRequestGrace = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await askShopForMoreTime(id);
      await loadBookings();
      showNotification('The shop was told you need 10 more minutes.');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Could not ask for more time');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page-enter" style={{ maxWidth: 1080, width: '100%', margin: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
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

      {unratedBooking && (
        <div
          className="panel"
          style={{
            border: '1.5px solid #f59e0b',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(240, 65, 43, 0.05) 100%)',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 15 }}>
              <span>✂️</span>
              <span>How was your cut at {unratedBooking.shopName}?</span>
            </div>
            <p className="secondary" style={{ fontSize: 13, margin: '4px 0 0 0' }}>
              Your session is finished. Leave a quick rating to let them know how they did!
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRatingModalOpen(true)}
            className="btn-primary"
            style={{ fontSize: 13, minHeight: 36, padding: '6px 16px', background: '#f59e0b' }}
          >
            ⭐ Rate your cut
          </button>
        </div>
      )}

            {/* Tabs: Active Spots vs Past Tickets */}
      <div className="filter-pills-row" style={{ width: 'fit-content' }}>
        <button
          type="button"
          className={`filter-seg ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active Line {activeBookings.length > 0 ? `(${activeBookings.length})` : ''}
        </button>
        <button
          type="button"
          className={`filter-seg ${activeTab === 'past' ? 'active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          Past Tickets {pastBookings.length > 0 ? `(${pastBookings.length})` : ''}
        </button>
      </div>

      {loading ? (
        <div className="panel" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading tickets…
        </div>
      ) : needsAuth ? (
        <div className="panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Sign in to see your tickets</h2>
          <p className="secondary" style={{ fontSize: 14, maxWidth: 340, margin: '8px auto 0', lineHeight: 1.5 }}>
            Your place in line, past visits, and updates show up here after you join a shop.
          </p>
          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => requestSignIn('Sign in to view your tickets.')}
          >
            Sign in
          </button>
        </div>
      ) : activeTab === 'past' ? (
        pastBookings.length === 0 ? (
          <div className="panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: 16, fontWeight: 650 }}>No past tickets yet</div>
            <p className="muted" style={{ fontSize: 13.5, marginTop: 8 }}>
              Visits you complete or cancel will appear here so you can rebook or review them easily.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 14 }}>
            {pastBookings.map((b) => {
              const isCompleted = b.status === 'completed';
              const hasRated = b.notes && b.notes.includes('[[rated:');
              let ratingVal = '';
              if (hasRated) {
                const match = b.notes?.match(/\[\[rated:(\d+)\]\]/);
                if (match) ratingVal = match[1];
              }

              return (
                <div
                  key={b.id}
                  className="panel"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    padding: 16,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="eyebrow">Ticket #{b.id.slice(0, 8).toUpperCase()}</span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 99,
                            background: isCompleted ? 'var(--brand-success-soft)' : 'var(--bg-elevated)',
                            color: isCompleted ? 'var(--brand-success)' : 'var(--text-muted)',
                          }}
                        >
                          {isCompleted ? 'Finished' : 'Cancelled'}
                        </span>
                      </div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 6, marginBottom: 2 }}>{b.shopName}</h3>
                      {b.shopAddress && (
                        <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
                          {b.shopAddress}
                        </p>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                        {b.scheduledTime || 'Previous visit'}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                        GHS {b.price}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderTop: '1px solid var(--bg-border)', paddingTop: 10 }}>
                    <div style={{ fontSize: 13, color: 'var(--brand-primary)', fontWeight: 600 }}>
                      {b.serviceName} ({b.serviceDuration} min)
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {hasRated ? (
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          ★ {ratingVal} Rated
                        </span>
                      ) : isCompleted ? (
                        <button
                          type="button"
                          onClick={() => {
                            setTargetRatingBooking(b);
                            setRatingModalOpen(true);
                          }}
                          className="btn-secondary"
                          style={{ fontSize: 12, minHeight: 30, padding: '4px 10px', color: '#f59e0b', borderColor: '#f59e0b' }}
                        >
                          ⭐ Rate cut
                        </button>
                      ) : null}

                      <Link
                        href={`/shops/${b.shopId}`}
                        className="btn-primary"
                        style={{ fontSize: 12, minHeight: 30, padding: '4px 12px', textDecoration: 'none' }}
                      >
                        Book again
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : activeBookings.length > 0 ? (
        <div className="list-stack">
          {activeBookings.map((booking) => {
            const currentWait = booking.estimatedWaitMinutes;
            const here = ticketSaysHere(booking.notes);
            const ahead = Math.max(0, booking.queuePosition - 1);
            const isDifferentDay = Boolean(booking.scheduledTime && booking.scheduledTime.includes('·'));
            return (
              <div key={booking.id} className="queue-ticket">
                <div className="queue-ticket-header">
                  <div>
                    <div className="eyebrow">Ticket {booking.id.slice(0, 8).toUpperCase()}</div>
                    <div className="status-mark wait" style={{ marginTop: 6 }}>
                      <span className="status-dot live" />
                      Position #<CountUp value={booking.queuePosition} />
                      {ahead === 0 ? (isDifferentDay ? ' · first on line' : ' · you\'re next') : ` · ${ahead} ahead`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="eyebrow">Seat around</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600 }}>
                      {booking.scheduledTime || '—'}
                    </div>
                    <div className="muted" style={{ fontSize: 12.5 }}>
                      {isDifferentDay ? 'Upcoming appointment' : <>~<CountUp value={currentWait} /> min left</>}
                    </div>
                  </div>
                </div>

                <div className="queue-ticket-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 600 }}>{booking.shopName}</h2>
                    <p style={{ fontSize: 14.5, fontWeight: 600, marginTop: 4, color: 'var(--brand-primary)' }}>
                      {booking.serviceName} · GHS {booking.price} · {booking.serviceDuration} min
                    </p>
                    <p className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13, flexWrap: 'wrap' }}>
                      <MapPinIcon size={14} color="var(--text-muted)" />
                      <span>{booking.shopAddress || 'Live queue spot'}</span>
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
                      onClick={() => void handleArrivalCheckIn(booking.id)}
                      disabled={here || busyId === booking.id}
                      className={here ? 'btn-secondary' : 'btn-primary'}
                      style={{ fontSize: 12.5, minHeight: 36, padding: '8px 12px' }}
                    >
                      {here ? 'Shop knows you are here' : busyId === booking.id ? 'Sending…' : "I'm here"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRequestGrace(booking.id)}
                      disabled={busyId === booking.id}
                      className="btn-secondary"
                      style={{ fontSize: 12.5, minHeight: 36, padding: '8px 12px' }}
                    >
                      +10 min
                    </button>

                    <button
                      type="button"
                      onClick={() => setOpenRouteId(openRouteId === booking.id ? null : booking.id)}
                      className="btn-secondary"
                      style={{ fontSize: 12.5, minHeight: 36, padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <MapPinIcon size={14} />
                      {openRouteId === booking.id ? 'Hide route map' : '📍 View route to shop'}
                    </button>
                  </div>

                  {openRouteId === booking.id && (
                    <div style={{ marginTop: 4 }}>
                      <RouteMap
                        shopName={booking.shopName}
                        shopAddress={booking.shopAddress}
                        shopLat={booking.shopLat}
                        shopLng={booking.shopLng}
                        height={260}
                        autoLocate={true}
                      />
                    </div>
                  )}

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
      {(targetRatingBooking || unratedBooking) && (
        <RatingModal
          shopId={(targetRatingBooking || unratedBooking)!.shopId}
          shopName={(targetRatingBooking || unratedBooking)!.shopName}
          bookingId={(targetRatingBooking || unratedBooking)!.id}
          serviceName={(targetRatingBooking || unratedBooking)!.serviceName}
          isOpen={ratingModalOpen}
          onClose={() => {
            setRatingModalOpen(false);
            setTargetRatingBooking(null);
          }}
          onSubmitted={(stars) => {
            const name = (targetRatingBooking || unratedBooking)!.shopName;
            setUnratedBooking(null);
            setTargetRatingBooking(null);
            void loadBookings();
            showNotification(`Thanks! You rated ${name} ${stars} stars.`);
          }}
        />
      )}
    </div>
  );
}
