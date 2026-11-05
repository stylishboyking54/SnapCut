'use client';

import React, { useState } from 'react';
import { ScissorsIcon, UserIcon } from '@/components/ui/Icons';
import { AuthRole, login, register } from '@/lib/auth';

export type AppRole = 'customer' | 'barber' | 'salon';

interface RoleWelcomeProps {
  onComplete: (role: AppRole) => void;
}

export default function RoleWelcome({ onComplete }: RoleWelcomeProps) {
  const [step, setStep] = useState<'role' | 'auth'>('role');
  const [role, setRole] = useState<AppRole | null>(null);
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickRole = (next: AppRole) => {
    setRole(next);
    setStep('auth');
    setError(null);
  };

  const roleLabel =
    role === 'salon' ? 'Salon' : role === 'barber' ? 'Barber' : 'Customer';

  const handleGoogle = () => {
    setError('Google sign-up needs to be enabled in Supabase Auth. Use email for now.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signup') {
        await register(email.trim(), password, fullName.trim() || roleLabel, role as AuthRole);
      } else {
        const session = await login(email.trim(), password);
        // Prefer chosen role for routing; profile may already have one
        if (session.profile.role === 'customer' || session.profile.role === 'barber' || session.profile.role === 'salon') {
          onComplete(session.profile.role);
          return;
        }
      }
      onComplete(role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="role-welcome">
      <div className="role-welcome-card">
        {step === 'role' ? (
          <>
            <div className="eyebrow">Welcome</div>
            <h1 className="brand-hero" style={{ fontSize: 'clamp(34px, 8vw, 48px)', marginTop: 8 }}>
              Snapcut
            </h1>
            <p className="secondary" style={{ marginTop: 12, fontSize: 15, lineHeight: 1.45, maxWidth: 360 }}>
              Who are you here as?
            </p>

            <div className="role-welcome-choices">
              <button type="button" className="role-choice" onClick={() => pickRole('customer')}>
                <span className="role-choice-icon">
                  <UserIcon size={22} />
                </span>
                <span className="role-choice-copy">
                  <strong>Customer</strong>
                  <span>Find a barbershop or salon, check the wait, join the line</span>
                </span>
              </button>

              <button type="button" className="role-choice" onClick={() => pickRole('barber')}>
                <span className="role-choice-icon">
                  <ScissorsIcon size={22} />
                </span>
                <span className="role-choice-copy">
                  <strong>Barber</strong>
                  <span>Men&apos;s barbershop — run your queue and chair</span>
                </span>
              </button>

              <button type="button" className="role-choice" onClick={() => pickRole('salon')}>
                <span className="role-choice-icon">
                  <ScissorsIcon size={22} />
                </span>
                <span className="role-choice-copy">
                  <strong>Salon</strong>
                  <span>Women&apos;s salon — run your queue and appointments</span>
                </span>
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setStep('role');
                setError(null);
              }}
              style={{
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
                alignSelf: 'flex-start',
              }}
            >
              ← Change role
            </button>
            <div className="eyebrow">{roleLabel}</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, marginTop: 6 }}>
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="secondary" style={{ marginTop: 8, fontSize: 14, lineHeight: 1.45 }}>
              Sign up to save your spot and sync across devices.
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
              <button type="button" className="btn-secondary" onClick={handleGoogle} style={{ width: '100%' }}>
                Continue with Google
              </button>
              <div className="muted" style={{ textAlign: 'center', fontSize: 12 }}>
                or use email
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              {mode === 'signup' && (
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
                />
              </div>
              <button type="submit" className="btn-primary" disabled={busy} style={{ marginTop: 4 }}>
                {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setMode(mode === 'signup' ? 'login' : 'signup');
                  setError(null);
                }}
              >
                {mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
