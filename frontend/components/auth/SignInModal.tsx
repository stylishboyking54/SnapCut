'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GoogleIcon } from '@/components/ui/Icons';
import {
  login,
  loginWithGoogle,
  PICK_ROLE_KEY,
  register,
  setAccountRole,
} from '@/lib/auth';
import { ScissorsIcon, UserIcon } from '@/components/ui/Icons';

type Mode = 'login' | 'register' | 'role';
type AppRole = 'customer' | 'barber' | 'salon';

interface SignInModalProps {
  open: boolean;
  reason?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SignInModal({
  open,
  reason,
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
    setMode('login');
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
        await register(
          email.trim(),
          password,
          fullName.trim() || email.trim().split('@')[0] || 'Snapcut',
          'customer',
        );
        setMode('role');
        setBusy(false);
        return;
      }
      await login(email.trim(), password);
      finish();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t sign in');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'register') sessionStorage.setItem(PICK_ROLE_KEY, '1');
      else sessionStorage.removeItem(PICK_ROLE_KEY);
      await loginWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google didn’t work');
      setBusy(false);
    }
  };

  return createPortal(
    <div className="auth-modal-overlay" role="presentation" onClick={mode === 'role' ? undefined : onClose}>
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="auth-modal-handle" aria-hidden="true" />
        {mode !== 'role' && (
          <button type="button" className="auth-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        )}

        <h2 id="auth-modal-title" style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, marginTop: 2 }}>
          {mode === 'role' ? 'Who are you?' : mode === 'login' ? 'Sign in' : 'Create an account'}
        </h2>
        {reason ? (
          <p className="secondary" style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.4 }}>
            {reason}
          </p>
        ) : null}

        {error && (
          <div
            className="alert-banner"
            style={{ marginTop: 12, background: 'var(--brand-danger-soft)', color: 'var(--brand-danger)' }}
          >
            {error}
          </div>
        )}

        {mode === 'role' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            {([
              ['customer', 'Customer', 'Find a shop and join the line'],
              ['barber', 'Barber', 'Run the line at a men\u2019s shop'],
              ['salon', 'Salon', 'Run the line at a women\u2019s salon'],
            ] as const).map(([id, title, copy]) => (
              <button
                key={id}
                type="button"
                className="role-choice"
                disabled={busy}
                style={{ textAlign: 'left' }}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    await setAccountRole(id as AppRole);
                    finish();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Could not save that');
                    setBusy(false);
                  }
                }}
              >
                <span className="role-choice-icon">{id === 'customer' ? <UserIcon size={20} /> : <ScissorsIcon size={20} />}</span>
                <span className="role-choice-copy">
                  <strong>{title}</strong>
                  <span>{copy}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
        <>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleGoogle}
          disabled={busy}
          style={{ width: '100%', marginTop: 16 }}
        >
          <GoogleIcon size={18} />
          Google
        </button>

        <div
          className="muted"
          style={{ textAlign: 'center', fontSize: 11.5, margin: '12px 0 4px', letterSpacing: '0.04em' }}
        >
          EMAIL
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mode === 'register' && (
            <div className="field">
              <label>Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Name"
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
              placeholder="Email"
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
              placeholder="Password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={busy} style={{ marginTop: 2 }}>
            {busy ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
          style={{
            marginTop: 14,
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 13,
            fontWeight: 550,
            cursor: 'pointer',
          }}
        >
          {mode === 'login' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
        </button>
        </>
        )}
      </div>
    </div>,
    document.body,
  );
}
