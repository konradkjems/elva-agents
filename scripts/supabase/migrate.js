/**
 * MongoDB → Supabase data migration (Phase 1).
 *
 * Migrates all collections preserving original ids in `legacy_id`, generating
 * fresh UUIDs, and resolving FK relationships. Idempotent: re-running upserts
 * on legacy_id rather than duplicating.
 *
 * Usage:
 *   node scripts/supabase/migrate.js            # migrate everything, in order
 *
 * Requires: MONGODB_URI, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * (in .env.local). The Postgres schema (supabase/migrations) must be applied
 * first.
 */

const { getMongo, getSupabase, legacyKey, toDate, upsertMapped, ref, chunk } = require('./_lib');

async function main() {
  const { client, db } = await getMongo();
  const supabase = getSupabase();
  console.log('🔄 Starting MongoDB → Supabase migration\n');

  try {
    // ───────────────────────────────────────────── organizations (owner later)
    console.log('📦 organizations');
    const orgs = await db.collection('organizations').find({}).toArray();
    const orgMap = await upsertMapped(supabase, 'organizations',
      orgs.map((o) => ({
        legacy_id: legacyKey(o._id),
        name: o.name,
        slug: o.slug,
        owner_id: null, // resolved after users
        plan: o.plan || 'free',
        limits: o.limits || {},
        usage: o.usage || {},
        subscription_status: o.subscriptionStatus || null,
        subscription_id: o.subscriptionId || null,
        trial_ends_at: toDate(o.trialEndsAt),
        billing_email: o.billingEmail || null,
        settings: o.settings || {},
        logo: o.logo || null,
        primary_color: o.primaryColor || null,
        domain: o.domain || null,
        created_at: toDate(o.createdAt),
        updated_at: toDate(o.updatedAt),
        deleted_at: toDate(o.deletedAt),
      })));

    // ───────────────────────────────────────────────────────────────── users
    console.log('📦 users');
    const users = await db.collection('users').find({}).toArray();
    const userMap = await upsertMapped(supabase, 'users',
      users.map((u) => ({
        legacy_id: legacyKey(u._id),
        email: (u.email || '').toLowerCase(),
        name: u.name || null,
        password_hash: u.password || null,
        role: u.role || 'member',
        platform_role: u.platformRole || null,
        status: u.status || 'active',
        provider: u.provider || null,
        email_verified: !!u.emailVerified,
        image: u.image || null,
        preferences: u.preferences || {},
        agent_profile: u.agentProfile || null,
        current_organization_id: ref(orgMap, u.currentOrganizationId),
        last_login: toDate(u.lastLogin),
        deletion_scheduled_at: toDate(u.deletionScheduledAt),
        deletion_date: toDate(u.deletionDate),
        deletion_reason: u.deletionReason || null,
        created_at: toDate(u.createdAt),
        updated_at: toDate(u.updatedAt),
      })));

    // ────────────────────────────────────── close circular FK: org.owner_id
    console.log('📦 organizations.owner_id');
    let ownerUpdates = 0;
    for (const o of orgs) {
      const orgId = ref(orgMap, o._id);
      const ownerId = ref(userMap, o.ownerId);
      if (orgId && ownerId) {
        const { error } = await supabase.from('organizations')
          .update({ owner_id: ownerId }).eq('id', orgId);
        if (error) throw error;
        ownerUpdates++;
      }
    }
    console.log(`   ✅ owner_id set on ${ownerUpdates} organizations`);

    // ─────────────────────────────────────────────────────────── team_members
    console.log('📦 team_members');
    const teamMembers = await db.collection('team_members').find({}).toArray();
    await upsertMapped(supabase, 'team_members',
      teamMembers.map((t) => ({
        legacy_id: legacyKey(t._id),
        organization_id: ref(orgMap, t.organizationId),
        user_id: ref(userMap, t.userId),
        role: t.role,
        permissions: t.permissions || {},
        status: t.status || 'active',
        invited_by: ref(userMap, t.invitedBy),
        invited_at: toDate(t.invitedAt),
        joined_at: toDate(t.joinedAt),
        created_at: toDate(t.createdAt),
        updated_at: toDate(t.updatedAt),
      })).filter((r) => r.organization_id && r.user_id));

    // ─────────────────────────────────────────────────────────────── widgets
    console.log('📦 widgets');
    const widgets = await db.collection('widgets').find({}).toArray();
    const widgetMap = await upsertMapped(supabase, 'widgets',
      widgets.map((w) => ({
        legacy_id: legacyKey(w._id),
        organization_id: ref(orgMap, w.organizationId),
        name: w.name || null,
        description: w.description || null,
        status: w.status || 'active',
        is_demo_mode: !!w.isDemoMode,
        openai: w.openai || {},
        appearance: w.appearance || {},
        messages: w.messages || {},
        branding: w.branding || {},
        advanced: w.advanced || {},
        analytics: w.analytics || {},
        prompt: typeof w.prompt === 'string' ? w.prompt : null,
        theme: w.theme || null,
        created_by: ref(userMap, w.createdBy),
        last_edited_by: ref(userMap, w.lastEditedBy),
        last_edited_at: toDate(w.lastEditedAt),
        created_at: toDate(w.createdAt),
        updated_at: toDate(w.updatedAt),
      })));

    // ───────────────────────────────────────────────────────── conversations
    // Large collection — stream in batches. widget_id resolves from widgetMap
    // by the string form of the stored widgetId.
    console.log('📦 conversations');
    await migrateConversations(db, supabase, orgMap, widgetMap);

    // ───────────────────────────────────────────────────────────────── demos
    console.log('📦 demos');
    const demos = await db.collection('demos').find({}).toArray();
    await upsertMapped(supabase, 'demos',
      demos.map((d) => ({
        legacy_id: legacyKey(d._id),
        name: d.name || null,
        description: d.description || null,
        source_widget_id: d.sourceWidgetId ? legacyKey(d.sourceWidgetId) : null,
        source_widget_name: d.sourceWidgetName || null,
        organization_id: ref(orgMap, d.organizationId),
        created_by: ref(userMap, d.createdBy),
        target_client: d.targetClient || {},
        demo_settings: d.demoSettings || {},
        status: d.status || 'active',
        converted_to_organization_id: ref(orgMap, d.convertedToOrganizationId),
        created_at: toDate(d.createdAt),
        updated_at: toDate(d.updatedAt),
      })));

    // ───────────────────────────────────────────────────────────── invitations
    console.log('📦 invitations');
    const invitations = await db.collection('invitations').find({}).toArray();
    await upsertMapped(supabase, 'invitations',
      invitations.map((i) => ({
        legacy_id: legacyKey(i._id),
        organization_id: ref(orgMap, i.organizationId),
        email: (i.email || '').toLowerCase(),
        invited_by: ref(userMap, i.invitedBy),
        role: i.role,
        token: i.token,
        status: i.status || 'pending',
        expires_at: toDate(i.expiresAt),
        accepted_at: toDate(i.acceptedAt),
        accepted_by: ref(userMap, i.acceptedBy),
        created_at: toDate(i.createdAt),
        updated_at: toDate(i.updatedAt),
      })).filter((r) => r.organization_id && r.token && r.expires_at));

    // ───────────────────────────────────────────────────────── support_requests
    console.log('📦 support_requests');
    const supportRequests = await db.collection('support_requests').find({}).toArray();
    // conversation_id needs resolution; build a targeted map for the referenced ids.
    const convLegacyIds = [...new Set(supportRequests.map((s) => legacyKey(s.conversationId)).filter(Boolean))];
    const convRefMap = await lookupLegacyIds(supabase, 'conversations', convLegacyIds);
    await upsertMapped(supabase, 'support_requests',
      supportRequests.map((s) => ({
        legacy_id: legacyKey(s._id),
        widget_id: ref(widgetMap, s.widgetId),
        organization_id: ref(orgMap, s.organizationId),
        conversation_id: convRefMap.get(legacyKey(s.conversationId)) || null,
        contact_info: s.contactInfo || {},
        message: s.message || null,
        status: s.status || 'pending',
        submitted_at: toDate(s.submittedAt),
        created_at: toDate(s.createdAt),
        updated_at: toDate(s.updatedAt),
      })));

    // ───────────────────────────────────────────────────────────────── audit_log
    console.log('📦 audit_log');
    const auditLogs = await db.collection('audit_log').find({}).toArray();
    await upsertMapped(supabase, 'audit_log',
      auditLogs.map((a) => ({
        legacy_id: legacyKey(a._id),
        action: a.action || 'unknown',
        user_id: ref(userMap, a.userId),
        organization_id: ref(orgMap, a.organizationId),
        performed_by: ref(userMap, a.performedBy),
        metadata: a.metadata || a.details || {},
        timestamp: toDate(a.timestamp) || toDate(a.createdAt),
      })));

    // ───────────────────────────────────────────────────────────────── analytics
    // agentId is a STRING widget id → resolve via widgetMap.
    console.log('📦 analytics');
    const analytics = await db.collection('analytics').find({}).toArray();
    await upsertMapped(supabase, 'analytics',
      analytics.map((a) => ({
        legacy_id: legacyKey(a._id),
        widget_id: ref(widgetMap, a.agentId),
        date: toDate(a.date),
        metrics: a.metrics || {},
        hourly: a.hourly || {},
        session_ids: a.sessionIds || [],
        created_at: toDate(a.createdAt),
        updated_at: toDate(a.updatedAt),
      })).filter((r) => r.widget_id && r.date));

    // ─────────────────────────────────────────────────────── satisfaction_analytics
    // widgetId is an ObjectId → resolve via widgetMap.
    console.log('📦 satisfaction_analytics');
    const satisfaction = await db.collection('satisfaction_analytics').find({}).toArray();
    await upsertMapped(supabase, 'satisfaction_analytics',
      satisfaction.map((s) => ({
        legacy_id: legacyKey(s._id),
        widget_id: ref(widgetMap, s.widgetId),
        date: toDate(s.date),
        ratings: s.ratings || {},
        trends: s.trends || {},
        created_at: toDate(s.createdAt),
        updated_at: toDate(s.updatedAt),
      })).filter((r) => r.widget_id && r.date));

    // ───────────────────────────────────────────────────────────── app_settings
    console.log('📦 app_settings');
    const settingsDocs = await db.collection('settings').find({}).toArray();
    if (settingsDocs.length) {
      const { _id, ...data } = settingsDocs[0];
      const { error } = await supabase.from('app_settings')
        .upsert({ id: 1, data }, { onConflict: 'id' });
      if (error) throw error;
      console.log('   ✅ app_settings: 1 row');
    } else {
      console.log('   ℹ️  no settings doc');
    }

    console.log('\n✨ Migration complete. Run verify-migration.js to check counts.');
  } finally {
    await client.close();
  }
}

