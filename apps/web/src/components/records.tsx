'use client';
import { Calendar, ExternalLink, Pencil, Search } from 'lucide-react';
import type { NfRecord } from '@/lib/api';
import { formatDue, priorityTone, statusTone } from '@/lib/format';
import { Pill, ProgressBar } from './ui';

export function RecordRow({ r, leading, dense, onEdit }: { r: NfRecord; leading?: React.ReactNode; dense?: boolean; onEdit?: () => void }) {
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
