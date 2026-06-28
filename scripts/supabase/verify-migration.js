/**
 * Verify the MongoDB → Supabase migration: compares document counts per
 * collection against row counts per table, plus a few FK-resolution spot
 * checks (orphaned references that failed to map).
 *
 * Usage: node scripts/supabase/verify-migration.js
 */

const { getMongo, getSupabase } = require('./_lib');

// Mongo collection → Postgres table
const PAIRS = [
  ['organizations', 'organizations'],
  ['users', 'users'],
  ['team_members', 'team_members'],
  ['widgets', 'widgets'],
  ['conversations', 'conversations'],
  ['demos', 'demos'],
  ['invitations', 'invitations'],
  ['support_requests', 'support_requests'],
  ['audit_log', 'audit_log'],
  ['analytics', 'analytics'],
  ['satisfaction_analytics', 'satisfaction_analytics'],
];

async function pgCount(supabase, table, filter) {
  let q = supabase.from(table).select('*', { count: 'exact', head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

async function main() {
  const { client, db } = await getMongo();
  const supabase = getSupabase();
  let mismatches = 0;

  try {
    console.log('🔍 Count comparison (Mongo → Postgres)\n');
    console.log('   collection'.padEnd(26), 'mongo'.padStart(8), 'pg'.padStart(8), '  status');
    console.log('   ' + '─'.repeat(54));

    for (const [coll, table] of PAIRS) {
      const mongoCount = await db.collection(coll).countDocuments();
      const pgRows = await pgCount(supabase, table);
      const ok = mongoCount === pgRows;
      if (!ok) mismatches++;
      console.log(
        '   ' + coll.padEnd(24),
        String(mongoCount).padStart(8),
        String(pgRows).padStart(8),
        ok ? '  ✅' : `  ⚠️  diff ${pgRows - mongoCount}`
      );
    }

    // ── FK spot checks: rows whose required reference failed to resolve ──────
    console.log('\n🔗 Orphaned-reference checks (should all be 0)\n');
    const checks = [
      ['widgets missing organization_id', 'widgets', (q) => q.is('organization_id', null)],
      ['conversations missing widget_id', 'conversations', (q) => q.is('widget_id', null)],
      ['team_members missing user_id', 'team_members', (q) => q.is('user_id', null)],
      ['analytics missing widget_id', 'analytics', (q) => q.is('widget_id', null)],
    ];
    for (const [label, table, filter] of checks) {
      const n = await pgCount(supabase, table, filter);
      console.log('   ' + label.padEnd(38), n === 0 ? '✅ 0' : `⚠️  ${n}`);
      if (n > 0) mismatches++;
    }

    console.log(
      mismatches === 0
        ? '\n✨ All checks passed.'
        : `\n⚠️  ${mismatches} check(s) need attention (some diffs may be expected, e.g. orphaned legacy data).`
    );
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
