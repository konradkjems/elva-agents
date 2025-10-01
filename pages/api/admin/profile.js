import { getSession } from 'next-auth/react';
import clientPromise from '../../../lib/mongodb';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const client = await clientPromise;
  const db = client.db('chatwidgets');

  if (req.method === 'GET') {
    try {
      // Find user by email
      const user = await db.collection('users').findOne({
        email: session.user.email
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Return user data without sensitive information
      const { password, ...userData } = user;
      
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
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
          return res.status(400).json({ message: 'Email already in use' });
        }
      }

      // Update user
      const result = await db.collection('users').findOneAndUpdate(
        { email: session.user.email },
        {
          $set: {
            name,
            email,
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Return updated user data without sensitive information
      const { password, ...userData } = result.value;
      
      return res.status(200).json(userData);
    } catch (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

