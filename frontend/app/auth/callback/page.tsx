'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { completeOAuthSession, homeForRole } from '@/lib/auth';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const session = await completeOAuthSession();
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
  }, [router]);

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
            <p className="secondary" style={{ marginTop: 14, fontSize: 14, lineHeight: 1.45 }}>
              Enable Google under Supabase → Authentication → Providers, add this site’s
              <code> /auth/callback</code> to Redirect URLs, then try again.
            </p>
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
