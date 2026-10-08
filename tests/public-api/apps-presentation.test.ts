import { describe, expect } from 'vitest';
import { test } from '@/tests/public-api/browser';

describe('present', () => {
  test('a hosted story enters fullscreen and restores the exploration on close', async ({
    page,
  }) => {
    await page.goto('/starter-data-app');
    const app = page.frameLocator('iframe');
    const launch = app.getByRole('button', {
      name: 'Present story',
      exact: true,
    });
    await expect
      .poll(() => launch.getAttribute('aria-keyshortcuts'))
      .toBe('Meta+Shift+Enter Control+Shift+Enter');
    const modifier = await launch.evaluate(() =>
      /Macintosh|Mac OS X|iPhone|iPad/.test(navigator.userAgent)
        ? 'Meta'
        : 'Control'
    );
    await launch.press(`${modifier}+Shift+Enter`);
    await expect
      .poll(() => page.locator('iframe:fullscreen').isVisible())
      .toBe(true);
    await expect
      .poll(() => app.locator('html:fullscreen').isVisible())
      .toBe(true);
    const story = app.getByRole('dialog');
    await expect
      .poll(() =>
        story.getByRole('heading', { name: 'Total samples: 3' }).isVisible()
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
    await expect.poll(() => page.locator(':fullscreen').count()).toBe(0);
    await expect.poll(() => story.count()).toBe(0);
    await expect.poll(() => page.url()).not.toMatch(/present=1/);
    await expect
      .poll(() =>
        launch.evaluate(
          element => element === element.ownerDocument.activeElement
        )
      )
      .toBe(true);
  });

  test('a saved presentation opens without fullscreen or a user gesture', async ({
    page,
  }) => {
    await page.goto('/starter-data-app?present=1&step=counts-by-group');
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
    await page.keyboard.press('Escape');
    await expect.poll(() => app.getByRole('dialog').count()).toBe(0);
    await expect.poll(() => page.url()).not.toMatch(/present=1/);
  });

  test('a host denying fullscreen still allows the story to open and close', async ({
    page,
  }) => {
    await page.goto('/starter-data-app?no-fullscreen=1');
    const app = page.frameLocator('iframe');
    await app
      .getByRole('button', { name: 'Present story', exact: true })
      .click();
    const story = app.getByRole('dialog');
    await expect
      .poll(() =>
        story.getByRole('heading', { name: 'Total samples: 3' }).isVisible()
      )
      .toBe(true);
    await expect.poll(() => page.locator(':fullscreen').count()).toBe(0);
    await story
      .getByRole('button', { name: 'Exit presentation', exact: true })
      .click();
    await expect.poll(() => story.count()).toBe(0);
    await expect.poll(() => page.url()).not.toMatch(/present=1/);
  });
});
