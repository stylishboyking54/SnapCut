const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const SESSION_KEY = 'snapcut_session';

export type AuthProfile = {
  id: string;
  full_name: string;
  role: 'customer' | 'barber' | 'admin';
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
  role: 'customer' | 'barber' = 'customer',
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
  clearSession();
}

export function authHeaders(extra: HeadersInit = {}): HeadersInit {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}
