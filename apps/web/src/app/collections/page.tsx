'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api, Collection, PageRef } from '@/lib/api';
import { PageCard } from '@/components/page-card';
import { iconFor } from '@/lib/icons';
import { ErrorBox, Loading, PageHeader } from '@/components/ui';

export default function Collections() {
  const q = useQuery({ queryKey: ['collections'], queryFn: () => api<Collection[]>('collections'), staleTime: 5 * 60_000 });
  const pages = useQuery({ queryKey: ['pages'], queryFn: () => api<PageRef[]>(`pages?tz=${-new Date().getTimezoneOffset()}`), staleTime: 5 * 60_000, retry: false });
  return (
    <div>
      <PageHeader title="Your tables" subtitle="Every Notion database connected to NotionFlow" />
      {q.isError ? <ErrorBox error={q.error} retry={() => q.refetch()} /> : !q.data ? <Loading /> : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {q.data.map((c) => {
            const Icon = iconFor(c.icon);
            const body = (
              <>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Icon size={20} /></span>
                <p className="mt-3 font-medium">{c.label}</p>
                <p className="text-xs text-slate-500">{c.configured ? (c.description ?? (c.discovered ? 'From your Notion home' : 'Open')) : 'Not configured'}</p>
              </>
            );
            return c.configured
              ? <Link key={c.key} href={`/c/${c.key}`} className="card transition hover:border-indigo-300">{body}</Link>
              : <div key={c.key} className="card opacity-50">{body}</div>;
          })}
        </div>
      )}
      {(pages.data ?? []).length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Pages</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {pages.data!.map((pg) => <PageCard key={pg.id} id={pg.id} title={pg.title} icon={pg.icon} iconName={pg.iconName} />)}
          </div>
        </section>
      )}
    </div>
  );
}
