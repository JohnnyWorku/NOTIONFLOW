'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarClock, CalendarDays, ExternalLink, Flame, GraduationCap, FolderKanban, Target, type LucideIcon } from 'lucide-react';
import { api, Collection, HomeData, NfRecord, Related } from '@/lib/api';
import { greeting, type Tone } from '@/lib/format';
import { useStats } from '@/lib/hooks';
import { iconFor } from '@/lib/icons';
import { Empty, ErrorBox, ICON_TONE, Loading, PageHeader } from '@/components/ui';
import { RecordRow } from '@/components/records';
import { BarChart, Ring } from '@/components/charts';
import { NotionBlocks } from '@/components/notion-blocks';
import { QuickAdd } from '@/components/quick-add';

interface Dash {
  notion: { configured: boolean }; sync: { version: number; lastWebhookAt: string | null };
  tasks: { today: NfRecord[]; overdue: NfRecord[]; upcoming: NfRecord[] } | null;
  projects: { active: NfRecord[] } | null;
  goals: { items: NfRecord[]; averageProgress: number | null } | null;
  learning: { items: NfRecord[]; averageProgress: number | null } | null;
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

function Focus({ title, items, empty }: { title: string; items: NfRecord[] | undefined; empty: string }) {
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

function NotionHome({ page }: { page: NonNullable<HomeData['page']> }) {
  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold">{page.title}</h2>
        {page.url && <a href={page.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">Open in Notion <ExternalLink size={13} /></a>}
      </div>
      {page.error ? <p role="alert" className="text-sm text-amber-800">{page.error}</p> : <NotionBlocks blocks={page.blocks} />}
      {(page.skipped > 0 || page.truncated) && (
        <p className="mt-3 text-[11px] text-slate-400">
          {page.skipped > 0 && `${page.skipped} block${page.skipped === 1 ? '' : 's'} (images, linked database views, embeds…) can’t be shown here. `}
          {page.truncated && 'Showing the first part of a long page.'}
        </p>
      )}
    </section>
  );
}

export default function Home() {
  const dash = useQuery({ queryKey: ['dashboard'], queryFn: () => api<Dash>('dashboard') });
  const home = useQuery({ queryKey: ['home'], queryFn: () => api<HomeData>('home') });
  const cols = useQuery({ queryKey: ['collections'], queryFn: () => api<Collection[]>('collections'), staleTime: 5 * 60_000 });

  if (dash.isLoading) return <Loading />;
  if (dash.isError) return <ErrorBox error={dash.error} retry={() => dash.refetch()} />;
  const d = dash.data!;
  const n = (xs?: unknown[]) => (xs ? String(xs.length) : '—');
  const pct = (v?: number | null) => (v === null || v === undefined ? '—' : `${v}%`);
  const nothing = !d.tasks && !d.projects && !d.goals && !d.learning;
  const relatedFor = (r: NfRecord): Related[] => (r.relatedIds ?? []).map((id) => home.data?.related[id]).filter((x): x is Related => !!x);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting()} 👋`}
        subtitle={d.sync.lastWebhookAt ? `Live sync active · last Notion event ${new Date(d.sync.lastWebhookAt).toLocaleTimeString()}` : 'Your Notion home · syncs every 15 seconds'}
        action={<QuickAdd collections={cols.data ?? []} />}
      />
      {!d.notion.configured && (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Notion is not configured on the server. See docs/notion-setup.md.</p>
      )}
      {nothing && d.notion.configured && <Empty text="No databases configured yet. Add the NOTION_*_DB IDs to the server settings and restart/redeploy the backend." />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Overdue" value={n(d.tasks?.overdue)} tone="red" icon={AlertTriangle} />
        <Stat label="Due today" value={n(d.tasks?.today)} tone="amber" icon={CalendarDays} />
        <Stat label="Upcoming" value={n(d.tasks?.upcoming)} tone="blue" icon={CalendarClock} />
        <Stat label="Active projects" value={n(d.projects?.active)} tone="violet" icon={FolderKanban} />
        <Stat label="Goal progress" value={pct(d.goals?.averageProgress)} tone="green" icon={Target} />
        <Stat label="Learning" value={pct(d.learning?.averageProgress)} tone="blue" icon={GraduationCap} />
      </div>

      <Performance />

      {home.data?.page && <NotionHome page={home.data.page} />}

      <div className="grid gap-8 lg:grid-cols-2">
        <Focus title="Overdue" items={d.tasks?.overdue} empty="Nothing overdue. 🎉" />
        <Focus title="Today" items={d.tasks?.today} empty="No tasks due today." />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Your tables</h2>
        {home.isLoading ? <Loading /> : home.isError ? <ErrorBox error={home.error} retry={() => home.refetch()} /> : (
          <div className="grid gap-6 lg:grid-cols-2">
            {home.data!.sections.map((s) => {
              const Icon = iconFor(s.icon);
              return (
                <div key={s.key} className="card space-y-3 !p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-semibold"><Icon size={18} className="text-indigo-600" /> {s.label}</h3>
                    <Link href={`/c/${s.key}`} className="text-sm font-medium text-indigo-600 hover:underline">{s.hasMore ? 'View all →' : 'Open →'}</Link>
                  </div>
                  {s.error ? <p className="text-sm text-rose-700">{s.error}</p> : s.items.length === 0 ? <p className="text-sm text-slate-500">Nothing here yet.</p> : (
                    <ul className="space-y-2">{s.items.map((r) => <RecordRow key={r.id} r={r} dense related={relatedFor(r)} />)}</ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
