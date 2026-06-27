import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { admin } from '../../../lib/supabase/admin'
import { verifyPassword, needsRehash, hashPassword } from '../../../lib/password'

// Default permissions for an organization owner.
const OWNER_PERMISSIONS = {
  widgets: { create: true, read: true, update: true, delete: true },
  demos: { create: false, read: true, update: false, delete: false },
  team: { invite: true, manage: true, remove: true },
  settings: { view: true, edit: true }
}

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          // Find active user by email
          const { data: user } = await admin
            .from('users')
            .select('id, email, name, role, password_hash, current_organization_id')
            .eq('email', credentials.email.toLowerCase())
            .eq('status', 'active')
            .maybeSingle()

          if (!user || !user.password_hash) {
            return null
          }

          // Verify password with bcrypt - GDPR COMPLIANCE FIX (Artikel 32)
          const isValidPassword = await verifyPassword(credentials.password, user.password_hash)

          if (!isValidPassword) {
            return null
          }

          // Optional: Rehash if needed (salt rounds increased)
          if (needsRehash(user.password_hash)) {
            const newHash = await hashPassword(credentials.password)
            await admin.from('users').update({ password_hash: newHash }).eq('id', user.id)
          }

          // Update last login
          await admin.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id)

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            currentOrganizationId: user.current_organization_id || undefined
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // Update session every hour when active
    rolling: true, // Extend session on activity
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth sign-in
      if (account.provider === 'google') {
        try {
          // Check if user exists
          let { data: dbUser } = await admin
            .from('users')
            .select('id, role, current_organization_id')
            .eq('email', user.email.toLowerCase())
            .maybeSingle()

          if (!dbUser) {
            // Create new user from Google account
            const { data: created, error: createErr } = await admin
              .from('users')
              .insert({
                email: user.email.toLowerCase(),
                name: user.name,
                image: user.image,
                role: 'member',
                status: 'active',
                provider: 'google',
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
              .single()
            if (createErr) throw createErr

            const userId = created.id

            // Create personal organization for new user
            const { data: org, error: orgErr } = await admin
              .from('organizations')
              .insert({
                name: `${user.name}'s Organization`,
                slug: user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-org',
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
              .single()
            if (orgErr) throw orgErr

            // Create team member entry (owner)
            await admin.from('team_members').insert({
              organization_id: org.id,
              user_id: userId,
              role: 'owner',
              permissions: OWNER_PERMISSIONS,
              status: 'active',
              joined_at: new Date().toISOString()
            })

            // Set current organization
            await admin.from('users')
              .update({ current_organization_id: org.id })
              .eq('id', userId)

            dbUser = { id: userId, role: 'member', current_organization_id: org.id }
          } else {
            // Update last login + image
            await admin.from('users')
              .update({ last_login: new Date().toISOString(), image: user.image })
              .eq('id', dbUser.id)
          }

          // Add fields to user object for JWT
          user.role = dbUser.role
          user.currentOrganizationId = dbUser.current_organization_id || undefined
          user.id = dbUser.id
        } catch (error) {
          console.error('Google sign-in error:', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account, trigger }) {
      // On sign in or update, set user data
      if (user) {
        token.role = user.role
        token.currentOrganizationId = user.currentOrganizationId
        if (account?.provider === 'google') {
          token.provider = 'google'
        }
      }

      // Always refresh currentOrganizationId from database
      // This ensures org switching works immediately
      if (token.sub) {
        try {
          const { data: dbUser } = await admin
            .from('users')
            .select('role, current_organization_id')
            .eq('id', token.sub)
            .maybeSingle()

          if (dbUser) {
            token.currentOrganizationId = dbUser.current_organization_id || undefined
            token.role = dbUser.role

            // Fetch team role and permissions from current organization
            if (dbUser.current_organization_id) {
              const { data: teamMember } = await admin
                .from('team_members')
                .select('role, permissions')
                .eq('user_id', token.sub)
                .eq('organization_id', dbUser.current_organization_id)
                .eq('status', 'active')
                .maybeSingle()

              if (teamMember) {
                token.teamRole = teamMember.role
                token.permissions = teamMember.permissions
              }
            }
          }
        } catch (error) {
          console.error('Error refreshing user data in JWT:', error)
        }
      }

      return token
    },
    async session({ session, token }) {
      session.user.id = token.sub
      session.user.role = token.role
      session.user.currentOrganizationId = token.currentOrganizationId
      session.user.provider = token.provider
      session.user.teamRole = token.teamRole
      session.user.permissions = token.permissions
      return session
    }
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login'
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
