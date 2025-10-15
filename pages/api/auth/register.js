/**
 * User Registration API
 * 
 * POST /api/auth/register - Create new user account
 */

import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { hashPassword } from '../../../lib/password';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, name, password, invitationToken } = req.body;

    // Validation
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const client = await clientPromise;
    const db = client.db('elva-agents');

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({
      email: email.toLowerCase()
    });

    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // If there's an invitation token, verify it matches this email
    if (invitationToken) {
      const invitation = await db.collection('invitations').findOne({
        token: invitationToken,
        email: email.toLowerCase(),
        status: 'pending',
        expiresAt: { $gt: new Date() }
      });

      if (!invitation) {
        return res.status(400).json({ 
          error: 'Invalid or expired invitation. The email must match the invitation.' 
        });
      }
    }

    // Hash password - GDPR COMPLIANCE FIX (Artikel 32)
    const hashedPassword = await hashPassword(password);

    // Create the new user
    const newUser = {
      email: email.toLowerCase(),
      name: name.trim(),
      password: hashedPassword, // ✅ Now hashed with bcrypt!
      role: 'member', // Regular user by default
      status: 'active',
      provider: 'credentials',
      emailVerified: false, // Email verification can be added later
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: {
          email: true,
          newWidgetCreated: true,
          teamInvitation: true
        }
      },
      createdAt: new Date(),
      lastLogin: new Date()
    };

    const result = await db.collection('users').insertOne(newUser);
    const userId = result.insertedId;

    // If no invitation, create a personal organization for the new user
    if (!invitationToken) {
      const organization = {
        name: `${name}'s Organization`,
        slug: email.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-org',
        ownerId: userId,
        plan: 'free',
        limits: {
          maxWidgets: 10,
          maxTeamMembers: 5,
          maxConversations: 10000,
          maxDemos: 0
        },
        subscriptionStatus: 'trial',
        settings: {
          allowDemoCreation: false,
          requireEmailVerification: false,
          allowGoogleAuth: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const orgResult = await db.collection('organizations').insertOne(organization);

      // Create team membership
      const teamMember = {
        organizationId: orgResult.insertedId,
        userId: userId,
        role: 'owner',
        permissions: {
          widgets: { create: true, read: true, update: true, delete: true },
          demos: { create: false, read: true, update: false, delete: false },
          team: { invite: true, manage: true, remove: true },
          settings: { view: true, edit: true }
        },
        status: 'active',
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('team_members').insertOne(teamMember);

      // Set current organization for user
      await db.collection('users').updateOne(
        { _id: userId },
        { $set: { currentOrganizationId: orgResult.insertedId } }
      );
    }

    return res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: userId.toString(),
        email: newUser.email,
        name: newUser.name
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'An error occurred during registration' });
  }
}

