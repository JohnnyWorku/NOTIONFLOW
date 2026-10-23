'use client';
import { Calendar, ExternalLink, Link2, Pencil, Search } from 'lucide-react';
import Link from 'next/link';
import type { NfRecord, Related } from '@/lib/api';
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

export function RecordRow({ r, leading, dense, onEdit, related }: { r: NfRecord; leading?: React.ReactNode; dense?: boolean; onEdit?: () => void; related?: Related[] }) {
  const done = r.done === true || (r.status ? /done|complete/i.test(r.status) : false);
  const due = r.due ? formatDue(r.due, done) : null;
  return (
    <li className={`flex items-start gap-3 rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm ${dense ? 'p-3' : 'p-4'}`}>
      {leading}
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium ${done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{r.title}</p>
        {(r.status || r.priority || due || r.amount !== null) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {r.status && <Pill tone={statusTone(r.status)}>{r.status}</Pill>}
            {r.priority && <Pill tone={priorityTone(r.priority)}>{r.priority}</Pill>}
            {due && (
              <Pill tone={due.overdue ? 'red' : due.today ? 'amber' : 'slate'}>
                <Calendar size={12} /> {due.label}
              </Pill>
            )}
            {r.amount !== null && <Pill tone="violet">{r.amount}</Pill>}
          </div>
        )}
        {r.progress !== null && <ProgressBar value={r.progress} className="mt-2.5" />}
        {related && <RelatedChips items={related} />}
      </div>
      {onEdit && (
        <button onClick={onEdit} aria-label={`Edit ${r.title}`} className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
          <Pencil size={16} />
        </button>
      )}
      <a href={r.url} target="_blank" rel="noreferrer" aria-label={`Open ${r.title} in Notion`}
        className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
        <ExternalLink size={16} />
      </a>
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
