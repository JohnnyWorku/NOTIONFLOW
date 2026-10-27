'use client';
import Link from 'next/link';
import { BookOpen, Calendar, Check, ExternalLink, FolderKanban, Hourglass, Link2, Pencil, Search, Target } from 'lucide-react';
import type { CardStyle, NfRecord, Related } from '@/lib/api';
import { formatDue, priorityTone, statusTone } from '@/lib/format';
import { Pill, ProgressBar } from './ui';

export function RelatedChips({ items }: { items: Related[] }) {
  if (items.length === 0) return null;
  const cls = 'inline-flex max-w-[11rem] items-center gap-1 truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600 hover:bg-indigo-50 hover:text-indigo-700';
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
  /** Card design. Each kind of table has its own: task, project, goal, learning, habit (log) or standard. */
  variant?: CardStyle;
}

const isDone = (r: NfRecord) => r.done === true || (r.status ? /done|complete/i.test(r.status) : false);
const dayParts = (ymd: string) => {
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
  return { month: new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short' }), day: d };
};

function Actions({ r, onEdit }: { r: NfRecord; onEdit?: () => void }) {
  const btn = 'rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700';
  return (
    <div className="flex shrink-0 items-center">
      {onEdit && <button onClick={onEdit} aria-label={`Edit ${r.title}`} className={btn}><Pencil size={16} /></button>}
      <a href={r.url} target="_blank" rel="noreferrer" aria-label={`Open ${r.title} in Notion`} className={btn}><ExternalLink size={16} /></a>
    </div>
  );
}

function Title({ r, done, className = '' }: { r: NfRecord; done: boolean; className?: string }) {
  return <p className={`truncate font-medium ${done ? 'text-slate-400 line-through' : 'text-slate-900'} ${className}`}>{r.title}</p>;
}

/** Small progress ring used by goal cards. */
function MiniRing({ value }: { value: number }) {
  const size = 54, stroke = 6, rad = (size - stroke) / 2, c = 2 * Math.PI * rad, v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${Math.round(v)}%`}>
        <circle cx={size / 2} cy={size / 2} r={rad} fill="none" strokeWidth={stroke} className="stroke-emerald-100" />
        <circle cx={size / 2} cy={size / 2} r={rad} fill="none" strokeWidth={stroke} strokeLinecap="round" className="stroke-emerald-500"
          strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span className="absolute text-xs font-bold tabular-nums text-emerald-700">{Math.round(v)}%</span>
    </div>
  );
}

function TaskCard({ r, leading, dense, onEdit, related }: RowProps) {
  const done = isDone(r);
  const due = r.due ? formatDue(r.due, done) : null;
  const stripe = done ? 'bg-emerald-400' : due?.overdue ? 'bg-rose-500' : priorityTone(r.priority) === 'red' ? 'bg-rose-500' : priorityTone(r.priority) === 'amber' ? 'bg-amber-400' : 'bg-slate-200';
  return (
    <li className={`relative flex items-start gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white pr-2 transition hover:shadow-sm ${dense ? 'py-2.5 pl-4' : 'py-3.5 pl-5'}`}>
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${stripe}`} />
      {leading}
      <div className="min-w-0 flex-1">
        <Title r={r} done={done} />
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {due && <Pill tone={due.overdue ? 'red' : due.today ? 'amber' : 'slate'}><Calendar size={12} /> {due.label}</Pill>}
          {r.priority && <Pill tone={priorityTone(r.priority)}>{r.priority}</Pill>}
          {r.status && <Pill tone={statusTone(r.status)}>{r.status}</Pill>}
        </div>
        {related && <RelatedChips items={related} />}
      </div>
      <Actions r={r} onEdit={onEdit} />
    </li>
  );
}

function ProjectCard({ r, leading, dense, onEdit, related }: RowProps) {
  const done = isDone(r);
  const due = r.due ? formatDue(r.due, done) : null;
  return (
    <li className={`flex items-start gap-3.5 rounded-2xl border border-slate-200 bg-white transition hover:shadow-md ${dense ? 'p-3' : 'p-4'}`}>
      {leading}
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm"><FolderKanban size={19} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Title r={r} done={done} className="text-[15px] font-semibold" />
          {r.status && <Pill tone={statusTone(r.status)}>{r.status}</Pill>}
        </div>
        {due && (
          <p className={`mt-1 flex items-center gap-1 text-xs ${due.overdue ? 'font-medium text-rose-600' : 'text-slate-500'}`}><Calendar size={12} /> Deadline {due.label}</p>
        )}
        {r.progress !== null && <ProgressBar value={r.progress} thick className="mt-3" />}
        {related && <RelatedChips items={related} />}
      </div>
      <Actions r={r} onEdit={onEdit} />
    </li>
  );
}

