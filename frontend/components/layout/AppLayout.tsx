'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import Navbar from './Navbar';
import RoleWelcome, { AppRole } from './RoleWelcome';
import SignInModal from '@/components/auth/SignInModal';
import {
  getSession,
  isProtectedCustomerPath,
  PICK_ROLE_KEY,
  syncCurrentProfile,
} from '@/lib/auth';
import { getMyShop, getMyNotifications } from '@/lib/api';
import { subscribeNotifications } from '@/lib/realtime';

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
  const [needsRole, setNeedsRole] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastAlert, setToastAlert] = useState<{ id: string; message: string; type: string } | null>(null);

  const openAuthGate = useCallback((reason?: string) => {
    if (getSession()) return;
    setAuthReason(reason ?? reasonForPath(pathname) ?? '');
    setAuthOpen(true);
  }, [pathname]);

  // Synchronize unread notifications and real-time alerts
  useEffect(() => {
    let isMounted = true;
    let unsub: () => void = () => {};

    const loadUnread = async () => {
      const session = getSession();
      if (!session) {
        if (isMounted) setUnreadCount(0);
        return;
      }
      try {
        const list = await getMyNotifications();
        if (!isMounted) return;
        const unread = list.filter((n) => !n.isRead);
        setUnreadCount((prevCount) => {
          // If a new unread arrives while browsing, show in-app alert banner
          if (unread.length > prevCount && unread[0]) {
            setToastAlert({
              id: unread[0].id,
              message: unread[0].message,
              type: unread[0].type,
            });
            setTimeout(() => {
              if (isMounted) setToastAlert(null);
            }, 6000);
          }
          return unread.length;
        });
      } catch {
        // quiet error
      }
    };

    const connect = () => {
      unsub();
      unsub = () => {};
      void loadUnread();
      const session = getSession();
      if (!session?.profile?.id) return;
      unsub = subscribeNotifications({
        userId: session.profile.id,
        onChange: () => {
          void loadUnread();
        },
      });
    };

    connect();

    const onAuth = () => connect();
    const onCountUpdate = (e: any) => {
      if (typeof e.detail?.unread === 'number') {
        setUnreadCount(e.detail.unread);
      }
    };

    window.addEventListener('snapcut-auth', onAuth);
    window.addEventListener('snapcut-notifications-count', onCountUpdate);
    const poll = window.setInterval(() => {
      void loadUnread();
    }, 12000);

    return () => {
      isMounted = false;
      window.removeEventListener('snapcut-auth', onAuth);
      window.removeEventListener('snapcut-notifications-count', onCountUpdate);
      window.clearInterval(poll);
      unsub();
    };
  }, []);

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
    if (session) {
      void syncCurrentProfile().then((fresh) => {
        if (fresh?.role) {
          setRole(fresh.role as UserRole);
        }
      });
    }
    setNeedsRole(sessionStorage.getItem(PICK_ROLE_KEY) === '1');
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
    if (pathname.startsWith('/admin') && role !== 'admin') {
      router.replace('/');
    }
  }, [ready, role, pathname, router]);

  const handleWelcomeComplete = async (next: AppRole) => {
    localStorage.setItem(ROLE_KEY, next);
    setRole(next);
    setSignedIn(!!getSession());
    if (next === 'barber' || next === 'salon') {
      try {
        const mine = await getMyShop();
        router.replace(mine ? '/barber/dashboard' : '/barber/shop?setup=1');
      } catch {
        router.replace('/barber/shop?setup=1');
      }
      return;
    }
    router.replace(homeForRole(next));
  };

  const handleGateClose = () => {
    setAuthOpen(false);
    sessionStorage.removeItem('snapcut_after_signin');
  };

  const handleAuthSuccess = async () => {
    setSignedIn(true);
    setAuthOpen(false);
    sessionStorage.removeItem(PICK_ROLE_KEY);
    setNeedsRole(false);
    const session = getSession();
    const r = (session?.profile.role || role) as UserRole;
    const effective = r;
    if (effective === 'customer' || effective === 'barber' || effective === 'salon' || effective === 'admin') {
      localStorage.setItem(ROLE_KEY, effective);
      setRole(effective);
    }
    const pending = sessionStorage.getItem('snapcut_after_signin');
    sessionStorage.removeItem('snapcut_after_signin');
    if (effective === 'barber' || effective === 'salon') {
      try {
        const mine = await getMyShop();
        router.push(mine ? '/barber/dashboard' : '/barber/shop?setup=1');
      } catch {
        router.push('/barber/shop?setup=1');
      }
      return;
    }
    if (effective === 'admin') {
      router.push(homeForRole(effective));
      return;
    }
    if (pending) router.push(pending);
  };

  const customerNavItems = [
    { href: '/', label: 'Find a shop', iconName: 'explore' },
    { href: '/map', label: 'Nearby', iconName: 'map' },
    { href: '/bookings', label: 'My ticket', iconName: 'queue' },
    { href: '/notifications', label: 'Updates', iconName: 'alerts', badge: unreadCount > 0 ? unreadCount : undefined },
    { href: '/profile', label: 'Me', iconName: 'account' },
  ];

  const proNavItems = [
    { href: '/barber/dashboard', label: "Today's line", iconName: 'queue' },
    { href: '/barber/schedule', label: 'Open hours', iconName: 'schedule' },
    { href: '/barber/bookings', label: "Who's booked", iconName: 'bookings' },
    { href: '/barber/emergency', label: 'Pause line', iconName: 'emergency' },
    { href: '/barber/shop', label: role === 'salon' ? 'My salon' : 'My shop', iconName: 'shop' },
  ];

  const adminNavItems = [
    { href: '/admin', label: 'Home', iconName: 'explore' },
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

  if (!ready || !role || needsRole) {
    return (
      <>
        {!ready ? (
          <div className="role-welcome">
            <div className="muted" style={{ fontSize: 14 }}>Loading…</div>
          </div>
        ) : (
          <RoleWelcome
            initialStep={needsRole ? 'role' : 'signin'}
            onComplete={(next) => {
              sessionStorage.removeItem(PICK_ROLE_KEY);
              setNeedsRole(false);
              void handleWelcomeComplete(next);
            }}
          />
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
                <Navbar currentRole={role} notificationCount={unreadCount} />
        {toastAlert && (
          <div
            style={{
              position: 'sticky',
              top: 60,
              zIndex: 1000,
              padding: '10px 16px',
              margin: '0 auto 12px auto',
              maxWidth: 640,
              width: '90%',
              borderRadius: 'var(--radius-md)',
              background: toastAlert.type === 'emergency' ? 'var(--brand-danger, #dc2626)' : 'var(--brand-primary, #f0412b)',
              color: '#ffffff',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              animation: 'slideDown 0.3s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600 }}>
              <span>{toastAlert.type === 'emergency' ? '⚠️' : '🔔'}</span>
              <span>{toastAlert.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastAlert(null)}
              style={{
                background: 'rgba(255,255,255,0.25)',
                border: 'none',
                color: '#fff',
                borderRadius: 4,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        )}
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

      <SignInModal
        open={authOpen}
        reason={authReason}
        onClose={handleGateClose}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
