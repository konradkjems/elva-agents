import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client using the service-role key.
 *
 * This bypasses Row Level Security and is the primary data-access entry point
 * for all server-side queries. It replaced the old
 * `const client = await clientPromise; const db = client.db('elva-agents');`
 * MongoDB pattern.
 *
 * Usage:
 *   import { admin } from '@/lib/supabase/admin';
 *   const { data, error } = await admin.from('widgets').select('*').eq('id', id);
 *
 * NEVER import this into client-side code — the service-role key must stay
 * on the server. It is read from SUPABASE_SERVICE_ROLE_KEY (not NEXT_PUBLIC_*).
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isDevelopment = process.env.NODE_ENV === 'development';

const createAdminClient = () => {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase admin credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      // The service-role client is stateless — no session persistence or
      // token refresh. It authenticates purely via the service-role key.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Cache the client on globalThis in development so HMR doesn't create a new
// connection pool on every hot reload.
let adminClient;

if (isDevelopment) {
  if (!global._supabaseAdminClient) {
    global._supabaseAdminClient = createAdminClient();
  }
  adminClient = global._supabaseAdminClient;
} else {
  adminClient = createAdminClient();
}

export const admin = adminClient;
export default adminClient;
