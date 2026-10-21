'use client';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { api, Kind, NfRecord, Page } from '@/lib/api';
import { Empty, ErrorBox, Loading } from './ui';

export function RecordRow({ r, right }: { r: NfRecord; right?: React.ReactNode }) {
  return (
    <li className="card flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{r.title}</p>
        <p className="text-xs text-slate-500">
          {[r.status, r.priority, r.due && `due ${r.due.slice(0, 10)}`, r.progress !== null && `${r.progress}%`].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {right}
        <a href={r.url} target="_blank" rel="noreferrer" aria-label={`Open ${r.title} in Notion`} className="text-slate-500 hover:text-slate-900"><ExternalLink size={16} /></a>
      </div>
    </li>
  );
}

/** Generic searchable, paginated list used by projects, goals and learning. */
export function RecordList({ kind, emptyText }: { kind: Kind; emptyText: string }) {
  const [search, setSearch] = useState('');
  const q = useQuery({
    queryKey: [kind, search],
    queryFn: () => api<Page<NfRecord>>(`${kind}?pageSize=50${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  });
  return (
    <div className="space-y-3">
      <input className="input" placeholder="Search…" aria-label="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
      {q.isLoading ? <Loading /> : q.isError ? <ErrorBox error={q.error} retry={() => q.refetch()} /> :
        q.data!.items.length === 0 ? <Empty text={emptyText} /> :
        <ul className="space-y-2">{q.data!.items.map((r) => <RecordRow key={r.id} r={r} />)}</ul>}
    </div>
  );
}
