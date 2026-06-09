import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  sourcemap: true,
  // Inline the workspace package (it ships .ts source, not built JS) so the
  // bundle is self-contained at runtime. Other deps stay external (installed
  // from node_modules in production).
  noExternal: ['@forge/shared'],
});
