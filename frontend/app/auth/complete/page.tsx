'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthRole, completeOAuthSession, homeForRole, setAccountRole } from '@/lib/auth';
import { ScissorsIcon, UserIcon } from '@/components/ui/Icons';

type PickState = 'loading' | 'pick-role' | 'done' | 'error';

function AuthCompleteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<PickState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let started = false;

    (async () => {
      if (started) return;
      started = true;

      const presetError = searchParams.get('error');
      if (presetError) {
        setError(presetError);
        setState('error');
        return;
      }

      try {
        const roleParam = searchParams.get('role');
        // Only treat explicitly chosen pro roles as "preferred"
        const preferred: AuthRole | undefined =
          roleParam === 'barber' || roleParam === 'salon' || roleParam === 'admin'
            ? roleParam
            : undefined;

        const session = await completeOAuthSession(preferred);
        if (cancelled) return;

        // New Google account with no role chosen yet → Who are you?
        if (session.is_new && !preferred) {
          setState('pick-role');
        } else {
          router.replace(homeForRole(session.profile.role));
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Google sign-in failed');
        setState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  const handleRolePick = async (role: 'customer' | 'barber' | 'salon') => {
    setBusy(true);
    try {
      await setAccountRole(role);
      router.replace(homeForRole(role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your role');
      setState('error');
      setBusy(false);
    }
  };

  if (state === 'pick-role') {
    return (
      <div className="role-welcome">
        <div className="role-welcome-card">
          <div className="eyebrow">Welcome to SnapCut</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginTop: 8 }}>
            Who are you?
          </h1>
          <p className="muted" style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>
            Choose your role to get started.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
            {([
              ['customer', 'Customer', 'Find a shop and join the line'],
              ['barber', 'Barber', "Men's shop — run your queue"],
              ['salon', 'Salon', "Women's salon — run your queue"],
            ] as const).map(([id, title, copy]) => (
              <button
                key={id}
                type="button"
                className="role-choice"
                disabled={busy}
                style={{ textAlign: 'left', opacity: busy ? 0.6 : 1 }}
                onClick={() => handleRolePick(id)}
              >
                <span className="role-choice-icon">
                  {id === 'customer' ? <UserIcon size={20} /> : <ScissorsIcon size={20} />}
                </span>
                <span className="role-choice-copy">
                  <strong>{title}</strong>
                  <span>{copy}</span>
                </span>
              </button>
            ))}
          </div>

          {error && (
            <div
              className="alert-banner"
              style={{ marginTop: 14, background: 'var(--brand-danger-soft)', color: 'var(--brand-danger)' }}
            >
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="role-welcome">
      <div className="role-welcome-card" style={{ textAlign: 'center' }}>
        {state === 'error' ? (
          <>
            <div className="eyebrow">Sign-in</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginTop: 8 }}>
              Couldn&apos;t finish Google
            </h1>
            <div
              className="alert-banner"
              style={{ marginTop: 16, background: 'var(--brand-danger-soft)', color: 'var(--brand-danger)' }}
            >
              {error}
            </div>
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: 18, width: '100%' }}
              onClick={() => router.replace('/')}
            >
              Back to SnapCut
            </button>
          </>
        ) : (
          <>
            <div className="eyebrow">SnapCut</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginTop: 8 }}>
              Signing you in…
            </h1>
            <p className="muted" style={{ marginTop: 12, fontSize: 14 }}>
              Finishing Google sign-in
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="role-welcome">
          <div className="muted" style={{ fontSize: 14 }}>
            Signing you in…
          </div>
        </div>
      }
    >
      <AuthCompleteInner />
    </Suspense>
  );
}
