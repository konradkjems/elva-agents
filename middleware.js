import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

/**
 * Gate /admin/* on a valid Supabase session (replaces next-auth/middleware).
 * Reads the session from cookies, validates it against Supabase (getUser also
 * refreshes the token and writes refreshed cookies onto the response), and
 * redirects unauthenticated requests to /admin/login. /admin/login is public.
 */
export async function middleware(req) {
  const res = NextResponse.next({ request: { headers: req.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = req.nextUrl

  // Login page is always accessible.
  if (pathname.startsWith('/admin/login')) {
    return res
  }

  // All other admin routes require a session.
  if (pathname.startsWith('/admin') && !user) {
    const url = req.nextUrl.clone()
    url.pathname = '/admin/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*'],
}
