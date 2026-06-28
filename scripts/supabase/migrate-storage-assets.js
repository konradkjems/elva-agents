/**
 * Migrate bounded assets from Cloudinary to Supabase Storage.
 *
 * Walks widgets (branding + appearance JSONB) and users (agent_profile JSONB),
 * downloads every Cloudinary image URL, re-uploads it to the matching public
 * bucket, and rewrites the URL in place. Historical CHAT images embedded in
 * conversation messages are intentionally left on Cloudinary (absolute URLs
 * that still resolve) — migrate those in bulk separately if/when retiring the
 * Cloudinary account.
 *
 *   node scripts/supabase/migrate-storage-assets.js --dry-run
 *   node scripts/supabase/migrate-storage-assets.js
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const DRY = process.argv.includes('--dry-run');
const isCloudinary = (u) => typeof u === 'string' && /res\.cloudinary\.com|\/cloudinary/.test(u);
const extFromType = (t) => ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' }[t] || 'bin');

// Deep-collect cloudinary URLs in an object; returns list of {pathArr, url}.
function collect(obj, pathArr = [], out = []) {
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && isCloudinary(v)) out.push({ pathArr: [...pathArr, k], url: v });
    else if (v && typeof v === 'object') collect(v, [...pathArr, k], out);
  }
  return out;
}
function setIn(obj, pathArr, value) {
  let o = obj;
  for (let i = 0; i < pathArr.length - 1; i++) o = o[pathArr[i]];
  o[pathArr[pathArr.length - 1]] = value;
}

async function migrateOne(admin, bucket, keyPrefix, url, idx) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`download ${resp.status}`);
  const contentType = resp.headers.get('content-type')?.split(';')[0] || 'image/png';
  const buf = Buffer.from(await resp.arrayBuffer());
  const path = `migrated/${keyPrefix}/${Date.now()}-${idx}.${extFromType(contentType)}`;
  const { error } = await admin.storage.from(bucket).upload(path, buf, { contentType, upsert: true, cacheControl: '31536000' });
  if (error) throw error;
  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error('❌ Supabase env missing'); process.exit(1); }
  const admin = createClient(url, key, { auth: { persistSession: false } });

  let migrated = 0, failed = 0;

  // Widgets: branding + appearance -> widget-assets
  const { data: widgets } = await admin.from('widgets').select('id, name, branding, appearance');
  for (const w of (widgets || [])) {
    const branding = w.branding || {};
    const appearance = w.appearance || {};
    const hits = [...collect(branding, ['branding']), ...collect(appearance, ['appearance'])];
    if (!hits.length) continue;
    console.log(`\n🧩 widget ${w.name} (${w.id}): ${hits.length} asset(s)`);
    const nextBranding = JSON.parse(JSON.stringify(branding));
    const nextAppearance = JSON.parse(JSON.stringify(appearance));
    let changed = false;
    for (let i = 0; i < hits.length; i++) {
      const h = hits[i];
      try {
        if (DRY) { console.log(`   ● would migrate ${h.pathArr.join('.')}`); continue; }
        const newUrl = await migrateOne(admin, 'widget-assets', w.id, h.url, i);
        const target = h.pathArr[0] === 'branding' ? nextBranding : nextAppearance;
        setIn(target, h.pathArr.slice(1), newUrl);
        changed = true; migrated++;
        console.log(`   ✓ ${h.pathArr.join('.')} -> ${newUrl}`);
      } catch (e) { failed++; console.log(`   ✗ ${h.pathArr.join('.')}: ${e.message}`); }
    }
    if (changed && !DRY) {
      const { error } = await admin.from('widgets').update({ branding: nextBranding, appearance: nextAppearance }).eq('id', w.id);
      if (error) console.log(`   ⚠ db update failed: ${error.message}`);
    }
  }

  // Users: agent_profile -> agent-avatars
  const { data: users } = await admin.from('users').select('id, email, agent_profile');
  for (const u of (users || [])) {
    const ap = u.agent_profile || {};
    const hits = collect(ap, ['agent_profile']);
    if (!hits.length) continue;
    console.log(`\n👤 user ${u.email}: ${hits.length} asset(s)`);
    const next = JSON.parse(JSON.stringify(ap));
    let changed = false;
    for (let i = 0; i < hits.length; i++) {
      const h = hits[i];
      try {
        if (DRY) { console.log(`   ● would migrate ${h.pathArr.join('.')}`); continue; }
        const newUrl = await migrateOne(admin, 'agent-avatars', u.id, h.url, i);
        setIn(next, h.pathArr.slice(1), newUrl);
        changed = true; migrated++;
        console.log(`   ✓ ${h.pathArr.join('.')} -> ${newUrl}`);
      } catch (e) { failed++; console.log(`   ✗ ${h.pathArr.join('.')}: ${e.message}`); }
    }
    if (changed && !DRY) {
      const { error } = await admin.from('users').update({ agent_profile: next }).eq('id', u.id);
      if (error) console.log(`   ⚠ db update failed: ${error.message}`);
    }
  }

  console.log(`\n── ${DRY ? 'DRY RUN ' : ''}summary ──`);
  console.log(`  migrated: ${migrated} | failed: ${failed}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
