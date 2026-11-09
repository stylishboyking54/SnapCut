'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { INITIAL_SHOPS, INITIAL_QUEUE } from '@/lib/mockData';
import { getShopById, getShopLiveQueue, joinShopQueue } from '@/lib/api';
import { getSession, requestSignIn } from '@/lib/auth';
import { Shop, Service, QueueItem } from '@/lib/types';
import { CoffeeIcon } from '@/components/ui/Icons';

function ShopDetailContent() {
  const params = useParams();
  const shopId = (params?.id as string) || 'shop-1';

  const [shop, setShop] = useState<Shop | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isSimulatingNextTurn, setIsSimulatingNextTurn] = useState(false);

  useEffect(() => {
    let active = true;
    const session = getSession();
    if (session?.profile.full_name) setCustomerName(session.profile.full_name);

    Promise.all([getShopById(shopId), getShopLiveQueue(shopId)]).then(
      ([apiShop, apiQueue]) => {
        if (!active) return;
        const currentShop = apiShop || INITIAL_SHOPS.find((s) => s.id === shopId) || INITIAL_SHOPS[0];
        setShop(currentShop);
        if (currentShop.services.length > 0) {
          setSelectedService(currentShop.services[0]);
        }
        if (apiQueue && apiQueue.queue.length > 0) {
          setQueueItems(apiQueue.queue);
        } else {
          setQueueItems(INITIAL_QUEUE.filter((q) => q.shopId === currentShop.id));
        }
      }
    );

    return () => {
      active = false;
    };
  }, [shopId]);

  if (!shop) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        Loading shop…
      </div>
    );
  }

  const handleJoinQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !customerName.trim() || shop.isEmergency || isJoining) return;

    if (!getSession()) {
      requestSignIn('Sign in to join the queue and get a ticket.');
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
      setBookingSuccess(true);
      setTimeout(() => setBookingSuccess(false), 5000);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Could not join the line.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleSimulateNext = () => {
    if (queueItems.length === 0) return;
    setIsSimulatingNextTurn(true);

    setTimeout(() => {
      setQueueItems((prev) => {
        if (prev.length === 0) return prev;
        const [, ...rest] = prev;
        return rest.map((item, idx) => ({
          ...item,
          queuePosition: idx + 1,
          status: (idx === 0 ? 'in_progress' : 'waiting') as QueueItem['status'],
          estimatedWaitMinutes: Math.max(0, item.estimatedWaitMinutes - shop.avgDurationPerClient),
        }));
      });

      setShop((prev) =>
        prev
          ? {
              ...prev,
              currentQueueCount: Math.max(0, prev.currentQueueCount - 1),
              estimatedWaitMinutes: Math.max(0, (prev.currentQueueCount - 1) * prev.avgDurationPerClient),
            }
          : null
      );
      setIsSimulatingNextTurn(false);
    }, 500);
  };

  return (
    <div className="page-enter" style={{ maxWidth: 980, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Link href="/" className="muted" style={{ fontSize: 13, fontWeight: 600, width: 'fit-content' }}>
        ← All shops
      </Link>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }} className="shop-detail-hero">
        <div>
          <div style={{ height: 220, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--bg-border)' }}>
            <img src={shop.coverImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600 }}>{queueItems.length}</div>
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
                ~{shop.estimatedWaitMinutes}m
              </div>
            </div>
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10 }}>
            <div>
              <h2 className="panel-title" style={{ marginBottom: 0 }}>Who&apos;s ahead</h2>
              <p className="panel-sub" style={{ marginBottom: 0 }}>Updates as seats open</p>
            </div>
            <button
              type="button"
              onClick={handleSimulateNext}
              disabled={queueItems.length === 0 || isSimulatingNextTurn}
              className="btn-secondary"
              style={{ fontSize: 12, padding: '6px 10px', minHeight: 34 }}
            >
              {isSimulatingNextTurn ? 'Updating…' : 'Advance turn'}
            </button>
          </div>

          {queueItems.length === 0 ? (
            <p className="muted" style={{ padding: '24px 0', textAlign: 'center', fontSize: 14 }}>
              Chair is open — join now and you&apos;re next.
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
              disabled={shop.isEmergency || !customerName.trim() || isJoining}
              className="btn-primary"
              style={{
                marginTop: 4,
                opacity: shop.isEmergency || !customerName.trim() ? 0.5 : 1,
                cursor: shop.isEmergency || !customerName.trim() || isJoining ? 'not-allowed' : 'pointer',
              }}
            >
              {shop.isEmergency ? 'Paused for now' : isJoining ? 'Holding…' : 'Hold my spot'}
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
              You&apos;re on the list. Check Ticket for live updates.
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
