'use client';

import React from 'react';
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

interface NavItem {
  href: string;
  label: string;
  iconName: string;
  badge?: number;
}

interface SidebarProps {
  navItems: NavItem[];
  role?: 'customer' | 'barber' | 'admin';
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

export default function Sidebar({ navItems, role }: SidebarProps) {
  const pathname = usePathname();

  const sectionLabel =
    role === 'barber' ? 'Shop floor' : role === 'admin' ? 'Admin' : 'Find a cut';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-text">Snapcut</span>
        <div className="sidebar-logo-sub">Neighborhood barber queues</div>
      </div>

      <nav className="sidebar-nav">
        {role && <div className="sidebar-section-label">{sectionLabel}</div>}

        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
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
          {role === 'barber' ? 'MV' : 'AJ'}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {role === 'barber' ? 'Marcus Vance' : 'Alex Johnson'}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            {role === 'barber' ? 'At the chair' : 'Downtown'}
          </div>
        </div>
      </div>
    </aside>
  );
}
