import { admin } from '../../../lib/supabase/admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the base URL dynamically from request headers
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    // Find all demo widgets with localhost URLs in widgets table
    const { data: widgetRows, error: widgetErr } = await admin
      .from('widgets')
      .select('*')
      .eq('is_demo_mode', true);
    if (widgetErr) throw widgetErr;
    const demoWidgets = (widgetRows || []).filter(
      w => w.demo_settings?.demoUrl && w.demo_settings.demoUrl.includes('localhost')
    );

    // Find all demos with localhost URLs in demos table
    const { data: demoRows, error: demoErr } = await admin
      .from('demos')
      .select('*');
    if (demoErr) throw demoErr;
    const demos = (demoRows || []).filter(
      d => d.demo_settings?.demoUrl && d.demo_settings.demoUrl.includes('localhost')
    );

    console.log(`Found ${demoWidgets.length} demo widgets and ${demos.length} demos with localhost URLs`);

    // Update each demo widget (mutate the JSONB demo_settings and write it back)
    const widgetUpdatePromises = demoWidgets.map(widget => {
      const publicId = widget.legacy_id || widget.id;
      widget.demo_settings.demoUrl = `${baseUrl}/demo/${publicId}`;

      return admin
        .from('widgets')
        .update({ demo_settings: widget.demo_settings })
        .eq('id', widget.id);
    });

    // Update each demo
    const demoUpdatePromises = demos.map(demo => {
      const publicId = demo.legacy_id || demo.id;
      demo.demo_settings.demoUrl = `${baseUrl}/demo/${publicId}`;

      return admin
        .from('demos')
        .update({ demo_settings: demo.demo_settings })
        .eq('id', demo.id);
    });

    await Promise.all([...widgetUpdatePromises, ...demoUpdatePromises]);

    const totalUpdated = demoWidgets.length + demos.length;
    console.log(`Updated ${totalUpdated} demo URLs to use base URL: ${baseUrl}`);

    return res.status(200).json({
      message: `Successfully updated ${totalUpdated} demo URLs`,
      baseUrl: baseUrl,
      widgetsUpdated: demoWidgets.length,
      demosUpdated: demos.length,
      totalUpdated: totalUpdated
    });

  } catch (error) {
    console.error('Error updating demo URLs:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}
