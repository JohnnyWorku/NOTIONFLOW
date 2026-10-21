'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const links = [['/dashboard', 'Dashboard'], ['/tasks', 'Tasks'], ['/projects', 'Projects'], ['/learning', 'Learning'], ['/goals', 'Goals'], ['/settings', 'Settings']];

export function Nav() {
  const path = usePathname();
  const health = useQuery({ queryKey: ['health'], queryFn: () => api<{ notionConfigured: boolean }>('health'), refetchInterval: 60_000, retry: false });
  const status = health.isError ? 'Backend offline' : health.data?.notionConfigured ? 'Notion connected' : 'Notion not configured';
  return (
    <nav aria-label="Main" className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white p-2 md:h-screen md:w-56 md:flex-col md:border-b-0 md:border-r">
      <span className="hidden px-3 py-2 text-lg font-semibold md:block">NotionFlow</span>
      {links.map(([href, label]) => (
        <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}
          className={`whitespace-nowrap rounded-md px-3 py-2 text-sm ${path === href ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}>{label}</Link>
      ))}
      <span className="ml-auto self-center px-3 text-xs text-slate-500 md:mt-auto md:ml-0">{status}</span>
    </nav>
  );
}
