/**
 * Client-side auth context backed by Supabase Auth — the replacement for
 * NextAuth's <SessionProvider> + useSession().
 *
 * It exposes a DROP-IN useSession() compatible with next-auth/react so client
 * pages change only their import:
 *
 *   - import { useSession } from 'next-auth/react'
 *   + import { useSession } from '@/lib/supabase/auth-context'
 *
 *   const { data: session, status, update } = useSession()
 *     status  : 'loading' | 'authenticated' | 'unauthenticated'
 *     session : { user: { id, email, name, image, role, provider,
 *                         currentOrganizationId, teamRole, permissions } } | null
 *
 * The Supabase session lives in cookies (via @supabase/ssr's browser client),
 * so the server can read it. The richer app profile (role/teamRole/org) is
 * fetched from /api/auth/me whenever the Supabase auth state changes.
 *
 * Also exports signOut() and useSupabaseClient() for the login/logout flows.
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { getSupabaseBrowserClient } from './client';

const AuthContext = createContext({
  data: null,
  status: 'loading',
  update: async () => null,
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('loading');
  const supabaseRef = useRef(null);

  if (!supabaseRef.current) {
    try {
      supabaseRef.current = getSupabaseBrowserClient();
    } catch (e) {
      // Missing env — render children unauthenticated rather than crashing.
      console.error('AuthProvider: Supabase client init failed:', e.message);
    }
  }

  // Pull the full app profile from the server (role/teamRole/org).
  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (!res.ok) {
        setSession(null);
        setStatus('unauthenticated');
        return null;
      }
      const data = await res.json();
      if (data?.user) {
        const next = { user: data.user };
        setSession(next);
        setStatus('authenticated');
        return next;
      }
      setSession(null);
      setStatus('unauthenticated');
      return null;
    } catch (e) {
      setSession(null);
      setStatus('unauthenticated');
      return null;
    }
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) {
      setStatus('unauthenticated');
      return;
    }

    let active = true;

    // Initial load.
    supabase.auth.getSession().then(({ data: { session: sbSession } }) => {
      if (!active) return;
      if (sbSession) loadProfile();
      else {
        setSession(null);
        setStatus('unauthenticated');
      }
    });

    // React to sign-in / sign-out / token refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sbSession) => {
      if (!active) return;
      if (event === 'SIGNED_OUT' || !sbSession) {
        setSession(null);
        setStatus('unauthenticated');
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        loadProfile();
      }
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const value = { data: session, status, update: loadProfile };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Drop-in replacement for next-auth/react's useSession(). */
export function useSession() {
  return useContext(AuthContext);
}

/** Access the browser Supabase client (login/logout). */
export function useSupabaseClient() {
  return getSupabaseBrowserClient();
}

/**
 * Drop-in-ish replacement for next-auth/react's signOut(). Signs out of
 * Supabase and redirects (default '/admin/login').
 */
export async function signOut(options = {}) {
  const { callbackUrl = '/admin/login' } = options;
  try {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
  } catch (e) {
    console.error('signOut error:', e.message);
  }
  if (typeof window !== 'undefined') {
    window.location.href = callbackUrl;
  }
}

/** Hook variant that has the router available, if a page prefers it. */
export function useSignOut() {
  const router = useRouter();
  return useCallback(async (options = {}) => {
    const { callbackUrl = '/admin/login' } = options;
    try {
      await getSupabaseBrowserClient().auth.signOut();
    } catch (e) {
      console.error('signOut error:', e.message);
    }
    router.push(callbackUrl);
  }, [router]);
}
