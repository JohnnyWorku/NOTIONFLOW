import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api, Stats } from './api';

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/** crypto.randomUUID only exists in secure contexts (https/localhost); plain http on a LAN IP lacks it. */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function useStats(days: number) {
  return useQuery({
    queryKey: ['stats', days],
    queryFn: () => api<Stats>(`stats?days=${days}&tz=${-new Date().getTimezoneOffset()}`),
    staleTime: 60_000,
  });
}

export function shortDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
