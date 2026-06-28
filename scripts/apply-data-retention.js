/**
 * Apply Data Retention Policies
 *
 * Scheduled job to delete/anonymize conversations based on per-widget retention
 * settings. GDPR Article 5(1)(e) - Storage Limitation.
 *
 * Postgres/Supabase version. Retention settings live in the widget's `advanced`
 * JSONB (advanced.dataRetention.{conversationDays,anonymizeAfterDays}); both
 * default to 30 / 90 days when unset.
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

async function applyDataRetentionPolicies() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { success: false, error: 'Supabase env not set' };
  }

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    console.log('⏰ Applying data retention policies...', new Date().toISOString());

    const { data: widgets, error: wErr } = await admin
      .from('widgets')
      .select('id, name, advanced');
    if (wErr) throw wErr;

    console.log(`📋 Found ${widgets.length} widgets to process`);

    let totalDeleted = 0;
    let totalAnonymized = 0;

    for (const widget of widgets) {
      const retention = widget.advanced?.dataRetention || {};
      const conversationDays = retention.conversationDays || 30;
      const anonymizeAfterDays = retention.anonymizeAfterDays || 90;

      const deleteCutoff = new Date();
      deleteCutoff.setDate(deleteCutoff.getDate() - conversationDays);
      const anonymizeCutoff = new Date();
      anonymizeCutoff.setDate(anonymizeCutoff.getDate() - anonymizeAfterDays);

      // Delete old conversations (widget_id is the uuid FK).
      const { count: deletedCount, error: delErr } = await admin
        .from('conversations')
        .delete({ count: 'exact' })
        .eq('widget_id', widget.id)
        .lt('created_at', deleteCutoff.toISOString());
      if (delErr) throw delErr;
      if (deletedCount) {
        console.log(`   🗑️  ${widget.name}: deleted ${deletedCount} conversations > ${conversationDays}d`);
        totalDeleted += deletedCount;
      }

      // Anonymize very old conversations still present (strip message content,
      // keep the row for statistics). Fetch candidates, skip already-anonymized.
      const { data: toAnon } = await admin
        .from('conversations')
        .select('id, metadata')
        .eq('widget_id', widget.id)
        .lt('created_at', anonymizeCutoff.toISOString());

      let anonymizedCount = 0;
      for (const conv of (toAnon || [])) {
        if (conv.metadata?.anonymized) continue;
        const { userAgent, referrer, ...restMeta } = conv.metadata || {};
        const { error: upErr } = await admin
          .from('conversations')
          .update({
            messages: [],
            message_count: 0,
            user_id: 'anonymized',
            metadata: { ...restMeta, anonymized: true, anonymizedAt: new Date().toISOString() },
          })
          .eq('id', conv.id);
        if (!upErr) anonymizedCount++;
      }
      if (anonymizedCount) {
        console.log(`   🔒 ${widget.name}: anonymized ${anonymizedCount} conversations > ${anonymizeAfterDays}d`);
        totalAnonymized += anonymizedCount;
      }

      await admin.from('audit_log').insert({
        action: 'data_retention_applied',
        metadata: {
          widgetId: widget.id,
          widgetName: widget.name,
          retentionDays: conversationDays,
          conversationsDeleted: deletedCount || 0,
          conversationsAnonymized: anonymizedCount,
        },
      });
    }

    console.log('\n📊 Retention Summary:');
    console.log(`   Deleted: ${totalDeleted} | Anonymized: ${totalAnonymized} | Widgets: ${widgets.length}`);

    return { success: true, deleted: totalDeleted, anonymized: totalAnonymized, widgetsProcessed: widgets.length };
  } catch (error) {
    console.error('❌ Error applying retention policies:', error);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  applyDataRetentionPolicies().then((result) => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { applyDataRetentionPolicies };