function GoalCard({ r, leading, dense, onEdit, related }: RowProps) {
  const done = isDone(r);
  const due = r.due ? formatDue(r.due, done) : null;
  return (
    <li className={`flex items-center gap-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70 transition hover:shadow-md ${dense ? 'p-3' : 'p-4'}`}>
      {leading}
      {r.progress !== null
        ? <MiniRing value={r.progress} />
        : <span className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Target size={22} /></span>}
      <div className="min-w-0 flex-1">
        <Title r={r} done={done} className="font-semibold" />
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {r.status && <Pill tone={statusTone(r.status)}>{r.status}</Pill>}
          {due && <Pill tone={due.overdue ? 'red' : 'green'}><Target size={12} /> Target {due.label}</Pill>}
        </div>
        {related && <RelatedChips items={related} />}
      </div>
      <Actions r={r} onEdit={onEdit} />
    </li>
  );
}

function LearningCard({ r, leading, dense, onEdit, related }: RowProps) {
  const done = isDone(r);
  const due = r.due ? formatDue(r.due, done) : null;
  return (
    <li className={`flex items-start gap-3 rounded-xl border border-sky-100 bg-white transition hover:shadow-sm ${dense ? 'p-3' : 'p-3.5'}`}>
      {leading}
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600"><BookOpen size={18} /></span>
      <div className="min-w-0 flex-1">
        <Title r={r} done={done} />
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {r.status && <Pill tone={statusTone(r.status)}>{r.status}</Pill>}
          {r.amount !== null && <Pill tone="blue"><Hourglass size={12} /> {r.amount}</Pill>}
          {due && <Pill tone={due.overdue ? 'red' : 'slate'}><Calendar size={12} /> {due.label}</Pill>}
        </div>
        {r.progress !== null && <ProgressBar value={r.progress} color="bg-sky-500" className="mt-2.5" />}
        {related && <RelatedChips items={related} />}
      </div>
      <Actions r={r} onEdit={onEdit} />
    </li>
  );
}

function HabitCard({ r, leading, dense, onEdit, related }: RowProps) {
  const done = isDone(r);
  const when = dayParts(r.due ?? r.created);
  return (
    <li className={`flex items-center gap-3 rounded-xl border border-teal-100 bg-white transition hover:shadow-sm ${dense ? 'p-2.5' : 'p-3'}`}>
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-teal-50 text-teal-700" aria-label={`${when.month} ${when.day}`}>
        <span className="text-[10px] font-semibold uppercase leading-none tracking-wide">{when.month}</span>
        <span className="text-lg font-bold leading-tight tabular-nums">{when.day}</span>
      </div>
      {leading}
      <div className="min-w-0 flex-1">
        <Title r={r} done={done} />
        {(r.status || (done && r.done === null)) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {r.status && <Pill tone={statusTone(r.status)}>{r.status}</Pill>}
            {done && r.done === null && <Pill tone="green"><Check size={12} /> Done</Pill>}
          </div>
        )}
        {related && <RelatedChips items={related} />}
      </div>
      {r.amount !== null && <p className="shrink-0 px-1 text-xl font-bold tabular-nums text-teal-700">{r.amount}</p>}
      <Actions r={r} onEdit={onEdit} />
    </li>
  );
}

function StandardCard({ r, leading, dense, onEdit, related }: RowProps) {
  const done = isDone(r);
  const due = r.due ? formatDue(r.due, done) : null;
  return (
    <li className={`flex items-start gap-3 rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm ${dense ? 'p-3' : 'p-4'}`}>
      {leading}
      <div className="min-w-0 flex-1">
        <Title r={r} done={done} />
        {(r.status || r.priority || due || r.amount !== null) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {r.status && <Pill tone={statusTone(r.status)}>{r.status}</Pill>}
            {r.priority && <Pill tone={priorityTone(r.priority)}>{r.priority}</Pill>}
            {due && <Pill tone={due.overdue ? 'red' : due.today ? 'amber' : 'slate'}><Calendar size={12} /> {due.label}</Pill>}
            {r.amount !== null && <Pill tone="violet">{r.amount}</Pill>}
          </div>
        )}
        {r.progress !== null && <ProgressBar value={r.progress} className="mt-2.5" />}
        {related && <RelatedChips items={related} />}
      </div>
      <Actions r={r} onEdit={onEdit} />
    </li>
  );
}

/** One record, drawn with the card design that suits its table. */
export function RecordRow(props: RowProps) {
  switch (props.variant) {
    case 'task': return <TaskCard {...props} />;
    case 'project': return <ProjectCard {...props} />;
    case 'goal': return <GoalCard {...props} />;
    case 'learning': return <LearningCard {...props} />;
    case 'habit': return <HabitCard {...props} />;
    default: return <StandardCard {...props} />;
  }
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative max-w-sm flex-1">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input className="input pl-9" placeholder={placeholder} aria-label={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
