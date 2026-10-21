import { ApiError } from '@/lib/api';

export function Loading() {
  return <div role="status" aria-busy="true" className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-md bg-slate-200" />)}<span className="sr-only">Loading</span></div>;
}
export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  const msg = error instanceof ApiError ? error.message : 'Something went wrong.';
  return (
    <div role="alert" className="card border-red-300 text-red-800">
      <p className="font-medium">{msg}</p>
      {retry && <button className="btn mt-2" onClick={retry}>Retry</button>}
    </div>
  );
}
export function Empty({ text }: { text: string }) {
  return <p className="card text-center text-slate-500">{text}</p>;
}
