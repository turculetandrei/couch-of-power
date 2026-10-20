import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Couch of Power',
    short_name: 'Couch',
    description: 'Jocul cu canapeaua: împarte bilețele pe un telefon sau joacă online.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#000000',
    theme_color: '#000000',
    lang: 'ro',
    categories: ['games', 'entertainment'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Doar împărțire nume', url: '/local', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Joc online', url: '/online', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
