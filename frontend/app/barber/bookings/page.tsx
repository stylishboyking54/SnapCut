'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { cancelBooking, getMyShop, getShopBookingsWithHistory } from '@/lib/api';
import { QueueItem } from '@/lib/types';
import { getSession } from '@/lib/auth';
import { timeGreeting, todayLabel } from '@/lib/greeting';
import { proCopy, useProKind } from '@/lib/proRole';

function placeWord(status: string) {
  if (status === 'in_progress') return 'Being served';
  if (status === 'waiting') return 'Waiting';
  if (status === 'completed') return 'Finished';
  if (status === 'cancelled') return 'Cancelled';
  return 'Confirmed';
}

function formatDateHeader(scheduledAt?: string, scheduledTime?: string): string {
  if (scheduledAt) {
    const d = new Date(scheduledAt);
    if (!isNaN(d.getTime())) {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(now.getDate() + 1);

      if (d.toDateString() === now.toDateString()) {
        return 'Today';
      }
      if (d.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow · ${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}`;
      }
      return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    }
  }
  if (scheduledTime && scheduledTime.includes('·')) {
    return scheduledTime.split('·')[0].trim();
  }
  return 'Upcoming Date';
}

function formatClockTime(scheduledAt?: string, fallback = ''): string {
  if (scheduledAt) {
    const d = new Date(scheduledAt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
  }
  if (fallback && fallback.includes('·')) {
    return fallback.split('·')[1].trim();
  }
  return fallback || '—';
}

export default function BarberBookingsPage() {
  const kind = useProKind();
  const copy = proCopy(kind);

  const [activeQueue, setActiveQueue] = useState<QueueItem[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<QueueItem[]>([]);
  const [pastBookings, setPastBookings] = useState<QueueItem[]>([]);
  const [mainTab, setMainTab] = useState<'live' | 'upcoming' | 'past'>('live');
  const [loading, setLoading] = useState(true);
  const [hasShop, setHasShop] = useState(true);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'in_progress'>('all');
  const [pastFilter, setPastFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    try {
      const mine = await getMyShop();
      if (!mine) {
        setHasShop(false);
        setActiveQueue([]);
        setUpcomingBookings([]);
        setPastBookings([]);
        return;
      }
      setHasShop(true);
      const data = await getShopBookingsWithHistory(mine.id);
      setActiveQueue(data.todayQueue || data.active || []);
      setUpcomingBookings(data.upcoming || []);
      setPastBookings(data.past || []);
    } catch {
      setActiveQueue([]);
      setUpcomingBookings([]);
      setPastBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam === 'upcoming' || tabParam === 'past' || tabParam === 'live') {
        setMainTab(tabParam as typeof mainTab);
      }
    }
    void loadData();
    const interval = window.setInterval(() => {
      void loadData();
    }, 12000);
    return () => window.clearInterval(interval);
  }, []);

  const handleCancelSpot = async (bookingId: string, customerName: string) => {
    if (busyId) return;
    if (!window.confirm(`Release booking for ${customerName}?`)) return;
    setBusyId(bookingId);
    try {
      await cancelBooking(bookingId);
      showToast(`Spot released for ${customerName}.`);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not release booking');
    } finally {
      setBusyId(null);
    }
  };

  // Filter for active queue (today)
  const filteredActive = activeQueue.filter((b) => {
    if (filter !== 'all' && b.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = b.customerName.toLowerCase().includes(q);
      const matchPhone = b.customerPhone?.toLowerCase().includes(q);
      const matchService = b.serviceName.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchService) return false;
    }
    return true;
  });

  // Filter for upcoming bookings (future/different days)
  const filteredUpcoming = upcomingBookings.filter((b) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = b.customerName.toLowerCase().includes(q);
      const matchPhone = b.customerPhone?.toLowerCase().includes(q);
      const matchService = b.serviceName.toLowerCase().includes(q);
      const matchTime = b.scheduledTime.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchService && !matchTime) return false;
    }
    return true;
  });

  // Group upcoming bookings by date header
  const upcomingGrouped = filteredUpcoming.reduce((groups, booking) => {
    const key = formatDateHeader(booking.scheduledAt, booking.scheduledTime);
    if (!groups[key]) groups[key] = [];
    groups[key].push(booking);
    return groups;
  }, {} as Record<string, QueueItem[]>);

  // Filter for past client history
  const filteredPast = pastBookings.filter((b) => {
    if (pastFilter !== 'all' && b.status !== pastFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = b.customerName.toLowerCase().includes(q);
      const matchPhone = b.customerPhone?.toLowerCase().includes(q);
      const matchService = b.serviceName.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchService) return false;
    }
    return true;
  });

  const totalFinished = pastBookings.filter((b) => b.status === 'completed').length;
  const totalRevenue = pastBookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + (Number(b.price) || 0), 0);

  if (loading) {
    return (
      <div className="page-enter" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading bookings…
      </div>
    );
  }

  if (!hasShop) {
    return (
      <div className="page-enter" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: '48px 20px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 600 }}>Set up your {copy.shopTitle.toLowerCase()} first</h1>
        <p className="secondary" style={{ marginTop: 10, fontSize: 14, lineHeight: 1.45 }}>
          Add your shop first. People show up here after they join your line.
        </p>
        <Link href="/barber/shop?setup=1" className="btn-primary" style={{ marginTop: 20, display: 'inline-flex' }}>
          Set up my shop
        </Link>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ maxWidth: 1120, width: '100%', margin: 0, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="page-header-row">
        <div>
          <div className="date-pill"><span className="status-dot live" />{todayLabel()}</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 10 }}>{timeGreeting(getSession()?.profile.full_name)}</h1>
          <p className="secondary" style={{ marginTop: 6, fontSize: 14, maxWidth: 500, lineHeight: 1.45 }}>
            Manage today&apos;s active line, view clients booked on different upcoming days, and review completed tickets.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => void loadData()}
            className="btn-secondary"
            style={{ fontSize: 12.5 }}
          >
            Refresh
          </button>
          <Link href="/barber/dashboard" className="btn-secondary" style={{ fontSize: 12.5 }}>
            {copy.backQueue}
          </Link>
        </div>
      </div>

      {toast && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--brand-accent)',
            color: 'var(--text-primary)',
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          {toast}
        </div>
      )}

      {/* Main Mode Toggle: Today's Line vs Upcoming Days vs Past History */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="filter-pills-row" style={{ width: 'fit-content' }}>
          <button
            type="button"
            className={`filter-seg ${mainTab === 'live' ? 'active' : ''}`}
            onClick={() => setMainTab('live')}
          >
            Today&apos;s Line {activeQueue.length > 0 ? `(${activeQueue.length})` : ''}
          </button>
          <button
            type="button"
            className={`filter-seg ${mainTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setMainTab('upcoming')}
            style={{ position: 'relative' }}
          >
            Upcoming Days {upcomingBookings.length > 0 ? `(${upcomingBookings.length})` : ''}
          </button>
          <button
            type="button"
            className={`filter-seg ${mainTab === 'past' ? 'active' : ''}`}
            onClick={() => setMainTab('past')}
          >
            Past Tickets &amp; History {pastBookings.length > 0 ? `(${pastBookings.length})` : ''}
          </button>
        </div>

        <input
          type="search"
          placeholder="Search name, phone, or service"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            minWidth: 200,
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--bg-border)',
            background: 'var(--bg-surface)',
            fontSize: 13,
          }}
        />
      </div>

      {/* ================= 1. LIVE LINE TAB (TODAY) ================= */}
      {mainTab === 'live' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="filter-pills-row" style={{ width: 'fit-content' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'in_progress', label: copy.inServiceFilter },
              { id: 'waiting', label: 'Waiting' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={`filter-seg ${filter === item.id ? 'active' : ''}`}
                onClick={() => setFilter(item.id as typeof filter)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {activeQueue.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '32px 20px' }}>
              <div style={{ fontSize: 15, fontWeight: 650 }}>Line is clear today</div>
              <p className="muted" style={{ fontSize: 13.5, marginTop: 8, lineHeight: 1.45 }}>
                When someone joins your line for today, they will show up here immediately.
              </p>
              {upcomingBookings.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => setMainTab('upcoming')}
                    className="btn-primary"
                    style={{ fontSize: 12.5 }}
                  >
                    View {upcomingBookings.length} upcoming booking{upcomingBookings.length === 1 ? '' : 's'} on other days →
                  </button>
                </div>
              )}
            </div>
          ) : filteredActive.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, padding: '24px' }}>
              No active clients match &ldquo;{search}&rdquo;.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredActive.map((b) => (
                <div
                  key={b.id}
                  className="panel"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    gap: 12,
                    flexWrap: 'wrap',
                    borderLeft: b.status === 'in_progress' ? '4px solid var(--brand-primary)' : undefined,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{b.customerName}</span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 99,
                          background: b.status === 'in_progress' ? 'var(--brand-primary)' : 'var(--bg-elevated)',
                          color: b.status === 'in_progress' ? '#ffffff' : 'var(--text-primary)',
                        }}
                      >
                        {placeWord(b.status)}
                      </span>
                      <span className="eyebrow" style={{ fontSize: 11 }}>
                        Ticket #{b.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>

                    <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                      #{b.queuePosition} in line · {b.serviceName} · GHS {b.price} · {b.scheduledTime}
                    </div>

                    {b.customerPhone && (
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        <a href={`tel:${b.customerPhone}`} style={{ color: 'var(--brand-accent)', textDecoration: 'none' }}>
                          📞 {b.customerPhone}
                        </a>
                      </div>
                    )}

                    {b.notes && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                        Note: &ldquo;{b.notes.replace(/\[\[.*?\]\]/g, '').trim()}&rdquo;
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => handleCancelSpot(b.id, b.customerName)}
                      disabled={busyId === b.id}
                      className="btn-secondary"
                      style={{ fontSize: 11.5, minHeight: 30, padding: '4px 10px', color: 'var(--brand-danger)' }}
                    >
                      Release spot
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= 2. UPCOMING DAYS TAB (DIFFERENT DAYS) ================= */}
      {mainTab === 'upcoming' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            className="panel"
            style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, rgba(240, 65, 43, 0.05) 0%, rgba(245, 158, 11, 0.04) 100%)',
              border: '1px solid var(--bg-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📅</span>
                <span>Clients Booked for Future Days ({upcomingBookings.length})</span>
              </div>
              <p className="secondary" style={{ fontSize: 13, margin: '4px 0 0 0' }}>
                These are clients who booked ahead for different dates. They are ordered chronologically so earlier appointments appear first on tickets.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href="/barber/schedule" className="btn-secondary" style={{ fontSize: 12, minHeight: 32, padding: '4px 12px' }}>
                Edit Working Hours
              </Link>
            </div>
          </div>

          {upcomingBookings.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div style={{ fontSize: 16, fontWeight: 650 }}>No upcoming bookings on future days</div>
              <p className="muted" style={{ fontSize: 13.5, marginTop: 8, maxWidth: 440, margin: '8px auto 0', lineHeight: 1.45 }}>
                When clients choose a different date (like tomorrow, Friday, or next week), their appointments will appear here so you can prepare before that day.
              </p>
            </div>
          ) : filteredUpcoming.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, padding: '24px' }}>
              No upcoming bookings match &ldquo;{search}&rdquo;.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {Object.entries(upcomingGrouped).map(([dateLabel, bookingsForDate]) => (
                <div key={dateLabel} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 2px',
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 750, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🗓️</span>
                      <span>{dateLabel}</span>
                      <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>
                        ({bookingsForDate.length} {bookingsForDate.length === 1 ? 'client' : 'clients'})
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {bookingsForDate.map((b) => (
                      <div
                        key={b.id}
                        className="panel"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '16px 18px',
                          gap: 14,
                          flexWrap: 'wrap',
                          borderLeft: '4px solid var(--brand-accent)',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: 15.5 }}>{b.customerName}</span>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 99,
                                background: 'var(--brand-accent)',
                                color: '#ffffff',
                              }}
                            >
                              Position #{b.queuePosition}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 650,
                                padding: '2px 8px',
                                borderRadius: 99,
                                background: 'var(--bg-elevated)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              ⏰ {formatClockTime(b.scheduledAt, b.scheduledTime)}
                            </span>
                            <span className="eyebrow" style={{ fontSize: 11 }}>
                              Ticket #{b.id.slice(0, 8).toUpperCase()}
                            </span>
                          </div>

                          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                            {b.serviceName} · {b.serviceDuration} min · <strong>GHS {b.price}</strong>
                          </div>

                          {b.customerPhone && (
                            <div style={{ fontSize: 12.5, marginTop: 4 }}>
                              <a
                                href={`tel:${b.customerPhone}`}
                                style={{ color: 'var(--brand-accent)', textDecoration: 'none', fontWeight: 600 }}
                              >
                                📞 Call {b.customerPhone}
                              </a>
                            </div>
                          )}

                          {b.notes && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                              Special request: &ldquo;{b.notes.replace(/\[\[.*?\]\]/g, '').trim()}&rdquo;
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => handleCancelSpot(b.id, b.customerName)}
                            disabled={busyId === b.id}
                            className="btn-secondary"
                            style={{ fontSize: 12, minHeight: 32, padding: '4px 12px', color: 'var(--brand-danger)' }}
                          >
                            Cancel booking
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= 3. PAST TICKETS TAB ================= */}
      {mainTab === 'past' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* History Stats Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            <div className="panel" style={{ padding: '16px 18px' }}>
              <div className="eyebrow">Clients Finished</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{totalFinished}</div>
            </div>
            <div className="panel" style={{ padding: '16px 18px' }}>
              <div className="eyebrow">Revenue Recorded</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>GHS {totalRevenue}</div>
            </div>
          </div>

          <div className="filter-pills-row" style={{ width: 'fit-content' }}>
            {[
              { id: 'all', label: 'All History' },
              { id: 'completed', label: 'Finished' },
              { id: 'cancelled', label: 'Cancelled' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={`filter-seg ${pastFilter === item.id ? 'active' : ''}`}
                onClick={() => setPastFilter(item.id as typeof pastFilter)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {pastBookings.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div style={{ fontSize: 16, fontWeight: 650 }}>No past tickets yet</div>
              <p className="muted" style={{ fontSize: 13.5, marginTop: 8 }}>
                As you serve clients and complete tickets, their history and details will appear here.
              </p>
            </div>
          ) : filteredPast.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, padding: '24px' }}>
              No past tickets match your filter or search.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredPast.map((b) => {
                const isFinished = b.status === 'completed';
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
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 18px',
                      gap: 14,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{b.customerName}</span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 99,
                            background: isFinished ? 'var(--brand-success-soft)' : 'var(--bg-elevated)',
                            color: isFinished ? 'var(--brand-success)' : 'var(--text-muted)',
                          }}
                        >
                          {isFinished ? 'Finished' : 'Cancelled'}
                        </span>
                        {hasRated && (
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#f59e0b' }}>
                            ★ {ratingVal} Stars
                          </span>
                        )}
                      </div>

                      <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                        {b.serviceName} · GHS {b.price} · {b.scheduledTime || 'Previous date'}
                      </div>

                      {b.customerPhone && (
                        <div style={{ fontSize: 12, marginTop: 4 }}>
                          <a href={`tel:${b.customerPhone}`} style={{ color: 'var(--brand-accent)', textDecoration: 'none' }}>
                            📞 {b.customerPhone}
                          </a>
                        </div>
                      )}

                      {b.notes && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                          Note: &ldquo;{b.notes.replace(/\[\[.*?\]\]/g, '').trim()}&rdquo;
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div className="eyebrow">Ticket #{b.id.slice(0, 8).toUpperCase()}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>GHS {b.price}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}