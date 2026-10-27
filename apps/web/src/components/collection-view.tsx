'use client';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Inbox, Plus, X } from 'lucide-react';
import { api, ApiError, Meta, NfRecord, Page } from '@/lib/api';
import { useDebounced } from '@/lib/hooks';
import { Empty, ErrorBox, Loading, PageHeader } from './ui';
import { RecordRow, SearchBox } from './records';
import { RecordDialog } from './record-dialog';

interface DialogState { record?: NfRecord; banner?: string }

/** One component powers Tasks, Projects, Goals, Learning and every custom table. */
export function CollectionView({ ckey, title, subtitle }: { ckey: string; title: string; subtitle?: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const q = useDebounced(search, 300);
  const [overdue, setOverdue] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const meta = useQuery({ queryKey: ['meta', ckey], queryFn: () => api<Meta>(`c/${ckey}/meta`), staleTime: 5 * 60_000 });
  const list = useInfiniteQuery({
    queryKey: ['c', ckey, q, overdue],
    queryFn: ({ pageParam }) =>
      api<Page<NfRecord>>(`c/${ckey}?pageSize=30${q ? `&search=${encodeURIComponent(q)}` : ''}${overdue ? '&overdue=true' : ''}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['c', ckey] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['stats'] });
  };

  const toggle = useMutation({
    mutationFn: (r: NfRecord) => api<NfRecord>(`c/${ckey}/${r.id}`, { method: 'PATCH', body: JSON.stringify({ expectedLastEdited: r.lastEdited, done: !r.done }) }),
    onSuccess: () => { setNotice(null); refresh(); },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 409) { setNotice('This record changed in Notion. The list was refreshed; please try again.'); refresh(); }
      else setNotice(e instanceof ApiError ? e.message : 'Update failed.');
    },
  });

  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const hasDue = !!meta.data?.fields.due && !!meta.data?.fields.done;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title} subtitle={subtitle}
        action={<button className="btn" onClick={() => setDialog({})}><Plus size={16} /> New</button>}
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder={`Search ${title.toLowerCase()}…`} />
        {hasDue && (
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5" role="group" aria-label="Filter">
            {([['All', false], ['Overdue', true]] as const).map(([label, val]) => (
              <button key={label} onClick={() => setOverdue(val)} aria-pressed={overdue === val}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${overdue === val ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {notice && (
        <p role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {notice}
          <button aria-label="Dismiss" onClick={() => setNotice(null)}><X size={16} /></button>
        </p>
      )}

      {list.isError ? <ErrorBox error={list.error} retry={() => list.refetch()} /> : !list.data ? <Loading /> :
        items.length === 0 ? <Empty icon={Inbox} text={overdue ? 'Nothing overdue. Nice work!' : `No ${title.toLowerCase()} found.`} /> : (
          <>
            <ul className="space-y-2.5">
              {items.map((r) => (
                <RecordRow key={r.id} r={r} variant={meta.data?.style} onEdit={() => setDialog({ record: r })} leading={
                  r.done !== null ? (
                    <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 accent-indigo-600"
                      aria-label={`Mark ${r.title} ${r.done ? 'incomplete' : 'complete'}`} checked={r.done} disabled={toggle.isPending} onChange={() => toggle.mutate(r)} />
                  ) : undefined
                } />
              ))}
            </ul>
            {list.hasNextPage && (
              <div className="text-center">
                <button className="btn-ghost" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
                  {list.isFetchingNextPage ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}

      {dialog && (
        <RecordDialog
          key={`${dialog.record?.id ?? 'new'}-${dialog.record?.lastEdited ?? ''}`}
          ckey={ckey} meta={meta.data} record={dialog.record} banner={dialog.banner}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); refresh(); }}
          onConflict={(current) => { refresh(); setDialog({ record: current, banner: 'This record changed in Notion. The latest version is loaded below; review it and save again.' }); }}
        />
      )}
    </div>
  );
}