/** Insert conversations in batches, resolving widget_id from widgetMap. */
async function migrateConversations(db, supabase, orgMap, widgetMap) {
  const cursor = db.collection('conversations').find({});
  let batch = [];
  let total = 0;
  const flush = async () => {
    if (!batch.length) return;
    const { error } = await supabase.from('conversations')
      .upsert(batch, { onConflict: 'legacy_id' });
    if (error) throw error;
    total += batch.length;
    process.stdout.write(`\r   …conversations: ${total}`);
    batch = [];
  };

  while (await cursor.hasNext()) {
    const c = await cursor.next();
    batch.push({
      legacy_id: legacyKey(c._id),
      widget_id: ref(widgetMap, c.widgetId),
      widget_legacy_id: c.widgetId != null ? legacyKey(c.widgetId) : null,
      organization_id: ref(orgMap, c.organizationId),
      session_id: c.sessionId || null,
      user_id: c.userId != null ? String(c.userId) : null,
      start_time: toDate(c.startTime),
      end_time: toDate(c.endTime),
      message_count: c.messageCount || (Array.isArray(c.messages) ? c.messages.length : 0),
      messages: c.messages || [],
      satisfaction: c.satisfaction || null,
      tags: c.tags || [],
      metadata: c.metadata || {},
      openai: c.openai || {},
      last_response_id: (c.openai && c.openai.lastResponseId) || null,
      live_chat: c.liveChat || null,
      created_at: toDate(c.createdAt),
      updated_at: toDate(c.updatedAt),
    });
    if (batch.length >= 500) await flush();
  }
  await flush();
  process.stdout.write(`\r   ✅ conversations: ${total}\n`);
}

/** Build a legacy_id → uuid map for specific legacy ids in a table. */
async function lookupLegacyIds(supabase, table, legacyIds) {
  const map = new Map();
  if (!legacyIds.length) return map;
  for (const part of chunk(legacyIds, 500)) {
    const { data, error } = await supabase.from(table)
      .select('id, legacy_id').in('legacy_id', part);
    if (error) throw error;
    for (const r of data) map.set(r.legacy_id, r.id);
  }
  return map;
}

main().catch((err) => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
