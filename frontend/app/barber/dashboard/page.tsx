'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  advanceShopQueue,
  cancelBooking,
  getMyShop,
  getShopBookingRows,
  getShopBookingsWithHistory,
  ticketSaysHere,
} from '@/lib/api';
import { QueueItem, Shop } from '@/lib/types';
import { ScissorsIcon, CoffeeIcon, AlertTriangleIcon } from '@/components/ui/Icons';
import { proCopy, useProKind } from '@/lib/proRole';
import { subscribeBookings } from '@/lib/realtime';
import CountUp from '@/components/ui/CountUp';
import WeekCard from '@/components/ui/WeekCard';
import { timeGreeting, todayLabel } from '@/lib/greeting';
import { getSession } from '@/lib/auth';
import { summarizeWeek, WeekSummary } from '@/lib/weekStats';

function isClientDue(scheduledAt?: string): boolean {
  if (!scheduledAt) return true;
  const t = new Date(scheduledAt).getTime();
  if (isNaN(t)) return true;
  // Due if within 15 minutes of appointment or past due
  return t <= Date.now() + 15 * 60 * 1000;
}

function timeUntilDue(scheduledAt?: string): string {
  if (!scheduledAt) return 'Ready';
  const diffMs = new Date(scheduledAt).getTime() - Date.now();
  if (diffMs <= 0) return 'Due now';
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `in ${hours}h ${remainingMins}m` : `in ${hours}h`;
}

