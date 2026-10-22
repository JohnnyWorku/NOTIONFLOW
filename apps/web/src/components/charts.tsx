import { shortDate } from '@/lib/hooks';
import type { Tally } from '@/lib/api';

export function BarChart({ data, height = 120, unit = '' }: { data: { label: string; value: number }[]; height?: number; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height }} role="img" aria-label={`Bar chart, total ${total}${unit}`}>
        {data.map((d) => (
          <div key={d.label} className="relative h-full flex-1" title={`${shortDate(d.label)}: ${d.value}${unit}`}>
            <div
              className={`absolute inset-x-0 bottom-0 rounded-sm ${d.value ? 'bg-indigo-500' : 'bg-slate-200'}`}
              style={{ height: d.value ? `${Math.max(8, (d.value / max) * 100)}%` : 4 }}
            />
          </div>
        ))}
      </div>
      {data.length > 1 && (
        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
          <span>{shortDate(data[0].label)}</span><span>{shortDate(data[data.length - 1].label)}</span>
        </div>
      )}
    </div>
  );
}

export function Ring({ value, size = 104, caption }: { value: number | null; size?: number; caption?: string }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={value === null ? 'No data' : `${v}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-slate-100" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          className="stroke-indigo-500 transition-all" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-xl font-semibold tabular-nums">{value === null ? '—' : `${v}%`}</p>
        {caption && <p className="text-[10px] text-slate-500">{caption}</p>}
      </div>
    </div>
  );
}

export function Breakdown({ items }: { items: Tally[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (items.length === 0) return <p className="text-sm text-slate-500">No data.</p>;
  return (
    <ul className="space-y-2">
      {items.slice(0, 8).map((i) => (
        <li key={i.name} className="text-sm">
          <div className="mb-1 flex justify-between"><span className="truncate">{i.name}</span><span className="tabular-nums text-slate-500">{i.count}</span></div>
          <div className="h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-400" style={{ width: `${(i.count / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
