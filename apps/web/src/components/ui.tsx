import { AlertTriangle, Inbox, type LucideIcon } from 'lucide-react';
import { ApiError } from '@/lib/api';
import type { Tone } from '@/lib/format';

const PILL: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
};
export const ICON_TONE: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-600',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-rose-50 text-rose-600',
  violet: 'bg-violet-50 text-violet-600',
};

export function Pill({ tone = 'slate', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${PILL[tone]}`}>
      {children}
    </span>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ProgressBar({ value, className = '', thick = false, color = 'bg-indigo-500' }: { value: number; className?: string; thick?: boolean; color?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${thick ? 'h-2.5' : 'h-1.5'} flex-1 overflow-hidden rounded-full bg-slate-100`} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${v}%` }} />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-slate-500">{Math.round(v)}%</span>
    </div>
  );
}

export function Loading() {
  return (
    <div role="status" aria-busy="true" className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-[72px] animate-pulse rounded-xl border border-slate-200 bg-white" />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  const msg = error instanceof ApiError ? error.message : 'Something went wrong.';
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium">{msg}</p>
        {retry && <button className="btn-ghost mt-3" onClick={retry}>Try again</button>}
      </div>
    </div>
  );
}

export function Empty({ text, icon: Icon = Inbox }: { text: string; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
      <Icon size={28} className="text-slate-400" />
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}
