import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Mirrors tsconfig's "@/*" -> "./*" so tests can import the same '@/...'
// paths the app code uses (needed the moment a test imports a file that
// itself imports '@/lib/...', e.g. an app/api/**/route.ts handler).
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
