import { createClient } from '@/lib/supabase/client';

const PROD_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://snapcut-599t.onrender.com/api';
const SESSION_KEY = 'snapcut_session';
const PENDING_ROLE_KEY = 'snapcut_pending_role';
const ROLE_KEY = 'qb_role';

/** Prefer env; never call localhost from a deployed host or during production SSR */
export function getApiBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL || '';
  if (fromEnv && !fromEnv.includes('localhost')) {
    return fromEnv;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const onLocal = host === 'localhost' || host === '127.0.0.1';
    if (!onLocal) {
      return PROD_API_URL;
    }
    return fromEnv || 'http://localhost:3001/api';
  }
  // Server-side / SSR: if in production or running on Vercel, always use PROD_API_URL
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    return PROD_API_URL;
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
  is_new?: boolean;
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
  // Keep Supabase browser client in sync so Realtime works after Nest login
  if (session.access_token && session.refresh_token) {
    try {
      const supabase = createClient();
      void supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    } catch {
      /* ignore */
    }
  }
  window.dispatchEvent(new Event('snapcut-auth'));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event('snapcut-auth'));
}

export function handleSessionExpired(reason = 'Your session has expired. Please sign in again.') {
  clearSession();
  requestSignIn(reason);
}

export async function ensureFreshToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const session = getSession();
  if (!session?.access_token) return null;

  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      if (data.session.access_token !== session.access_token) {
        session.access_token = data.session.access_token;
        if (data.session.refresh_token) {
          session.refresh_token = data.session.refresh_token;
        }
        saveSession(session);
      }
      return data.session.access_token;
    }

    if (session.refresh_token) {
      const { data: refreshed, error } = await supabase.auth.refreshSession({
        refresh_token: session.refresh_token,
      });
      if (refreshed?.session?.access_token) {
        session.access_token = refreshed.session.access_token;
        session.refresh_token = refreshed.session.refresh_token;
        saveSession(session);
        return refreshed.session.access_token;
      }
      if (error) {
        handleSessionExpired('Your session has expired. Please sign in again.');
        return null;
      }
    }
  } catch (e) {
    console.warn('Token freshness check failed:', e);
  }

  return session.access_token;
}

export async function syncCurrentProfile(): Promise<AuthProfile | null> {
  if (typeof window === 'undefined') return null;
  const session = getSession();
  if (!session?.profile?.id) return null;
  try {
    const supabase = createClient();
    const { data: fresh } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.profile.id)
      .maybeSingle();

    if (fresh && fresh.role) {
      if (fresh.role !== session.profile.role || fresh.full_name !== session.profile.full_name) {
        session.profile = {
          ...session.profile,
          role: fresh.role as AuthRole,
          full_name: fresh.full_name || session.profile.full_name,
          phone: fresh.phone ?? session.profile.phone,
          avatar_url: fresh.avatar_url ?? session.profile.avatar_url,
        };
        saveSession(session);
        localStorage.setItem(ROLE_KEY, fresh.role);
      }
      return session.profile;
    }
  } catch (err) {
    console.warn('Profile sync error:', err);
  }
  return session.profile;
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
export const PICK_ROLE_KEY = 'snapcut_pick_role';

/** Google sign-in. Pass a role only when the person just chose one. */
export async function loginWithGoogle(role?: AuthRole) {
  if (typeof window === 'undefined') return;
  if (role) sessionStorage.setItem(PENDING_ROLE_KEY, role);
  else sessionStorage.removeItem(PENDING_ROLE_KEY);
  const supabase = createClient();
  const redirectTo = role
    ? `${window.location.origin}/auth/callback?role=${encodeURIComponent(role)}`
    : `${window.location.origin}/auth/callback`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
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

export function takePendingRole(fallback?: AuthRole): AuthRole | null {
  if (typeof window === 'undefined') return fallback || null;
  const raw = sessionStorage.getItem(PENDING_ROLE_KEY);
  sessionStorage.removeItem(PENDING_ROLE_KEY);
  if (raw === 'customer' || raw === 'barber' || raw === 'salon' || raw === 'admin') {
    return raw;
  }
  if (fallback === 'customer' || fallback === 'barber' || fallback === 'salon' || fallback === 'admin') {
    return fallback;
  }
  return null;
}

export async function updateMyAvatar(image: string) {
  const res = await fetch(`${getApiBaseUrl()}/auth/avatar`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ image }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not save the photo');
  const session = getSession();
  if (session) {
    session.profile.avatar_url = data.avatar_url || null;
    saveSession(session);
  }
  return data.avatar_url as string | null;
}

export async function updateMyProfile(input: { full_name: string; phone: string }) {
  const res = await fetch(`${getApiBaseUrl()}/auth/profile`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not save your profile');
  const session = getSession();
  if (session) {
    session.profile.full_name = data.full_name || input.full_name;
    session.profile.phone = data.phone ?? input.phone;
    saveSession(session);
  }
  return data;
}

export async function setAccountRole(role: 'customer' | 'barber' | 'salon') {
  const res = await fetch(`${getApiBaseUrl()}/auth/role`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ role }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not save who you are');
  const session = getSession();
  if (session) {
    session.profile.role = data.role || role;
    saveSession(session);
  }
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(PICK_ROLE_KEY);
    localStorage.setItem(ROLE_KEY, data.role || role);
  }
}

/**
 * After server /auth/callback exchanged the code into cookies,
 * read the session and sync SnapCut profile/role.
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
    'SnapCut User';
  const avatarUrl =
    user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

  let profile: AuthProfile | null = null;
  let isNew = false;

  // Prefer API sync; fall back to direct Supabase profile if API/CORS is down
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/oauth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sbSession.access_token}`,
      },
      body: JSON.stringify(pendingRole ? { role: pendingRole } : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.profile) {
      isNew = Boolean(data.is_new);
      const apiRole = (data.profile.role || pendingRole) as AuthRole;
      // Never let a sync wipe a barber/salon down to customer
      const role: AuthRole =
        (apiRole === 'customer' && (pendingRole === 'barber' || pendingRole === 'salon'))
          ? pendingRole
          : (apiRole === 'customer' &&
              (user.user_metadata?.role === 'barber' || user.user_metadata?.role === 'salon') &&
              !pendingRole)
            ? (user.user_metadata.role as AuthRole)
            : apiRole;
      profile = {
        id: data.profile.id || user.id,
        full_name: data.profile.full_name || fullName,
        role,
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

    isNew = !existing || (!user.user_metadata?.role_picked && existing?.role === 'customer');

    const nextRole: AuthRole =
      existing?.role === 'admin'
        ? 'admin'
        : existing?.role === 'barber' || existing?.role === 'salon'
          ? (pendingRole === 'barber' || pendingRole === 'salon' ? pendingRole : existing.role)
          : pendingRole || existing?.role || 'customer';

    const { data: upserted } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: existing?.full_name || fullName,
        role: nextRole,
        avatar_url: existing?.avatar_url || avatarUrl,
      })
      .select()
      .single();

    profile = {
      id: upserted?.id || user.id,
      full_name: upserted?.full_name || fullName,
      role: (upserted?.role as AuthRole) || nextRole,
      phone: upserted?.phone,
      avatar_url: upserted?.avatar_url || avatarUrl,
    };
  }

  const session: AuthSession = {
    access_token: sbSession.access_token,
    refresh_token: sbSession.refresh_token,
    email: user.email || '',
    profile,
    is_new: isNew,
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
