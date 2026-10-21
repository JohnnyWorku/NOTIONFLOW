'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRef, useState } from 'react';
import { api, ApiError, NfRecord, Page } from '@/lib/api';
import { taskSchema, TaskForm } from '@/lib/schemas';
import { Empty, ErrorBox, Loading } from '@/components/ui';
import { RecordRow } from '@/components/records';

export default function Tasks() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [overdue, setOverdue] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // One idempotency key per form submission attempt; regenerated only after success so retries never duplicate.
  const idem = useRef<string>(crypto.randomUUID());
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TaskForm>({ resolver: zodResolver(taskSchema) });

  const list = useQuery({
    queryKey: ['tasks', search, overdue],
    queryFn: () => api<Page<NfRecord>>(`tasks?pageSize=50${search ? `&search=${encodeURIComponent(search)}` : ''}${overdue ? '&overdue=true' : ''}`),
  });

  const create = useMutation({
    mutationFn: (v: TaskForm) => api<NfRecord>('tasks', { method: 'POST', headers: { 'idempotency-key': idem.current }, body: JSON.stringify({ ...v, due: v.due || undefined, priority: v.priority || undefined, notes: v.notes || undefined }) }),
    onSuccess: () => { idem.current = crypto.randomUUID(); reset(); setNotice(null); qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });

  const toggle = useMutation({
    mutationFn: (r: NfRecord) => api<NfRecord>(`tasks/${r.id}`, { method: 'PATCH', body: JSON.stringify({ expectedLastEdited: r.lastEdited, done: !r.done }) }),
    onSuccess: () => { setNotice(null); qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 409) { setNotice('This task changed in Notion. The list was refreshed; please retry.'); qc.invalidateQueries({ queryKey: ['tasks'] }); }
      else setNotice(e instanceof ApiError ? e.message : 'Update failed.');
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tasks</h1>
      <form onSubmit={handleSubmit((v) => create.mutate(v))} className="card grid gap-3 md:grid-cols-4" noValidate>
        <div className="md:col-span-2">
          <label htmlFor="title" className="text-sm font-medium">Title</label>
          <input id="title" className="input" aria-invalid={!!errors.title} {...register('title')} />
          {errors.title && <p role="alert" className="text-xs text-red-700">{errors.title.message}</p>}
        </div>
        <div><label htmlFor="priority" className="text-sm font-medium">Priority</label><input id="priority" className="input" placeholder="e.g. High" {...register('priority')} /></div>
        <div>
          <label htmlFor="due" className="text-sm font-medium">Due</label>
          <input id="due" type="date" className="input" {...register('due')} />
          {errors.due && <p role="alert" className="text-xs text-red-700">{errors.due.message}</p>}
        </div>
        <div className="md:col-span-4"><button className="btn" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create task'}</button>
          {create.isError && <span role="alert" className="ml-3 text-sm text-red-700">{create.error instanceof ApiError ? create.error.message : 'Failed'}</span>}</div>
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <input className="input max-w-xs" placeholder="Search tasks…" aria-label="Search tasks" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={overdue} onChange={(e) => setOverdue(e.target.checked)} /> Overdue only</label>
      </div>
      {notice && <p role="alert" className="card border-amber-300 text-amber-900">{notice}</p>}

      {list.isLoading ? <Loading /> : list.isError ? <ErrorBox error={list.error} retry={() => list.refetch()} /> :
        list.data!.items.length === 0 ? <Empty text="No tasks found." /> :
        <ul className="space-y-2">
          {list.data!.items.map((r) => (
            <RecordRow key={r.id} r={r} right={
              r.done !== null && <input type="checkbox" aria-label={`Mark ${r.title} ${r.done ? 'incomplete' : 'complete'}`} checked={r.done} disabled={toggle.isPending} onChange={() => toggle.mutate(r)} />
            } />
          ))}
        </ul>}
    </div>
  );
}
