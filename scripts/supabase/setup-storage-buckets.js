/**
 * Create the Supabase Storage buckets used by the app (idempotent).
 *
 * All buckets are PUBLIC so chat images are readable by OpenAI vision and the
 * widget renders avatars/logos by URL; tenant isolation is enforced app-side.
 *
 *   node scripts/supabase/setup-storage-buckets.js
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const BUCKETS = [
  { id: 'widget-assets',    opts: { public: true, fileSizeLimit: '10MB', allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf', 'text/plain'] } },
  { id: 'chat-uploads',     opts: { public: true, fileSizeLimit: '5MB',  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] } },
  { id: 'agent-avatars',    opts: { public: true, fileSizeLimit: '2MB',  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] } },
  { id: 'demo-screenshots', opts: { public: true, fileSizeLimit: '10MB', allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] } },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const { data: existing } = await admin.storage.listBuckets();
  const have = new Set((existing || []).map((b) => b.id));

  for (const b of BUCKETS) {
    if (have.has(b.id)) {
      // Keep settings in sync on re-run.
      const { error } = await admin.storage.updateBucket(b.id, b.opts);
      console.log(error ? `⚠ ${b.id}: ${error.message}` : `⏭  exists (updated): ${b.id}`);
      continue;
    }
    const { error } = await admin.storage.createBucket(b.id, b.opts);
    console.log(error ? `✗ ${b.id}: ${error.message}` : `✓ created: ${b.id} (public)`);
  }

  const { data: after } = await admin.storage.listBuckets();
  console.log('\nBuckets:', (after || []).map((b) => `${b.id}${b.public ? '(public)' : ''}`).join(', '));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
