import { expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

for (const runtime of ['hosted', 'local'] as const) {
  test(`${runtime} finding distinguishes exploration, resets all controls, and retains displayed scope on refresh and failure`, async ({
    page,
  }) => {
    let pending: (() => void) | undefined;
    let mode: 'ready' | 'pending' | 'error' = 'ready';
    await page.route('**/api/query**', async route => {
      const body = route.request().postDataJSON();
      const query =
        body.queryId ??
        new URL(route.request().url()).pathname.split('/').at(-1);
      const group = body.params.groupName;
      if (
        mode === 'pending' &&
        group === 'Beta' &&
        query === 'samplesOverTime'
      ) {
        await new Promise<void>(resolve => {
          pending = resolve;
        });
      }
      if (mode === 'error' && group === 'Beta') {
        await route.fulfill({ status: 503, json: { reason: 'unavailable' } });
        return;
      }
      const columns =
        query === 'samplesOverTime'
          ? ['period_start', 'sample_count']
          : query === 'samplesByMember'
            ? ['member', 'sample_count']
            : ['period_start', 'member', 'sample_count'];
      const rows =
        query === 'samplesOverTime'
          ? [['2026-03-09', group === 'Beta' ? 8 : 32]]
          : query === 'samplesByMember'
            ? [[group === 'Beta' ? 'Partner' : 'Online', 32]]
            : [['2026-03-09', 'Online', 32]];
      await route.fulfill({
        json: {
          columns: columns.map(name => ({ name })),
          rows,
          queryId: 'fixture',
        },
      });
    });
    await page.goto(
      runtime === 'hosted' ? '/starter-finding-data-app' : '/local-finding'
    );
    const app = runtime === 'hosted' ? page.frameLocator('iframe') : page;
    const trend = app
      .getByRole('region', { name: 'Samples over time', exact: true })
      .filter({
        has: app.getByRole('heading', {
          name: 'Samples over time',
          exact: true,
        }),
      });
    await expect.poll(() => trend.textContent()).toContain('group Alpha');
    expect(
      await app.getByText('Exploration: scope changed', { exact: true }).count()
    ).toBe(0);
    // A display choice changes representation, not the business population.
    await trend.getByRole('button', { name: /Day/ }).click();
    await app.getByRole('option', { name: 'Week', exact: true }).click();
    expect(
      await app.getByText('Exploration: scope changed', { exact: true }).count()
    ).toBe(0);
    mode = 'pending';
    await app.getByRole('button', { name: /Alpha/ }).click();
    await app.getByRole('option', { name: 'Beta', exact: true }).click();
    await expect
      .poll(() =>
        app.getByText('Exploration: scope changed', { exact: true }).isVisible()
      )
      .toBe(true);
    await expect.poll(() => Boolean(pending)).toBe(true);
    expect(await trend.textContent()).toContain('group Alpha');
    expect(await trend.textContent()).not.toContain('group Beta');
    // Only the primary query needs holding; other sections retain their own scopes.
    mode = 'error';
    pending!();
    await expect.poll(() => app.getByRole('alert').count()).toBeGreaterThan(0);
    expect(await trend.textContent()).toContain('group Alpha');
    expect(await trend.textContent()).not.toContain('group Beta');
    expect(await app.getByText(/Finding scope:/).textContent()).toContain(
      'group Alpha'
    );
    await app
      .getByRole('button', { name: 'Back to finding', exact: true })
      .click();
    await expect
      .poll(() => app.getByRole('button', { name: /Alpha/ }).isVisible())
      .toBe(true);
    await expect
      .poll(() => trend.getByRole('button', { name: /Day/ }).isVisible())
      .toBe(true);
    expect(
      await app.getByText('Exploration: scope changed', { exact: true }).count()
    ).toBe(0);
    const dates = app.getByRole('combobox', {
      name: 'Date range',
      exact: true,
    });
    await dates.click();
    await dates.fill('2026-03-02 to 2026-03-09');
    await dates.press('Enter');
    await expect
      .poll(() =>
        app.getByText('Exploration: scope changed', { exact: true }).isVisible()
      )
      .toBe(true);
    mode = 'ready';
    await trend.getByRole('button', { name: /Day/ }).click();
    await app.getByRole('option', { name: 'Week', exact: true }).click();
    const distribution = app.getByRole('region', {
      name: 'By member',
      exact: true,
    });
    await distribution.getByRole('button', { name: /Segment/ }).click();
    await app.getByRole('option', { name: 'Group', exact: true }).click();
    await app.getByRole('button', { name: /Alpha/ }).click();
    await app.getByRole('option', { name: 'Beta', exact: true }).click();
    await expect.poll(() => trend.textContent()).toContain('group Beta');
    await app
      .getByRole('button', { name: 'Back to finding', exact: true })
      .click();
    await expect
      .poll(() => trend.textContent())
      .toContain('Mar 2–15, 2026 UTC · group Alpha');
    expect(await trend.getByRole('button', { name: /Day/ }).isVisible()).toBe(
      true
    );
    expect(
      await distribution.getByRole('button', { name: /Segment/ }).isVisible()
    ).toBe(true);
    expect(
      await app.getByText('Exploration: scope changed', { exact: true }).count()
    ).toBe(0);
    await page.setViewportSize({ width: 360, height: 900 });
    const heading = distribution.getByRole('heading', {
      name: 'By member',
      exact: true,
    });
    expect(
      await heading.evaluate(element => {
        // A word must fit on one line beside the real breakdown control.
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const value = node.textContent ?? '';
          for (const match of value.matchAll(/\S+/g)) {
            const range = document.createRange();
            range.setStart(node, match.index);
            range.setEnd(node, match.index + match[0].length);
            if (
              new Set(
                [...range.getClientRects()].map(rect => Math.round(rect.top))
              ).size > 1
            )
              return false;
          }
        }
        return true;
      })
    ).toBe(true);
    await app.getByText('View detailed data', { exact: true }).click();
    await expect
      .poll(() =>
        app
          .getByRole('region', { name: 'Sample details', exact: true })
          .textContent()
      )
      .toContain('group Alpha');
  });
}

