/**
 * Promote a user to platform admin on Supabase.
 *
 * Sets public.users.role = 'platform_admin' — the exact check the live app uses
 * (lib/roleCheck.js: session.user.role === 'platform_admin'). A platform admin
 * bypasses org scoping and can manage all organizations + demos.
 *
 * Usage: node scripts/set-platform-admin.js <email>
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const email = (process.argv[2] || '').toLowerCase();
  if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: node scripts/set-platform-admin.js <email>');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const { data: user, error: fErr } = await admin
    .from('users')
    .select('id, name, role')
    .eq('email', email)
    .maybeSingle();
  if (fErr) { console.error('❌ lookup failed:', fErr.message); process.exit(1); }
  if (!user) { console.error(`❌ User with email "${email}" not found`); process.exit(1); }

  if (user.role === 'platform_admin') {
    console.log(`✅ "${user.name || email}" is already a Platform Admin`);
    return;
  }

  const { error: uErr } = await admin
    .from('users')
    .update({ role: 'platform_admin' })
    .eq('id', user.id);
  if (uErr) { console.error('❌ update failed:', uErr.message); process.exit(1); }

  console.log(`✅ "${user.name || email}" (${email}) is now a Platform Admin`);
  console.log('🔑 Capabilities: manage all demos, access any organization, system-wide settings/analytics.');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
