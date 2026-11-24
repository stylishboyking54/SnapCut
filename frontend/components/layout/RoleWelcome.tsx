'use client';

import React, { useState } from 'react';
import { GoogleIcon, EyeIcon, EyeOffIcon, ScissorsIcon, UserIcon } from '@/components/ui/Icons';
import { login, loginWithGoogle, PICK_ROLE_KEY, register, setAccountRole } from '@/lib/auth';

export type AppRole = 'customer' | 'barber' | 'salon';

interface RoleWelcomeProps {
  onComplete: (role: AppRole) => void;
  /** role = account already exists and we only need who they are */
  initialStep?: 'signin' | 'role';
}

export default function RoleWelcome({ onComplete, initialStep = 'signin' }: RoleWelcomeProps) {
  const [step, setStep] = useState<'signin' | 'signup' | 'role'>(initialStep);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      sessionStorage.removeItem(PICK_ROLE_KEY);
      await loginWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setBusy(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setBusy(true);
    setError(null);
    try {
      sessionStorage.setItem(PICK_ROLE_KEY, '1');
      await loginWithGoogle();
    } catch (err) {
      sessionStorage.removeItem(PICK_ROLE_KEY);
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setBusy(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const session = await login(email.trim(), password);
      const role = session.profile.role;
      onComplete(role === 'barber' || role === 'salon' ? role : 'customer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in');
      setBusy(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await register(email.trim(), password, fullName.trim() || 'SnapCut', 'customer');
      setStep('role');
      setBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account');
      setBusy(false);
    }
  };

  const handleRole = async (role: AppRole) => {
    setBusy(true);
    setError(null);
    try {
      await setAccountRole(role);
      onComplete(role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that');
      setBusy(false);
    }
  };

  return (
    <div className="role-welcome">
      <div className="role-welcome-card">
        {step === 'role' ? (
          <>
            <div className="eyebrow">Account ready</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, marginTop: 6 }}>
              Who are you?
            </h1>
            <p className="secondary" style={{ marginTop: 8, fontSize: 14, lineHeight: 1.45 }}>
              This is the only time we ask. It decides whether you join a line or run a shop.
            </p>
            {error && (
              <div className="alert-banner" style={{ marginTop: 14, background: 'var(--brand-danger-soft)', color: 'var(--brand-danger)' }}>
                {error}
              </div>
            )}
            <div className="role-welcome-choices" style={{ marginTop: 16 }}>
              <button type="button" className="role-choice" disabled={busy} onClick={() => void handleRole('customer')}>
                <span className="role-choice-icon"><UserIcon size={22} /></span>
                <span className="role-choice-copy">
                  <strong>Customer</strong>
                  <span>Find a shop, see the wait, and join the line</span>
                </span>
              </button>
              <button type="button" className="role-choice" disabled={busy} onClick={() => void handleRole('barber')}>
                <span className="role-choice-icon"><ScissorsIcon size={22} /></span>
                <span className="role-choice-copy">
                  <strong>Barber</strong>
                  <span>Run the line at a men&apos;s shop</span>
                </span>
              </button>
              <button type="button" className="role-choice" disabled={busy} onClick={() => void handleRole('salon')}>
                <span className="role-choice-icon"><ScissorsIcon size={22} /></span>
                <span className="role-choice-copy">
                  <strong>Salon</strong>
                  <span>Run the line at a women&apos;s salon</span>
                </span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="eyebrow">SnapCut</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, marginTop: 6 }}>
              {step === 'signup' ? 'Create an account' : 'Sign in'}
            </h1>
            <p className="secondary" style={{ marginTop: 8, fontSize: 14, lineHeight: 1.45 }}>
              {step === 'signup'
                ? 'Use your email. Next you will choose customer, barber, or salon.'
                : 'Use the email and password from your account.'}
            </p>

            {error && (
              <div className="alert-banner" style={{ marginTop: 14, background: 'var(--brand-danger-soft)', color: 'var(--brand-danger)' }}>
                {error}
              </div>
            )}

            <button
              type="button"
              className="btn-secondary"
              onClick={() => void (step === 'signup' ? handleGoogleSignUp() : handleGoogleSignIn())}
              disabled={busy}
              style={{ width: '100%', marginTop: 16 }}
            >
              <GoogleIcon size={18} />
              {busy ? 'Please wait…' : 'Continue with Google'}
            </button>

            <form
              onSubmit={step === 'signup' ? handleCreate : handleSignIn}
              style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}
            >
              {step === 'signup' && (
                <div className="field">
                  <label>Your name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" required />
                </div>
              )}
              <div className="field">
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required autoComplete="email" />
              </div>
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ margin: 0 }}>Password</label>
                  <span className="muted" style={{ fontSize: 11.5 }}>
                    Min. 6 characters
                  </span>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                    placeholder="At least 6 characters"
                    autoComplete={step === 'signup' ? 'new-password' : 'current-password'}
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
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Please wait…' : step === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setStep(step === 'signup' ? 'signin' : 'signup');
                setError(null);
              }}
              style={{
                marginTop: 14,
                width: '100%',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 650,
              }}
            >
              {step === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
