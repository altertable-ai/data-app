import { expect } from 'vitest';
import type { DataAppDiagnostic } from '@altertable/data-app-embed';
import { test } from '@/tests/public-api/browser';

test('a host cancels timed-out queries and aborts old work when the iframe reloads', async ({
  page,
}) => {
  await page.goto('/bridge-host?timeout=1');
  const app = page.frameLocator('iframe');
  await app
    .getByRole('button', { name: 'Wait for query', exact: true })
    .click();
  await expect
    .poll(() =>
      app
        .getByRole('status', { name: 'Query result', exact: true })
        .textContent()
    )
    .toBe('timeout');
  await expect
    .poll(() =>
      page
        .getByRole('status', { name: 'Cancelled requests', exact: true })
        .textContent()
    )
    .toBe('1');
  await app
    .getByRole('button', { name: 'Wait for query', exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .getByRole('status', { name: 'Pending requests', exact: true })
        .textContent()
    )
    .toBe('1');
  await page
    .getByRole('button', { name: 'Replace iframe', exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .getByRole('status', { name: 'Cancelled requests', exact: true })
        .textContent()
    )
    .toBe('2');
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect
    .poll(() =>
      app
        .getByRole('status', { name: 'Query result', exact: true })
        .textContent()
    )
    .toContain('"version":1');
});

test('iframe log delivery follows the current public host logger and can be disabled', async ({
  page,
}) => {
  await page.goto('/bridge-host');
  const app = page.frameLocator('iframe');
  await app.getByRole('button', { name: 'Write logs', exact: true }).click();
  const entries: unknown[][] = [
    [1, 'log', 'plain'],
    [1, 'info', 'completed', { rows: 3 }],
    [1, 'warn', 'slow'],
    [1, 'error', 'failed'],
  ];
  await expect
    .poll(() =>
      page.getByRole('status', { name: 'Host logs', exact: true }).textContent()
    )
    .toBe(JSON.stringify(entries));
  await page
    .getByRole('button', { name: 'Change handler', exact: true })
    .click();
  await app.getByRole('button', { name: 'Write logs', exact: true }).click();
  entries.push(...entries.map(([, ...entry]) => [2, ...entry]));
  await expect
    .poll(() =>
      page.getByRole('status', { name: 'Host logs', exact: true }).textContent()
    )
    .toBe(JSON.stringify(entries));
  await page
    .getByRole('button', { name: 'Toggle logging', exact: true })
    .click();
  await app.getByRole('button', { name: 'Write logs', exact: true }).click();
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect
    .poll(() =>
      app
        .getByRole('status', { name: 'Query result', exact: true })
        .textContent()
    )
    .toContain('"version":2');
  expect(
    await page
      .getByRole('status', { name: 'Host logs', exact: true })
      .textContent()
  ).toBe(JSON.stringify(entries));
});

test('a failing consumer logger cannot interrupt iframe queries', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/bridge-host');
  const app = page.frameLocator('iframe');
  await app
    .getByRole('button', { name: 'Write failing logs', exact: true })
    .click();
  await expect
    .poll(() =>
      app
        .getByRole('status', { name: 'Query result', exact: true })
        .textContent()
    )
    .toBe('App continued after logging');
  await page.getByRole('button', { name: 'Break logger', exact: true }).click();
  await app.getByRole('button', { name: 'Write logs', exact: true }).click();
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect
    .poll(() =>
      app
        .getByRole('status', { name: 'Query result', exact: true })
        .textContent()
    )
    .toContain('"version":1');
  expect(
    await page
      .getByRole('status', { name: 'Host logs', exact: true })
      .textContent()
  ).toBe('[]');
  expect(errors).toEqual([]);
  await page.getByRole('button', { name: 'Break logger', exact: true }).click();
  await app.getByRole('button', { name: 'Write logs', exact: true }).click();
  await expect
    .poll(async () =>
      JSON.parse(
        (await page
          .getByRole('status', { name: 'Host logs', exact: true })
          .textContent())!
      )
    )
    .toHaveLength(4);
});

test('foreign and malformed iframe log messages cannot invoke the host logger', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.addEventListener('message', event => {
      if (event.data?.type === 'runtime:log')
        Object.assign(window, { capturedLog: event.data });
    });
  });
  await page.goto('/bridge-host');
  const app = page.frameLocator('iframe');
  await app.getByRole('button', { name: 'Write logs', exact: true }).click();
  await expect
    .poll(async () =>
      JSON.parse(
        (await page
          .getByRole('status', { name: 'Host logs', exact: true })
          .textContent())!
      )
    )
    .toHaveLength(4);
  const original = await page
    .getByRole('status', { name: 'Host logs', exact: true })
    .textContent();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(Reflect.get(window, 'capturedLog')))
    )
    .toBe(true);
  const invocations = page.getByRole('status', {
    name: 'Logger invocations',
    exact: true,
  });
  const initialCalls = Number(await invocations.textContent());
  const packet = await page.evaluate(() => Reflect.get(window, 'capturedLog'));
  await page.evaluate(value => window.postMessage(value, '*'), packet);
  const frame = page.frames().find(frame => frame !== page.mainFrame())!;
  await frame.evaluate(value => {
    parent.postMessage({ ...value, sessionId: 'old-session' }, '*');
    parent.postMessage(
      { ...value, payload: { method: 'constructor', args: ['failed'] } },
      '*'
    );
    parent.postMessage(
      { ...value, payload: { method: 'error', args: 'failed' } },
      '*'
    );
  }, packet);
  // Valid logs follow the malformed packets from the same sender, proving delivery has drained.
  await app.getByRole('button', { name: 'Write logs', exact: true }).click();
  await expect
    .poll(async () =>
      JSON.parse(
        (await page
          .getByRole('status', { name: 'Host logs', exact: true })
          .textContent())!
      )
    )
    .toHaveLength(8);
  expect(Number(await invocations.textContent())).toBe(initialCalls + 4);
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect
    .poll(() =>
      app
        .getByRole('status', { name: 'Query result', exact: true })
        .textContent()
    )
    .toContain('"version":1');
  expect(
    JSON.parse(
      (await page
        .getByRole('status', { name: 'Host logs', exact: true })
        .textContent())!
    )
  ).toEqual([...JSON.parse(original!), ...JSON.parse(original!)]);
});

