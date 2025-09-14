import { getToken } from 'next-auth/jwt'
import { getSession } from 'next-auth/react'

export async function requireAuth(req, res, next) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Add user info to request
    req.user = token
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

export async function requireAdmin(req, res, next) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    
    if (!token || token.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    req.user = token
    next()
  } catch (error) {
    console.error('Admin middleware error:', error)
    return res.status(403).json({ error: 'Admin access required' })
  }
}

export function withAuth(handler) {
  return async (req, res) => {
    try {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
      
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      req.user = token
      return handler(req, res)
    } catch (error) {
      console.error('Auth wrapper error:', error)
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }
}

export function withAdmin(handler) {
  return async (req, res) => {
    try {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
      
      if (!token || token.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' })
      }

      req.user = token
      return handler(req, res)
    } catch (error) {
      console.error('Admin wrapper error:', error)
      return res.status(403).json({ error: 'Admin access required' })
    }
  }
}
