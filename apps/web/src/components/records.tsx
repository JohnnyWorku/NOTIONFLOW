'use client';
import Link from 'next/link';
import { BookOpen, Calendar, Check, CheckCircle2, ExternalLink, FileText, FolderKanban, Hourglass, Link2, Pencil, Search, Sparkles, Target, type LucideIcon } from 'lucide-react';
import type { CardStyle, NfRecord, Related } from '@/lib/api';
import { formatDue, priorityTone, statusTone } from '@/lib/format';
import { Pill } from './ui';

export function RelatedChips({ items }: { items: Related[] }) {
  if (items.length === 0) return null;
  const cls = 'inline-flex max-w-[11rem] items-center gap-1 truncate rounded-md bg-white/70 px-1.5 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200 hover:bg-indigo-50 hover:text-indigo-700';
  return (
    <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Linked records">
      {items.slice(0, 4).map((x) => x.collectionKey
        ? <Link key={x.id} href={`/c/${x.collectionKey}`} className={cls} title={x.title}><Link2 size={11} />{x.title}</Link>
        : <a key={x.id} href={x.url} target="_blank" rel="noreferrer" className={cls} title={x.title}><Link2 size={11} />{x.title}</a>)}
    </div>
  );
}

interface RowProps {
  r: NfRecord; leading?: React.ReactNode; dense?: boolean; onEdit?: () => void; related?: Related[];
  /** Which table this record belongs to. Every table uses the same card; the accent colour and icon differ. */
  variant?: CardStyle;
}

interface Palette { card: string; circle: string; ringTrack: string; ringStroke: string; ringText: string; icon: LucideIcon }

// One card design (the Goals look), one accent per kind of table. Class names are written out in full so Tailwind keeps them.
const ACCENT: Record<CardStyle, Palette> = {
  task: { card: 'border-indigo-100 from-white to-indigo-50/70', circle: 'bg-indigo-100 text-indigo-600', ringTrack: 'stroke-indigo-100', ringStroke: 'stroke-indigo-500', ringText: 'text-indigo-700', icon: CheckCircle2 },
  project: { card: 'border-violet-100 from-white to-violet-50/70', circle: 'bg-violet-100 text-violet-600', ringTrack: 'stroke-violet-100', ringStroke: 'stroke-violet-500', ringText: 'text-violet-700', icon: FolderKanban },
  goal: { card: 'border-emerald-100 from-white to-emerald-50/70', circle: 'bg-emerald-100 text-emerald-600', ringTrack: 'stroke-emerald-100', ringStroke: 'stroke-emerald-500', ringText: 'text-emerald-700', icon: Target },
  learning: { card: 'border-sky-100 from-white to-sky-50/70', circle: 'bg-sky-100 text-sky-600', ringTrack: 'stroke-sky-100', ringStroke: 'stroke-sky-500', ringText: 'text-sky-700', icon: BookOpen },
  habit: { card: 'border-teal-100 from-white to-teal-50/70', circle: 'bg-teal-100 text-teal-700', ringTrack: 'stroke-teal-100', ringStroke: 'stroke-teal-500', ringText: 'text-teal-700', icon: Sparkles },
  standard: { card: 'border-slate-200 from-white to-slate-50', circle: 'bg-slate-100 text-slate-500', ringTrack: 'stroke-slate-200', ringStroke: 'stroke-slate-500', ringText: 'text-slate-700', icon: FileText },
};
const OVERDUE: Palette = { card: 'border-rose-200 from-white to-rose-50/80', circle: 'bg-rose-100 text-rose-600', ringTrack: 'stroke-rose-100', ringStroke: 'stroke-rose-500', ringText: 'text-rose-700', icon: CheckCircle2 };
const DONE: Palette = { ...ACCENT.goal, icon: Check };

const isDone = (r: NfRecord) => r.done === true || (r.status ? /done|complete/i.test(r.status) : false);
const dayParts = (ymd: string) => {
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
  return { month: new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short' }), day: d };
};

function Ring({ value, p }: { value: number; p: Palette }) {
  const size = 54, stroke = 6, rad = (size - stroke) / 2, c = 2 * Math.PI * rad, v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${Math.round(v)}%`}>
        <circle cx={size / 2} cy={size / 2} r={rad} fill="none" strokeWidth={stroke} className={p.ringTrack} />
        <circle cx={size / 2} cy={size / 2} r={rad} fill="none" strokeWidth={stroke} strokeLinecap="round" className={p.ringStroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span className={`absolute text-xs font-bold tabular-nums ${p.ringText}`}>{Math.round(v)}%</span>
    </div>
  );
}

/** One record. The same rounded gradient card for every table; colour and icon say which table it is. */
export function RecordRow({ r, leading, dense, onEdit, related, variant = 'standard' }: RowProps) {
  const done = isDone(r);
  const due = r.due ? formatDue(r.due, done) : null;
  const p = variant === 'task' && done ? DONE : variant === 'task' && due?.overdue ? OVERDUE : ACCENT[variant];
  const Icon = p.icon;
  const dueLabel = due ? `${variant === 'goal' ? 'Target ' : variant === 'project' ? 'Deadline ' : ''}${due.label}` : '';
  const when = variant === 'habit' ? dayParts(r.due ?? r.created) : null;

  const circle = r.progress !== null ? <Ring value={r.progress} p={p} />
    : when ? (
      <div className={`flex h-[54px] w-[54px] shrink-0 flex-col items-center justify-center rounded-full ${p.circle}`} aria-label={`${when.month} ${when.day}`}>
        <span className="text-[9px] font-semibold uppercase leading-none tracking-wide">{when.month}</span>
        <span className="text-lg font-bold leading-tight tabular-nums">{when.day}</span>
      </div>
    ) : <span className={`grid h-[54px] w-[54px] shrink-0 place-items-center rounded-full ${p.circle}`}><Icon size={22} /></span>;

  const btn = 'rounded-md p-1.5 text-slate-400 transition hover:bg-white/70 hover:text-slate-700';
  return (
    <li className={`flex items-center gap-4 rounded-2xl border bg-gradient-to-br transition hover:shadow-md ${p.card} ${dense ? 'p-3' : 'p-4'}`}>
      {leading}
      {circle}
      <div className="min-w-0 flex-1">
        <p className={`truncate font-semibold ${done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{r.title}</p>
        {(r.status || r.priority || due || (r.amount !== null && variant !== 'habit')) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {due && <Pill tone={due.overdue ? 'red' : due.today ? 'amber' : 'slate'}><Calendar size={12} /> {dueLabel}</Pill>}
            {r.priority && <Pill tone={priorityTone(r.priority)}>{r.priority}</Pill>}
            {r.status && <Pill tone={statusTone(r.status)}>{r.status}</Pill>}
            {r.amount !== null && variant !== 'habit' && <Pill tone="violet"><Hourglass size={12} /> {r.amount}</Pill>}
          </div>
        )}
        {related && <RelatedChips items={related} />}
      </div>
      {r.amount !== null && variant === 'habit' && <p className={`shrink-0 px-1 text-2xl font-bold tabular-nums ${p.ringText}`}>{r.amount}</p>}
      <div className="flex shrink-0 items-center">
        {onEdit && <button onClick={onEdit} aria-label={`Edit ${r.title}`} className={btn}><Pencil size={16} /></button>}
        <a href={r.url} target="_blank" rel="noreferrer" aria-label={`Open ${r.title} in Notion`} className={btn}><ExternalLink size={16} /></a>
      </div>
    </li>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative max-w-sm flex-1">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input className="input pl-9" placeholder={placeholder} aria-label={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
