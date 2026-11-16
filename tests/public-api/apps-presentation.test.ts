import type { Locator } from 'playwright';
import { describe, expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

function isFocused(locator: Locator) {
  return locator.evaluate(
    element => element === element.ownerDocument.activeElement
  );
}

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

  test('closing a story run from the keyboard returns focus to its host launcher', async ({
    page,
  }) => {
    await page.goto(`/starter-data-app?${search}`);
    const app = page.frameLocator('iframe');
    const launch = page.getByRole('button', {
      name: 'Present story',
      exact: true,
    });
    await expect.poll(() => launch.isEnabled()).toBe(true);
    await launch.focus();
    await page.keyboard.press('Enter');
    const story = app.getByRole('dialog');
    await expect
      .poll(() =>
        story.getByRole('heading', { name: 'Total samples: 2.2M' }).isVisible()
      )
      .toBe(true);
    await story
      .getByRole('button', { name: 'Exit presentation', exact: true })
      .press('Enter');
    await expect.poll(() => story.count()).toBe(0);
    await expect.poll(() => isFocused(launch)).toBe(true);

    // Escape leaves fullscreen before the story sees it; that also closes the story.
    await page.keyboard.press('Enter');
    await expect.poll(() => story.isVisible()).toBe(true);
    await expect
      .poll(() => page.locator('iframe:fullscreen').isVisible())
      .toBe(true);
    await page.evaluate(() => document.exitFullscreen());
    await expect.poll(() => story.count()).toBe(0);
    await expect.poll(() => isFocused(launch)).toBe(true);
  });

  test('a reader who moves to another host control keeps it when the story closes', async ({
    page,
  }) => {
    await page.goto(`/starter-data-app?${search}`);
    // Without fullscreen, host controls stay reachable while the story is open.
    await page.evaluate(() => {
      HTMLIFrameElement.prototype.requestFullscreen = () =>
        Promise.reject(new Error('Fullscreen denied'));
    });
    const app = page.frameLocator('iframe');
    const launch = page.getByRole('button', {
      name: 'Present story',
      exact: true,
    });
    await expect.poll(() => launch.isEnabled()).toBe(true);
    await launch.click();
    const story = app.getByRole('dialog');
    await expect.poll(() => story.isVisible()).toBe(true);
    const explore = page.getByRole('button', {
      name: 'Explore data',
      exact: true,
    });
    await explore.focus();
    await page.goBack();
    await expect.poll(() => story.count()).toBe(0);
    expect(await isFocused(explore)).toBe(true);
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
    // Only a host-run presentation returns focus to the host launcher.
    expect(
      await isFocused(
        page.getByRole('button', { name: 'Present story', exact: true })
      )
    ).toBe(false);
  });
});
