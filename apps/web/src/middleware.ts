import { NextRequest, NextResponse } from 'next/server';

/**
 * Gatekeeper: everything except the public paths needs the session cookie.
 * This only checks the cookie is present (cheap, edge-safe). The BACKEND verifies the signed token on every
 * API call, so a forged or expired cookie never yields any data.
 */
const PUBLIC = ['/login', '/download', '/api/auth', '/api/apk-info', '/api/apk-file'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  if (req.cookies.get('nf_session')?.value) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ message: 'Not signed in.' }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
