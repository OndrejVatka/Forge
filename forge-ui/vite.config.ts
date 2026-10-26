import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { SUPABASE_REST_CACHE } from './src/lib/offline-cache.js';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Forge',
        short_name: 'Forge',
        description: 'AI-native project management for Claude Code & Codex',
        start_url: '/',
        display: 'standalone',
        // Graphite dark --bg (the default theme), so the splash and title bar
        // match the first paint. theme-boot.js retints the live theme-color.
        background_color: '#0b0c0e',
        theme_color: '#0b0c0e',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallbackDenylist: [/^\/auth/],
        runtimeCaching: [
          {
            // Cached board/ticket reads so the app shows last-known data offline.
            urlPattern: ({ url }) =>
              url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: SUPABASE_REST_CACHE,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              // 200 only: these are CORS fetches, so an opaque (status 0)
              // response would be an error or redirect cached as real data.
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://fonts.googleapis.com' ||
              url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'forge-google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
