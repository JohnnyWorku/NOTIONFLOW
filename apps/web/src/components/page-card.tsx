import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { iconFor } from '@/lib/icons';

/** A Notion page as a card (same look as the record cards, amber accent). */
export function PageCard({ id, title, icon, iconName, subtitle }: { id: string; title: string; icon?: string; iconName?: string; subtitle?: string }) {
  const Icon = iconFor(iconName ?? 'folder');
  return (
    <Link href={`/p/${id}`} className="flex items-center gap-4 rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/70 p-4 transition hover:shadow-md">
      <span className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-full bg-amber-100 text-2xl text-amber-600" aria-hidden>
        {icon ?? <Icon size={22} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{title}</p>
        <p className="text-xs text-slate-500">{subtitle ?? 'Notion page'}</p>
      </div>
      <ChevronRight size={18} className="shrink-0 text-slate-400" />
    </Link>
  );
}
