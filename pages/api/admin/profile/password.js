import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import clientPromise from '../../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Don't allow password changes for Google OAuth users
  if (session.user?.provider === 'google') {
    return res.status(400).json({ 
      message: 'Password changes are not available for Google accounts' 
    });
  }

  const client = await clientPromise;
  const db = client.db('elva-agents');

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

    // Find user
    const user = await db.collection('users').findOne({
      email: session.user.email
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    // Note: In production, you should use bcrypt for password hashing
    if (user.password !== currentPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update password
    // Note: In production, you should hash the password with bcrypt
    await db.collection('users').updateOne(
      { email: session.user.email },
      {
        $set: {
          password: newPassword,
          updatedAt: new Date()
        }
      }
    );

    return res.status(200).json({ 
      message: 'Password updated successfully' 
    });
  } catch (error) {
    console.error('Error updating password:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

