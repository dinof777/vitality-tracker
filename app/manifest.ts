import type { MetadataRoute } from 'next';

// PWA manifest — installs to the iPhone Home Screen as a full-screen app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vitality Tracker',
    short_name: 'Vitality',
    description: 'Workout tracker for the Live Elevated / Vitality training philosophy.',
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
