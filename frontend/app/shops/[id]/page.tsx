'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getMyBookings, getShopById, getShopLiveQueue, joinShopQueue } from '@/lib/api';
import { getSession, requestSignIn } from '@/lib/auth';
import { Shop, Service, QueueItem } from '@/lib/types';
import { CoffeeIcon } from '@/components/ui/Icons';
import CountUp from '@/components/ui/CountUp';
import ShopFilm from '@/components/ui/ShopFilm';

function ShopDetailContent() {
  const params = useParams();
  const shopId = (params?.id as string) || '';

  const [shop, setShop] = useState<Shop | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinedShopId, setJoinedShopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const session = getSession();
    if (session?.profile.full_name) setCustomerName(session.profile.full_name);
    if (session) {
      getMyBookings()
        .then((rows) => setJoinedShopId(rows[0]?.shopId || null))
        .catch(() => setJoinedShopId(null));
    }

    if (!shopId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    Promise.all([getShopById(shopId), getShopLiveQueue(shopId)])
      .then(([apiShop, apiQueue]) => {
        if (!active) return;
        if (!apiShop) {
          setNotFound(true);
          setShop(null);
          return;
        }
        setShop(apiShop);
        if (apiShop.services.length > 0) {
          setSelectedService(apiShop.services[0]);
        }
        setQueueItems(apiQueue?.queue || []);
      })
      .catch(() => {
        if (active) setNotFound(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [shopId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        Loading shop…
      </div>
    );
  }

  if (notFound || !shop) {
    return (
      <div className="page-enter" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: '48px 20px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>Shop not found</h1>
        <p className="secondary" style={{ marginTop: 10, fontSize: 14, lineHeight: 1.45 }}>
          This shop may have closed its Snapcut line, or the link is outdated.
        </p>
        <Link href="/" className="btn-primary" style={{ marginTop: 18, display: 'inline-flex' }}>
          Browse shops
        </Link>
      </div>
    );
  }

  const handleJoinQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !customerName.trim() || shop.isEmergency || isJoining) return;

    if (!getSession()) {
      requestSignIn('Join the line with an account.');
      return;
    }

    setIsJoining(true);
    setJoinError(null);
    try {
      const result = await joinShopQueue(shop.id, {
        serviceId: selectedService.id,
        customerName: customerName.trim(),
        notes: customerNotes.trim() || undefined,
      });
      setQueueItems(result.queue);
      setShop((prev) =>
        prev
          ? {
              ...prev,
              currentQueueCount: result.totalInQueue,
              estimatedWaitMinutes: result.estimatedTotalWait,
            }
          : null
      );
      setCustomerName('');
      setCustomerNotes('');
      setJoinedShopId(shop.id);
      setBookingSuccess(true);
      setTimeout(() => setBookingSuccess(false), 5000);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Could not join the line.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="page-enter" style={{ maxWidth: 980, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Link href="/" className="muted" style={{ fontSize: 13, fontWeight: 600, width: 'fit-content' }}>
        ← All shops
      </Link>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }} className="shop-detail-hero">
        <div>
          <div className="shop-cover">
            <ShopFilm photos={shop.photos?.length ? shop.photos : shop.coverImage ? [shop.coverImage] : []} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
          <div
            className={`status-mark ${shop.isEmergency ? 'emergency' : 'open'}`}
          >
            <span className={`status-dot ${!shop.isEmergency ? 'live' : ''}`} />
            {shop.isEmergency ? 'Shift delayed' : 'Taking walk-ins'}
          </div>

          <h1 style={{ fontSize: 'clamp(26px, 4vw, 34px)', fontWeight: 600 }}>{shop.name}</h1>
          <p className="secondary" style={{ fontSize: 14.5 }}>{shop.tagline}</p>

          <p className="muted" style={{ fontSize: 13 }}>
            {shop.address} · {shop.distanceKm} km · Barber {shop.ownerName}
          </p>
          <p className="muted" style={{ fontSize: 13 }}>
            ★ {shop.rating} ({shop.reviewCount}) · {shop.phone}
          </p>

          <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
            <div>
              <div className="eyebrow">In line</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600 }}>
                <CountUp value={queueItems.length} />
              </div>
            </div>
            <div>
              <div className="eyebrow">Seat in</div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 28,
                  fontWeight: 600,
                  color: shop.estimatedWaitMinutes === 0 ? 'var(--brand-success)' : 'var(--text-primary)',
                }}
              >
                ~<CountUp value={shop.estimatedWaitMinutes} />m
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="fit-grid">
        <div className="panel">
          <div style={{ marginBottom: 14 }}>
            <h2 className="panel-title" style={{ marginBottom: 0 }}>Who&apos;s ahead</h2>
            <p className="panel-sub" style={{ marginBottom: 0 }}>Updates as seats open</p>
          </div>

          {queueItems.length === 0 ? (
            <p className="muted" style={{ padding: '24px 0', textAlign: 'center', fontSize: 14 }}>
              Line is clear — join now and you&apos;re next.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {queueItems.map((item) => {
                const isInChair = item.status === 'in_progress';
                const isYou = item.customerName.includes('(You)');

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: isYou ? 'var(--bg-elevated)' : 'transparent',
                      border: '1px solid var(--bg-border)',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 'var(--radius-xs)',
                          background: isInChair ? 'var(--brand-primary)' : 'var(--bg-elevated)',
                          color: isInChair ? 'var(--brand-primary-text)' : 'var(--text-primary)',
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {item.queuePosition}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 650, fontSize: 13.5 }}>
                          {item.customerName}
                          {isInChair && (
                            <span className="status-mark open" style={{ marginLeft: 8, fontSize: 11 }}>
                              in chair
                            </span>
                          )}
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {item.serviceName} · {item.serviceDuration}m
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 650 }}>
                        {isInChair ? 'Almost done' : `~${item.estimatedWaitMinutes}m`}
                      </div>
                      <div className="muted" style={{ fontSize: 11 }}>{item.scheduledTime}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {shop.breaks.length > 0 && (
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--bg-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <CoffeeIcon size={15} />
                <span style={{ fontSize: 13, fontWeight: 650 }}>Breaks today</span>
              </div>
              {shop.breaks.map((b) => (
                <div
                  key={b.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12.5,
                    padding: '6px 0',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span>{b.reason}</span>
                  <strong>{b.startTime}–{b.endTime}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <h2 className="panel-title">Join the line</h2>
          <p className="panel-sub">Pick a cut, leave your name, get a seat time.</p>

          <form onSubmit={handleJoinQueue} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label>Service</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {shop.services.map((srv) => {
                  const isSelected = selectedService?.id === srv.id;
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => setSelectedService(srv)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                        border: isSelected ? '1px solid var(--brand-primary)' : '1px solid var(--bg-border)',
                        textAlign: 'left',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{srv.name}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{srv.duration} min</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>GHS {srv.price}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="field">
              <label>Your name</label>
              <input
                type="text"
                placeholder="Alex Johnson"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label>Notes (optional)</label>
              <input
                type="text"
                placeholder="Low fade, tidy the beard"
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={shop.isEmergency || !customerName.trim() || isJoining || joinedShopId === shop.id}
              className={joinedShopId === shop.id ? 'btn-secondary' : 'btn-primary'}
              style={{
                marginTop: 4,
                opacity: shop.isEmergency || !customerName.trim() ? 0.5 : 1,
                cursor: shop.isEmergency || !customerName.trim() || isJoining || joinedShopId === shop.id ? 'default' : 'pointer',
              }}
            >
              {shop.isEmergency
                ? 'Paused for now'
                : joinedShopId === shop.id
                ? 'Joined'
                : isJoining
                ? 'Joining…'
                : 'Join line'}
            </button>
          </form>

          {joinError && (
            <div
              style={{
                marginTop: 14,
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--brand-danger-soft)',
                color: 'var(--brand-danger)',
                fontSize: 13,
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              {joinError}
            </div>
          )}

          {bookingSuccess && (
            <div
              style={{
                marginTop: 14,
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--brand-success-soft)',
                color: 'var(--brand-success)',
                fontSize: 13,
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              You&apos;re on the list.{' '}
              <Link href="/bookings" style={{ color: 'inherit', textDecoration: 'underline' }}>
                Open My ticket
              </Link>
              , then tap I&apos;m here when you arrive.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default function ShopDetailPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>Loading shop…</div>}>
      <ShopDetailContent />
    </Suspense>
  );
}
