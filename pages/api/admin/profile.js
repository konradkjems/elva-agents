import { getSessionContext } from '../../../lib/supabase/session';
import { admin } from '../../../lib/supabase/admin';
import { fromRow } from '../../../lib/supabase/transform';

export default async function handler(req, res) {
  const session = await getSessionContext(req, res);

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      // Find user by email
      const { data: user, error } = await admin
        .from('users')
        .select('*')
        .eq('email', session.user.email)
        .maybeSingle();
      if (error) throw error;

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Return user data without sensitive information
      const userData = fromRow(user);
      delete userData.passwordHash;

      return res.status(200).json(userData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { name, email } = req.body;

      // Validate input
      if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required' });
      }

      // Check if email is already taken by another user
      if (email !== session.user.email) {
        const { data: existingUser } = await admin
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        if (existingUser) {
          return res.status(400).json({ message: 'Email already in use' });
        }
      }

      // Update user
      const { data: updated, error } = await admin
        .from('users')
        .update({ name, email })
        .eq('email', session.user.email)
        .select('*')
        .single();
      if (error) throw error;

      if (!updated) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Return updated user data without sensitive information
      const userData = fromRow(updated);
      delete userData.passwordHash;

      return res.status(200).json(userData);
    } catch (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
