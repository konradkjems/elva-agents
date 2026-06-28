/**
 * OAuth / magic-link callback landing page (public — NOT under /admin, so the
 * auth middleware doesn't bounce it).
 *
 * Supabase redirects here after Google sign-in with `?code=…` (PKCE). The
 * browser client exchanges that code for a session (detectSessionInUrl, on by
 * default), which writes the session cookie. We then forward to `next`
 * (default /admin) with a full navigation so the middleware sees the fresh
 * cookie.
 *
 * Why a dedicated page: redirecting OAuth straight to /admin fails — middleware
 * runs server-side before the client can exchange the code, sees no session,
 * and redirects to /admin/login, discarding the code.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let done = false;
    const forward = (dest) => {
      if (done) return;
      done = true;
      // Full navigation so the middleware reads the freshly-set session cookie.
      window.location.assign(dest);
    };

    const url = new URL(window.location.href);
    const next = url.searchParams.get('next') || '/admin';
    const oauthError = url.searchParams.get('error_description') || url.searchParams.get('error');
    if (oauthError) {
      setError(decodeURIComponent(oauthError));
      return;
    }

    // detectSessionInUrl (default) exchanges the ?code= on client init; we just
    // wait for the resulting session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) forward(next);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) forward(next);
    });

    const timeout = setTimeout(() => {
      if (!done) setError('Sign-in timed out. Please try again.');
    }, 10000);

    return () => {
      subscription?.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        {error ? (
          <>
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <a href="/admin/login" className="text-sm font-medium text-primary hover:underline">
              Back to sign in
            </a>
          </>
        ) : (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Signing you in…</p>
          </>
        )}
      </div>
    </div>
  );
}
