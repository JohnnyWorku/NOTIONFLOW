'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarClock, CalendarDays, Flame, FolderKanban, GraduationCap, Plus, Target, type LucideIcon } from 'lucide-react';
import { api, NfRecord } from '@/lib/api';
import { greeting, type Tone } from '@/lib/format';
import { useStats } from '@/lib/hooks';
import { Empty, ErrorBox, ICON_TONE, Loading, PageHeader } from '@/components/ui';
import { RecordRow } from '@/components/records';
import { BarChart, Ring } from '@/components/charts';

interface Dash {
  notion: { configured: boolean }; sync: { version: number; lastWebhookAt: string | null };
  tasks: { today: NfRecord[]; overdue: NfRecord[]; upcoming: NfRecord[] } | null;
  projects: { active: NfRecord[] } | null;
  goals: { items: NfRecord[]; averageProgress: number | null } | null;
  learning: { items: NfRecord[]; averageProgress: number | null } | null;
  recent: NfRecord[];
}

function Stat({ label, value, tone, icon: Icon }: { label: string; value: string; tone: Tone; icon: LucideIcon }) {
  return (
    <div className="card flex items-center gap-4 !p-4">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${ICON_TONE[tone]}`}><Icon size={20} /></span>
      <div>
        <p className="text-2xl font-semibold tabular-nums leading-none">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function Section({ title, items, empty }: { title: string; items: NfRecord[] | undefined; empty: string }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        {title}
        {items && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">{items.length}</span>}
      </h2>
      {items === undefined ? <p className="text-sm text-slate-500">Database not configured.</p> :
        items.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">{empty}</p> :
        <ul className="space-y-2">{items.map((r) => <RecordRow key={r.id} r={r} dense />)}</ul>}
    </section>
  );
}

function Performance() {
  const s = useStats(14);
  const t = s.data?.tasks;
  if (s.isLoading) return <div className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  if (!t) return null;
  const delta = t.last7 - t.prev7;
  const Trend = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : ArrowRight;
  return (
    <section className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Performance</h2>
        <Link href="/stats" className="text-sm font-medium text-indigo-600 hover:underline">All statistics →</Link>
      </div>
      <div className="grid gap-6 md:grid-cols-[auto_1fr_1.4fr] md:items-center">
        <div className="flex justify-center"><Ring value={t.completionRate} caption="completed" /></div>
        <dl className="grid grid-cols-3 gap-3 text-center md:grid-cols-1 md:text-left">
          <div>
            <dt className="text-xs text-slate-500">Done last 7 days</dt>
            <dd className="flex items-center justify-center gap-1 text-xl font-semibold tabular-nums md:justify-start">
              {t.last7}
              <span className={`inline-flex items-center text-xs font-medium ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                <Trend size={14} />{Math.abs(delta)} vs prev
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Current streak</dt>
            <dd className="flex items-center justify-center gap-1 text-xl font-semibold tabular-nums md:justify-start"><Flame size={18} className="text-orange-500" />{t.currentStreak}d</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Open / overdue</dt>
            <dd className="text-xl font-semibold tabular-nums">{t.open} <span className="text-sm font-normal text-rose-600">/ {t.overdue}</span></dd>
          </div>
        </dl>
        <div>
          <p className="mb-2 text-xs text-slate-500">Tasks completed per day (14 days)</p>
          <BarChart data={t.completedByDay.map((d) => ({ label: d.date, value: d.count }))} height={96} />
        </div>
      </div>
      <p className="mt-3 text-[11px] text-slate-400">Completion day is estimated from when a task was last edited in Notion.</p>
    </section>
  );
}

export default function Dashboard() {
  const q = useQuery({ queryKey: ['dashboard'], queryFn: () => api<Dash>('dashboard') });
  if (q.isLoading) return <Loading />;
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />;
  const d = q.data!;
  const n = (xs?: unknown[]) => (xs ? String(xs.length) : '—');
  const pct = (v?: number | null) => (v === null || v === undefined ? '—' : `${v}%`);
  const nothing = !d.tasks && !d.projects && !d.goals && !d.learning;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting()} 👋`}
        subtitle={d.sync.lastWebhookAt ? `Live sync active · last Notion event ${new Date(d.sync.lastWebhookAt).toLocaleTimeString()}` : 'Syncs with Notion every 15 seconds'}
        action={<Link href="/tasks" className="btn"><Plus size={16} /> New task</Link>}
      />
      {!d.notion.configured && (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Notion is not configured on the server. See docs/notion-setup.md.</p>
      )}
      {nothing && d.notion.configured && <Empty text="No databases configured yet. Add the NOTION_*_DB IDs to server/.env and restart the backend." />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Overdue" value={n(d.tasks?.overdue)} tone="red" icon={AlertTriangle} />
        <Stat label="Due today" value={n(d.tasks?.today)} tone="amber" icon={CalendarDays} />
        <Stat label="Upcoming" value={n(d.tasks?.upcoming)} tone="blue" icon={CalendarClock} />
        <Stat label="Active projects" value={n(d.projects?.active)} tone="violet" icon={FolderKanban} />
        <Stat label="Goal progress" value={pct(d.goals?.averageProgress)} tone="green" icon={Target} />
        <Stat label="Learning" value={pct(d.learning?.averageProgress)} tone="blue" icon={GraduationCap} />
      </div>

      <Performance />

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Overdue" items={d.tasks?.overdue} empty="Nothing overdue. 🎉" />
        <Section title="Today" items={d.tasks?.today} empty="No tasks due today." />
        <Section title="Upcoming" items={d.tasks?.upcoming} empty="No upcoming deadlines." />
        <Section title="Active projects" items={d.projects?.active} empty="No active projects." />
      </div>
      <Section title="Recently updated" items={d.recent} empty="No recent records." />
    </div>
  );
}
