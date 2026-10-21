import './globals.css';
import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { Nav } from '@/components/nav';

export const metadata: Metadata = { title: 'NotionFlow' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="md:flex">
            <Nav />
            <main className="mx-auto w-full max-w-4xl p-4 md:p-8">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
