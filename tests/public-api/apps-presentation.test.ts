import { describe, expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

describe.each(['frame', 'content'])('present (%s sizing)', sizing => {
  const search = sizing === 'content' ? 'content-sizing=1&' : '';
  test('a host presents the story fullscreen and the exploration resumes on close', async ({
    page,
  }) => {
    await page.goto(`/starter-data-app?${search}`);
    const app = page.frameLocator('iframe');
    const launch = page.getByRole('button', {
      name: 'Present story',
      exact: true,
    });
    await expect.poll(() => launch.isEnabled()).toBe(true);
    expect(
      await app.getByRole('button', { name: 'Present story' }).count()
    ).toBe(0);
    await launch.click();
    await expect
      .poll(() => page.locator('iframe:fullscreen').isVisible())
      .toBe(true);
    const story = app.getByRole('dialog');
    await expect
      .poll(() =>
        story.getByRole('heading', { name: 'Total samples: 2.2M' }).isVisible()
      )
      .toBe(true);
    await expect
      .poll(() => page.url())
      .toMatch(/present=1.*step=total-samples/);
    await story.getByRole('button', { name: 'Next step', exact: true }).click();
    await expect
      .poll(() =>
        story.getByRole('heading', { name: 'Counts by group' }).isVisible()
      )
      .toBe(true);

    await story
      .getByRole('button', { name: 'Exit presentation', exact: true })
      .click();
    await expect.poll(() => story.count()).toBe(0);
    await expect.poll(() => page.url()).not.toMatch(/present=1/);
    await expect.poll(() => page.locator(':fullscreen').count()).toBe(0);

    // Leaving fullscreen, as Escape does, also ends the presentation.
    await launch.click();
    await expect.poll(() => story.isVisible()).toBe(true);
    await expect
      .poll(() => page.locator('iframe:fullscreen').isVisible())
      .toBe(true);
    await page.evaluate(() => document.exitFullscreen());
    await expect.poll(() => story.count()).toBe(0);
    await expect.poll(() => page.url()).not.toMatch(/present=1/);
  });

  test('a saved presentation opens without fullscreen or a user gesture', async ({
    page,
  }) => {
    await page.goto(
      `/starter-data-app?${search}present=1&step=counts-by-group`
    );
    const app = page.frameLocator('iframe');
    await expect
      .poll(() =>
        app
          .getByRole('dialog')
          .getByRole('heading', { name: 'Counts by group' })
          .isVisible()
      )
      .toBe(true);
    await expect.poll(() => app.locator(':fullscreen').count()).toBe(0);
    await expect.poll(() => page.locator(':fullscreen').count()).toBe(0);
    await app.getByRole('dialog').press('Escape');
    await expect.poll(() => app.getByRole('dialog').count()).toBe(0);
    await expect.poll(() => page.url()).not.toMatch(/present=1/);
  });
});
