'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ErrorBox, Loading } from '@/components/ui';

export default function Settings() {
  const h = useQuery({ queryKey: ['health'], queryFn: () => api<{ status: string; notionConfigured: boolean; time: string }>('health') });
  const dbs = useQuery({ queryKey: ['databases'], queryFn: () => api<{ id: string; title: string }[]>('notion/databases'), retry: false });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <section className="card">
        <h2 className="font-semibold">Connection</h2>
        {h.isLoading ? <Loading /> : h.isError ? <ErrorBox error={h.error} /> : <p className="text-sm">Backend: {h.data!.status} · Notion token: {h.data!.notionConfigured ? 'set' : 'missing'}</p>}
      </section>
      <section className="card">
        <h2 className="font-semibold">Accessible Notion databases</h2>
        <p className="text-xs text-slate-500">Copy an ID into the matching NOTION_*_DB variable in server/.env.</p>
        {dbs.isLoading ? <Loading /> : dbs.isError ? <ErrorBox error={dbs.error} /> :
          <ul className="mt-2 space-y-1 text-sm">{dbs.data!.map((d) => <li key={d.id}><strong>{d.title}</strong> <code className="text-xs">{d.id}</code></li>)}</ul>}
      </section>
    </div>
  );
}
