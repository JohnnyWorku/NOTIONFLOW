import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password) return NextResponse.json({ message: 'Enter your password.' }, { status: 400 });
  const base = process.env.API_BASE_URL ?? 'http://localhost:4000/api';
  let res: Response;
  try {
    res = await fetch(`${base}/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }), cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ message: 'Cannot reach the server.' }, { status: 502 });
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.token) return NextResponse.json({ message: body?.message ?? 'Login failed.' }, { status: res.status === 200 ? 502 : res.status });

  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '');
  const out = NextResponse.json({ ok: true });
  out.cookies.set('nf_session', body.token, {
    httpOnly: true, sameSite: 'lax', secure: proto === 'https', path: '/', expires: new Date(body.expiresAt),
  });
  return out;
}
