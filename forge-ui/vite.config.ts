import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { SUPABASE_REST_CACHE } from './src/lib/offline-cache.js';

/**
 * Vendor groups split out of the entry chunk. Everything here is needed at
 * boot (auth runs before the first route), so splitting doesn't shrink the
 * first load. It keeps every chunk under Rollup's 500 kB warning, and an
 * app-only deploy invalidates just the small entry instead of the vendors the
 * PWA has already cached.
 */
const VENDOR_CHUNKS: ReadonlyArray<readonly [name: string, pattern: RegExp]> = [
  ['supabase', /\/node_modules\/(@supabase|iceberg-js)\//],
  ['react', /\/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//],
  ['query', /\/node_modules\/@tanstack\//],
];

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          return VENDOR_CHUNKS.find(([, pattern]) => pattern.test(id))?.[0];
        },
      },
    },
  },
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
