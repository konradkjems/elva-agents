/**
 * Phase 2 — Auth import: public.users  ->  auth.users (Supabase Auth / GoTrue).
 *
 * For each row in public.users, create a matching auth.users entry with the
 * SAME uuid (so session.user.id is unchanged from Phase 1) and, for credentials
 * users, the EXISTING bcrypt hash as the password — no password reset required.
 * GoTrue's admin createUser accepts a pre-computed `password_hash` (bcrypt) and
 * a custom `id` (supabase-js >= 2.10x), which is the supported migration path.
 *
 *   provider 'credentials' (has password_hash) -> email/password login works as-is
 *   provider 'google'      (no password_hash)  -> created without a password;
 *                                                 Google OAuth links by email on
 *                                                 first login (verify separately)
 *
 * Idempotent: skips any user whose id already exists in auth.users.
 *
 * Usage:
 *   node scripts/supabase/migrate-auth.js --dry-run            # preview all
 *   node scripts/supabase/migrate-auth.js --email=foo@bar.com  # ONE user (test first!)
 *   node scripts/supabase/migrate-auth.js --email=foo@bar.com  # then real run
 *   node scripts/supabase/migrate-auth.js                      # all users
 *
 * REQUIRES SUPABASE_SERVICE_ROLE_KEY to be the real secret (sb_secret_… /
 * service_role JWT). A publishable key is rejected by the Auth admin API.
 */

const { getSupabase } = require('./_lib');

function parseArgs(argv) {
  const args = { dryRun: false, email: null, limit: null };
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') args.dryRun = true;
    else if (a.startsWith('--email=')) args.email = a.slice('--email='.length).toLowerCase();
    else if (a.startsWith('--limit=')) args.limit = parseInt(a.slice('--limit='.length), 10);
  }
  return args;
}

function assertSecretKey() {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (k.startsWith('sb_publishable_') || (!k.startsWith('sb_secret_') && !k.startsWith('eyJ'))) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not a service-role secret.');
    console.error('   The Auth admin API needs the secret key (sb_secret_… or the legacy service_role JWT).');
    console.error('   Dashboard → Project Settings → API Keys → reveal the SECRET key.');
    process.exit(1);
  }
}

async function authUserExists(supabase, id) {
  // getUserById returns { data: { user }, error }; error when not found.
  const { data, error } = await supabase.auth.admin.getUserById(id);
  if (error) return false;
  return !!data?.user;
}

async function main() {
  const args = parseArgs(process.argv);
  assertSecretKey();
  const supabase = getSupabase();

  let q = supabase
    .from('users')
    .select('id, email, name, role, provider, email_verified, password_hash, image')
    .order('created_at', { ascending: true });
  if (args.email) q = q.eq('email', args.email);
  if (args.limit) q = q.limit(args.limit);

  const { data: users, error } = await q;
  if (error) { console.error('❌ Failed to read public.users:', error.message); process.exit(1); }

  console.log(`\n🔐 Auth import — ${users.length} user(s)${args.email ? ` (filtered: ${args.email})` : ''}${args.dryRun ? '  [DRY RUN]' : ''}\n`);

  let created = 0, skipped = 0, failed = 0, noHash = 0;

  for (const u of users) {
    const isGoogle = (u.provider || '').toLowerCase() === 'google';
    const hasHash = !!u.password_hash;
    const tag = `${u.email.padEnd(34)} [${(u.provider || 'credentials').padEnd(11)}]`;

    if (await authUserExists(supabase, u.id)) {
      console.log(`  ⏭  ${tag} already in auth.users — skip`);
      skipped++;
      continue;
    }

    if (!isGoogle && !hasHash) {
      console.log(`  ⚠  ${tag} no password_hash and not google — will create passwordless (login needs reset)`);
      noHash++;
    }

    if (args.dryRun) {
      console.log(`  ●  ${tag} would create ${hasHash ? 'with bcrypt hash' : isGoogle ? '(google, no pw)' : '(no pw)'}`);
      continue;
    }

    const attrs = {
      id: u.id,
      email: u.email,
      email_confirm: true, // pre-existing real users — confirm so they aren't locked out
      user_metadata: { name: u.name || null, image: u.image || null },
      app_metadata: isGoogle
        ? { provider: 'google', providers: ['google'] }
        : { provider: 'email', providers: ['email'] },
    };
    if (hasHash) attrs.password_hash = u.password_hash;

    const { error: cErr } = await supabase.auth.admin.createUser(attrs);
    if (cErr) {
      console.log(`  ✗  ${tag} FAILED: ${cErr.message}`);
      failed++;
    } else {
      console.log(`  ✓  ${tag} created${hasHash ? ' (bcrypt)' : isGoogle ? ' (google)' : ''}`);
      created++;
    }
  }

  console.log(`\n── summary ──`);
  console.log(`  created: ${created}`);
  console.log(`  skipped (already existed): ${skipped}`);
  console.log(`  passwordless (no hash, non-google): ${noHash}`);
  console.log(`  failed: ${failed}`);
  if (args.dryRun) console.log(`  (dry run — nothing written)`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
