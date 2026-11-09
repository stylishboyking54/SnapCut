'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { INITIAL_QUEUE, INITIAL_SHOPS } from '@/lib/mockData';
import { getMyShop } from '@/lib/api';
import { QueueItem, Shop } from '@/lib/types';
import { ScissorsIcon, CoffeeIcon, AlertTriangleIcon } from '@/components/ui/Icons';
import { proCopy, useProKind } from '@/lib/proRole';

export default function BarberDashboardPage() {
  const kind = useProKind();
  const copy = proCopy(kind);
  const [shop, setShop] = useState<Shop | null>(null);
  const [shopLoading, setShopLoading] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>(INITIAL_QUEUE.filter((q) => q.shopId === 'shop-1'));
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mine = await getMyShop();
        if (cancelled) return;
        setShop(mine);
        if (mine) {
          setQueue(INITIAL_QUEUE.filter((q) => q.shopId === mine.id));
        }
      } catch {
        if (!cancelled) setShop(INITIAL_SHOPS[0]);
      } finally {
        if (!cancelled) setShopLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleNextClient = () => {
    if (queue.length === 0) return;

    setQueue((prev) => {
      const finished = prev[0];
      const remaining = prev.slice(1).map((item, idx) => ({
        ...item,
        queuePosition: idx + 1,
        status: (idx === 0 ? 'in_progress' : 'waiting') as QueueItem['status'],
        estimatedWaitMinutes: Math.max(0, item.estimatedWaitMinutes - 25),
      }));

      showNotice(copy.finishNotice(finished.customerName));
      return remaining;
    });
  };

  const handleShiftDelay = (minutes: number) => {
    setQueue((prev) =>
      prev.map((item) => ({
        ...item,
        estimatedWaitMinutes: item.estimatedWaitMinutes + minutes,
      }))
    );
    showNotice(`Added +${minutes}m to everyone waiting.`);
  };

  const inChairClient = queue.find((q) => q.status === 'in_progress');
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
          Continue
        </Link>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ maxWidth: 960, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="page-header-row">
        <div>
          <div className="eyebrow">{copy.eyebrowToday}</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>{shop.name}</h1>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/barber/schedule" className="btn-secondary" style={{ fontSize: 12.5 }}>
            <CoffeeIcon size={14} />
            Breaks ({shop.breaks?.length || 0})
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
            Emergency
          </Link>
        </div>
      </div>

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

          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={() => handleShiftDelay(10)} className="btn-secondary" style={{ fontSize: 12, minHeight: 34, padding: '6px 10px' }}>
              +10m
            </button>
            <button type="button" onClick={() => handleShiftDelay(20)} className="btn-secondary" style={{ fontSize: 12, minHeight: 34, padding: '6px 10px' }}>
              +20m
            </button>
          </div>
        </div>

        {inChairClient ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  color: 'var(--brand-primary)',
                }}
              >
                {inChairClient.customerName.slice(0, 1)}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 650 }}>{inChairClient.customerName}</div>
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

            <button type="button" onClick={handleNextClient} className="btn-primary">
              <ScissorsIcon size={15} />
              {copy.doneNext}
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
                    <div style={{ fontWeight: 650, fontSize: 13.5 }}>{client.customerName}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {client.serviceName} · {client.scheduledTime}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 650 }}>~{client.estimatedWaitMinutes}m</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setQueue((prev) => prev.filter((q) => q.id !== client.id));
                      showNotice(`Removed ${client.customerName}.`);
                    }}
                    className="btn-secondary"
                    style={{ fontSize: 11.5, minHeight: 32, padding: '4px 10px' }}
                  >
                    No-show
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
