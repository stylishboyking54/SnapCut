'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  advanceShopQueue,
  cancelBooking,
  getMyShop,
  getShopBookingRows,
  getShopLiveQueue,
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

export default function BarberDashboardPage() {
  const kind = useProKind();
  const copy = proCopy(kind);
  const [shop, setShop] = useState<Shop | null>(null);
  const [shopLoading, setShopLoading] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
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
      const live = await getShopLiveQueue(shopId);
      setQueue(live.queue);
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

  const handleNextClient = async () => {
    if (!shop || busy || queue.length === 0) return;
    setBusy(true);
    try {
      const current = queue.find((q) => q.status === 'in_progress') || queue[0];
      const result = await advanceShopQueue(shop.id);
      await refreshQueue(shop.id);
      if (result.advanced) {
        showNotice(copy.finishNotice(current.customerName));
      } else {
        showNotice(result.message || copy.lineClear);
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

  const inChairClient = queue.find((q) => q.status === 'in_progress') || null;
  const waitingClients = queue.filter((q) => q.status !== 'in_progress');

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
    <div className="page-enter" style={{ maxWidth: 960, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="page-header-row">
        <div>
          <div className="date-pill"><span className="status-dot live" />{todayLabel()}</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 10 }}>{hello}</h1>
          <p className="secondary" style={{ marginTop: 6, fontSize: 14, maxWidth: 460, lineHeight: 1.45 }}>
            {shop.name}. When you finish someone, tap Finished — call next. Their ticket updates on its own.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/barber/schedule" className="btn-secondary" style={{ fontSize: 12.5 }}>
            <CoffeeIcon size={14} />
            Open hours
          </Link>
          <Link
            href="/barber/emergency"
            className="btn-secondary"
            style={{
              fontSize: 12.5,
              borderColor: 'rgba(180, 35, 24, 0.35)',
              color: 'var(--brand-danger)',
            }}
          >
            <AlertTriangleIcon size={14} color="var(--brand-danger)" />
            Pause line
          </Link>
        </div>
      </div>

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
          <div className={`status-mark ${inChairClient ? 'open' : 'wait'}`}>
            <span className={`status-dot ${inChairClient ? 'live' : ''}`} />
            {inChairClient ? copy.inSeat : copy.seatEmpty}
          </div>

        </div>

        {inChairClient ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                className="avatar-chip lg"
                style={{ width: 52, height: 52, minWidth: 52, minHeight: 52, fontSize: 18 }}
              >
                {inChairClient.customerName.slice(0, 1)}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 650 }}>
                  {inChairClient.customerName}
                  {ticketSaysHere(inChairClient.notes) ? ' · here now' : ''}
                </div>
                <div className="secondary" style={{ fontSize: 13.5, marginTop: 2 }}>
                  {inChairClient.serviceName} · GHS {inChairClient.price} · {inChairClient.serviceDuration}m
                </div>
                {inChairClient.notes && (
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                    Note: {inChairClient.notes}
                  </div>
                )}
              </div>
            </div>

            <button type="button" onClick={handleNextClient} className="btn-primary" disabled={busy}>
              <ScissorsIcon size={15} />
              {busy ? '…' : copy.doneNext}
            </button>
          </div>
        ) : waitingClients.length > 0 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 650 }}>{copy.seatEmpty}</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                {waitingClients[0].customerName} is next.
              </div>
            </div>
            <button type="button" onClick={handleNextClient} className="btn-primary" disabled={busy}>
              <ScissorsIcon size={15} />
              {busy ? '…' : 'Call next'}
            </button>
          </div>
        ) : (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 650 }}>{copy.nobodyInSeat}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{copy.nobodyHint}</div>
          </div>
        )}
      </section>

      <section className="panel">
        <h2 className="panel-title">Waiting ({waitingClients.length})</h2>
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
                    <div style={{ fontWeight: 650, fontSize: 13.5 }}>
                      {client.customerName}{ticketSaysHere(client.notes) ? ' · here now' : ''}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {client.serviceName} · {client.scheduledTime}
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
