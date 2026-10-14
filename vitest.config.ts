import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': new URL('.', import.meta.url).pathname } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'public-api',
          include: ['tests/public-api/**/*.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: 'time-interval',
          include: ['tests/vendor/d3-time/**/*.test.js'],
          pool: 'forks',
          env: { TZ: 'America/Los_Angeles' },
        },
      },
    ],
    testTimeout: 30000,
    expect: { poll: { timeout: 10000 } },
  },
});
