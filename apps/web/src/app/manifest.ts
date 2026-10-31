import type { MetadataRoute } from 'next';

/** Lets phones "Add to Home screen" with the NotionFlow icon and open it like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NotionFlow',
    short_name: 'NotionFlow',
    description: 'Your Notion workspace, focused.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F8FAFC',
    theme_color: '#4F46E5',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
