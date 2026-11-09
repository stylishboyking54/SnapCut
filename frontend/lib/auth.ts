import { createClient } from '@/lib/supabase/client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const SESSION_KEY = 'snapcut_session';
const PENDING_ROLE_KEY = 'snapcut_pending_role';
const ROLE_KEY = 'qb_role';

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

export async function login(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
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
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
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
    await fetch(`${API_BASE_URL}/auth/logout`, {
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

/** Starts Google OAuth; returns after redirect to /auth/callback */
export async function loginWithGoogle(role: AuthRole = 'customer') {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PENDING_ROLE_KEY, role);
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
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

export function takePendingRole(): AuthRole {
  if (typeof window === 'undefined') return 'customer';
  const raw = sessionStorage.getItem(PENDING_ROLE_KEY);
  sessionStorage.removeItem(PENDING_ROLE_KEY);
  if (raw === 'customer' || raw === 'barber' || raw === 'salon' || raw === 'admin') {
    return raw;
  }
  return 'customer';
}

/** Finish OAuth: exchange code, sync profile, save Snapcut session */
export async function completeOAuthSession(): Promise<AuthSession> {
  const supabase = createClient();
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const oauthError = params.get('error_description') || params.get('error');
  if (oauthError) throw new Error(oauthError);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw new Error(error.message || 'Could not finish Google sign-in');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(sessionError.message);
  const sbSession = sessionData.session;
  if (!sbSession?.access_token) {
    throw new Error('No session after Google sign-in. Try again.');
  }

  const pendingRole = takePendingRole();
  const res = await fetch(`${API_BASE_URL}/auth/oauth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sbSession.access_token}`,
    },
    body: JSON.stringify({ role: pendingRole }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Could not sync account');

  const session: AuthSession = {
    access_token: sbSession.access_token,
    refresh_token: sbSession.refresh_token,
    email: data.user?.email || sbSession.user.email || '',
    profile: {
      id: data.profile?.id || sbSession.user.id,
      full_name:
        data.profile?.full_name ||
        sbSession.user.user_metadata?.full_name ||
        sbSession.user.user_metadata?.name ||
        sbSession.user.email ||
        'Snapcut User',
      role: data.profile?.role || pendingRole,
      phone: data.profile?.phone,
      avatar_url:
        data.profile?.avatar_url ||
        sbSession.user.user_metadata?.avatar_url ||
        sbSession.user.user_metadata?.picture,
    },
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
