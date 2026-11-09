'use client';

import React, { useEffect, useState } from 'react';
import { INITIAL_NOTIFICATIONS } from '@/lib/mockData';
import { AppNotification } from '@/lib/types';
import { getSession } from '@/lib/auth';
import { ClockIcon, AlertTriangleIcon } from '@/components/ui/Icons';

export default function NotificationsPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);

  useEffect(() => {
    const sync = () => setSignedIn(!!getSession());
    sync();
    window.addEventListener('snapcut-auth', sync);
    return () => window.removeEventListener('snapcut-auth', sync);
  }, []);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleClear = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (!signedIn) return null;

  return (
    <div className="page-enter" style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="page-header-row">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600 }}>Alerts</h1>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="btn-secondary"
            style={{ fontSize: 12.5, minHeight: 34, padding: '6px 12px' }}
          >
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          Nothing yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map((n) => {
            const isEmergency = n.type === 'emergency';

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
                      background: isEmergency ? 'var(--brand-danger-soft)' : 'var(--bg-elevated)',
                      color: isEmergency ? 'var(--brand-danger)' : 'var(--brand-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isEmergency ? <AlertTriangleIcon size={16} /> : <ClockIcon size={16} />}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 650, fontSize: 14 }}>{n.title}</span>
                      {!n.isRead && <span className="status-dot" style={{ background: 'var(--brand-primary)' }} />}
                    </div>
                    <p className="secondary" style={{ fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>
                      {n.message}
                    </p>
                    <div className="muted" style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 12 }}>
                      <span>{n.timestamp}</span>
                      {n.shopName && <span>· {n.shopName}</span>}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleClear(n.id)}
                  style={{
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    fontSize: 14,
                    padding: 2,
                    flexShrink: 0,
                  }}
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
