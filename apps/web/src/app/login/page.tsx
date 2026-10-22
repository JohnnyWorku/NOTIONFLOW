'use client';
import { useState } from 'react';
import { Eye, EyeOff, Lock, Workflow } from 'lucide-react';

export default function Login() {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return setError('Enter your password.');
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(res.status === 429 ? 'Too many attempts. Wait a minute and try again.' : body?.message ?? 'Login failed.');
        setBusy(false);
        return;
      }
      window.location.href = '/dashboard'; // full navigation so the new cookie is used everywhere
    } catch {
      setError('Cannot reach the server.');
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-indigo-50 via-slate-50 to-white px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-5 !p-7" noValidate>
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-600 text-white"><Workflow size={24} /></span>
          <h1 className="text-xl font-semibold tracking-tight">NotionFlow</h1>
          <p className="text-sm text-slate-500">Sign in to your workspace</p>
        </div>
        <div>
          <label htmlFor="pw" className="mb-1 block text-sm font-medium">Password</label>
          <div className="relative">
            <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input id="pw" type={show ? 'text' : 'password'} autoComplete="current-password" autoFocus className="input px-9"
              value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
        </div>
        <button className="btn w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
