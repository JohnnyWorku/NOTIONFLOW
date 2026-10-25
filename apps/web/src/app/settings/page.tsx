'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Database, LogOut, Smartphone } from 'lucide-react';
import { api, signOut } from '@/lib/api';
import { ErrorBox, Loading, PageHeader, Pill } from '@/components/ui';

export default function Settings() {
  const ver = useQuery({ queryKey: ['version'], queryFn: () => fetch('/api/version').then((r) => r.json() as Promise<{ version: string; commit: string | null; environment: string }>), retry: false });
  const h = useQuery({ queryKey: ['health'], queryFn: () => api<{ status: string; notionConfigured: boolean; version?: string; commit?: string | null }>('health') });
  const dbs = useQuery({ queryKey: ['databases'], queryFn: () => api<{ id: string; title: string }[]>('notion/databases'), retry: false });
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Connection status and your Notion databases" />
      <section className="card">
        <h2 className="mb-3 font-semibold">Connection</h2>
        {h.isError ? <ErrorBox error={h.error} /> : !h.data ? <Loading /> : (
          <div className="flex flex-wrap gap-2">
            <Pill tone={h.data.status === 'ok' ? 'green' : 'red'}>Backend {h.data.status}</Pill>
            <Pill tone={h.data.notionConfigured ? 'green' : 'amber'}>Notion token {h.data.notionConfigured ? 'set' : 'missing'}</Pill>
          </div>
        )}
      </section>
      <section className="card">
        <h2 className="mb-3 font-semibold">Versions running</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <Pill>Web {ver.data ? `v${ver.data.version}${ver.data.commit ? ` · ${ver.data.commit}` : ''}` : '…'}</Pill>
          <Pill>Backend {h.data ? (h.data.version ? `v${h.data.version}${h.data.commit ? ` · ${h.data.commit}` : ''}` : 'older than 0.3.2') : '…'}</Pill>
        </div>
        <p className="mt-2 text-xs text-slate-500">If a number is older than you expect, that part has not been redeployed yet.</p>
      </section>
      <section className="card">
        <h2 className="mb-1 flex items-center gap-2 font-semibold"><Database size={16} /> Accessible Notion databases</h2>
        <p className="mb-3 text-xs text-slate-500">Copy an ID into NOTION_*_DB or into NOTION_COLLECTIONS in the server settings, then restart/redeploy the backend.</p>
        {dbs.isError ? <ErrorBox error={dbs.error} /> : !dbs.data ? <Loading /> :
          <ul className="divide-y divide-slate-100 text-sm">
            {dbs.data.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <strong className="font-medium">{d.title}</strong>
                <code className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{d.id}</code>
              </li>
            ))}
          </ul>}
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/download" className="card flex items-center gap-3 transition hover:border-indigo-300"><Smartphone className="text-indigo-600" /> <span className="font-medium">Get the Android app</span></Link>
        <button onClick={signOut} className="card flex items-center gap-3 text-left transition hover:border-rose-300"><LogOut className="text-rose-600" /> <span className="font-medium">Sign out</span></button>
      </div>
    </div>
  );
}
