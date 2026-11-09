import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function safeRole(raw: string | null): string {
  if (raw === 'customer' || raw === 'barber' || raw === 'salon' || raw === 'admin') {
    return raw;
  }
  return 'customer';
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const role = safeRole(searchParams.get('role'));
  const oauthError = searchParams.get('error_description') || searchParams.get('error');

  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/auth/complete?error=${encodeURIComponent(oauthError)}`,
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/auth/complete?role=${role}`);
    }
    return NextResponse.redirect(
      `${origin}/auth/complete?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(
    `${origin}/auth/complete?error=${encodeURIComponent('Missing auth code')}`,
  );
}
