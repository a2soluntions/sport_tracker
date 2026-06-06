export default function manifest() {
  return {
    name: 'A2 Sport Trackers',
    short_name: 'A2 Trackers',
    description: 'Dashboard de Inteligência +EV',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0B0E',
    theme_color: '#0B0B0E',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      },
    ],
  }
}
