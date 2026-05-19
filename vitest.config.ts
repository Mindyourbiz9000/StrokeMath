import { defineConfig } from 'vitest/config';

// Standalone config so the PWA/React plugins from vite.config aren't loaded
// during unit tests (the engine + geo helpers are pure, node-environment).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
