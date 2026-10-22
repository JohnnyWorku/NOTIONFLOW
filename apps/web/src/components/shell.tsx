'use client';
import { usePathname } from 'next/navigation';
import { Nav } from './nav';

/** Public pages (/login, /download) render without the app chrome. */
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === '/login' || path === '/download') return <>{children}</>;
  return (
    <div className="min-h-screen md:flex">
      <Nav />
      <main className="min-w-0 flex-1 pb-24 md:pb-10">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">{children}</div>
      </main>
    </div>
  );
}
