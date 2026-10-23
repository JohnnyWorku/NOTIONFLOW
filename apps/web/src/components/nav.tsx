'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Activity, CheckSquare, FolderKanban, GraduationCap, LayoutGrid, LayoutDashboard, LogOut, Settings, Smartphone, Target, Workflow, type LucideIcon } from 'lucide-react';
import { api, Collection, signOut } from '@/lib/api';
import { iconFor } from '@/lib/icons';

interface Item { href: string; label: string; icon: LucideIcon }
const MAIN: Item[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/stats', label: 'Statistics', icon: Activity },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/learning', label: 'Learning', icon: GraduationCap },
  { href: '/goals', label: 'Goals', icon: Target },
];
const TABS: Item[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/stats', label: 'Stats', icon: Activity },
  { href: '/collections', label: 'Tables', icon: LayoutGrid },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function Brand() {
  return (
    <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white"><Workflow size={18} /></span>
      NotionFlow
    </span>
  );
}

export function Nav() {
  const path = usePathname();
  const health = useQuery({ queryKey: ['health'], queryFn: () => api<{ notionConfigured: boolean }>('health'), refetchInterval: 60_000, retry: false });
  const cols = useQuery({ queryKey: ['collections'], queryFn: () => api<Collection[]>('collections'), staleTime: 5 * 60_000, retry: false });
  const extras = (cols.data ?? []).filter((c) => !c.builtin && c.configured);
  const [dot, text] = health.isError ? ['bg-rose-500', 'Backend offline']
    : health.data?.notionConfigured ? ['bg-emerald-500', 'Notion connected']
    : ['bg-amber-500', health.isLoading ? 'Checking…' : 'Notion not configured'];
  const active = (href: string) => path === href || path.startsWith(`${href}/`);
  const link = (href: string, label: string, Icon: LucideIcon) => (
    <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${active(href) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}>
      <Icon size={18} /> <span className="truncate">{label}</span>
    </Link>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white p-4 md:flex">
        <div className="px-2 py-3"><Brand /></div>
        <nav aria-label="Main" className="mt-4 flex flex-1 flex-col gap-1">
          {MAIN.map(({ href, label, icon }) => link(href, label, icon))}
          {extras.length > 0 && <p className="mt-4 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Your tables</p>}
          {extras.map((c) => link(`/c/${c.key}`, c.label, iconFor(c.icon)))}
          <div className="mt-auto space-y-1 border-t border-slate-100 pt-3">
            {link('/download', 'Get the app', Smartphone)}
            {link('/settings', 'Settings', Settings)}
            <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
              <LogOut size={18} /> Sign out
            </button>
            <p className="flex items-center gap-2 px-3 pt-2 text-xs text-slate-500"><span className={`h-2 w-2 rounded-full ${dot}`} />{text}</p>
          </div>
        </nav>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <Brand />
        <div className="flex items-center gap-1">
          <span className={`mr-2 h-2 w-2 rounded-full ${dot}`} title={text} />
          <Link href="/download" aria-label="Get the app" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Smartphone size={20} /></Link>
          <button onClick={signOut} aria-label="Sign out" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><LogOut size={20} /></button>
        </div>
      </header>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        {TABS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active(href) ? 'text-indigo-600' : 'text-slate-500'}`}>
            <Icon size={20} /> {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
