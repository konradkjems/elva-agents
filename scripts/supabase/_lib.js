/**
 * Shared helpers for the MongoDB → Supabase data migration scripts.
 *
 * CommonJS (run with `node scripts/supabase/<name>.js`). Reads .env.local like
 * the other operational scripts in /scripts.
 *
 * Strategy: bounded parent entities (organizations, users, widgets, demos) are
 * inserted first; their legacy_id → uuid map is captured from the INSERT ...
 * RETURNING so children can resolve FKs at transform time. No `pg` dependency —
 * everything goes through the Supabase service-role client.
 */

// Load env like Next.js does: .env.local takes precedence over .env.
// dotenv won't override already-set vars, so load .env.local first.
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');

const MONGODB_URI = process.env.MONGODB_URI;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'elva-agents';

function assertEnv() {
  const missing = [];
  if (!MONGODB_URI) missing.push('MONGODB_URI');
  if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length) {
    console.error('❌ Missing env vars:', missing.join(', '));
    process.exit(1);
  }
}

async function getMongo() {
  assertEnv();
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return { client, db: client.db(MONGO_DB_NAME) };
}

function getSupabase() {
  assertEnv();
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Render a Mongo _id (ObjectId or custom string) as a stable string key. */
function legacyKey(id) {
  if (id === null || id === undefined) return null;
  // ObjectId has a toHexString(); strings/numbers fall through to String().
  if (typeof id === 'object' && typeof id.toHexString === 'function') {
    return id.toHexString();
  }
  return String(id);
}

/** Convert a Mongo value to a JS Date or null (handles Date, $date, string). */
function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * NOT-NULL timestamp columns (created_at/updated_at/timestamp) must never be
 * explicit null — some Mongo docs lack updatedAt/createdAt. Fall back across
 * each other, then to now(), so the row inserts with sensible values.
 */
function normalizeTimestamps(row) {
  const now = new Date();
  if ('created_at' in row || 'updated_at' in row) {
    const c = row.created_at || null;
    const u = row.updated_at || null;
    if ('created_at' in row) row.created_at = c || u || now;
    if ('updated_at' in row) row.updated_at = u || c || now;
  }
  if ('timestamp' in row && row.timestamp == null) {
    row.timestamp = row.created_at || now;
  }
  return row;
}

/**
 * Upsert rows into a table in batches (idempotent on legacy_id) and return a
 * Map of legacy_id → generated uuid. Each row MUST include `legacy_id`.
 */
async function upsertMapped(supabase, table, rows, { batchSize = 500 } = {}) {
  const map = new Map();
  if (!rows.length) return map;

  rows.forEach(normalizeTimestamps);

  for (const batch of chunk(rows, batchSize)) {
    const { data, error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: 'legacy_id' })
      .select('id, legacy_id');

    if (error) {
      console.error(`❌ Upsert into ${table} failed:`, error.message);
      throw error;
    }
    for (const r of data) map.set(r.legacy_id, r.id);
  }

  console.log(`   ✅ ${table}: ${map.size} rows`);
  return map;
}

/** Resolve a legacy reference through a map, returning null when absent. */
function ref(map, id) {
  const key = legacyKey(id);
  if (key === null) return null;
  return map.get(key) || null;
}

module.exports = {
  getMongo,
  getSupabase,
  legacyKey,
  toDate,
  chunk,
  upsertMapped,
  normalizeTimestamps,
  ref,
  MONGO_DB_NAME,
};
