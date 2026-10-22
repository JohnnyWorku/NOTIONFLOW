export type Tone = 'slate' | 'blue' | 'green' | 'amber' | 'red' | 'violet';

export function statusTone(s: string | null): Tone {
  if (!s) return 'slate';
  if (/done|complete|finish|shipped/i.test(s)) return 'green';
  if (/progress|doing|active|started|working/i.test(s)) return 'blue';
  if (/block|hold|wait|paused|stuck/i.test(s)) return 'amber';
  return 'slate';
}

export function priorityTone(p: string | null): Tone {
  if (!p) return 'slate';
  if (/high|urgent|critical/i.test(p)) return 'red';
  if (/med|normal/i.test(p)) return 'amber';
  return 'slate';
}

const ymd = (d: Date) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

export function formatDue(due: string, done: boolean): { label: string; overdue: boolean; today: boolean } {
  const day = due.slice(0, 10);
  const now = new Date();
  const today = ymd(now);
  const tomorrow = ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const [y, m, d] = day.split('-').map(Number);
  const label =
    day === today ? 'Today' : day === tomorrow ? 'Tomorrow'
    : new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return { label, overdue: !done && day < today, today: day === today };
}

export function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function formatBytes(n: number): string {
  return n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
}
