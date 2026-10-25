'use client';
import { useState } from 'react';
import { Flame } from 'lucide-react';
import { useStats } from '@/lib/hooks';
import { iconFor } from '@/lib/icons';
import { ErrorBox, Loading, PageHeader } from '@/components/ui';
import { BarChart, Breakdown, Ring } from '@/components/charts';

const RANGES = [7, 30, 90] as const;

export default function StatsPage() {
  const [days, setDays] = useState<number>(30);
  const q = useStats(days);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistics" subtitle="How you are doing across your Notion databases"
        action={
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5" role="group" aria-label="Range">
            {RANGES.map((r) => (
              <button key={r} onClick={() => setDays(r)} aria-pressed={days === r}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${days === r ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {r}d
              </button>
            ))}
          </div>
        }
      />
      {q.isError ? <ErrorBox error={q.error} retry={() => q.refetch()} /> : !q.data ? <Loading /> : (() => {
        const s = q.data;
        const t = s.tasks;
        return (
          <>
            {t && (
              <section className="card space-y-6">
                <h2 className="font-semibold">Tasks</h2>
                <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
                  <div className="flex justify-center"><Ring value={t.completionRate} size={120} caption="all-time completed" /></div>
                  <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                      ['Total', t.total], ['Done', t.done], ['Open', t.open], ['Overdue', t.overdue],
                      [`Done in ${days}d`, t.completedInRange], ['Last 7 days', t.last7], ['Previous 7', t.prev7], ['Longest streak', `${t.longestStreak}d`],
                    ].map(([k, v]) => (
                      <div key={String(k)}><dt className="text-xs text-slate-500">{k}</dt><dd className="text-xl font-semibold tabular-nums">{v}</dd></div>
                    ))}
                  </dl>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-900">
                  <Flame size={16} /> Current streak: <strong>{t.currentStreak} day{t.currentStreak === 1 ? '' : 's'}</strong> with at least one task completed
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">Completed per day</p>
                  <BarChart data={t.completedByDay.map((d) => ({ label: d.date, value: d.count }))} />
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div><p className="mb-2 text-sm font-medium">By status</p><Breakdown items={t.byStatus} /></div>
                  <div><p className="mb-2 text-sm font-medium">By priority</p><Breakdown items={t.byPriority} /></div>
                </div>
                <p className="text-[11px] text-slate-400">Notion does not record when a task was completed, so the completion day is estimated from the last edit.</p>
              </section>
            )}
            {!t && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Connect your Tasks database (NOTION_TASKS_DB) to see task performance.</p>}

            <div className="grid gap-6 lg:grid-cols-2">
              {s.collections.map((c) => {
                const Icon = iconFor(c.icon);
                const series = c.hasAmount && c.amountInRange > 0 ? c.amountByDay : c.entriesByDay;
                return (
                  <section key={c.key} className="card space-y-4">
                    <h2 className="flex items-center gap-2 font-semibold"><Icon size={18} className="text-indigo-600" /> {c.label}</h2>
                    <dl className="grid grid-cols-3 gap-3">
                      <div><dt className="text-xs text-slate-500">Records</dt><dd className="text-xl font-semibold tabular-nums">{c.total}{c.truncated ? '+' : ''}</dd></div>
                      <div><dt className="text-xs text-slate-500">In {days}d</dt><dd className="text-xl font-semibold tabular-nums">{c.entriesInRange}</dd></div>
                      <div><dt className="text-xs text-slate-500">{c.hasAmount ? `Total (${days}d)` : 'Avg progress'}</dt>
                        <dd className="text-xl font-semibold tabular-nums">{c.hasAmount ? Math.round(c.amountInRange * 100) / 100 : c.avgProgress === null ? '—' : `${c.avgProgress}%`}</dd></div>
                    </dl>
                    <BarChart data={series.map((d) => ({ label: d.date, value: d.count }))} height={80} />
                    {c.byStatus.length > 0 && c.byStatus.some((x) => x.name !== 'None') && <Breakdown items={c.byStatus} />}
                  </section>
                );
              })}
            </div>
          </>
        );
      })()}
    </div>
  );
}
