import type { MetadataRoute } from 'next';

// PWA manifest — installs to the iPhone Home Screen as a full-screen app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vitality Tracker',
    short_name: 'Vitality',
    description: 'Workout tracker for the Live Elevated / Vitality training philosophy.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0B0C',
    theme_color: '#0B0B0C',
    orientation: 'portrait',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
