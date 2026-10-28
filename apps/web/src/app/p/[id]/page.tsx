'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { api, PageData } from '@/lib/api';
import { Empty, ErrorBox, Loading } from '@/components/ui';
import { NotionBlocks } from '@/components/notion-blocks';

/** A Notion page mirrored in the app: its text and sub-pages, plus every table on it as a live list with the view's own filter. */
export default function NotionPage() {
  const { id } = useParams<{ id: string }>();
  const q = useQuery({ queryKey: ['page', id], queryFn: () => api<PageData>(`pages/${id}?tz=${-new Date().getTimezoneOffset()}`) });
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />;
  if (!q.data) return <Loading />;
  const { page, related } = q.data;

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"><ArrowLeft size={14} /> Home</Link>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
          {page.icon && <span aria-hidden className="text-3xl">{page.icon}</span>}
          {page.title}
        </h1>
        {page.url && <a href={page.url} target="_blank" rel="noreferrer" className="btn-ghost">Open in Notion <ExternalLink size={14} /></a>}
      </header>
      {page.error ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{page.error}</p>
        : page.blocks.length === 0 ? <Empty text="This page is empty." />
        : <section className="card"><NotionBlocks blocks={page.blocks} related={related} /></section>}
      {(page.skipped > 0 || page.truncated) && (
        <p className="text-[11px] text-slate-400">
          {page.skipped > 0 && `${page.skipped} block${page.skipped === 1 ? '' : 's'} (images, embeds…) can’t be shown here. `}
          {page.truncated && 'Showing the first part of a long page.'}
        </p>
      )}
    </div>
  );
}
