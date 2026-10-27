import Link from 'next/link';
import { ExternalLink, FileText, Table2 } from 'lucide-react';
import type { Block, NfRecord, Related, Seg } from '@/lib/api';
import { RecordRow } from './records';

function Rich({ segs }: { segs?: Seg[] }) {
  return (
    <>
      {(segs ?? []).map((s, i) => {
        let node: React.ReactNode = s.text;
        if (s.code) node = <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.85em]">{node}</code>;
        if (s.bold) node = <strong>{node}</strong>;
        if (s.italic) node = <em>{node}</em>;
        if (s.strike) node = <s>{node}</s>;
        if (s.href) node = <a href={s.href} target="_blank" rel="noreferrer" className="text-indigo-600 underline">{node}</a>;
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}

const EMPTY: Record<string, string> = { today: 'Nothing due today.', week: 'Nothing due this week.', overdue: 'Nothing overdue.', upcoming: 'Nothing upcoming.', open: 'Nothing open.' };

/** A database view from your Notion page, filled with live records from the matching table. */
function LiveView({ b, related }: { b: Block; related: Record<string, Related> }) {
  const items: NfRecord[] = b.items ?? [];
  return (
    <div className="space-y-2">
      {b.error ? (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">{b.error}</p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500">{b.exact ? 'Nothing in this view right now.' : EMPTY[b.preset ?? ''] ?? 'Nothing here yet.'}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <RecordRow key={r.id} r={r} dense variant={b.style} related={(r.relatedIds ?? []).map((id) => related[id]).filter((x): x is Related => !!x)} />
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {b.collectionKey && <Link href={`/c/${b.collectionKey}`} className="font-medium text-indigo-600 hover:underline">Open table →</Link>}
        {b.viewUrl && <a href={b.viewUrl} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 hover:underline">{b.hasMore ? 'See the rest in Notion ↗' : 'Open this view in Notion ↗'}</a>}
        <span className="text-slate-400">
          {b.exact ? `Same filter as your Notion view${b.viewName ? ` “${b.viewName}”` : ''}` : 'Approximate filter, read from the heading'}
        </span>
      </div>
    </div>
  );
}

function Tile({ b }: { b: Block }) {
  const label = b.title ?? (b.heading ? `Open “${b.heading.trim()}” in Notion` : b.collectionKey ? 'Open table' : 'Open in Notion');
  const inner = (
    <>
      {b.type === 'database' ? <Table2 size={16} className="text-indigo-600" /> : <FileText size={16} className="text-slate-500" />}
      <span className="truncate">{label}</span>
      {!b.collectionKey && <ExternalLink size={13} className="ml-auto text-slate-400" />}
    </>
  );
  const cls = 'flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium transition hover:border-indigo-300';
  return b.collectionKey
    ? <Link href={`/c/${b.collectionKey}`} className={cls}>{inner}</Link>
    : <a href={b.url} target="_blank" rel="noreferrer" className={cls}>{inner}</a>;
}

function One({ b, n, related }: { b: Block; n: number; related: Record<string, Related> }) {
  const kids = b.children?.length ? <div className="ml-5 mt-1"><NotionBlocks blocks={b.children} related={related} /></div> : null;
  switch (b.type) {
    case 'heading': {
      const cls = b.level === 1 ? 'text-xl font-semibold' : b.level === 2 ? 'text-lg font-semibold' : 'font-semibold';
      return <p className={`${cls} mt-3 first:mt-0`}><Rich segs={b.text} /></p>;
    }
    case 'text': return <p className="text-sm leading-relaxed text-slate-700"><Rich segs={b.text} /></p>;
    case 'bullet': return <div className="text-sm text-slate-700"><div className="flex gap-2"><span aria-hidden>•</span><span><Rich segs={b.text} /></span></div>{kids}</div>;
    case 'number': return <div className="text-sm text-slate-700"><div className="flex gap-2"><span className="tabular-nums" aria-hidden>{n}.</span><span><Rich segs={b.text} /></span></div>{kids}</div>;
    case 'todo': return (
      <div className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={!!b.checked} readOnly disabled className="mt-1 accent-indigo-600" aria-label={b.checked ? 'Done' : 'Not done'} />
        <span className={b.checked ? 'text-slate-400 line-through' : 'text-slate-700'}><Rich segs={b.text} /></span>
      </div>
    );
    case 'callout': return (
      <div className="flex gap-3 rounded-xl bg-indigo-50 p-3 text-sm text-slate-800">
        {b.icon && <span className="text-lg leading-none" aria-hidden>{b.icon}</span>}
        <div className="min-w-0"><Rich segs={b.text} />{kids}</div>
      </div>
    );
    case 'quote': return <blockquote className="border-l-4 border-slate-300 pl-3 text-sm italic text-slate-600"><Rich segs={b.text} />{kids}</blockquote>;
    case 'divider': return <hr className="border-slate-200" />;
    case 'toggle': return (
      <details className="text-sm"><summary className="cursor-pointer font-medium"><Rich segs={b.text} /></summary>{kids}</details>
    );
    case 'columns': return (
      <div className="grid gap-4 md:grid-cols-[repeat(auto-fit,minmax(0,1fr))]">
        {(b.children ?? []).map((c) => <div key={c.id} className="min-w-0"><NotionBlocks blocks={c.children ?? []} related={related} /></div>)}
      </div>
    );
    case 'column': return <NotionBlocks blocks={b.children ?? []} related={related} />;
    case 'database': return b.items || b.error ? <LiveView b={b} related={related} /> : <Tile b={b} />;
    case 'page': case 'link': return <Tile b={b} />;
    default: return null;
  }
}

/** Renders a simplified mirror of a Notion page. Read-only by design. */
export function NotionBlocks({ blocks, related = {} }: { blocks: Block[]; related?: Record<string, Related> }) {
  let n = 0;
  return (
    <div className="space-y-2">
      {blocks.map((b) => {
        n = b.type === 'number' ? n + 1 : 0;
        return <One key={b.id} b={b} n={n} related={related} />;
      })}
    </div>
  );
}