test('an overloaded iframe rejects excess work, releases cancelled requests and settles pending work on disposal', async ({
  page,
}) => {
  await page.goto('/bridge-host');
  const app = page.frameLocator('iframe');
  await app.getByRole('button', { name: 'Flood queries', exact: true }).click();
  await expect
    .poll(async () =>
      Number(
        await page
          .getByRole('status', { name: 'Pending requests', exact: true })
          .textContent()
      )
    )
    .toBeGreaterThan(0);
  await app.getByRole('button', { name: 'Cancel query', exact: true }).click();
  await expect
    .poll(
      async () =>
        JSON.parse(
          (await app
            .getByRole('status', { name: 'Query result', exact: true })
            .textContent()) || '[]'
        ).length
    )
    .toBe(200);
  const results: string[] = JSON.parse(
    (await app
      .getByRole('status', { name: 'Query result', exact: true })
      .textContent())!
  );
  expect(results).toContain('bridge_busy');
  expect(results).toContain('AbortError');
  expect(
    results.every(result => result === 'bridge_busy' || result === 'AbortError')
  ).toBe(true);
  await expect
    .poll(() =>
      page
        .getByRole('status', { name: 'Pending requests', exact: true })
        .textContent()
    )
    .toBe('0');
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect
    .poll(() =>
      app
        .getByRole('status', { name: 'Query result', exact: true })
        .textContent()
    )
    .toContain('"version":1');
  await app
    .getByRole('button', { name: 'Wait for query', exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .getByRole('status', { name: 'Pending requests', exact: true })
        .textContent()
    )
    .toBe('1');
  await app
    .getByRole('button', { name: 'Dispose transport', exact: true })
    .click();
  await expect
    .poll(() =>
      app
        .getByRole('status', { name: 'Query result', exact: true })
        .textContent()
    )
    .toBe('bridge_closed');
  await expect
    .poll(() =>
      page
        .getByRole('status', { name: 'Pending requests', exact: true })
        .textContent()
    )
    .toBe('0');
});

for (const mode of ['bridge-host', 'bundle-host', 'bundle-host?packaged=1']) {
  test(`the ${mode} correlates concurrent queries and cancels host work when its caller aborts`, async ({
    page,
  }) => {
    await page.goto(`/${mode}`);
    const app = page.frameLocator('iframe');
    const result = app.getByRole('status', {
      name: mode === 'bridge-host' ? 'Query result' : 'Transport result',
      exact: true,
    });
    await app
      .getByRole('button', { name: 'Concurrent queries', exact: true })
      .click();
    await expect
      .poll(async () => JSON.parse((await result.textContent()) || '[]'))
      .toEqual(
        Array.from({ length: 50 }, (_, index) => ({
          period: String(index),
          version: 1,
        }))
      );
    await app
      .getByRole('button', { name: 'Wait for query', exact: true })
      .click();
    await expect
      .poll(() =>
        page
          .getByRole('status', { name: 'Pending requests', exact: true })
          .textContent()
      )
      .toBe('1');
    await app
      .getByRole('button', { name: 'Cancel query', exact: true })
      .click();
    await expect.poll(() => result.textContent()).toBe('AbortError');
    await expect
      .poll(() =>
        page
          .getByRole('status', { name: 'Cancelled requests', exact: true })
          .textContent()
      )
      .toBe('1');
  });

  test(`the ${mode} rejects messages from another window and from stale sessions`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.addEventListener('message', event => {
        if (event.data?.type === 'bridge:request')
          Object.assign(window, { capturedRequest: event.data });
      });
    });
    await page.goto(`/${mode}`);
    const app = page.frameLocator('iframe');
    await app.getByRole('button', { name: 'Query', exact: true }).click();
    await expect
      .poll(() =>
        page
          .getByRole('status', { name: 'Echo requests', exact: true })
          .textContent()
      )
      .toBe('1');
    const captured = await page.evaluate(() =>
      Reflect.get(window, 'capturedRequest')
    );
    await page.evaluate(
      packet => window.postMessage({ ...packet, id: 'foreign-source' }, '*'),
      captured
    );
    const frame = page.frames().find(frame => frame !== page.mainFrame())!;
    await frame.evaluate(packet => {
      parent.postMessage(
        { ...packet, id: 'stale-session', sessionId: 'old-session' },
        '*'
      );
      if (packet.token)
        parent.postMessage(
          { ...packet, id: 'stale-token', token: 'old-token' },
          '*'
        );
      parent.postMessage(
        { ...packet, id: 'malformed', payload: { period: 1 } },
        '*'
      );
    }, captured);
    await app.getByRole('button', { name: 'Query', exact: true }).click();
    await expect
      .poll(() =>
        page
          .getByRole('status', { name: 'Echo requests', exact: true })
          .textContent()
      )
      .toBe('2');
    const diagnostics: DataAppDiagnostic[] = JSON.parse(
      (await page
        .getByRole('status', { name: 'Host diagnostics', exact: true })
        .textContent())!
    );
    expect(diagnostics).toContainEqual({
      direction: 'drop',
      reason: 'session_mismatch',
      type: 'bridge:request',
    });
    if (captured.token)
      expect(diagnostics).toContainEqual({
        direction: 'drop',
        reason: 'token_mismatch',
        type: 'bridge:request',
      });
    expect(diagnostics).toContainEqual({
      direction: 'send',
      type: 'bridge:error',
      id: 'malformed',
      error: expect.objectContaining({ code: 'invalid_payload' }),
      durationMs: expect.any(Number),
    });
    expect(diagnostics).toContainEqual({
      direction: 'receive',
      type: 'bridge:request',
      id: captured.id,
      route: 'test:echo',
    });
    expect(diagnostics).toContainEqual({
      direction: 'send',
      type: 'bridge:result',
      id: captured.id,
      durationMs: expect.any(Number),
    });
    expect(
      diagnostics.filter(
        event =>
          event.direction !== 'drop' &&
          event.id !== undefined &&
          ['foreign-source', 'stale-session', 'stale-token'].includes(event.id)
      )
    ).toEqual([]);
  });
}

