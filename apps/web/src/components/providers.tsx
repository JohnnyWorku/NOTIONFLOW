'use client';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

/** Polls the cheap sync status; when the server version changes (app write or Notion webhook), refetch everything. */
function SyncWatcher() {
  const qc = useQueryClient();
  const path = usePathname();
  const enabled = path !== '/login' && path !== '/download';
  const last = useRef<number | null>(null);
  const { data } = useQuery({ queryKey: ['sync-status'], queryFn: () => api<{ version: number }>('sync/status'), refetchInterval: 15_000, retry: false, enabled });
  useEffect(() => {
    if (!data) return;
    if (last.current !== null && last.current !== data.version) qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'sync-status' });
    last.current = data.version;
  }, [data, qc]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true } } }));
  return (
    <QueryClientProvider client={client}>
      <SyncWatcher />
      {children}
    </QueryClientProvider>
  );
}
