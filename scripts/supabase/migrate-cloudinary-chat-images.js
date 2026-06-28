/**
 * Migrate the remaining historical CHAT images from Cloudinary to Supabase
 * Storage (the chat-uploads bucket), and rewrite the URLs in place inside
 * conversations.messages.
 *
 * Scope: chat images live as a pure-URL string at messages[i].imageUrl (verified
 * by a read-only scan — all hits are standalone URLs, never embedded in message
 * text). To avoid ever clobbering message text, this script ONLY rewrites values
 * that are BOTH a Cloudinary URL AND a "pure" URL (the whole string is one URL);
 * anything embedded in text is logged and skipped, not touched.
 *
 * Faithful 1:1: downloads the original bytes and re-uploads them as-is (no
 * resize / re-encode), preserving the original content-type — same approach as
 * scripts/supabase/migrate-storage-assets.js. Idempotent: only Cloudinary URLs
 * are collected, so a second run finds nothing.
 *
 *   node scripts/supabase/migrate-cloudinary-chat-images.js --dry-run
 *   node scripts/supabase/migrate-cloudinary-chat-images.js
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const DRY = process.argv.includes('--dry-run');
const BUCKET = 'chat-uploads';
const PAGE = 200;

const isCloudinary = (u) => typeof u === 'string' && /res\.cloudinary\.com|\/cloudinary/.test(u);
const isPureUrl = (s) => typeof s === 'string' && /^https?:\/\/\S+$/.test(s.trim()) && s.trim() === s;
const extFromType = (t) => ({
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
  'image/gif': 'gif', 'image/webp': 'webp',
}[t] || 'png');

// Deep-collect cloudinary string values; returns [{ pathArr, url, pure }].
function collect(obj, pathArr = [], out = []) {
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && isCloudinary(v)) {
      out.push({ pathArr: [...pathArr, k], url: v, pure: isPureUrl(v) });
    } else if (v && typeof v === 'object') {
      collect(v, [...pathArr, k], out);
    }
  }
  return out;
}

function setIn(obj, pathArr, value) {
  let o = obj;
  for (let i = 0; i < pathArr.length - 1; i++) o = o[pathArr[i]];
  o[pathArr[pathArr.length - 1]] = value;
}

async function migrateOne(admin, url, convId, idx) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`download ${resp.status}`);
  const contentType = resp.headers.get('content-type')?.split(';')[0] || 'image/png';
  const buf = Buffer.from(await resp.arrayBuffer());
  const path = `migrated/chat/${convId}/${Date.now()}-${idx}.${extFromType(contentType)}`;
  const { error } = await admin.storage.from(BUCKET).upload(path, buf, {
    contentType, upsert: true, cacheControl: '31536000',
  });
  if (error) throw error;
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error('❌ Supabase env missing'); process.exit(1); }
  const admin = createClient(url, key, { auth: { persistSession: false } });

  let from = 0, scanned = 0, migrated = 0, failed = 0, skippedEmbedded = 0;
  while (true) {
    const { data: rows, error } = await admin
      .from('conversations').select('id, messages').range(from, from + PAGE - 1);
    if (error) { console.error('query error:', error.message); process.exit(1); }
    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      scanned++;
      if (!row.messages) continue;
      const hits = collect(row.messages, ['messages']);
      if (!hits.length) continue;

      console.log(`\n💬 conversation ${row.id}: ${hits.length} cloudinary URL(s)`);
      const next = JSON.parse(JSON.stringify(row.messages));
      let changed = false;
      for (let i = 0; i < hits.length; i++) {
        const h = hits[i];
        if (!h.pure) {
          skippedEmbedded++;
          console.log(`   ⏭  SKIP (embedded in text, not touched) ${h.pathArr.join('.')}`);
          continue;
        }
        try {
          if (DRY) { console.log(`   ● would migrate ${h.pathArr.join('.')}`); continue; }
          const newUrl = await migrateOne(admin, h.url, row.id, i);
          setIn(next, h.pathArr.slice(1), newUrl); // drop leading 'messages'
          changed = true; migrated++;
          console.log(`   ✓ ${h.pathArr.join('.')} -> ${newUrl}`);
        } catch (e) { failed++; console.log(`   ✗ ${h.pathArr.join('.')}: ${e.message}`); }
      }
      if (changed && !DRY) {
        const { error: upErr } = await admin.from('conversations').update({ messages: next }).eq('id', row.id);
        if (upErr) console.log(`   ⚠ db update failed: ${upErr.message}`);
      }
    }
    from += PAGE;
  }

  console.log(`\n── ${DRY ? 'DRY RUN ' : ''}summary ──`);
  console.log(`  conversations scanned : ${scanned}`);
  console.log(`  images migrated       : ${migrated}`);
  console.log(`  failed                : ${failed}`);
  console.log(`  skipped (embedded)    : ${skippedEmbedded}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
