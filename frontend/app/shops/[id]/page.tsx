'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { getMyBookings, getShopById, getShopLiveQueue, joinShopQueue } from '@/lib/api';
import { AuthSession, getSession, requestSignIn } from '@/lib/auth';
import { Shop, Service, QueueItem } from '@/lib/types';
import { CoffeeIcon } from '@/components/ui/Icons';
import CountUp from '@/components/ui/CountUp';
import ShopFilm from '@/components/ui/ShopFilm';
import RatingModal from '@/components/reviews/RatingModal';

const RouteMap = dynamic(() => import('@/components/map/RouteMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: 280,
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-elevated)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontSize: 13,
      }}
    >
      Loading map route…
    </div>
  ),
});

function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTomorrowIsoDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const d = String(tomorrow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDefaultTime(targetDateIso: string, shop: Shop): string {
  const todayIso = getTodayIsoDate();
  const isToday = targetDateIso === todayIso;
  const now = new Date();

  const [y, m, d] = targetDateIso.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = dateObj.getDay();

  const hours = shop.workingHours?.find((h) => h.dayOfWeek === dayOfWeek);
  const startTime = (hours?.startTime || '09:00').slice(0, 5);
  const endTime = (hours?.endTime || '18:00').slice(0, 5);

  if (!isToday) return startTime;

  const currentTotalMins = now.getHours() * 60 + now.getMinutes() + (shop.estimatedWaitMinutes || 0);
  const roundedMins = Math.ceil(currentTotalMins / 5) * 5;
  const h = Math.floor(roundedMins / 60);
  const min = roundedMins % 60;
  const roundedTime = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

  if (roundedTime < startTime) return startTime;
  if (roundedTime > endTime) return endTime;
  return roundedTime;
}

function validateSelection(
  dateIso: string,
  timeStr: string,
  shop: Shop,
): { valid: boolean; error: string | null; hoursText?: string; dayName: string; isOpenDay: boolean } {
  if (!dateIso) return { valid: false, error: 'Please choose a date.', dayName: '', isOpenDay: false };

  const [y, m, d] = dateIso.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = dateObj.getDay();
  const dayName = dateObj.toLocaleDateString([], { weekday: 'long' });

  let hours = shop.workingHours?.find((h) => h.dayOfWeek === dayOfWeek);
  if (!shop.workingHours || shop.workingHours.length === 0) {
    if (dayOfWeek === 0) {
      return { valid: false, error: 'The shop is closed on Sundays.', dayName, isOpenDay: false };
    }
    hours = { dayOfWeek, dayName, startTime: '09:00', endTime: '18:00', isOpen: true };
  } else if (!hours || !hours.isOpen) {
    return { valid: false, error: `The shop is closed on ${dayName}s.`, dayName, isOpenDay: false };
  }

  const startTime = (hours.startTime || '09:00').slice(0, 5);
  const endTime = (hours.endTime || '18:00').slice(0, 5);

  if (!timeStr) {
    return { valid: false, error: 'Please choose a time.', hoursText: `${startTime} – ${endTime}`, dayName, isOpenDay: true };
  }

  const [th, tm] = timeStr.split(':').map(Number);
  const timeMins = th * 60 + (tm || 0);

  const [sh, sm] = startTime.split(':').map(Number);
  const startMins = sh * 60 + (sm || 0);

  const [eh, em] = endTime.split(':').map(Number);
  const endMins = eh * 60 + (em || 0);

  if (timeMins < startMins) {
    return {
      valid: false,
      error: `Barber starts at ${startTime} on ${dayName}s. Chosen time is before working hours.`,
      hoursText: `${startTime} – ${endTime}`,
      dayName,
      isOpenDay: true,
    };
  }

  if (timeMins >= endMins) {
    return {
      valid: false,
      error: `Barber closes at ${endTime} on ${dayName}s. Chosen time is after working hours.`,
      hoursText: `${startTime} – ${endTime}`,
      dayName,
      isOpenDay: true,
    };
  }

  const todayIso = getTodayIsoDate();
  if (dateIso === todayIso) {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    if (timeMins < currentMins) {
      return {
        valid: false,
        error: 'That time has already passed today. Please pick an upcoming time.',
        hoursText: `${startTime} – ${endTime}`,
        dayName,
        isOpenDay: true,
      };
    }
  }

  if (shop.breaks?.length) {
    for (const b of shop.breaks) {
      const bStart = (b.startTime || '').slice(0, 5);
      const bEnd = (b.endTime || '').slice(0, 5);
      if (bStart && bEnd) {
        const [bsh, bsm] = bStart.split(':').map(Number);
        const [beh, bem] = bEnd.split(':').map(Number);
        const bsMins = bsh * 60 + (bsm || 0);
        const beMins = beh * 60 + (bem || 0);
        if (timeMins >= bsMins && timeMins < beMins) {
          return {
            valid: false,
            error: `Barber is on break from ${bStart} to ${bEnd}${b.reason ? ` (${b.reason})` : ''}.`,
            hoursText: `${startTime} – ${endTime}`,
            dayName,
            isOpenDay: true,
          };
        }
      }
    }
  }

  return { valid: true, error: null, hoursText: `${startTime} – ${endTime}`, dayName, isOpenDay: true };
}

function ShopDetailContent() {
  const params = useParams();
  const shopId = (params?.id as string) || '';

  const todayIso = useMemo(() => getTodayIsoDate(), []);
  const tomorrowIso = useMemo(() => getTomorrowIsoDate(), []);

  const [shop, setShop] = useState<Shop | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingDate, setBookingDate] = useState<string>(todayIso);
  const [bookingTime, setBookingTime] = useState<string>('10:00');
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinedShopId, setJoinedShopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    let active = true;

    const syncAuth = () => {
      const s = getSession();
      if (!active) return;
      setSession(s);
      if (s?.profile.full_name) {
        setCustomerName(s.profile.full_name);
      }
      if (s) {
        getMyBookings()
          .then((rows) => {
            if (active) setJoinedShopId(rows[0]?.shopId || null);
          })
          .catch(() => {
            if (active) setJoinedShopId(null);
          });
      } else {
        setJoinedShopId(null);
      }
    };

    syncAuth();
    window.addEventListener('snapcut-auth', syncAuth);

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
        const initDate = getTodayIsoDate();
        setBookingDate(initDate);
        setBookingTime(getDefaultTime(initDate, apiShop));
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
      window.removeEventListener('snapcut-auth', syncAuth);
    };
  }, [shopId]);

  const validation = shop
    ? validateSelection(bookingDate, bookingTime, shop)
    : { valid: false, error: null, dayName: '', isOpenDay: false };

  const handleDateChange = (newDate: string) => {
    setBookingDate(newDate);
    if (shop) {
      setBookingTime(getDefaultTime(newDate, shop));
    }
  };

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
          This shop may have closed its SnapCut line, or the link is outdated.
        </p>
        <Link href="/" className="btn-primary" style={{ marginTop: 18, display: 'inline-flex' }}>
          Browse shops
        </Link>
      </div>
    );
  }

  const handleJoinQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (shop.isEmergency || isJoining) return;

    if (!getSession()) {
      requestSignIn('Sign in to join the queue and get your ticket.');
      return;
    }

    if (!selectedService) {
      setJoinError('Please select a service.');
      return;
    }

    if (!customerName.trim()) {
      setJoinError('Please enter your name.');
      return;
    }

    if (!validation.valid) {
      setJoinError(validation.error || 'Please select a valid working time.');
      return;
    }

    setIsJoining(true);
    setJoinError(null);
    try {
      const [y, m, d] = bookingDate.split('-').map(Number);
      const [hour, minute] = bookingTime.split(':').map(Number);
      const scheduledDate = new Date(y, m - 1, d, hour, minute, 0);

      const result = await joinShopQueue(shop.id, {
        serviceId: selectedService.id,
        customerName: customerName.trim(),
        notes: customerNotes.trim() || undefined,
        scheduledAt: scheduledDate.toISOString(),
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
    <div className="page-enter" style={{ maxWidth: 1120, width: '100%', margin: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              {shop.address} · {shop.distanceKm} km · {shop.shopType === 'salon' ? 'Salon' : 'Barber'} {shop.ownerName}
            </p>
            {shop.lat && shop.lng ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--brand-accent)',
                  textDecoration: 'underline',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                Directions in Google Maps ↗
              </a>
            ) : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              ★ {shop.rating} ({shop.reviewCount} {shop.reviewCount === 1 ? 'review' : 'reviews'}) · {shop.phone}
            </p>
            <button
              type="button"
              onClick={() => {
                if (!getSession()) {
                  requestSignIn('Sign in to rate this shop');
                  return;
                }
                setRatingModalOpen(true);
              }}
              className="btn-secondary"
              style={{ fontSize: 11.5, minHeight: 28, padding: '2px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              ⭐ Rate shop
            </button>
          </div>

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
          <p className="panel-sub">Pick a service, set date & time, secure your spot.</p>

          <form onSubmit={handleJoinQueue} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Service selector */}
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

            {/* Day / Date Selector */}
            <div className="field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ margin: 0 }}>Day</label>
                <span className="muted" style={{ fontSize: 11.5 }}>
                  {bookingDate === todayIso ? 'Today' : validation.dayName}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleDateChange(todayIso)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: bookingDate === todayIso ? '1.5px solid var(--brand-accent)' : '1px solid var(--bg-border)',
                    background: bookingDate === todayIso ? 'var(--brand-accent)' : 'var(--bg-elevated)',
                    color: bookingDate === todayIso ? '#fff' : 'var(--text-primary)',
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleDateChange(tomorrowIso)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: bookingDate === tomorrowIso ? '1.5px solid var(--brand-accent)' : '1px solid var(--bg-border)',
                    background: bookingDate === tomorrowIso ? 'var(--brand-accent)' : 'var(--bg-elevated)',
                    color: bookingDate === tomorrowIso ? '#fff' : 'var(--text-primary)',
                  }}
                >
                  Tomorrow
                </button>
                <input
                  type="date"
                  min={todayIso}
                  value={bookingDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 130,
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--bg-border)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: validation.isOpenDay ? 'var(--text-muted)' : 'var(--brand-danger)',
                  fontWeight: validation.isOpenDay ? 500 : 650,
                }}
              >
                {validation.isOpenDay ? (
                  <>🕒 {validation.dayName} hours: <strong>{validation.hoursText || '09:00 – 18:00'}</strong></>
                ) : (
                  <>🚫 Closed on {validation.dayName}s. Please pick another day.</>
                )}
              </div>
            </div>

            {/* Time Selector */}
            <div className="field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ margin: 0 }}>Time</label>
                {validation.hoursText && (
                  <span className="muted" style={{ fontSize: 11.5 }}>
                    Working: {validation.hoursText}
                  </span>
                )}
              </div>
              <input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                disabled={!validation.isOpenDay}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  border: !validation.valid && validation.error?.includes('working hours') || !validation.valid && validation.error?.includes('passed')
                    ? '1.5px solid var(--brand-danger)'
                    : '1px solid var(--bg-border)',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              />
              <div style={{ marginTop: 6 }}>
                {!validation.valid ? (
                  <div
                    style={{
                      padding: '5px 8px',
                      borderRadius: 'var(--radius-xs)',
                      background: 'var(--brand-danger-soft)',
                      color: 'var(--brand-danger)',
                      fontSize: 12,
                      fontWeight: 650,
                    }}
                  >
                    ⚠️ {validation.error}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-xs)',
                      background: 'rgba(34, 197, 94, 0.12)',
                      color: '#16a34a',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    ✓ Time fits barber&apos;s working hours ({validation.hoursText})
                  </div>
                )}
              </div>
            </div>

            <div className="field">
              <label>Your name</label>
              <input
                type="text"
                placeholder={session ? "Alex Johnson" : "Enter your name (sign in required to join)"}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
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
              disabled={shop.isEmergency || isJoining || joinedShopId === shop.id || !validation.valid}
              className={joinedShopId === shop.id ? 'btn-secondary' : 'btn-primary'}
              style={{
                marginTop: 4,
                opacity: shop.isEmergency || !validation.valid ? 0.5 : 1,
                cursor: shop.isEmergency || isJoining || joinedShopId === shop.id || !validation.valid ? 'default' : 'pointer',
              }}
            >
              {shop.isEmergency
                ? 'Paused for now'
                : joinedShopId === shop.id
                ? 'Joined'
                : !validation.valid
                ? (validation.error?.includes('closed') ? 'Shop Closed on this day' : 'Barber Off at this time')
                : isJoining
                ? 'Joining…'
                : !session
                ? 'Sign in to join line'
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

      {/* Location & Directions Card */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 className="panel-title" style={{ margin: 0 }}>Location & Route</h2>
            <p className="panel-sub" style={{ margin: '4px 0 0 0' }}>
              Preview your route and estimated travel time before joining the line.
            </p>
          </div>
        </div>

        <RouteMap
          shopName={shop.name}
          shopAddress={shop.address}
          shopLat={shop.lat}
          shopLng={shop.lng}
          height={300}
          autoLocate={true}
        />
      </div>
      {ratingModalOpen && (
        <RatingModal
          shopId={shop.id}
          shopName={shop.name}
          isOpen={ratingModalOpen}
          onClose={() => setRatingModalOpen(false)}
          onSubmitted={(newStars) => {
            setShop((prev) => {
              if (!prev) return null;
              const currentRating = Number(prev.rating) || 5;
              const currentCount = Number(prev.reviewCount) || 0;
              const newCount = currentCount + 1;
              const calculated = Math.round(((currentRating * currentCount + newStars) / newCount) * 10) / 10;
              return { ...prev, rating: calculated, reviewCount: newCount };
            });
          }}
        />
      )}
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
