'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthRole, completeOAuthSession, homeForRole } from '@/lib/auth';

function AuthCompleteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let started = false;

    (async () => {
      if (started) return;
      started = true;

      const presetError = searchParams.get('error');
      if (presetError) {
        setError(presetError);
        return;
      }

      try {
        const roleParam = searchParams.get('role');
        const preferred: AuthRole | undefined =
          roleParam === 'customer' ||
          roleParam === 'barber' ||
          roleParam === 'salon' ||
          roleParam === 'admin'
            ? roleParam
            : undefined;
        const session = await completeOAuthSession(preferred);
        if (cancelled) return;
        router.replace(homeForRole(session.profile.role));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Google sign-in failed');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="role-welcome">
      <div className="role-welcome-card" style={{ textAlign: 'center' }}>
        {error ? (
          <>
            <div className="eyebrow">Sign-in</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginTop: 8 }}>
              Couldn’t finish Google
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
              Back to Snapcut
            </button>
          </>
        ) : (
          <>
            <div className="eyebrow">Snapcut</div>
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
