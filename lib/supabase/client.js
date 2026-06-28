import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase client (singleton). Used by client components for auth
 * (signInWithPassword / signInWithOAuth / signOut) and the useUser() provider.
 *
 * Reads the public anon key — safe to ship to the browser. Tenant isolation
 * is enforced server-side (service-role + app-level organizationId scoping),
 * not via this client.
 *
 * Used from Phase 2 onward (Supabase Auth replaces NextAuth).
 */

let browserClient;

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}

export default getSupabaseBrowserClient;
