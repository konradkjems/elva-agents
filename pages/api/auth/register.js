/**
 * User Registration API
 *
 * POST /api/auth/register - Create new user account
 */

import { admin } from '../../../lib/supabase/admin';

function getPermissionsForRole(role) {
  switch (role) {
    case 'owner':
      return {
        widgets: { create: true, read: true, update: true, delete: true },
        demos: { create: true, read: true, update: true, delete: true },
        team: { invite: true, manage: true, remove: true },
        settings: { view: true, edit: true }
      };
    case 'admin':
      return {
        widgets: { create: true, read: true, update: true, delete: true },
        demos: { create: true, read: true, update: true, delete: true },
        team: { invite: true, manage: true, remove: true },
        settings: { view: true, edit: false }
      };
    case 'member':
    default:
      return {
        widgets: { create: false, read: true, update: false, delete: false },
        demos: { create: false, read: true, update: false, delete: false },
        team: { invite: false, manage: false, remove: false },
        settings: { view: true, edit: false }
      };
  }
}

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

    const normalizedEmail = email.toLowerCase();

    // Check if user already exists
    const { data: existingUser } = await admin
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // If there's an invitation token, verify it matches this email
    let invitation = null;
    if (invitationToken) {
      const { data } = await admin
        .from('invitations')
        .select('*')
        .eq('token', invitationToken)
        .eq('email', normalizedEmail)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      invitation = data;

      if (!invitation) {
        return res.status(400).json({
          error: 'Invalid or expired invitation. The email must match the invitation.'
        });
      }
    }

    // Create the application profile (password lives in Supabase Auth, below)
    const { data: newUser, error: userErr } = await admin
      .from('users')
      .insert({
        email: normalizedEmail,
        name: name.trim(),
        role: 'member',
        status: 'active',
        provider: 'credentials',
        email_verified: true,
        preferences: {
          theme: 'light',
          language: 'en',
          notifications: {
            email: true,
            newWidgetCreated: true,
            teamInvitation: true
          }
        },
        last_login: new Date().toISOString()
      })
      .select('id')
      .single();
    if (userErr) throw userErr;

    const userId = newUser.id;

    // Create the matching Supabase Auth user with the SAME id so the account is
    // loginnable (auth.users is the single source of truth for the password).
    const { error: authErr } = await admin.auth.admin.createUser({
      id: userId,
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { name: name.trim() },
      app_metadata: { provider: 'email', providers: ['email'] }
    });
    if (authErr) {
      // Roll back the profile row so we don't leave an un-loginnable account.
      await admin.from('users').delete().eq('id', userId);
      console.error('Auth user creation failed:', authErr);
      return res.status(500).json({ error: 'An error occurred during registration' });
    }

    if (invitation) {
      // User is registering via invitation - add them to the invited organization
      await admin.from('team_members').insert({
        organization_id: invitation.organization_id,
        user_id: userId,
        role: invitation.role,
        permissions: getPermissionsForRole(invitation.role),
        status: 'active',
        joined_at: new Date().toISOString()
      });

      await admin.from('users')
        .update({ current_organization_id: invitation.organization_id })
        .eq('id', userId);

      await admin.from('invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: userId })
        .eq('id', invitation.id);

      console.log(`✅ User ${userId} added to organization ${invitation.organization_id} with role ${invitation.role}`);
    } else {
      // No invitation - create a personal organization for the new user
      const { data: org, error: orgErr } = await admin
        .from('organizations')
        .insert({
          name: `${name}'s Organization`,
          slug: normalizedEmail.split('@')[0].replace(/[^a-z0-9]+/g, '-') + '-org',
          owner_id: userId,
          plan: 'free',
          limits: { maxWidgets: 10, maxTeamMembers: 5, maxConversations: 10000, maxDemos: 0 },
          usage: {
            conversations: {
              current: 0,
              limit: 100,
              lastReset: new Date().toISOString(),
              overage: 0,
              notificationsSent: []
            }
          },
          subscription_status: 'trial',
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          settings: {
            allowDemoCreation: false,
            requireEmailVerification: false,
            allowGoogleAuth: true
          }
        })
        .select('id')
        .single();
      if (orgErr) throw orgErr;

      await admin.from('team_members').insert({
        organization_id: org.id,
        user_id: userId,
        role: 'owner',
        permissions: getPermissionsForRole('owner'),
        status: 'active',
        joined_at: new Date().toISOString()
      });

      await admin.from('users')
        .update({ current_organization_id: org.id })
        .eq('id', userId);

      console.log(`✅ Created personal organization for user ${userId}`);
    }

    return res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: userId,
        email: normalizedEmail,
        name: name.trim()
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'An error occurred during registration' });
  }
}
