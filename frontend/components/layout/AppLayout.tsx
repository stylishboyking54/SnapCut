'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import Navbar from './Navbar';
import RoleWelcome, { AppRole } from './RoleWelcome';

type UserRole = AppRole | 'admin';

const ROLE_KEY = 'qb_role';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(ROLE_KEY);
    if (saved === 'customer' || saved === 'barber' || saved === 'admin') {
      setRole(saved);
    } else {
      setRole(null);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !role) return;
    if (role === 'barber' && (pathname === '/' || pathname.startsWith('/map') || pathname.startsWith('/bookings'))) {
      router.replace('/barber/dashboard');
    }
    if (role === 'customer' && pathname.startsWith('/barber')) {
      router.replace('/');
    }
  }, [ready, role, pathname, router]);

  const handleSelectRole = (next: AppRole) => {
    localStorage.setItem(ROLE_KEY, next);
    setRole(next);
    router.replace(next === 'barber' ? '/barber/dashboard' : '/');
  };

  const handleRoleChange = (next: UserRole) => {
    localStorage.setItem(ROLE_KEY, next);
    setRole(next);
    if (next === 'barber') router.replace('/barber/dashboard');
    else if (next === 'admin') router.replace('/admin');
    else router.replace('/');
  };

  const customerNavItems = [
    { href: '/', label: 'Explore', iconName: 'explore' },
    { href: '/map', label: 'Map', iconName: 'map' },
    { href: '/bookings', label: 'Ticket', iconName: 'queue', badge: 1 },
    { href: '/notifications', label: 'Alerts', iconName: 'alerts', badge: 2 },
    { href: '/profile', label: 'Profile', iconName: 'account' },
  ];

  const barberNavItems = [
    { href: '/barber/dashboard', label: 'Queue', iconName: 'queue', badge: 3 },
    { href: '/barber/schedule', label: 'Hours', iconName: 'schedule' },
    { href: '/barber/bookings', label: 'Bookings', iconName: 'bookings' },
    { href: '/barber/emergency', label: 'Emergency', iconName: 'emergency' },
    { href: '/barber/shop', label: 'Shop', iconName: 'shop' },
  ];

  const adminNavItems = [
    { href: '/admin', label: 'Overview', iconName: 'explore' },
    { href: '/admin/shops', label: 'Shops', iconName: 'shop' },
    { href: '/admin/users', label: 'People', iconName: 'account' },
  ];

  const currentNavItems =
    role === 'barber'
      ? barberNavItems
      : role === 'admin'
      ? adminNavItems
      : customerNavItems;

  if (!ready || !role) {
    return (
      <>
        {!ready ? (
          <div className="role-welcome">
            <div className="muted" style={{ fontSize: 14 }}>Loading…</div>
          </div>
        ) : (
          <RoleWelcome onSelect={handleSelectRole} />
        )}
        <div hidden aria-hidden="true">
          {children}
        </div>
      </>
    );
  }

  return (
    <div className="app-layout">
      <Suspense fallback={<aside className="sidebar" />}>
        <Sidebar navItems={currentNavItems} role={role} />
      </Suspense>

      <div className="main-content">
        <Navbar
          currentRole={role}
          onRoleChange={handleRoleChange}
          notificationCount={2}
        />
        <main className="page-content">
          <Suspense
            fallback={
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading…
              </div>
            }
          >
            {children}
          </Suspense>
        </main>
      </div>

      <Suspense
        fallback={
          <nav className="bottom-nav" aria-hidden="true" />
        }
      >
        <BottomNav navItems={currentNavItems} />
      </Suspense>
    </div>
  );
}
