import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import clientPromise from '../../../lib/mongodb'
import { verifyPassword, needsRehash, hashPassword } from '../../../lib/password'

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
          const client = await clientPromise
          const db = client.db('elva-agents') // Updated to new database
          
          // Find user in database
          const user = await db.collection('users').findOne({
            email: credentials.email,
            status: 'active'
          })

          if (!user) {
            return null
          }

          // Verify password with bcrypt - GDPR COMPLIANCE FIX (Artikel 32)
          const isValidPassword = await verifyPassword(credentials.password, user.password)
          
          if (!isValidPassword) {
            return null
          }

          // Optional: Rehash if needed (salt rounds increased)
          if (needsRehash(user.password)) {
            const newHash = await hashPassword(credentials.password)
            await db.collection('users').updateOne(
              { _id: user._id },
              { $set: { password: newHash } }
            )
          }

          // Update last login
          await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { lastLogin: new Date() } }
          )

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            currentOrganizationId: user.currentOrganizationId?.toString()
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
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth sign-in
      if (account.provider === 'google') {
        try {
          const client = await clientPromise
          const db = client.db('elva-agents') // Updated to new database
          const { ObjectId } = require('mongodb')
          
          // Check if user exists
          let dbUser = await db.collection('users').findOne({
            email: user.email
          })

          if (!dbUser) {
            // Create new user from Google account
            const newUser = {
              email: user.email,
              name: user.name,
              image: user.image,
              role: 'member', // Regular user by default
              status: 'active',
              provider: 'google',
              emailVerified: true,
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
            }
            
            const result = await db.collection('users').insertOne(newUser)
            dbUser = { ...newUser, _id: result.insertedId }

            // Create personal organization for new user
            const organization = {
              name: `${user.name}'s Organization`,
              slug: user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-org',
              ownerId: dbUser._id,
              plan: 'free',
              limits: {
                maxWidgets: 10,
                maxTeamMembers: 5,
                maxConversations: 10000,
                maxDemos: 0
              },
              usage: {
                conversations: {
                  current: 0,
                  limit: 100,
                  lastReset: new Date(),
                  overage: 0,
                  notificationsSent: []
                }
              },
              subscriptionStatus: 'trial',
              trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
              settings: {
                allowDemoCreation: false,
                requireEmailVerification: false,
                allowGoogleAuth: true
              },
              createdAt: new Date(),
              updatedAt: new Date()
            }

            const orgResult = await db.collection('organizations').insertOne(organization)

            // Create team member entry (owner)
            const teamMember = {
              organizationId: orgResult.insertedId,
              userId: dbUser._id,
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
            }

            await db.collection('team_members').insertOne(teamMember)

            // Set current organization
            await db.collection('users').updateOne(
              { _id: dbUser._id },
              { $set: { currentOrganizationId: orgResult.insertedId } }
            )

            dbUser.currentOrganizationId = orgResult.insertedId
          } else {
            // Update last login
            await db.collection('users').updateOne(
              { _id: dbUser._id },
              { $set: { lastLogin: new Date(), image: user.image } }
            )
          }

          // Add fields to user object for JWT
          user.role = dbUser.role
          user.currentOrganizationId = dbUser.currentOrganizationId?.toString()
          user.id = dbUser._id.toString()
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
          const client = await clientPromise
          const db = client.db('elva-agents')
          const { ObjectId } = require('mongodb')
          
          const dbUser = await db.collection('users').findOne({ 
            _id: new ObjectId(token.sub) 
          })
          
          if (dbUser) {
            token.currentOrganizationId = dbUser.currentOrganizationId?.toString()
            token.role = dbUser.role
            
            // Fetch team role and permissions from current organization
            if (dbUser.currentOrganizationId) {
              const teamMember = await db.collection('team_members').findOne({
                userId: new ObjectId(token.sub),
                organizationId: dbUser.currentOrganizationId,
                status: 'active'
              })
              
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
