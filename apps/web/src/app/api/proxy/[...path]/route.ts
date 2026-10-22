import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side proxy: the browser calls /api/proxy/*, this attaches the user's session token (from an httpOnly
 * cookie, invisible to page scripts) and forwards to NestJS. Only an allowlist of first path segments is forwarded.
 */
const ALLOWED = new Set(['tasks', 'projects', 'goals', 'learning', 'c', 'collections', 'dashboard', 'stats', 'sync', 'notion', 'health']);

async function forward(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (!ALLOWED.has(path[0])) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  const token = req.cookies.get('nf_session')?.value;
  if (!token) return NextResponse.json({ message: 'Not signed in.' }, { status: 401 });

  const base = process.env.API_BASE_URL ?? 'http://localhost:4000/api';
  const url = `${base}/${path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`;
  const headers: Record<string, string> = { 'content-type': 'application/json', authorization: `Bearer ${token}` };
  const idem = req.headers.get('idempotency-key');
  if (idem) headers['idempotency-key'] = idem;
  try {
    const res = await fetch(url, {
      method: req.method, headers, cache: 'no-store',
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text(),
    });
    return new NextResponse(await res.text(), { status: res.status, headers: { 'content-type': 'application/json' } });
  } catch {
    return NextResponse.json({ message: 'Backend unreachable' }, { status: 502 });
  }
}
export { forward as GET, forward as POST, forward as PATCH, forward as DELETE };
