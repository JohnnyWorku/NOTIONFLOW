'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api, NfRecord } from '@/lib/api';
import { ErrorBox, Loading } from '@/components/ui';
import { RecordRow } from '@/components/records';

interface Dash {
  notion: { configured: boolean }; sync: { version: number; lastWebhookAt: string | null };
  tasks: { today: NfRecord[]; overdue: NfRecord[]; upcoming: NfRecord[] } | null;
  projects: { active: NfRecord[] } | null;
  goals: { items: NfRecord[]; averageProgress: number | null } | null;
  learning: { items: NfRecord[]; averageProgress: number | null } | null;
  recent: NfRecord[];
}

function Section({ title, items, empty }: { title: string; items?: NfRecord[]; empty: string }) {
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{title}</h2>
      {items === undefined ? <p className="text-sm text-slate-500">Database not configured.</p> :
        items.length === 0 ? <p className="text-sm text-slate-500">{empty}</p> :
        <ul className="space-y-2">{items.map((r) => <RecordRow key={r.id} r={r} />)}</ul>}
    </section>
  );
}

export default function Dashboard() {
  const q = useQuery({ queryKey: ['dashboard'], queryFn: () => api<Dash>('dashboard') });
  if (q.isLoading) return <Loading />;
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />;
  const d = q.data!;
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex gap-2"><Link className="btn" href="/tasks">New task</Link></div>
      </header>
      {!d.notion.configured && <p role="alert" className="card border-amber-300 text-amber-900">Notion is not configured on the server. See docs/notion-setup.md.</p>}
      <p className="text-xs text-slate-500">Sync v{d.sync.version}{d.sync.lastWebhookAt ? ` · last webhook ${d.sync.lastWebhookAt}` : ' · refreshes every 15s (webhook not active)'}</p>
      <Section title="Overdue" items={d.tasks?.overdue} empty="Nothing overdue." />
      <Section title="Today" items={d.tasks?.today} empty="No tasks due today." />
      <Section title="Upcoming" items={d.tasks?.upcoming} empty="No upcoming deadlines." />
      <Section title="Active projects" items={d.projects?.active} empty="No active projects." />
      <p className="text-sm">Goal progress: {d.goals?.averageProgress ?? 'n/a'}{d.goals?.averageProgress != null && '%'} · Learning progress: {d.learning?.averageProgress ?? 'n/a'}{d.learning?.averageProgress != null && '%'}</p>
      <Section title="Recently updated" items={d.recent} empty="No recent records." />
    </div>
  );
}
