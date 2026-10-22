import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/providers';
import { Shell } from '@/components/shell';

export const metadata: Metadata = { title: 'NotionFlow', description: 'Your Notion workspace, focused.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#4f46e5' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
