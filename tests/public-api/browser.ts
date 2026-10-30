import { spawn } from 'node:child_process';

import { chromium, firefox, webkit, type Browser, type Page } from 'playwright';
import type { StartedTestContainer } from 'testcontainers';
import { afterAll, beforeAll, vi, test as vitestTest } from 'vitest';

import {
  seedStarterMock,
  starterMockImage,
} from '@/tests/fixtures/starter-mock';

let browser: Browser;
let baseURL: string;
export let localURL: string;
export let metricLocalURL: string;
export let findingLocalURL: string;
let server: ReturnType<typeof spawn>;
let starterMock: StartedTestContainer | undefined;
let output = '';
beforeAll(
  async () => {
    let mockUrl: string | undefined;
    if (process.env.DATA_APP_STARTER_MOCK === '1') {
      const { GenericContainer, Wait } = await import('testcontainers');
      starterMock = await new GenericContainer(starterMockImage)
        .withEnvironment({ ALTERTABLE_MOCK_USERS: 'dev:dev' })
        .withExposedPorts(15000)
        .withWaitStrategy(Wait.forListeningPorts())
        .start();
      mockUrl = `http://${starterMock.getHost()}:${starterMock.getMappedPort(15000)}`;
      await seedStarterMock(mockUrl);
    }
    server = spawn('bun', ['tests/public-api/fixtures/server.ts'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, STARTER_MOCK_URL: mockUrl },
    });
    server.stdout?.on('data', chunk => {
      output += chunk;
    });
    server.stderr?.on('data', chunk => {
      output += chunk;
    });
    await vi.waitFor(
      () => {
        if (server.exitCode !== null) throw new Error(output);
        const ready = output.match(/DATA_APP_TEST_SERVER (.*)/);
        if (!ready) throw new Error(`Browser fixture is not ready: ${output}`);
        ({ baseURL, localURL, metricLocalURL, findingLocalURL } = JSON.parse(
          ready[1]!
        ));
      },
      { timeout: 30000 }
    );
    const name = process.env.DATA_APP_TEST_BROWSER ?? 'chromium';
    const engine = [chromium, firefox, webkit].find(
      engine => engine.name() === name
    );
    if (!engine) throw new Error(`Unsupported test browser: ${name}`);
    browser = await engine.launch();
  },
  process.env.DATA_APP_STARTER_MOCK === '1' ? 120000 : 30000
);

afterAll(async () => {
  await browser?.close();
  if (server && server.exitCode === null && server.signalCode === null) {
    const exited = new Promise<void>(resolve =>
      server.once('exit', () => resolve())
    );
    server.kill();
    await exited;
  }
  await starterMock?.stop();
});

export const test = vitestTest.extend<{ page: Page; mobilePage: Page }>({
  // eslint-disable-next-line no-empty-pattern -- Vitest fixture dependencies use destructuring.
  page: async ({}, use) => {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    try {
      await use(page);
    } finally {
      await context.close();
    }
  },
  // eslint-disable-next-line no-empty-pattern -- Vitest fixture dependencies use destructuring.
  mobilePage: async ({}, use) => {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    try {
      await use(page);
    } finally {
      await context.close();
    }
  },
});
