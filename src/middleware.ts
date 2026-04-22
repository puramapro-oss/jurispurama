import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/',
  '/pricing',
  '/how-it-works',
  '/ecosystem',
  '/changelog',
  '/status',
  '/blog',
  '/offline',
  '/login',
  '/signup',
  '/forgot-password',
  '/aide',
  '/contact',
  '/parrainage',
  '/mentions-legales',
  '/politique-confidentialite',
  '/cgv',
  '/cgu',
  '/cookies',
  '/confirmation',
  '/subscribe',
  '/fiscal',
]

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  if (pathname.startsWith('/go/')) return true
  if (pathname.startsWith('/p/')) return true
  if (pathname.startsWith('/share/')) return true
  if (pathname.startsWith('/verify/')) return true
  if (pathname.startsWith('/api/')) return true
  if (pathname.startsWith('/_next/')) return true
  if (pathname.startsWith('/auth/')) return true
  if (
    pathname.match(
      /\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|json|xml|txt)$/
    )
  )
    return true
  if (
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    pathname === '/manifest.json'
  )
    return true
  return false
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = new URL(pathname, request.url)
    // Preserve ?ref=... on signup so that logged-out tests still work; for
    // logged-in users, redirect to dashboard only if no ref is pending.
    if (pathname === '/signup' && request.nextUrl.searchParams.has('ref')) {
      return response
    }
    void url
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin zone: super_admin only (email-based)
  if (
    user &&
    (pathname.startsWith('/admin') || pathname.startsWith('/api/admin'))
  ) {
    if (user.email !== 'matiss.frasne@gmail.com') {
      if (pathname.startsWith('/api/admin')) {
        return new NextResponse(
          JSON.stringify({ error: 'Accès réservé à l\'administration.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