export default function BarberDashboardPage() {
  const kind = useProKind();
  const copy = proCopy(kind);
  const [shop, setShop] = useState<Shop | null>(null);
  const [shopLoading, setShopLoading] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [upcomingList, setUpcomingList] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [week, setWeek] = useState<WeekSummary | null>(null);
  const [hello, setHello] = useState('Good evening');

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const refreshQueue = useCallback(async (shopId: string) => {
    try {
      const data = await getShopBookingsWithHistory(shopId);
      setQueue(data.todayQueue || data.active || []);
      setUpcomingList(data.upcoming || []);
    } catch {
      /* keep current */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsub: () => void = () => {};
    let poll: number | undefined;

    (async () => {
      try {
        const mine = await getMyShop();
        if (cancelled) return;
        setShop(mine);
        if (mine) {
          setHello(timeGreeting(getSession()?.profile.full_name));
          const rows = await getShopBookingRows(mine.id);
          if (!cancelled) setWeek(summarizeWeek(rows));
          await refreshQueue(mine.id);
          unsub = subscribeBookings({
            shopId: mine.id,
            onChange: () => {
              void refreshQueue(mine.id);
            },
          });
          poll = window.setInterval(() => {
            void refreshQueue(mine.id);
          }, 8000);
        }
      } catch {
        if (!cancelled) setShop(null);
      } finally {
        if (!cancelled) setShopLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      unsub();
      if (poll) window.clearInterval(poll);
    };
  }, [refreshQueue]);

  const handleNextClient = async (clientToFinish?: QueueItem) => {
    if (!shop || busy || queue.length === 0) return;
    const current = queue.find((q) => q.status === 'in_progress');
    const waiting = queue.filter((q) => q.status !== 'in_progress');

    // If chair is empty, ensure the next waiting client is actually due
    if (!current && waiting.length > 0) {
      const nextPerson = waiting[0];
      if (!isClientDue(nextPerson.scheduledAt)) {
        showNotice(`Cannot call ${nextPerson.customerName} yet. Their booking is for ${nextPerson.scheduledTime} (${timeUntilDue(nextPerson.scheduledAt)}).`);
        return;
      }
    }

    setBusy(true);
    try {
      const result = await advanceShopQueue(shop.id, clientToFinish?.id);
      await refreshQueue(shop.id);
      if (result.message) {
        showNotice(result.message);
      } else if (result.advanced) {
        const clientName = clientToFinish ? clientToFinish.customerName : current?.customerName;
        showNotice(clientName ? copy.finishNotice(clientName) : 'Called next client to chair.');
      } else {
        showNotice(copy.lineClear);
      }
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Could not advance line');
    } finally {
      setBusy(false);
    }
  };

  const handleNoShow = async (client: QueueItem) => {
    if (!shop || busy) return;
    setBusy(true);
    try {
      await cancelBooking(client.id);
      await refreshQueue(shop.id);
      showNotice(`Removed ${client.customerName}.`);
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Could not remove');
    } finally {
      setBusy(false);
    }
  };

  const inChairClients = queue.filter((q) => q.status === 'in_progress');
  const inChairClient = inChairClients[0] || null;
  const waitingClients = queue.filter((q) => q.status !== 'in_progress');
  const chairCount = shop?.chairCount || 1;
  const openChairs = Math.max(0, chairCount - inChairClients.length);

  if (shopLoading) {
    return (
      <div className="page-enter" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="page-enter" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: '48px 20px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 600 }}>Set up your {copy.shopTitle.toLowerCase()}</h1>
        <p className="secondary" style={{ marginTop: 10, fontSize: 14, lineHeight: 1.45 }}>
          Add your name and address so customers can find you and join your line.
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
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 10 }}>{hello}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              ★ {shop.rating}
            </span>
            <span className="muted" style={{ fontSize: 12.5 }}>
              · {shop.reviewCount} customer {shop.reviewCount === 1 ? 'review' : 'reviews'}
            </span>
          </div>
          <p className="secondary" style={{ marginTop: 6, fontSize: 14, maxWidth: 460, lineHeight: 1.45 }}>
            {shop.name}. When you finish someone, tap Finished — call next. Their ticket updates on its own.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/barber/bookings" className="btn-secondary" style={{ fontSize: 12.5 }}>
            All Bookings {upcomingList.length > 0 ? `(${upcomingList.length} upcoming)` : ''}
          </Link>
          <Link href="/barber/schedule" className="btn-secondary" style={{ fontSize: 12.5 }}>
            <CoffeeIcon size={14} />
            Open hours
          </Link>
          <Link
            href="/barber/emergency"
            className="btn-secondary"
            style={{
              fontSize: 12.5,
              borderColor: shop.isEmergency ? 'var(--brand-danger)' : 'rgba(180, 35, 24, 0.35)',
              background: shop.isEmergency ? 'var(--brand-danger-soft)' : undefined,
              color: 'var(--brand-danger)',
            }}
          >
            <AlertTriangleIcon size={14} color="var(--brand-danger)" />
            {shop.isEmergency ? 'Line paused' : 'Pause line'}
          </Link>
        </div>
      </div>

      {shop.isEmergency && (
        <div
          className="alert-banner"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--brand-danger-soft)',
            color: 'var(--brand-danger)',
            border: '1px solid var(--brand-danger)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <strong>Line is currently paused</strong>
            {shop.emergencyReason && <span> — {shop.emergencyReason}</span>}
            {shop.resumeAt && (
              <span style={{ display: 'block', fontSize: 12.5, marginTop: 2, opacity: 0.9 }}>
                Resumes around {new Date(shop.resumeAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <Link
            href="/barber/emergency"
            className="btn-secondary"
            style={{ fontSize: 12, borderColor: 'var(--brand-danger)', color: 'var(--brand-danger)' }}
          >
            Manage pause
          </Link>
        </div>
      )}

      {/* Upcoming Bookings on Future Days Card */}
      <section
        className="panel"
        style={{
          border: upcomingList.length > 0 ? '1.5px solid var(--brand-accent)' : undefined,
          background: upcomingList.length > 0
            ? 'linear-gradient(135deg, rgba(240, 65, 43, 0.05) 0%, rgba(245, 158, 11, 0.03) 100%)'
            : undefined,
          padding: '18px 20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>📅</span>
              <h2 className="panel-title" style={{ margin: 0, fontSize: 16 }}>
                Upcoming Bookings on Future Days ({upcomingList.length})
              </h2>
            </div>
            <p className="secondary" style={{ fontSize: 13, margin: '4px 0 0 0' }}>
              {upcomingList.length === 0
                ? 'No clients have booked for future days yet. Future calendar slots are open.'
                : `You have ${upcomingList.length} client${upcomingList.length === 1 ? '' : 's'} booked ahead for upcoming days.`}
            </p>
          </div>
          <Link
            href="/barber/bookings?tab=upcoming"
            className={upcomingList.length > 0 ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: 12.5, minHeight: 34, padding: '6px 14px', textDecoration: 'none' }}
          >
            {upcomingList.length > 0 ? 'View Upcoming Schedule →' : 'View Calendar'}
          </Link>
        </div>

        {upcomingList.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            {upcomingList.slice(0, 3).map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--bg-border)',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 99,
                      background: 'var(--brand-accent)',
                      color: '#ffffff',
                    }}
                  >
                    #{item.queuePosition}
                  </span>
                  <div>
                    <span style={{ fontWeight: 650, fontSize: 13.5 }}>{item.customerName}</span>
                    <span className="muted" style={{ fontSize: 12.5, marginLeft: 8 }}>
                      · {item.serviceName} (GHS {item.price})
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--brand-accent)' }}>
                    🗓️ {item.scheduledTime}
                  </span>
                  {item.customerPhone && (
                    <a
                      href={`tel:${item.customerPhone}`}
                      style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}
                    >
                      📞 Call
                    </a>
                  )}
                </div>
              </div>
            ))}
            {upcomingList.length > 3 && (
              <div style={{ textAlign: 'center', marginTop: 4 }}>
                <Link
                  href="/barber/bookings?tab=upcoming"
                  style={{ fontSize: 12, color: 'var(--brand-accent)', fontWeight: 600, textDecoration: 'none' }}
                >
                  +{upcomingList.length - 3} more upcoming client{upcomingList.length - 3 === 1 ? '' : 's'} · See full schedule
                </Link>
              </div>
            )}
          </div>
        )}
      </section>

      {week && (
        <WeekCard
          title="This week"
          subtitle={kind === 'salon' ? 'Services you finished or still have on the book.' : 'Cuts on your book over the last 7 days.'}
          totalLabel="Clients"
          total={week.visits}
          unit="people"
          asideLabel="Chair time"
          aside={week.visits ? `${week.minutes} min · GHS ${Math.round(week.spend)}` : 'Line hasn’t started yet'}
          days={week.days}
        />
      )}

      {notice && (
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
          {notice}
        </div>
      )}

      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <div className={`status-mark ${inChairClients.length > 0 ? 'open' : 'wait'}`}>
            <span className={`status-dot ${inChairClients.length > 0 ? 'live' : ''}`} />
            {chairCount > 1
              ? `${inChairClients.length} of ${chairCount} Chairs Active`
              : inChairClient ? copy.inSeat : copy.seatEmpty}
          </div>
          {chairCount > 1 && (
            <span className="muted" style={{ fontSize: 12.5 }}>
              Shop Capacity: <strong>{chairCount} simultaneous clients</strong>
            </span>
          )}
        </div>

        {inChairClients.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {inChairClients.map((client, idx) => (
              <div
                key={client.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                  padding: chairCount > 1 ? '14px 16px' : 0,
                  borderRadius: 'var(--radius-sm)',
                  background: chairCount > 1 ? 'var(--bg-elevated)' : 'transparent',
                  border: chairCount > 1 ? '1px solid var(--bg-border-subtle, rgba(255,255,255,0.06))' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    className="avatar-chip lg"
                    style={{ width: 50, height: 50, minWidth: 50, minHeight: 50, fontSize: 18 }}
                  >
                    {client.customerName.slice(0, 1)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 17, fontWeight: 650 }}>
                        {client.customerName}
                        {ticketSaysHere(client.notes) ? ' · here now' : ''}
                      </span>
                      {chairCount > 1 && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--brand-primary)', color: '#fff' }}>
                          Chair {idx + 1}
                        </span>
                      )}
                    </div>
                    <div className="secondary" style={{ fontSize: 13, marginTop: 2 }}>
                      {client.serviceName} · GHS {client.price} · {client.serviceDuration}m
                    </div>
                    {client.notes && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        Note: {client.notes}
                      </div>
                    )}
                  </div>
                </div>

                <button type="button" onClick={() => handleNextClient(client)} className="btn-primary" disabled={busy}>
                  <ScissorsIcon size={15} />
                  {busy ? '…' : copy.doneNext}
                </button>
              </div>
            ))}

            {openChairs > 0 && waitingClients.length > 0 && (() => {
              const nextClient = waitingClients[0];
              const due = isClientDue(nextClient.scheduledAt);
              const until = timeUntilDue(nextClient.scheduledAt);

              return (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px dashed var(--bg-border, rgba(255,255,255,0.15))',
                  flexWrap: 'wrap',
                  gap: 12,
                  background: 'rgba(255, 255, 255, 0.02)',
                }}>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 650, color: 'var(--text-secondary)' }}>
                      Chair {inChairClients.length + 1} is Free ({openChairs} chair{openChairs > 1 ? 's' : ''} available)
                    </div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>
                      Next: {nextClient.customerName} · {due ? 'Ready to sit now' : `Scheduled for ${nextClient.scheduledTime} (${until})`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNextClient()}
                    className={due ? 'btn-primary' : 'btn-secondary'}
                    disabled={busy || !due}
                    style={!due ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                  >
                    <ScissorsIcon size={14} />
                    {due ? `Seat in Chair ${inChairClients.length + 1}` : `Due at ${nextClient.scheduledTime}`}
                  </button>
                </div>
              );
            })()}
          </div>
        ) : waitingClients.length > 0 ? (
          (() => {
            const nextClient = waitingClients[0];
            const due = isClientDue(nextClient.scheduledAt);
            const until = timeUntilDue(nextClient.scheduledAt);

            return (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 650 }}>{copy.seatEmpty}</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                    {nextClient.customerName} is next · {due ? 'Ready to sit now' : `Scheduled for ${nextClient.scheduledTime} (${until})`}
                  </div>
                  {!due && (
                    <div style={{ fontSize: 12, color: 'var(--brand-primary, #eab308)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>⏳</span>
                      <span>Can only be called to chair when appointment time arrives ({until}).</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleNextClient()}
                  className={due ? 'btn-primary' : 'btn-secondary'}
                  disabled={busy || !due}
                  title={due ? 'Call client to chair' : `Client appointment is at ${nextClient.scheduledTime}`}
                  style={!due ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                >
                  <ScissorsIcon size={15} />
                  {busy ? '…' : due ? 'Call next' : `Due at ${nextClient.scheduledTime}`}
                </button>
              </div>
            );
          })()
        ) : (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 650 }}>{copy.nobodyInSeat}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{copy.nobodyHint}</div>
          </div>
        )}
      </section>

      <section className="panel">
        <h2 className="panel-title">Waiting Today ({waitingClients.length})</h2>
        <p className="panel-sub">{copy.waitingSub}</p>

        {waitingClients.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', padding: '16px 0', fontSize: 13.5 }}>
            {copy.lineClear}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {waitingClients.map((client) => (
              <div
                key={client.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 'var(--radius-xs)',
                      background: 'var(--bg-elevated)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {client.queuePosition}
                  </span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 650, fontSize: 13.5 }}>
                        {client.customerName}{ticketSaysHere(client.notes) ? ' · here now' : ''}
                      </span>
                      {isClientDue(client.scheduledAt) ? (
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 99,
                            background: 'rgba(34, 197, 94, 0.15)',
                            color: '#22c55e',
                          }}
                        >
                          Ready to sit
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: 99,
                            background: 'var(--bg-elevated)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {timeUntilDue(client.scheduledAt)}
                        </span>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {client.serviceName} · Scheduled {client.scheduledTime}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 650 }}>~<CountUp value={client.estimatedWaitMinutes} />m</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNoShow(client)}
                    className="btn-secondary"
                    disabled={busy}
                    style={{ fontSize: 11.5, minHeight: 32, padding: '4px 10px' }}
                  >
                    They didn't come
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}