/**
 * Create an admin bootstrap user on Supabase (Auth + profile + org).
 *
 * Replaces the old MongoDB version. Mirrors the proven prod creation flow in
 * pages/api/auth/register.js. Creates:
 *   - a public.users profile with role 'admin' and a matching auth.users record
 *     with the SAME uuid (auth.users is the password source of truth)
 *   - a personal enterprise organization, an owner team membership, current org
 *
 * Account role 'admin' is NOT the same as platform admin. To grant full
 * platform-admin access (all orgs + demos; lib/roleCheck.js checks
 * role === 'platform_admin'), run afterwards:
 *   node scripts/set-platform-admin.js <email>
 *
 * Usage:
 *   node scripts/create-admin-user.js [email] [password] [name]
 *   npm run create-admin
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const EMAIL = (process.argv[2] || 'admin@elva-solutions.com').toLowerCase();
const PASSWORD = process.argv[3] || 'admin123';
const NAME = process.argv[4] || 'Admin User';

const ownerPermissions = () => ({
  widgets: { create: true, read: true, update: true, delete: true },
  demos: { create: true, read: true, update: true, delete: true },
  team: { invite: true, manage: true, remove: true },
  settings: { view: true, edit: true },
});

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const admin = createClient(url, key, { auth: { persistSession: false } });

  // Already exists?
  const { data: existing } = await admin.from('users').select('id, role').eq('email', EMAIL).maybeSingle();
  if (existing) {
    console.log(`✅ User already exists: ${EMAIL} (role: ${existing.role})`);
    console.log(`💡 To make them a platform admin:\n   node scripts/set-platform-admin.js ${EMAIL}`);
    return;
  }

  console.log(`🔄 Creating admin user ${EMAIL} ...`);

  // 1) Application profile (password lives in Supabase Auth, created next).
  const { data: profile, error: pErr } = await admin
    .from('users')
    .insert({
      email: EMAIL,
      name: NAME,
      role: 'admin',
      status: 'active',
      provider: 'credentials',
      email_verified: true,
      preferences: {
        theme: 'light',
        language: 'da',
        notifications: { email: true, newWidgetCreated: true, teamInvitation: true },
      },
      last_login: null,
    })
    .select('id')
    .single();
  if (pErr) { console.error('❌ profile insert failed:', pErr.message); process.exit(1); }
  const userId = profile.id;

  // 2) Matching Supabase Auth user with the SAME id so the account is loginnable.
  const { error: aErr } = await admin.auth.admin.createUser({
    id: userId,
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: NAME },
    app_metadata: { provider: 'email', providers: ['email'] },
  });
  if (aErr) {
    await admin.from('users').delete().eq('id', userId); // rollback un-loginnable profile
    console.error('❌ auth user creation failed (rolled back profile):', aErr.message);
    process.exit(1);
  }
  console.log('✅ auth + profile created (role: admin)');

  // 3) Personal enterprise organization.
  const slug = EMAIL.split('@')[0].replace(/[^a-z0-9]+/g, '-') + '-org';
  const { data: org, error: oErr } = await admin
    .from('organizations')
    .insert({
      name: `${NAME}'s Organization`,
      slug,
      owner_id: userId,
      plan: 'enterprise',
      limits: { maxWidgets: 999, maxTeamMembers: 999, maxConversations: 999999, maxDemos: 0 },
      usage: {
        conversations: {
          current: 0,
          limit: 999999,
          lastReset: new Date().toISOString(),
          overage: 0,
          notificationsSent: [],
        },
      },
      subscription_status: 'active',
      settings: { allowDemoCreation: false, requireEmailVerification: false, allowGoogleAuth: true },
    })
    .select('id')
    .single();
  if (oErr) { console.error('❌ organization insert failed:', oErr.message); process.exit(1); }

  // 4) Owner team membership.
  const { error: tErr } = await admin.from('team_members').insert({
    organization_id: org.id,
    user_id: userId,
    role: 'owner',
    permissions: ownerPermissions(),
    status: 'active',
    joined_at: new Date().toISOString(),
  });
  if (tErr) { console.error('❌ team_member insert failed:', tErr.message); process.exit(1); }

  // 5) Set current organization.
  await admin.from('users').update({ current_organization_id: org.id }).eq('id', userId);

  console.log('\n🎉 Admin user setup complete!');
  console.log(`📧 Email: ${EMAIL}`);
  console.log(`🔑 Password: ${PASSWORD}`);
  console.log(`🏢 Organization: ${NAME}'s Organization (enterprise) — Owner`);
  console.log('\n⚠️  Change the password after first login.');
  console.log(`💡 To grant full platform-admin access (all orgs + demos):\n   node scripts/set-platform-admin.js ${EMAIL}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
