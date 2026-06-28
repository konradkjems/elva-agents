import { admin } from '../../../../lib/supabase/admin';
import { fromRow, toSnake } from '../../../../lib/supabase/transform';
import { deleteFromStorage, deleteByPublicUrl } from '../../../../lib/supabase/storage';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Demo widgets live in the widgets table (is_demo_mode = true). The demoId in
// the URL is the widget's custom string legacy_id; fall back to the uuid id.
async function findDemoWidgetRow(demoId) {
  let { data } = await admin
    .from('widgets')
    .select('*')
    .eq('legacy_id', demoId)
    .eq('is_demo_mode', true)
    .maybeSingle();
  if (!data && UUID_RE.test(demoId)) {
    ({ data } = await admin
      .from('widgets')
      .select('*')
      .eq('id', demoId)
      .eq('is_demo_mode', true)
      .maybeSingle());
  }
  return data || null;
}

function serializeDemo(row) {
  const demo = fromRow(row);
  if (demo && demo.legacyId) demo._id = demo.legacyId;
  return demo;
}

export default async function handler(req, res) {
  const { demoId } = req.query;

  if (!demoId) {
    return res.status(400).json({ message: 'Demo ID is required' });
  }

  try {
    if (req.method === 'GET') {
      // Get demo widget
      const demo = await findDemoWidgetRow(demoId);

      if (!demo) {
        return res.status(404).json({ message: 'Demo widget not found' });
      }

      return res.status(200).json(serializeDemo(demo));
    }

    if (req.method === 'PUT') {
      // Update demo widget
      const demo = await findDemoWidgetRow(demoId);
      if (!demo) {
        return res.status(404).json({ message: 'Demo widget not found' });
      }

      const patch = toSnake(req.body);
      // Remove fields that shouldn't be updated directly / are trigger-managed
      delete patch.id;
      delete patch.created_at;
      delete patch.updated_at;

      const { data, error } = await admin
        .from('widgets')
        .update(patch)
        .eq('id', demo.id)
        .eq('is_demo_mode', true)
        .select('id');
      if (error) throw error;

      return res.status(200).json({
        message: 'Demo widget updated successfully',
        modifiedCount: data ? data.length : 0
      });
    }

    if (req.method === 'DELETE') {
      // First, get the demo widget to check for screenshot
      const demo = await findDemoWidgetRow(demoId);

      if (!demo) {
        return res.status(404).json({ message: 'Demo widget not found' });
      }

      // Delete the demo screenshot from storage if it exists.
      try {
        if (demo.demo_settings?.screenshotPath) {
          await deleteFromStorage('demo-screenshots', demo.demo_settings.screenshotPath);
        } else if (demo.demo_settings?.screenshotUrl) {
          // Legacy rows store only a URL (Supabase URLs are deletable; Cloudinary
          // URLs are skipped).
          await deleteByPublicUrl(demo.demo_settings.screenshotUrl);
        }
      } catch (error) {
        console.error('Error deleting screenshot from storage:', error);
      }

      // Delete demo widget from database
      const { error } = await admin
        .from('widgets')
        .delete()
        .eq('id', demo.id)
        .eq('is_demo_mode', true);
      if (error) throw error;

      return res.status(200).json({
        message: 'Demo widget deleted successfully'
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Demo widget API error:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}
