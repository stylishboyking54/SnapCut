'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ScissorsIcon,
  CompassIcon,
  ClockIcon,
  BellIcon,
  UserIcon,
  CoffeeIcon,
  AlertTriangleIcon,
  CalendarIcon,
  StoreIcon,
} from '@/components/ui/Icons';
import { AuthSession, getSession, isProtectedCustomerPath, requestSignIn } from '@/lib/auth';

interface NavItem {
  href: string;
  label: string;
  iconName: string;
  badge?: number;
}

interface SidebarProps {
  navItems: NavItem[];
  role?: 'customer' | 'barber' | 'salon' | 'admin';
  onSignIn?: () => void;
}

function renderNavIcon(name: string) {
  switch (name) {
    case 'explore': return <ScissorsIcon size={17} />;
    case 'map': return <CompassIcon size={17} />;
    case 'queue': return <ClockIcon size={17} />;
    case 'alerts': return <BellIcon size={17} />;
    case 'account': return <UserIcon size={17} />;
    case 'schedule': return <CoffeeIcon size={17} />;
    case 'bookings': return <CalendarIcon size={17} />;
    case 'emergency': return <AlertTriangleIcon size={17} />;
    case 'shop': return <StoreIcon size={17} />;
    default: return <ClockIcon size={17} />;
  }
}

export default function Sidebar({ navItems, role, onSignIn }: SidebarProps) {
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const sync = () => setSession(getSession());
    sync();
    window.addEventListener('snapcut-auth', sync);
    return () => window.removeEventListener('snapcut-auth', sync);
  }, []);

  const sectionLabel =
    role === 'salon'
      ? 'Salon floor'
      : role === 'barber'
      ? 'Shop floor'
      : role === 'admin'
      ? 'Admin'
      : 'Find a cut';

  const brandSub =
    role === 'salon'
      ? 'Neighborhood salon queues'
      : role === 'barber'
      ? 'Neighborhood barber queues'
      : 'Neighborhood barber queues';

  const displayName = session?.profile.full_name || null;
  const initials = displayName
    ? displayName
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-text">Snapcut</span>
        <div className="sidebar-logo-sub">{brandSub}</div>
      </div>

      <nav className="sidebar-nav">
        {role && <div className="sidebar-section-label">{sectionLabel}</div>}

        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          const handleClick = (e: React.MouseEvent) => {
            if (!isProtectedCustomerPath(item.href)) return;
            if (getSession()) return;
            e.preventDefault();
            sessionStorage.setItem('snapcut_after_signin', item.href);
            const reason =
              item.href.startsWith('/bookings')
                ? 'Needed for your ticket.'
                : item.href.startsWith('/notifications')
                ? 'Needed for queue alerts.'
                : undefined;
            requestSignIn(reason);
          };

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleClick}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              {renderNavIcon(item.iconName)}
              <span>{item.label}</span>
              {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          padding: '16px 18px',
          borderTop: '1px solid var(--bg-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
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
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--brand-primary)',
          }}
        >
          {initials}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          {session ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {session.profile.role}
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>Not signed in</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Tap to sign in</div>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
