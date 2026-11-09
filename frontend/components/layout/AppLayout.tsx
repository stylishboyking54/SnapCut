'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import Navbar from './Navbar';
import RoleWelcome, { AppRole } from './RoleWelcome';
import RolePickModal from '@/components/auth/RolePickModal';
import SignInModal from '@/components/auth/SignInModal';
import {
  getSession,
  isProtectedCustomerPath,
} from '@/lib/auth';

type UserRole = AppRole | 'admin';

const ROLE_KEY = 'qb_role';

interface AppLayoutProps {
  children: React.ReactNode;
}

function homeForRole(role: UserRole) {
  if (role === 'barber' || role === 'salon') return '/barber/dashboard';
  if (role === 'admin') return '/admin';
  return '/';
}

function reasonForPath(pathname: string | null) {
  if (!pathname) return undefined;
  if (pathname.startsWith('/bookings')) return 'Needed for your ticket.';
  if (pathname.startsWith('/notifications')) return 'Needed for queue alerts.';
  if (pathname.startsWith('/profile')) return undefined;
  if (pathname.startsWith('/barber')) return 'Needed for your shop.';
  return undefined;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(null);
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [rolePickOpen, setRolePickOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState('');
  const [authRole, setAuthRole] = useState<AppRole>('customer');

  const openAuthGate = useCallback((reason?: string) => {
    if (getSession()) return;
    setAuthReason(reason ?? reasonForPath(pathname) ?? '');
    setAuthOpen(false);
    setRolePickOpen(true);
  }, [pathname]);

  // If Supabase dumps ?code= on Site URL (/), forward to the real callback route
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pathname?.startsWith('/auth/')) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;
    const roleParam = params.get('role');
    const qs = new URLSearchParams({ code });
    if (roleParam) qs.set('role', roleParam);
    router.replace(`/auth/callback?${qs.toString()}`);
  }, [pathname, router]);

  useEffect(() => {
    const saved = localStorage.getItem(ROLE_KEY);
    const session = getSession();
    setSignedIn(!!session);
    if (saved === 'customer' || saved === 'barber' || saved === 'salon' || saved === 'admin') {
      setRole(saved);
    } else if (session?.profile.role) {
      const r = session.profile.role as UserRole;
      localStorage.setItem(ROLE_KEY, r);
      setRole(r);
    } else {
      setRole(null);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    const onAuth = () => {
      const session = getSession();
      setSignedIn(!!session);

      if (!session) {
        const saved = localStorage.getItem(ROLE_KEY) as UserRole | null;
        if (saved === 'barber' || saved === 'salon' || saved === 'admin') {
          localStorage.removeItem(ROLE_KEY);
          setRole(null);
          setAuthOpen(false);
          setRolePickOpen(false);
          router.replace('/');
          return;
        }
        return;
      }

      const r = session.profile.role as UserRole;
      if (r === 'customer' || r === 'barber' || r === 'salon' || r === 'admin') {
        localStorage.setItem(ROLE_KEY, r);
        setRole(r);
      }
      setAuthOpen(false);
      setRolePickOpen(false);
    };

    const onSignInRequest = (e: Event) => {
      const detail = (e as CustomEvent<{ reason?: string }>).detail;
      openAuthGate(detail?.reason);
    };

    window.addEventListener('snapcut-auth', onAuth);
    window.addEventListener('snapcut-signin', onSignInRequest as EventListener);
    return () => {
      window.removeEventListener('snapcut-auth', onAuth);
      window.removeEventListener('snapcut-signin', onSignInRequest as EventListener);
    };
  }, [router, openAuthGate]);

  // Guest hits a gated URL → stay on Explore, open role → sign-in
  useEffect(() => {
    if (!ready || !role) return;
    const session = getSession();
    setSignedIn(!!session);

    if (role === 'barber' || role === 'salon' || role === 'admin') {
      if (!session) openAuthGate(reasonForPath(pathname));
      return;
    }

    if (isProtectedCustomerPath(pathname) && !session) {
      sessionStorage.setItem('snapcut_after_signin', pathname);
      router.replace('/');
      openAuthGate(reasonForPath(pathname));
    }
  }, [ready, role, pathname, openAuthGate, router]);

  useEffect(() => {
    if (!ready || !role) return;
    if ((role === 'barber' || role === 'salon') && (pathname === '/' || pathname.startsWith('/map') || pathname.startsWith('/bookings'))) {
      router.replace('/barber/dashboard');
    }
    if (role === 'customer' && pathname.startsWith('/barber')) {
      router.replace('/');
    }
  }, [ready, role, pathname, router]);

  const handleWelcomeComplete = (next: AppRole) => {
    localStorage.setItem(ROLE_KEY, next);
    setRole(next);
    setSignedIn(!!getSession());
    router.replace(homeForRole(next));
  };

  const handleRolePicked = (next: AppRole) => {
    localStorage.setItem(ROLE_KEY, next);
    setRole(next);
    setAuthRole(next);
    setRolePickOpen(false);
    setAuthOpen(true);
  };

  const handleGateClose = () => {
    setRolePickOpen(false);
    setAuthOpen(false);
    sessionStorage.removeItem('snapcut_after_signin');
  };

  const handleAuthSuccess = () => {
    setSignedIn(true);
    setAuthOpen(false);
    setRolePickOpen(false);
    const session = getSession();
    const r = (session?.profile.role || authRole || role) as UserRole;
    if (r === 'customer' || r === 'barber' || r === 'salon' || r === 'admin') {
      localStorage.setItem(ROLE_KEY, r);
      setRole(r);
    }
    const pending = sessionStorage.getItem('snapcut_after_signin');
    sessionStorage.removeItem('snapcut_after_signin');
    if (r === 'barber' || r === 'salon' || r === 'admin') {
      router.push(homeForRole(r));
      return;
    }
    if (pending) router.push(pending);
  };

  const customerNavItems = [
    { href: '/', label: 'Explore', iconName: 'explore' },
    { href: '/map', label: 'Map', iconName: 'map' },
    { href: '/bookings', label: 'Ticket', iconName: 'queue' },
    { href: '/notifications', label: 'Alerts', iconName: 'alerts' },
    { href: '/profile', label: 'Profile', iconName: 'account' },
  ];

  const proNavItems = [
    { href: '/barber/dashboard', label: role === 'salon' ? 'Line' : 'Queue', iconName: 'queue' },
    { href: '/barber/schedule', label: 'Hours', iconName: 'schedule' },
    { href: '/barber/bookings', label: 'Bookings', iconName: 'bookings' },
    { href: '/barber/emergency', label: 'Emergency', iconName: 'emergency' },
    { href: '/barber/shop', label: role === 'salon' ? 'Salon' : 'Shop', iconName: 'shop' },
  ];

  const adminNavItems = [
    { href: '/admin', label: 'Overview', iconName: 'explore' },
    { href: '/admin/shops', label: 'Shops', iconName: 'shop' },
    { href: '/admin/users', label: 'People', iconName: 'account' },
  ];

  const currentNavItems =
    role === 'barber' || role === 'salon'
      ? proNavItems
      : role === 'admin'
      ? adminNavItems
      : customerNavItems;

  if (pathname?.startsWith('/auth/')) {
    return <>{children}</>;
  }

  if (!ready || !role) {
    return (
      <>
        {!ready ? (
          <div className="role-welcome">
            <div className="muted" style={{ fontSize: 14 }}>Loading…</div>
          </div>
        ) : (
          <RoleWelcome onComplete={handleWelcomeComplete} />
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
        <Sidebar navItems={currentNavItems} role={role} onSignIn={() => openAuthGate()} />
      </Suspense>

      <div className="main-content">
        <Navbar currentRole={role} notificationCount={0} />
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

      <Suspense fallback={<nav className="bottom-nav" aria-hidden="true" />}>
        <BottomNav navItems={currentNavItems} />
      </Suspense>

      <RolePickModal
        open={rolePickOpen}
        onClose={handleGateClose}
        onPick={handleRolePicked}
      />

      <SignInModal
        open={authOpen}
        reason={authReason}
        defaultRole={authRole}
        onClose={handleGateClose}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