for (const source of ['bundle', 'packaged', 'url']) {
  test(`an embedded ${source} app queries through the host and restores navigation after reload`, async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/'))
        requests.push(request.frame() === page.mainFrame() ? 'host' : 'app');
    });
    await page.goto(
      `/bundle-host?${source === 'url' ? 'url=1&' : source === 'packaged' ? 'packaged=1&' : ''}period=last-30#totals`
    );
    const app = page.frameLocator('iframe');
    await expect
      .poll(() =>
        app
          .getByRole('status', { name: 'App location', exact: true })
          .textContent()
      )
      .toContain('period=last-30');
    if (source === 'packaged') {
      await expect
        .poll(() => page.locator('iframe').getAttribute('src'))
        .toMatch(/^data:text\/html/);
      await expect
        .poll(() => page.locator('iframe').getAttribute('sandbox'))
        .toBe('allow-scripts');
      const frame = page.frames().find(frame => frame !== page.mainFrame())!;
      expect(await frame.evaluate(() => typeof crypto.randomUUID)).toBe(
        'undefined'
      );
      expect(
        await frame.evaluate(async url => {
          try {
            await fetch(url);
            return false;
          } catch {
            return true;
          }
        }, new URL('/api/sql', page.url()).href)
      ).toBe(true);
    }
    await app.getByRole('button', { name: 'Query', exact: true }).click();
    await expect
      .poll(() =>
        app
          .getByRole('status', { name: 'Query result', exact: true })
          .textContent()
      )
      .toContain('"version":1');
    await page
      .getByRole('button', { name: 'Change handler', exact: true })
      .click();
    await expect
      .poll(() =>
        page
          .getByRole('status', { name: 'Handler version', exact: true })
          .textContent()
      )
      .toBe('2');
    await app.getByRole('button', { name: 'Query', exact: true }).click();
    await expect
      .poll(() =>
        app
          .getByRole('status', { name: 'Query result', exact: true })
          .textContent()
      )
      .toContain('"version":2');
    if (source !== 'url') {
      await app
        .getByRole('button', { name: 'Data query', exact: true })
        .click();
      await expect
        .poll(() =>
          app
            .getByRole('status', { name: 'Query result', exact: true })
            .textContent()
        )
        .toContain('sql-query');
      await app
        .getByRole('button', { name: 'Denied query', exact: true })
        .click();
      await expect
        .poll(() =>
          app
            .getByRole('status', { name: 'Query result', exact: true })
            .textContent()
        )
        .toBe('{"publicError":true,"code":"forbidden"}');
      expect(requests).toEqual(['host', 'host']);
    }
    if (source !== 'url') {
      await page
        .getByRole('button', { name: 'Change theme', exact: true })
        .click();
      await expect
        .poll(() =>
          app
            .locator('html')
            .evaluate(element => getComputedStyle(element).colorScheme)
        )
        .toBe('light');
    }
    await app.getByRole('button', { name: 'Last 7 days', exact: true }).click();
    await expect.poll(() => page.url()).toContain('period=last-7');
    await page.goBack();
    await expect
      .poll(() =>
        app
          .getByRole('status', { name: 'App location', exact: true })
          .textContent()
      )
      .toContain('period=last-30');
    await page.goForward();
    await expect
      .poll(() =>
        app
          .getByRole('status', { name: 'App location', exact: true })
          .textContent()
      )
      .toContain('period=last-7');
    const frame = page.frames().find(frame => frame !== page.mainFrame())!;
    expect(
      await frame.evaluate(() => {
        try {
          void parent.document;
          return false;
        } catch {
          return true;
        }
      })
    ).toBe(true);
    await Promise.all([
      page.waitForEvent('framenavigated', navigated => navigated === frame),
      frame.evaluate(() => location.reload()),
    ]);
    await frame.waitForLoadState('load');
    await expect
      .poll(() =>
        app
          .getByRole('status', { name: 'App location', exact: true })
          .textContent()
      )
      .toContain('period=last-7');
    await app.getByRole('button', { name: 'Query', exact: true }).click();
    await expect
      .poll(() =>
        app
          .getByRole('status', { name: 'Query result', exact: true })
          .textContent()
      )
      .toContain('"version":2');
  });
}

