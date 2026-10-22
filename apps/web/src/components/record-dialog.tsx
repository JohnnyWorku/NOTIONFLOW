'use client';
import { useEffect, useRef, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { api, ApiError, Meta, NfRecord } from '@/lib/api';
import { uuid } from '@/lib/hooks';

interface Draft { title: string; status: string; priority: string; due: string; done: boolean; progress: string; amount: string; notes: string }
const init = (r?: NfRecord): Draft => ({
  title: r?.title ?? '', status: r?.status ?? '', priority: r?.priority ?? '', due: r?.due?.slice(0, 10) ?? '',
  done: r?.done ?? false, progress: r?.progress?.toString() ?? '', amount: r?.amount?.toString() ?? '', notes: r?.notes ?? '',
});

interface Props {
  ckey: string; meta: Meta | undefined; record?: NfRecord; banner?: string;
  onClose: () => void; onSaved: () => void; onConflict: (current: NfRecord) => void;
}

/** Create / edit / delete one record. Only fields that exist in the Notion database's mapping are shown. */
export function RecordDialog({ ckey, meta, record, banner, onClose, onSaved, onConflict }: Props) {
  const [d, setD] = useState<Draft>(() => init(record));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const idem = useRef(uuid()); // one key per dialog => a retried "Create" never duplicates
  const has = (k: string) => !!meta?.fields[k];
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function validate(): string | null {
    if (!d.title.trim()) return 'Title is required.';
    if (d.progress !== '' && !(Number(d.progress) >= 0 && Number(d.progress) <= 100)) return 'Progress must be between 0 and 100.';
    if (d.amount !== '' && Number.isNaN(Number(d.amount))) return 'Amount must be a number.';
    return null;
  }

  async function save() {
    const problem = validate();
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      if (record) {
        const o = init(record);
        const changes: Record<string, unknown> = {};
        if (d.title.trim() !== o.title) changes.title = d.title.trim();
        if (has('status') && d.status && d.status !== o.status) changes.status = d.status;
        if (has('priority') && d.priority && d.priority !== o.priority) changes.priority = d.priority;
        if (has('due') && d.due !== o.due) changes.due = d.due || null;
        if (has('done') && d.done !== o.done) changes.done = d.done;
        if (has('progress') && d.progress !== o.progress && d.progress !== '') changes.progress = Number(d.progress);
        if (has('amount') && d.amount !== o.amount && d.amount !== '') changes.amount = Number(d.amount);
        if (has('notes') && d.notes !== o.notes) changes.notes = d.notes;
        if (Object.keys(changes).length === 0) return onClose();
        await api<NfRecord>(`c/${ckey}/${record.id}`, { method: 'PATCH', body: JSON.stringify({ expectedLastEdited: record.lastEdited, ...changes }) });
      } else {
        const body: Record<string, unknown> = { title: d.title.trim() };
        if (has('status') && d.status) body.status = d.status;
        if (has('priority') && d.priority) body.priority = d.priority;
        if (has('due') && d.due) body.due = d.due;
        if (has('done')) body.done = d.done;
        if (has('progress') && d.progress !== '') body.progress = Number(d.progress);
        if (has('amount') && d.amount !== '') body.amount = Number(d.amount);
        if (has('notes') && d.notes) body.notes = d.notes;
        await api<NfRecord>(`c/${ckey}`, { method: 'POST', headers: { 'idempotency-key': idem.current }, body: JSON.stringify(body) });
      }
      onSaved();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.body?.current) onConflict(e.body.current as NfRecord);
      else setError(e instanceof ApiError ? e.message : 'Could not save.');
      setBusy(false);
    }
  }

  async function remove() {
    if (!record) return;
    setBusy(true);
    try {
      await api(`c/${ckey}/${record.id}`, { method: 'DELETE' });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not delete.');
      setBusy(false);
    }
  }

  const choice = (k: 'status' | 'priority', label: string) => {
    const opts = meta?.options[k] ?? [];
    const values = d[k] && !opts.includes(d[k]) ? [d[k], ...opts] : opts;
    return (
      <div>
        <label htmlFor={`f-${k}`} className="mb-1 block text-sm font-medium">{label}</label>
        {values.length > 0 ? (
          <select id={`f-${k}`} className="input" value={d[k]} onChange={(e) => set(k, e.target.value)}>
            <option value="">—</option>
            {values.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input id={`f-${k}`} className="input" value={d[k]} onChange={(e) => set(k, e.target.value)} />
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 md:items-center md:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="dlg-title" className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl md:max-w-lg md:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="dlg-title" className="text-lg font-semibold">{record ? 'Edit' : 'New'} {meta?.label ? meta.label.replace(/s$/, '').toLowerCase() : 'record'}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>
        {banner && <p role="alert" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{banner}</p>}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="f-title" className="mb-1 block text-sm font-medium">Title</label>
            <input id="f-title" autoFocus className="input" value={d.title} onChange={(e) => set('title', e.target.value)} />
          </div>
          {has('status') && choice('status', 'Status')}
          {has('priority') && choice('priority', 'Priority')}
          {has('due') && (
            <div>
              <label htmlFor="f-due" className="mb-1 block text-sm font-medium">Date</label>
              <input id="f-due" type="date" className="input" value={d.due} onChange={(e) => set('due', e.target.value)} />
            </div>
          )}
          {has('progress') && (
            <div>
              <label htmlFor="f-progress" className="mb-1 block text-sm font-medium">Progress (0–100)</label>
              <input id="f-progress" inputMode="decimal" className="input" value={d.progress} onChange={(e) => set('progress', e.target.value)} />
            </div>
          )}
          {has('amount') && (
            <div>
              <label htmlFor="f-amount" className="mb-1 block text-sm font-medium">{meta?.fields.amount ?? 'Amount'}</label>
              <input id="f-amount" inputMode="decimal" className="input" value={d.amount} onChange={(e) => set('amount', e.target.value)} />
            </div>
          )}
          {has('done') && (
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
              <input type="checkbox" className="h-5 w-5 rounded accent-indigo-600" checked={d.done} onChange={(e) => set('done', e.target.checked)} />
              {meta?.fields.done ?? 'Done'}
            </label>
          )}
          {has('notes') && (
            <div className="md:col-span-2">
              <label htmlFor="f-notes" className="mb-1 block text-sm font-medium">Notes</label>
              <textarea id="f-notes" rows={3} className="input" value={d.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
          )}
        </div>

        {error && <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            {record && (confirmDelete ? (
              <span className="flex items-center gap-2 text-sm">
                <span className="text-rose-700">Move to Notion trash?</span>
                <button className="btn !bg-rose-600 hover:!bg-rose-700" onClick={remove} disabled={busy}>Yes, delete</button>
                <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>No</button>
              </span>
            ) : (
              <button className="btn-ghost !text-rose-700" onClick={() => setConfirmDelete(true)} disabled={busy}><Trash2 size={16} /> Delete</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn" onClick={save} disabled={busy}>{busy ? 'Saving…' : record ? 'Save changes' : 'Create'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
