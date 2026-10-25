import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** Visiting the bare domain: signed in -> /dashboard, otherwise -> /login. */
export default async function Home() {
  const session = (await cookies()).get('nf_session')?.value;
  redirect(session ? '/dashboard' : '/login');
}
