'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppNotification } from '@/lib/types';
import { getSession } from '@/lib/auth';
import { getMyNotifications, markNotificationsRead } from '@/lib/api';
import { subscribeNotifications } from '@/lib/realtime';
import { ClockIcon, AlertTriangleIcon } from '@/components/ui/Icons';
import { timeGreeting, todayLabel } from '@/lib/greeting';

export default function NotificationsPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const load = useCallback(async () => {
    const session = getSession();
    if (!session) {
      setSignedIn(false);
      setNotifications([]);
      setLoading(false);
      return;
    }
    setSignedIn(true);
    try {
      const items = await getMyNotifications();
      setNotifications(items);
      const unread = items.filter((n) => !n.isRead).length;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('snapcut-notifications-count', { detail: { unread } }));
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let unsub: () => void = () => {};

    const connect = () => {
      unsub();
      unsub = () => {};
      void load();
      const session = getSession();
      if (!session?.profile?.id) return;
      unsub = subscribeNotifications({
        userId: session.profile.id,
        onChange: () => {
          void load();
        },
      });
    };

    connect();
    const onAuth = () => {
      setLoading(true);
      connect();
    };
    window.addEventListener('snapcut-auth', onAuth);
    const poll = window.setInterval(() => {
      void load();
    }, 10000);

    return () => {
      window.removeEventListener('snapcut-auth', onAuth);
      window.clearInterval(poll);
      unsub();
    };
  }, [load]);

  const handleMarkAllRead = async () => {
    try {
      await markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } finally {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('snapcut-notifications-count', { detail: { unread: 0 } }));
      }
    }
  };

  const handleClear = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="page-enter" style={{ maxWidth: 1040, width: '100%', margin: 0, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="page-header-row">
        <div>
          <div className="date-pill"><span className="status-dot live" />{todayLabel()}</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 10 }}>{timeGreeting(getSession()?.profile.full_name)}</h1>
          <p className="secondary" style={{ fontSize: 14, marginTop: 6 }}>
            Messages when your place in line changes, or a shop has to pause.
          </p>
        </div>

        {signedIn && unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            className="btn-secondary"
            style={{ fontSize: 12.5, minHeight: 34, padding: '6px 12px' }}
          >
            Mark all read
          </button>
        )}
      </div>

      {!signedIn ? (
        <div className="panel" style={{ textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ fontSize: 15, fontWeight: 650 }}>Sign in to see alerts</div>
          <p className="muted" style={{ fontSize: 13.5, marginTop: 8, lineHeight: 1.45 }}>
            When you&apos;re in line, we&apos;ll tell you here if your turn moves up or a shop pauses the queue.
          </p>
        </div>
      ) : loading ? (
        <div className="panel" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          Loading alerts…
        </div>
      ) : notifications.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ fontSize: 15, fontWeight: 650 }}>Nothing yet</div>
          <p className="muted" style={{ fontSize: 13.5, marginTop: 8, lineHeight: 1.45, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
            Join a line from Explore. When the chair advances or a shop posts a delay, it shows up here.
          </p>
          <Link href="/" className="btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
            Find a shop
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map((n) => {
            const isEmergency = n.type === 'emergency';
            const isBroadcast = n.type === 'system_broadcast';

            return (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: n.isRead ? 'transparent' : 'var(--bg-surface)',
                  border: isEmergency
                    ? '1px solid rgba(180, 35, 24, 0.28)'
                    : isBroadcast
                    ? '1px solid rgba(234, 179, 8, 0.35)'
                    : '1px solid var(--bg-border)',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--bg-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isEmergency ? (
                      <AlertTriangleIcon size={15} color="var(--brand-danger)" />
                    ) : isBroadcast ? (
                      <span style={{ fontSize: 15 }}>📢</span>
                    ) : (
                      <ClockIcon size={15} />
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 650, fontSize: 13.5 }}>{n.title}</span>
                      {isBroadcast && (
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '1px 7px',
                            borderRadius: 4,
                            background: 'rgba(234, 179, 8, 0.16)',
                            color: '#ca8a04',
                          }}
                        >
                          Official Announcement
                        </span>
                      )}
                    </div>
                    <div className="secondary" style={{ fontSize: 13, marginTop: 3, lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
                      {n.shopName ? `${n.shopName} · ` : ''}
                      {n.timestamp}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {(n.message.toLowerCase().includes('all done') || n.message.toLowerCase().includes('thanks')) && (
                    <Link
                      href="/bookings"
                      className="btn-primary"
                      style={{ fontSize: 11, minHeight: 28, padding: '3px 10px', background: '#f59e0b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      ⭐ Rate cut
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => handleClear(n.id)}
                    className="btn-secondary"
                    style={{ fontSize: 11, minHeight: 28, padding: '3px 8px', flexShrink: 0 }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
