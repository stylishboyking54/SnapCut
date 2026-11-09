import { createClient } from '@/lib/supabase/client';

const PROD_API_URL = 'https://snapcut-599t.onrender.com/api';
const SESSION_KEY = 'snapcut_session';
const PENDING_ROLE_KEY = 'snapcut_pending_role';
const ROLE_KEY = 'qb_role';

/** Prefer env; never call localhost from a deployed host */
export function getApiBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL || '';
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const onLocal = host === 'localhost' || host === '127.0.0.1';
    if (!onLocal && (!fromEnv || fromEnv.includes('localhost'))) {
      return PROD_API_URL;
    }
  }
  return fromEnv || 'http://localhost:3001/api';
}

export type AuthRole = 'customer' | 'barber' | 'salon' | 'admin';

export type AuthProfile = {
  id: string;
  full_name: string;
  role: AuthRole;
  phone?: string | null;
  avatar_url?: string | null;
};

export type AuthSession = {
  access_token: string;
  refresh_token?: string;
  email: string;
  profile: AuthProfile;
};

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return getSession()?.access_token || null;
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event('snapcut-auth'));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event('snapcut-auth'));
}

/** Ask the app shell to open the sign-in modal (real-app gate). */
export function requestSignIn(reason?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('snapcut-signin', { detail: { reason: reason || '' } }),
  );
}

export function isProtectedCustomerPath(pathname: string | null | undefined) {
  if (!pathname) return false;
  return (
    pathname === '/bookings' ||
    pathname.startsWith('/bookings/') ||
    pathname === '/notifications' ||
    pathname.startsWith('/notifications/') ||
    pathname === '/profile' ||
    pathname.startsWith('/profile/')
  );
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Login failed');

  const session: AuthSession = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    email: data.user?.email || email,
    profile: {
      id: data.profile?.id || data.user?.id,
      full_name: data.profile?.full_name || data.user?.user_metadata?.full_name || email,
      role: data.profile?.role || 'customer',
      phone: data.profile?.phone,
      avatar_url: data.profile?.avatar_url,
    },
  };
  saveSession(session);
  return session;
}

export async function register(
  email: string,
  password: string,
  fullName: string,
  role: AuthRole = 'customer',
): Promise<AuthSession> {
  const res = await fetch(`${getApiBaseUrl()}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name: fullName, role }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Register failed');

  // register now returns a login payload
  if (data.access_token) {
    const session: AuthSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      email: data.user?.email || email,
      profile: {
        id: data.profile?.id || data.user?.id,
        full_name: data.profile?.full_name || fullName,
        role: data.profile?.role || role,
        phone: data.profile?.phone,
        avatar_url: data.profile?.avatar_url,
      },
    };
    saveSession(session);
    return session;
  }

  return login(email, password);
}

export async function logout() {
  const token = getAccessToken();
  if (token) {
    await fetch(`${getApiBaseUrl()}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);
  }
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch {
    /* ignore */
  }
  clearSession();
}

/** Starts Google OAuth; server route /auth/callback exchanges the PKCE code */
export async function loginWithGoogle(role: AuthRole = 'customer') {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PENDING_ROLE_KEY, role);
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Role travels on the redirect URL so it survives the Google hop
      redirectTo: `${window.location.origin}/auth/callback?role=${encodeURIComponent(role)}`,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });
  if (error) {
    sessionStorage.removeItem(PENDING_ROLE_KEY);
    throw new Error(error.message || 'Google sign-in failed');
  }
}

export function takePendingRole(fallback?: AuthRole): AuthRole {
  if (typeof window === 'undefined') return fallback || 'customer';
  const raw = sessionStorage.getItem(PENDING_ROLE_KEY);
  sessionStorage.removeItem(PENDING_ROLE_KEY);
  if (raw === 'customer' || raw === 'barber' || raw === 'salon' || raw === 'admin') {
    return raw;
  }
  if (fallback === 'customer' || fallback === 'barber' || fallback === 'salon' || fallback === 'admin') {
    return fallback;
  }
  return 'customer';
}

/**
 * After server /auth/callback exchanged the code into cookies,
 * read the session and sync Snapcut profile/role.
 */
export async function completeOAuthSession(preferredRole?: AuthRole): Promise<AuthSession> {
  const supabase = createClient();

  // Brief retry — cookies from the route handler may need a tick to be readable
  let sbSession = (await supabase.auth.getSession()).data.session;
  if (!sbSession?.access_token) {
    await new Promise((r) => setTimeout(r, 150));
    sbSession = (await supabase.auth.getSession()).data.session;
  }
  if (!sbSession?.access_token) {
    throw new Error('No session after Google sign-in. Try again.');
  }

  const pendingRole = takePendingRole(preferredRole);
  const user = sbSession.user;
  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Snapcut User';
  const avatarUrl =
    user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

  let profile: AuthProfile | null = null;

  // Prefer API sync; fall back to direct Supabase profile if API/CORS is down
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/oauth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sbSession.access_token}`,
      },
      body: JSON.stringify({ role: pendingRole }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.profile) {
      profile = {
        id: data.profile.id || user.id,
        full_name: data.profile.full_name || fullName,
        role: data.profile.role || pendingRole,
        phone: data.profile.phone,
        avatar_url: data.profile.avatar_url || avatarUrl,
      };
    }
  } catch {
    /* API unreachable — use Supabase below */
  }

  if (!profile) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!existing) {
      const { data: created } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          role: pendingRole,
          avatar_url: avatarUrl,
        })
        .select()
        .single();
      profile = {
        id: created?.id || user.id,
        full_name: created?.full_name || fullName,
        role: (created?.role as AuthRole) || pendingRole,
        phone: created?.phone,
        avatar_url: created?.avatar_url || avatarUrl,
      };
    } else {
      profile = {
        id: existing.id,
        full_name: existing.full_name || fullName,
        role: (existing.role as AuthRole) || pendingRole,
        phone: existing.phone,
        avatar_url: existing.avatar_url || avatarUrl,
      };
      if (!existing.avatar_url && avatarUrl) {
        await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
      }
    }
  }

  const session: AuthSession = {
    access_token: sbSession.access_token,
    refresh_token: sbSession.refresh_token,
    email: user.email || '',
    profile,
  };
  saveSession(session);
  localStorage.setItem(ROLE_KEY, session.profile.role);
  return session;
}

export function homeForRole(role: AuthRole) {
  if (role === 'barber' || role === 'salon') return '/barber/dashboard';
  if (role === 'admin') return '/admin';
  return '/';
}

export function authHeaders(extra: HeadersInit = {}): HeadersInit {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}
