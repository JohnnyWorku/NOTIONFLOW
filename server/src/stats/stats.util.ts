import type { NfRecord } from '../entities/mapping';

export interface DayCount { date: string; count: number }
export interface Tally { name: string; count: number }

const DAY = 86_400_000;

export const isDone = (r: Pick<NfRecord, 'done' | 'status'>): boolean =>
  r.done === true || /done|complete|finish/i.test(r.status ?? '');

/** Convert an ISO timestamp to a YYYY-MM-DD day in the viewer's timezone (tzMin = minutes east of UTC). */
export function localDay(iso: string, tzMin: number): string {
  if (iso.length === 10) return iso; // date-only values have no timezone
  return new Date(new Date(iso).getTime() + tzMin * 60_000).toISOString().slice(0, 10);
}

/** The last n local days, oldest first, ending today. */
export function lastNDays(n: number, tzMin: number, now: Date = new Date()): string[] {
  const todayMs = now.getTime() + tzMin * 60_000;
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(new Date(todayMs - i * DAY).toISOString().slice(0, 10));
  return out;
}

export const prevDay = (day: string): string => new Date(Date.parse(`${day}T00:00:00Z`) - DAY).toISOString().slice(0, 10);

export function countByDay(days: string[], dates: string[]): DayCount[] {
  const m = new Map<string, number>();
  for (const d of dates) m.set(d, (m.get(d) ?? 0) + 1);
  return days.map((date) => ({ date, count: m.get(date) ?? 0 }));
}

const sum = (xs: DayCount[]) => xs.reduce((s, x) => s + x.count, 0);

/** Current streak counts back from today (or from yesterday if nothing is done yet today). */
export function streaks(dates: Set<string>, today: string): { current: number; longest: number } {
  let d = dates.has(today) ? today : prevDay(today);
  let current = 0;
  while (dates.has(d)) { current++; d = prevDay(d); }
  const sorted = [...dates].sort();
  let longest = 0, run = 0, prev = '';
  for (const day of sorted) {
    run = prev && prevDay(day) === prev ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = day;
  }
  return { current, longest };
}

export function tally(values: (string | null)[]): Tally[] {
  const m = new Map<string, number>();
  for (const v of values) m.set(v ?? 'None', (m.get(v ?? 'None') ?? 0) + 1);
  return [...m].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

/**
 * Task performance. NOTE: Notion stores no "completed at" time, so the completion day is approximated by the
 * last time the page was edited. Clients are told via `approximate: true`.
 */
export function computeTaskStats(items: NfRecord[], days: number, tz: number, now: Date = new Date()) {
  const done = items.filter(isDone);
  const open = items.filter((r) => !isDone(r));
  const today = lastNDays(1, tz, now)[0];
  const doneDates = done.map((r) => localDay(r.lastEdited, tz));
  const byDay = countByDay(lastNDays(days, tz, now), doneDates);
  const { current, longest } = streaks(new Set(doneDates), today);
  return {
    total: items.length,
    done: done.length,
    open: open.length,
    overdue: open.filter((r) => r.due && r.due.slice(0, 10) < today).length,
    completionRate: items.length ? Math.round((done.length / items.length) * 100) : null,
    completedInRange: sum(byDay),
    completedByDay: byDay,
    last7: sum(countByDay(lastNDays(7, tz, now), doneDates)),
    prev7: sum(countByDay(lastNDays(14, tz, now).slice(0, 7), doneDates)),
    currentStreak: current,
    longestStreak: longest,
    byStatus: tally(items.map((r) => r.status)),
    byPriority: tally(items.map((r) => r.priority)),
    approximate: true,
  };
}

export function computeCollectionStats(
  c: { key: string; label: string }, items: NfRecord[], days: number, tz: number, truncated: boolean, now: Date = new Date(),
) {
  const range = lastNDays(days, tz, now);
  const inRangeSet = new Set(range);
  const dateOf = (r: NfRecord) => (r.due ? localDay(r.due, tz) : localDay(r.created, tz));
  const inRange = items.filter((r) => inRangeSet.has(dateOf(r)));
  const progress = items.filter((r) => r.progress !== null);
  const amountByDay: DayCount[] = range.map((date) => ({
    date, count: items.filter((r) => dateOf(r) === date).reduce((s, r) => s + (r.amount ?? 0), 0),
  }));
  const doneCount = items.filter(isDone).length;
  return {
    key: c.key,
    label: c.label,
    total: items.length,
    doneCount,
    completionRate: items.length ? Math.round((doneCount / items.length) * 100) : null,
    avgProgress: progress.length ? Math.round(progress.reduce((s, r) => s + (r.progress ?? 0), 0) / progress.length) : null,
    hasAmount: items.some((r) => r.amount !== null),
    amountInRange: inRange.reduce((s, r) => s + (r.amount ?? 0), 0),
    entriesInRange: inRange.length,
    entriesByDay: countByDay(range, inRange.map(dateOf)),
    amountByDay,
    byStatus: tally(items.map((r) => r.status)),
    truncated,
  };
}
