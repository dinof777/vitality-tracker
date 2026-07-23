import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// PWA manifest — installs to the iPhone Home Screen as a full-screen app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: SITE_URL,
    name: 'Live Elevated',
    short_name: 'Live Elevated',
    description: 'Workout tracker for the Live Elevated training philosophy.',
    start_url: '/',
    display: 'standalone',
    background_color: '#121316',
    theme_color: '#121316',
    orientation: 'portrait',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
