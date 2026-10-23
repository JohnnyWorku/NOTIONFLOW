'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { api, Collection, Meta } from '@/lib/api';
import { iconFor } from '@/lib/icons';
import { RecordDialog } from './record-dialog';

/** One button on Home: pick any connected table and add a record to it. */
export function QuickAdd({ collections }: { collections: Collection[] }) {
  const qc = useQueryClient();
  const [menu, setMenu] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  const meta = useQuery({ queryKey: ['meta', key], queryFn: () => api<Meta>(`c/${key}/meta`), enabled: !!key, staleTime: 5 * 60_000 });
  const list = collections.filter((c) => c.configured);
  if (list.length === 0) return null;

  return (
    <div className="relative">
      <button className="btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="menu">
        <Plus size={16} /> Quick add <ChevronDown size={14} />
      </button>
      {menu && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} aria-hidden />
          <ul role="menu" className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            {list.map((c) => {
              const Icon = iconFor(c.icon);
              return (
                <li key={c.key} role="none">
                  <button role="menuitem" className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => { setMenu(false); setKey(c.key); }}>
                    <Icon size={16} className="text-indigo-600" /> {c.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {key && (
        <RecordDialog
          ckey={key} meta={meta.data}
          onClose={() => setKey(null)}
          onSaved={() => { setKey(null); for (const k of ['c', 'dashboard', 'home', 'stats']) qc.invalidateQueries({ queryKey: [k] }); }}
          onConflict={() => undefined}
        />
      )}
    </div>
  );
}