test('a content-sized frame follows its app height, omits the toolbar, and keeps sheets in the visible page', async ({
  page,
}) => {
  await page.goto('/bundle-host?content-sizing=1');
  const frame = page.getByTitle('Sandbox app', { exact: true });
  const app = page.frameLocator('iframe');
  const main = app.getByRole('main');
  await expect.poll(() => main.isVisible()).toBe(true);
  const toolbarAction = app.getByRole('button', {
    name: 'Custom toolbar action',
    exact: true,
  });
  expect(await toolbarAction.count()).toBe(0);
  const root = app.locator(':root');
  function frameHeight() {
    return frame.evaluate(element => element.getBoundingClientRect().height);
  }
  function overflow() {
    return root.evaluate(
      element => element.scrollHeight - element.clientHeight
    );
  }
  await expect
    .poll(async () =>
      Math.floor(
        (await frameHeight()) -
          (await root.evaluate(
            element => element.getBoundingClientRect().height
          ))
      )
    )
    .toBe(0);
  const initial = await frameHeight();
  await app
    .getByRole('button', { name: 'Show long content', exact: true })
    .click();
  await expect.poll(frameHeight).toBeGreaterThanOrEqual(initial + 2000);
  expect(await overflow()).toBe(0);

  await app
    .getByRole('button', { name: 'Inspect report', exact: true })
    .click();
  const sheet = app.getByRole('dialog');
  const { height: viewport } = page.viewportSize()!;
  async function fitsViewport() {
    const box = await sheet.boundingBox();
    return (
      !!box &&
      box.height > 200 &&
      box.y >= -1 &&
      box.y + box.height <= viewport + 1
    );
  }
  await expect.poll(fitsViewport).toBe(true);
  await page.evaluate(() => scrollBy(0, 600));
  expect(
    await frame.evaluate(element => element.getBoundingClientRect().top)
  ).toBeLessThan(0);
  await expect.poll(fitsViewport).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => sheet.count()).toBe(0);

  await app
    .getByRole('button', { name: 'Show short content', exact: true })
    .click();
  await expect
    .poll(async () => Math.round(await frameHeight()))
    .toBe(Math.round(initial));
  await page
    .getByRole('button', { name: 'Toggle content sizing', exact: true })
    .click();
  await expect
    .poll(async () => Math.round(await frameHeight()))
    .toBe(Math.round(viewport * 0.8));
  await expect.poll(() => toolbarAction.isVisible()).toBe(true);
});

test('a content-sized frame stops following growth that tracks its own height', async ({
  page,
}) => {
  await page.goto('/bundle-host?content-sizing=1');
  const frame = page.getByTitle('Sandbox app', { exact: true });
  const app = page.frameLocator('iframe');
  await expect.poll(() => app.getByRole('main').isVisible()).toBe(true);
  function frameHeight() {
    return frame.evaluate(element =>
      Math.round(element.getBoundingClientRect().height)
    );
  }
  await app
    .getByRole('button', { name: 'Show viewport-height content', exact: true })
    .click();
  let previous = -1;
  await expect
    .poll(async () => {
      const height = await frameHeight();
      const settled = height === previous;
      previous = height;
      return settled;
    })
    .toBe(true);
  expect(previous).toBeLessThan(page.viewportSize()!.height * 4);
});
