import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Mirrors tsconfig's "@/*" -> "./*" so tests can import the same '@/...'
// paths the app code uses (needed the moment a test imports a file that
// itself imports '@/lib/...', e.g. an app/api/**/route.ts handler).
export default defineConfig({
  // tsconfig sets jsx:"preserve" (Next compiles the JSX itself), which esbuild
  // inherits and then refuses to parse — so importing any .tsx from a test
  // fails on "invalid JS syntax". Tests that import a route module for its
  // generateMetadata (app/g/[slug]/metadata.test.ts) need the JSX in that same
  // file transformed, even though nothing is rendered.
  // `oxc`, not `esbuild` — Vite 8 transforms with Oxc and ignores the old
  // esbuild block entirely.
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
