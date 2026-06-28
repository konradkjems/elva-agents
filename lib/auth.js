import { getSessionContext } from './supabase/session'

/**
 * Auth middlewares/wrappers backed by Supabase Auth (was next-auth getToken).
 * Behaviour is preserved 1:1 from the NextAuth version:
 *   - requireAuth / withAuth   : require any valid session
 *   - requireAdmin             : require a session with role === 'admin'
 *   - withAdmin                : require any valid session (no role check — as before)
 * req.user is populated with the session user for any handler that inspects it.
 */

export async function requireAuth(req, res, next) {
  try {
    const session = await getSessionContext(req, res)

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    req.user = session.user
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

export async function requireAdmin(req, res, next) {
  try {
    const session = await getSessionContext(req, res)

    if (!session || session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    req.user = session.user
    next()
  } catch (error) {
    console.error('Admin middleware error:', error)
    return res.status(403).json({ error: 'Admin access required' })
  }
}

export function withAuth(handler) {
  return async (req, res) => {
    try {
      const session = await getSessionContext(req, res)

      if (!session) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      req.user = session.user
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
      const session = await getSessionContext(req, res)

      if (!session) {
        return res.status(403).json({ error: 'Admin access required' })
      }

      req.user = session.user
      return handler(req, res)
    } catch (error) {
      console.error('Admin wrapper error:', error)
      return res.status(403).json({ error: 'Admin access required' })
    }
  }
}
