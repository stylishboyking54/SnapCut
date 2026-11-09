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
import { getSession, isProtectedCustomerPath, requestSignIn } from '@/lib/auth';

interface NavItem {
  href: string;
  label: string;
  iconName: string;
  badge?: number;
}

interface BottomNavProps {
  navItems: NavItem[];
}

function renderBottomIcon(name: string, isActive: boolean) {
  const color = isActive ? 'var(--text-primary)' : 'var(--text-muted)';
  switch (name) {
    case 'explore': return <ScissorsIcon size={20} color={color} />;
    case 'map': return <CompassIcon size={20} color={color} />;
    case 'queue': return <ClockIcon size={20} color={color} />;
    case 'alerts': return <BellIcon size={20} color={color} />;
    case 'account': return <UserIcon size={20} color={color} />;
    case 'schedule': return <CoffeeIcon size={20} color={color} />;
    case 'bookings': return <CalendarIcon size={20} color={color} />;
    case 'emergency': return <AlertTriangleIcon size={20} color={color} />;
    case 'shop': return <StoreIcon size={20} color={color} />;
    default: return <ClockIcon size={20} color={color} />;
  }
}

function reasonForHref(href: string) {
  if (href.startsWith('/bookings')) return 'Needed for your ticket.';
  if (href.startsWith('/notifications')) return 'Needed for queue alerts.';
  return undefined;
}

export default function BottomNav({ navItems }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/' && pathname.startsWith(item.href));

        const handleClick = (e: React.MouseEvent) => {
          if (!isProtectedCustomerPath(item.href)) return;
          if (getSession()) return;
          e.preventDefault();
          sessionStorage.setItem('snapcut_after_signin', item.href);
          requestSignIn(reasonForHref(item.href));
        };

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleClick}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {renderBottomIcon(item.iconName, isActive)}
              {Boolean(item.badge) && (
                <span
                  style={{
                    position: 'absolute',
                    top: -3,
                    right: -8,
                    background: 'var(--brand-primary)',
                    color: 'var(--brand-primary-text)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '1px 4px',
                    lineHeight: 1,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </div>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
