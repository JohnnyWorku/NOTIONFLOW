'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api, Collection } from '@/lib/api';
import { CollectionView } from '@/components/collection-view';

export default function CustomCollection() {
  const { key } = useParams<{ key: string }>();
  const cols = useQuery({ queryKey: ['collections'], queryFn: () => api<Collection[]>('collections'), staleTime: 5 * 60_000 });
  const c = cols.data?.find((x) => x.key === key);
  return <CollectionView ckey={key} title={c?.label ?? key} subtitle={c?.description} />;
}
