'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GoogleIcon } from '@/components/ui/Icons';
import {
  AuthRole,
  login,
  loginWithGoogle,
  register,
} from '@/lib/auth';

type Mode = 'login' | 'register';

interface SignInModalProps {
  open: boolean;
  reason?: string;
  defaultRole?: AuthRole;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SignInModal({
  open,
  reason,
  defaultRole = 'customer',
  onClose,
  onSuccess,
}: SignInModalProps) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setBusy(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const roleLabel =
    defaultRole === 'salon' ? 'Salon' : defaultRole === 'barber' ? 'Barber' : 'Customer';

  const finish = () => {
    onSuccess?.();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'register') {
        await register(email.trim(), password, fullName.trim() || roleLabel, defaultRole);
      } else {
        await login(email.trim(), password);
      }
      finish();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      await loginWithGoogle(defaultRole);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setBusy(false);
    }
  };

  return createPortal(
    <div className="auth-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="auth-modal-handle" aria-hidden="true" />
        <button type="button" className="auth-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="eyebrow">Account</div>
        <h2 id="auth-modal-title" style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, marginTop: 6 }}>
          {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
        </h2>
        <p className="secondary" style={{ marginTop: 8, fontSize: 14, lineHeight: 1.45 }}>
          {reason || 'Sign in to save your spot and sync across devices.'}
        </p>

        {error && (
          <div
            className="alert-banner"
            style={{ marginTop: 14, background: 'var(--brand-danger-soft)', color: 'var(--brand-danger)' }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
          <button type="button" className="btn-secondary" onClick={handleGoogle} disabled={busy} style={{ width: '100%' }}>
            <GoogleIcon size={18} />
            {busy ? 'Opening Google…' : 'Continue with Google'}
          </button>
          <div className="muted" style={{ textAlign: 'center', fontSize: 12 }}>
            or use email
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
          {mode === 'register' && (
            <div className="field">
              <label>Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={busy} style={{ marginTop: 4 }}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
          >
            {mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
