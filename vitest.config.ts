import { defineConfig } from 'vitest/config';

// Plain vitest config (no Astro integration needed: we only unit-test pure TS modules).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
