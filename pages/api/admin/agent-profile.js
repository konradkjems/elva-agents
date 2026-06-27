import { admin } from '../../../lib/supabase/admin';
import { getSessionContext } from '../../../lib/supabase/session';
export default async function handler(req, res) {
  const session = await getSessionContext(req, res);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get user
    const { data: user } = await admin
      .from('users')
      .select('id, agent_profile')
      .eq('email', session.user.email)
      .maybeSingle();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.method === 'GET') {
      // Return agent profile
      const agentProfile = user.agent_profile || {
        displayName: null,
        title: null,
        avatarUrl: null,
        isAvailable: false,
        currentActiveChats: []
      };

      return res.status(200).json({
        success: true,
        agentProfile
      });
    }

    if (req.method === 'PUT') {
      const { displayName, title, avatarUrl, isAvailable } = req.body;

      // Merge into the existing agent_profile JSONB. Only overwrite fields when
      // a truthy value is provided (matches the legacy behaviour of removing
      // null values from the update), but always set availability.
      const newProfile = { ...(user.agent_profile || {}) };

      if (displayName) newProfile.displayName = displayName;
      if (title) newProfile.title = title;
      if (avatarUrl) newProfile.avatarUrl = avatarUrl;
      newProfile.isAvailable = isAvailable !== undefined ? isAvailable : false;

      const { error: updErr } = await admin
        .from('users')
        .update({ agent_profile: newProfile })
        .eq('id', user.id);
      if (updErr) throw updErr;

      return res.status(200).json({
        success: true,
        message: 'Agent profile updated successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Error managing agent profile:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
