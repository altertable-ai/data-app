import { expect, test } from '@playwright/test';

for (const mode of ['hosted', 'local'] as const) {
  test(`${mode} runs the same SQL-free app through registered iframe messages`, async ({
    page,
    baseURL,
  }) => {
    const endpoint = mode === 'local' ? '**/api/query' : '**/api/sql';
    const url = new URL(baseURL!);
    if (mode === 'local') url.port = String(Number(url.port) + 3);
    else url.pathname = '/starter-data-app';
    const payloads: unknown[] = [];
    await page.exposeFunction('recordQuery', (payload: unknown) =>
      payloads.push(payload)
    );
    await page.addInitScript(() => {
      window.addEventListener('message', event => {
        const data = event.data;
        if (data?.type === 'bridge:request' && data.route === 'data:query') {
          void (
            window as unknown as {
              recordQuery: (value: unknown) => Promise<void>;
            }
          ).recordQuery(data.payload);
        }
      });
    });
    await page.route(endpoint, async route => {
      expect(route.request().frame()).toBe(page.mainFrame());
      if (mode === 'local') {
        const body = route.request().postDataJSON();
        expect(Object.keys(body).sort()).toEqual([
          'limit',
          'operation',
          'variables',
        ]);
      }
      await route.continue();
    });
    await page.goto(url.href);
    const app = page.frameLocator('iframe');
    await expect(page.locator('iframe')).toHaveAttribute(
      'sandbox',
      'allow-scripts'
    );
    await expect(app.getByText('Alpha: 3', { exact: true })).toBeVisible();
    await app.getByRole('button', { name: /^Group:/ }).click();
    const search = app.getByRole('searchbox', { name: 'Search group values' });
    await search.fill('Beta');
    await search.press('Enter');
    await expect(app.getByText('Showing Beta', { exact: true })).toBeVisible();
    await expect
      .poll(() => payloads)
      .toContainEqual({
        operation: 'sample-counts-by-group',
        variables: { groupName: 'Beta' },
        limit: 10,
      });
    if (mode === 'local') {
      const script = await (
        await page.request.get(new URL('/__local/app.js', url).href)
      ).text();
      expect(script).not.toContain('WITH sample_counts(');
      expect(script).not.toContain('SELECT group_name');
      const token = await page
        .locator('meta[name="query-token"]')
        .getAttribute('content');
      for (const body of [
        { operation: 'missing', variables: {}, limit: 1 },
        {
          operation: 'sample-counts-by-group',
          variables: { groupName: 42 },
          limit: 1,
        },
        {
          operation: 'sample-counts-by-group',
          variables: {},
          limit: 1,
          statement: 'SELECT 2',
        },
      ]) {
        const response = await page.request.post(
          new URL('/api/query', url).href,
          { headers: { 'x-data-app-token': token! }, data: body }
        );
        expect(response.status()).toBe(400);
      }
      const unauthenticated = await page.request.post(
        new URL('/api/query', url).href,
        {
          data: {
            operation: 'sample-counts-by-group',
            variables: {},
            limit: 1,
          },
        }
      );
      expect(unauthenticated.status()).toBe(403);
      const raw = await page.request.post(new URL('/api/sql', url).href, {
        data: { statement: 'SELECT 2' },
      });
      expect(raw.status()).toBe(404);
    }
  });
}
