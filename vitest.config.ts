import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': new URL('.', import.meta.url).pathname } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'public-api',
          exclude: ['tests/public-api/apps-*.test.ts'],
          include: ['tests/public-api/**/*.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['tests/public-api/apps-*.test.ts'],
          globalSetup: ['tests/public-api/fixtures/setup.ts'],
        },
      },
      {
        extends: true,
        test: { name: 'release', include: ['tests/release/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'time-interval',
          include: ['tests/vendor/d3-time/**/*.test.{js,ts}'],
          pool: 'forks',
          env: { TZ: 'America/Los_Angeles' },
        },
      },
    ],
    testTimeout: 30000,
    expect: { poll: { timeout: 10000 } },
  },
});
