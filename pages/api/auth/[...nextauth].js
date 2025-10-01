import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import clientPromise from '../../../lib/mongodb'

export default NextAuth({
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
          const db = client.db('chatwidgets')
          
          // Find user in database
          const user = await db.collection('users').findOne({
            email: credentials.email,
            status: 'active'
          })

          if (!user) {
            return null
          }

          // Simple password check (in production, use bcrypt)
          if (user.password !== credentials.password) {
            return null
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
            permissions: user.permissions
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
          const db = client.db('chatwidgets')
          
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
              role: 'admin', // Default role - adjust as needed
              permissions: ['read', 'write', 'delete'], // Default permissions
              status: 'active',
              provider: 'google',
              createdAt: new Date(),
              lastLogin: new Date()
            }
            
            const result = await db.collection('users').insertOne(newUser)
            dbUser = { ...newUser, _id: result.insertedId }
          } else {
            // Update last login
            await db.collection('users').updateOne(
              { _id: dbUser._id },
              { $set: { lastLogin: new Date(), image: user.image } }
            )
          }

          // Add role and permissions to user object for JWT
          user.role = dbUser.role
          user.permissions = dbUser.permissions
          user.id = dbUser._id.toString()
        } catch (error) {
          console.error('Google sign-in error:', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.role = user.role
        token.permissions = user.permissions
        if (account?.provider === 'google') {
          token.provider = 'google'
        }
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.sub
      session.user.role = token.role
      session.user.permissions = token.permissions
      session.user.provider = token.provider
      return session
    }
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login'
  },
  secret: process.env.NEXTAUTH_SECRET,
})
