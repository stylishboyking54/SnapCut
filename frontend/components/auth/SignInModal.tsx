'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GoogleIcon, EyeIcon, EyeOffIcon, ScissorsIcon, UserIcon } from '@/components/ui/Icons';
import {
  login,
  loginWithGoogle,
  PICK_ROLE_KEY,
  register,
  setAccountRole,
} from '@/lib/auth';
import TermsModal from '@/components/auth/TermsModal';

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
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
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
    setAgreedToTerms(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !termsOpen) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, termsOpen]);

  if (!mounted || !open) return null;

  const finish = () => {
    onSuccess?.();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (mode === 'register' && !agreedToTerms) {
      setError('Please read and agree to the Terms & Conditions to create an account.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'register') {
        await register(
          email.trim(),
          password,
          fullName.trim() || email.trim().split('@')[0] || 'SnapCut',
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
    <>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, marginTop: 4 }}>
            <img src="/logo.png" alt="SnapCut" width={38} height={38} style={{ borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
            <h2 id="auth-modal-title" style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: 0 }}>
              {mode === 'role' ? 'Who are you?' : mode === 'login' ? 'Sign in' : 'Create an account'}
            </h2>
          </div>
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
            Continue with Google
          </button>

          <div
            className="muted"
            style={{ textAlign: 'center', fontSize: 11.5, margin: '14px 0 6px', letterSpacing: '0.04em' }}
          >
            OR WITH EMAIL
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {mode === 'register' && (
              <div className="field">
                <label>Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
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
                placeholder="name@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ margin: 0 }}>Password</label>
                <span className="muted" style={{ fontSize: 11.5 }}>
                  Min. 8 characters
                </span>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  placeholder="At least 8 characters"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  style={{ width: '100%', paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 8,
                    background: 'transparent',
                    border: 'none',
                    padding: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    borderRadius: 'var(--radius-xs)',
                  }}
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
            </div>

            {/* Terms and Conditions Checkbox for registration */}
            {mode === 'register' && (
              <div style={{ marginTop: 4, marginBottom: 2 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    cursor: 'pointer',
                    userSelect: 'none',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: !agreedToTerms && error ? 'var(--brand-danger-soft)' : 'var(--bg-elevated)',
                    border: '1px solid var(--bg-border)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked);
                      if (e.target.checked) setError(null);
                    }}
                    style={{
                      marginTop: 2,
                      width: 17,
                      height: 17,
                      accentColor: 'var(--brand-accent)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--text-secondary)' }}>
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setTermsOpen(true);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--brand-accent)',
                        fontWeight: 650,
                        textDecoration: 'underline',
                        padding: 0,
                        cursor: 'pointer',
                        fontSize: 'inherit',
                      }}
                    >
                      Terms &amp; Conditions
                    </button>{' '}
                    and Privacy Policy.
                  </span>
                </label>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={busy}
              style={{
                marginTop: 4,
                background: mode === 'register' && !agreedToTerms ? 'var(--bg-elevated)' : 'var(--brand-accent)',
                color: mode === 'register' && !agreedToTerms ? 'var(--text-muted)' : '#fff',
                border: mode === 'register' && !agreedToTerms ? '1px solid var(--bg-border)' : 'none',
                transition: 'all 0.18s ease',
              }}
            >
              {busy ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              style={{
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
          </div>

          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11.5, color: 'var(--text-muted)' }}>
            Read SnapCut&apos;s{' '}
            <button
              type="button"
              onClick={() => setTermsOpen(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--brand-accent)',
                textDecoration: 'underline',
                padding: 0,
                fontSize: 'inherit',
                cursor: 'pointer',
              }}
            >
              Terms &amp; Conditions
            </button>
          </div>
          </>
          )}
        </div>
      </div>

      {/* Terms Reader Modal */}
      <TermsModal
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        onAccept={() => {
          setAgreedToTerms(true);
          setTermsOpen(false);
          setError(null);
        }}
      />
    </>,
    document.body,
  );
}
