import { spawn } from 'node:child_process';
import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, beforeAll, vi, test as vitestTest } from 'vitest';

let browser: Browser;
let baseURL: string;
export let localURL: string;
let server: ReturnType<typeof spawn>;
let output = '';
beforeAll(async () => {
  server = spawn('bun', ['tests/public-api/fixtures/server.ts'], {
    stdio: ['ignore', 'pipe', 'pipe'],
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
      ({ baseURL, localURL } = JSON.parse(ready[1]!));
    },
    { timeout: 30000 }
  );
  browser = await chromium.launch();
}, 30000);

afterAll(async () => {
  await browser?.close();
  if (server && server.exitCode === null && server.signalCode === null) {
    const exited = new Promise<void>(resolve =>
      server.once('exit', () => resolve())
    );
    server.kill();
    await exited;
  }
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
