import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Create a response that we will augment with any cookies Supabase sets (e.g., PKCE verifier)
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read all incoming cookies (including any PKCE verifier stored previously)
        getAll() {
          return request.cookies.getAll();
        },
        // When Supabase wants to set cookies, attach them to the response we will return
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  try {
    // Refresh the session – this will also sync PKCE cookies if present
    await supabase.auth.getUser();
  } catch (err) {
    console.error('Middleware error:', err);
  }

  // Return the response (with any cookies added)
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};