for (const runtime of ['hosted', 'local'] as const) {
  test(`${runtime} metric keeps the semantic breakdown and group drill`, async ({
    page,
  }) => {
    await page.route('**/api/query**', async route => {
      const body = route.request().postDataJSON();
      const query =
        body.queryId ??
        new URL(route.request().url()).pathname.split('/').at(-1);
      const group = body.params.groupName;
      const byGroup = query === 'sampleCountsByGroup';
      const rows = byGroup
        ? group === 'Beta'
          ? [['Beta', 600000]]
          : [
              ['Alpha', 2200000],
              ['Beta', 600000],
            ]
        : group === 'Beta'
          ? [['Partner', 600000]]
          : [
              ['Online', 1500000],
              ['Retail', 700000],
              ['Partner', 600000],
            ];
      await route.fulfill({
        json: {
          columns: [
            { name: byGroup ? 'group_name' : 'segment_name' },
            { name: 'sample_count' },
          ],
          rows,
          queryId: 'fixture',
        },
      });
    });
    await page.goto(
      runtime === 'hosted' ? '/starter-metric-data-app' : '/local-metric'
    );
    const app = runtime === 'hosted' ? page.frameLocator('iframe') : page;
    const segments = app.getByRole('region', {
      name: 'Samples by segment',
      exact: true,
    });
    await expect.poll(() => segments.textContent()).toContain('Online');
    await app.getByRole('button', { name: /Beta:.*Drill into group/ }).click();
    await expect.poll(() => segments.textContent()).toContain('group Beta');
    await expect.poll(() => segments.textContent()).not.toContain('Online');
    expect(await segments.textContent()).toContain('Partner');
    expect(
      await app
        .getByRole('combobox', { name: 'Date range', exact: true })
        .count()
    ).toBe(0);
  });
}
