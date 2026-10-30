import { expect } from 'vitest';

import {
  test,
  metricLocalURL,
  findingLocalURL,
} from '@/tests/public-api/browser';

for (const kind of ['metric', 'finding'] as const) {
  for (const mode of ['hosted', 'local'] as const) {
    test(`${mode} ${kind} starter renders fixture evidence without dashboard actions`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(
        mode === 'hosted'
          ? `/starter-${kind}-data-app`
          : kind === 'metric'
            ? metricLocalURL
            : findingLocalURL
      );
      const app = mode === 'hosted' ? page.frameLocator('iframe') : page;
      await expect
        .poll(() =>
          app
            .getByRole('region', { name: 'Sample count', exact: true })
            .getByText('Alpha', { exact: true })
            .isVisible()
        )
        .toBe(true);
      expect(
        await app
          .getByRole('group', { name: 'Page actions', exact: true })
          .count()
      ).toBe(0);
      expect(
        await app.getByRole('button', { name: 'Present story' }).count()
      ).toBe(0);
      expect(await app.locator('h1').count()).toBe(mode === 'hosted' ? 0 : 1);
      expect(
        await app.getByRole('heading', { name: 'Supporting evidence' }).count()
      ).toBe(kind === 'finding' ? 1 : 0);
      expect(
        await app
          .getByRole('heading', { name: 'Limitations', exact: true })
          .count()
      ).toBe(0);
      if (kind === 'metric') {
        const main = app.getByRole('region', {
          name: 'Sample count',
          exact: true,
        });
        const secondary = app.getByRole('region', {
          name: 'Samples by segment',
          exact: true,
        });
        await expect
          .poll(() =>
            secondary.getByText('Retail', { exact: true }).isVisible()
          )
          .toBe(true);
        await main
          .getByRole('button', { name: /^Beta:.*Drill into group/ })
          .click();
        await expect
          .poll(() => main.getByText('Alpha', { exact: true }).count())
          .toBe(0);
        await expect
          .poll(() => secondary.getByText('Retail', { exact: true }).count())
          .toBe(0);
        await app
          .getByRole('button', { name: 'Beta Group', exact: true })
          .click();
        await app
          .getByRole('option', { name: 'All groups', exact: true })
          .click();
        await expect
          .poll(() => main.getByText('Alpha', { exact: true }).isVisible())
          .toBe(true);
        await expect
          .poll(() =>
            secondary.getByText('Retail', { exact: true }).isVisible()
          )
          .toBe(true);
      }
      expect(errors).toEqual([]);
    });
  }
}

test('omitting presentation and export retains refresh and loaded content', async ({
  page,
}) => {
  await page.goto('/declared-app?no-exports');
  await page
    .getByRole('button', { name: 'Resolve alpha 1', exact: true })
    .click();
  await page.getByRole('button', { name: 'Show primary', exact: true }).click();
  await expect
    .poll(() =>
      page
        .getByRole('button', { name: 'Refresh data', exact: true })
        .isEnabled()
    )
    .toBe(true);
  expect(
    await page.getByRole('button', { name: 'Present story' }).count()
  ).toBe(0);
  expect(await page.getByRole('button', { name: /Export/ }).count()).toBe(0);
  await expect
    .poll(() =>
      page.getByRole('region', { name: 'Alpha visualization' }).isVisible()
    )
    .toBe(true);
});
