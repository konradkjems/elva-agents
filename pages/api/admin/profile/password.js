import { createClient } from '@supabase/supabase-js';
import { admin } from '../../../../lib/supabase/admin';
import { getSessionContext } from '../../../../lib/supabase/session';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getSessionContext(req, res);

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Don't allow password changes for Google OAuth users
  if (session.user?.provider === 'google') {
    return res.status(400).json({
      message: 'Password changes are not available for Google accounts'
    });
  }

  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: 'New password must be at least 8 characters long'
      });
    }

    // Verify the current password by attempting a sign-in with the anon client
    // (Supabase Auth has no "verify password" admin call).
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { error: verifyError } = await anon.auth.signInWithPassword({
      email: session.user.email,
      password: currentPassword,
    });
    if (verifyError) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update the password in Supabase Auth.
    const { error: updateError } = await admin.auth.admin.updateUserById(
      session.user.id,
      { password: newPassword }
    );
    if (updateError) throw updateError;

    return res.status(200).json({
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error updating password:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
