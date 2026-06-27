import { createServerClient, serializeCookieHeader } from '@supabase/ssr';

/**
 * Request-scoped Supabase client for Pages Router API routes and
 * getServerSideProps. Reads/writes the auth session via cookies on the
 * incoming request/response, so `supabase.auth.getUser()` reflects the
 * logged-in user.
 *
 * This is used from Phase 2 onward (Supabase Auth). During Phase 1 the
 * session mechanism is still NextAuth; this helper is created ahead of time
 * so the Phase 2 swap is a drop-in.
 *
 * Usage (API route):
 *   const supabase = createServerSupabase(req, res);
 *   const { data: { user } } = await supabase.auth.getUser();
 */
export function createServerSupabase(req, res) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return Object.entries(req.cookies || {}).map(([name, value]) => ({
          name,
          value,
        }));
      },
      setAll(cookiesToSet) {
        const serialized = cookiesToSet.map(({ name, value, options }) =>
          serializeCookieHeader(name, value, options)
        );
        // Preserve any cookies already queued on the response.
        const existing = res.getHeader('Set-Cookie');
        const prev = Array.isArray(existing)
          ? existing
          : existing
          ? [existing]
          : [];
        res.setHeader('Set-Cookie', [...prev, ...serialized]);
      },
    },
  });
}

export default createServerSupabase;
