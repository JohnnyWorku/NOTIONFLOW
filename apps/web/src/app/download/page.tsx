'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, Copy, Download, ShieldCheck, Smartphone, Workflow } from 'lucide-react';
import { formatBytes } from '@/lib/format';
import { ErrorBox, Loading, Pill } from '@/components/ui';

interface Info { url: string; version: string; sha256?: string; sizeBytes?: number; builtAt?: string | null }

async function fetchInfo(): Promise<Info | null> {
  const res = await fetch('/api/apk-info', { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Could not load app info');
  return res.json();
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button className="btn-ghost !px-2.5 !py-1.5" aria-label={label}
      onClick={async () => { try { await navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard unavailable on plain http */ } }}>
      {done ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

const STEPS = [
  'Tap Download on your Android phone.',
  'Open the downloaded file. Android will ask you to allow installs from this browser (“Install unknown apps”). This is normal for apps not from Google Play.',
  'Tap Install, then Open.',
  'Enter the server address below and your NotionFlow password on the app’s sign-in screen.',
];

export default function DownloadPage() {
  const q = useQuery({ queryKey: ['apk-info'], queryFn: fetchInfo, retry: false });
  const [apiUrl, setApiUrl] = useState('');
  const [isLocal, setIsLocal] = useState(false);
  useEffect(() => {
    const { protocol, hostname, host } = window.location;
    const local = hostname === 'localhost' || hostname === '127.0.0.1';
    setIsLocal(local);
    // On a deployed site the backend lives elsewhere: the owner sets it in settings. Offer the LAN guess only on http.
    setApiUrl(protocol === 'http:' ? `http://${hostname}:4000/api` : `https://${host.replace(/^www\./, '')}/api`);
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white"><Workflow size={18} /></span> NotionFlow
        </span>
        <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:underline">Open web app →</Link>
      </header>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Get the Android app</h1>
        <p className="mt-1 text-sm text-slate-500">Same Notion data as the website, native on your phone.</p>
      </div>

      <section className="card">
        {q.isLoading ? <Loading /> : q.isError ? <ErrorBox error={q.error} retry={() => q.refetch()} /> : !q.data ? (
          <div className="space-y-2">
            <p className="font-medium">The app hasn’t been published yet.</p>
            <p className="text-sm text-slate-500">Build it with <code className="rounded bg-slate-100 px-1">./scripts/publish-apk.sh</code>. For a deployed site, upload the APK somewhere public and set the <code className="rounded bg-slate-100 px-1">APK_URL</code> environment variable (see docs/deployment.md).</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-white"><Smartphone size={26} /></span>
              <div>
                <p className="font-semibold">NotionFlow for Android</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Pill tone="violet">v{q.data.version}</Pill>
                  {!!q.data.sizeBytes && <Pill>{formatBytes(q.data.sizeBytes)}</Pill>}
                  {q.data.builtAt && <Pill>Built {new Date(q.data.builtAt).toLocaleDateString()}</Pill>}
                </div>
              </div>
            </div>
            <a href={q.data.url} download className="btn !px-5 !py-3"><Download size={18} /> Download APK</a>
          </div>
        )}
        {q.data?.sha256 && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="flex items-center gap-2 text-xs font-medium text-slate-600"><ShieldCheck size={14} /> SHA-256 checksum (to verify the download)</p>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-600">{q.data.sha256}</code>
              <CopyButton text={q.data.sha256} label="Copy checksum" />
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">How to install</h2>
        <ol className="space-y-3">
          {STEPS.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">{i + 1}</span>
              <span className="pt-0.5 text-slate-700">{s}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h2 className="mb-1 font-semibold">Server address for the app</h2>
        <p className="mb-3 text-sm text-slate-500">
          {isLocal
            ? 'You opened this via localhost. On your phone use your laptop’s Wi-Fi IP instead (run hostname -I on the laptop).'
            : 'Use your backend’s API address (ends in /api). If you are on the same Wi-Fi as the server, this is a likely value:'}
        </p>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded bg-slate-100 px-2 py-1.5 text-sm">{apiUrl || '…'}</code>
          <CopyButton text={apiUrl} label="Copy API URL" />
        </div>
        <p className="mt-3 text-xs text-slate-500">You sign in with the same password as the website. Nothing secret is shown on this page.</p>
      </section>
    </div>
  );
}
