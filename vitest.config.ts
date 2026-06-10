import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        // Node-side packages: shared domain + MCP server.
        test: {
          name: 'node',
          environment: 'node',
          include: ['forge-shared/**/*.test.ts', 'forge-mcp/**/*.test.ts'],
          exclude: ['**/node_modules/**', '**/dist/**'],
        },
      },
      {
        // Browser-side package: React PWA.
        plugins: [react()],
        test: {
          name: 'ui',
          environment: 'jsdom',
          globals: true,
          include: ['forge-ui/**/*.test.{ts,tsx}'],
          exclude: ['**/node_modules/**', '**/dist/**'],
          setupFiles: ['forge-ui/src/test/setup.ts'],
        },
      },
    ],
  },
});
