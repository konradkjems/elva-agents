import { uploadToStorage, resizeImage, deleteByPublicUrl } from '../../../../lib/supabase/storage';
import { getSessionContext } from '../../../../lib/supabase/session';
import { admin } from '../../../../lib/supabase/admin';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  const session = await getSessionContext(req, res);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Decode the data URL / base64 payload into a buffer.
    const base64 = String(image).replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
    const inputBuffer = Buffer.from(base64, 'base64');
    if (!inputBuffer.length) {
      return res.status(400).json({ error: 'Invalid image data' });
    }

    // Square 200x200 avatar, webp.
    const { buffer, contentType, ext } = await resizeImage(inputBuffer, {
      width: 200, height: 200, fit: 'cover', format: 'webp'
    });

    const userId = session.user.id;
    const path = `${userId}/${Date.now()}.${ext}`;
    const result = await uploadToStorage('agent-avatars', path, buffer, contentType);
    if (!result.success) {
      return res.status(500).json({ error: 'Failed to upload image', details: result.error });
    }

    // Load current profile, merge the new avatar URL into agent_profile JSONB.
    const { data: user, error: readErr } = await admin
      .from('users')
      .select('id, agent_profile')
      .eq('id', userId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const prevUrl = user.agent_profile?.avatarUrl || null;
    const newProfile = { ...(user.agent_profile || {}), avatarUrl: result.url };

    const { error: updErr } = await admin
      .from('users')
      .update({ agent_profile: newProfile })
      .eq('id', userId);
    if (updErr) throw updErr;

    // Best-effort cleanup of the previous avatar (only if it was in our storage).
    if (prevUrl && prevUrl !== result.url) {
      await deleteByPublicUrl(prevUrl);
    }

    return res.status(200).json({
      success: true,
      avatarUrl: result.url
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
