/**
 * Configure the Google OAuth provider on the Supabase project via the
 * Management API, using GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET from the env.
 *
 * Needs a Supabase Personal Access Token (https://supabase.com/dashboard/account/tokens)
 * exported as SUPABASE_ACCESS_TOKEN — the service-role key does NOT work for the
 * Management API.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/supabase/setup-google-oauth.js
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/supabase/setup-google-oauth.js --site-url=https://app.example.com
 *
 * It also adds localhost dev URLs (+ optional --site-url) to the redirect
 * allow-list so signInWithOAuth({ redirectTo }) is accepted.
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

async function main() {
  const PAT = process.env.SUPABASE_ACCESS_TOKEN;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const ref = url.match(/https:\/\/([a-z0-9]+)\.supabase/)?.[1];
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  const siteUrl = arg('site-url');

  const missing = [];
  if (!PAT) missing.push('SUPABASE_ACCESS_TOKEN (Supabase personal access token, sbp_…)');
  if (!ref) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!clientId) missing.push('GOOGLE_CLIENT_ID');
  if (!secret) missing.push('GOOGLE_CLIENT_SECRET');
  if (missing.length) {
    console.error('❌ Missing:\n  - ' + missing.join('\n  - '));
    process.exit(1);
  }

  const base = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
  const headers = { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' };

  // Merge: read current allow-list so we don't clobber existing entries.
  const current = await fetch(base, { headers }).then((r) => r.json()).catch(() => ({}));
  const existing = (current.uri_allow_list || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const devUrls = [
    'http://localhost:3000/**',
    'http://localhost:3100/**',
  ];
  if (siteUrl) devUrls.push(`${siteUrl.replace(/\/$/, '')}/**`);
  const allow = [...new Set([...existing, ...devUrls])].join(',');

  const body = {
    external_google_enabled: true,
    external_google_client_id: clientId,
    external_google_secret: secret,
    uri_allow_list: allow,
  };
  if (siteUrl) body.site_url = siteUrl;

  const res = await fetch(base, { method: 'PATCH', headers, body: JSON.stringify(body) });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`❌ Management API ${res.status}:`, JSON.stringify(out));
    process.exit(1);
  }

  console.log('✅ Google provider configured on project', ref);
  console.log('   external_google_enabled:', out.external_google_enabled);
  console.log('   client id:', (out.external_google_client_id || '').slice(0, 18) + '…');
  console.log('   uri_allow_list:', out.uri_allow_list);
  console.log('\n👉 In Google Cloud Console, add this Authorized redirect URI to the OAuth client:');
  console.log(`   ${url}/auth/v1/callback`);
}

main().catch((e) => { console.error(e); process.exit(1); });
