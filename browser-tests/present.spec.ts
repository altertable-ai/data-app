import { expect, test } from '@playwright/test';

test('a hosted story enters fullscreen and restores the exploration on close', async ({
  page,
}) => {
  await page.goto('/starter-data-app');
  const app = page.frameLocator('iframe');
  const launch = app.getByRole('button', {
    name: 'Present story',
    exact: true,
  });
  await launch.click();
  await expect(page.locator('iframe:fullscreen')).toBeVisible();
  await expect(app.locator('html:fullscreen')).toBeVisible();
  const story = app.getByRole('dialog');
  await expect(
    story.getByRole('heading', { name: 'Alpha has 3 samples' })
  ).toBeVisible();
  await expect(page).toHaveURL(/present=1.*step=sample-count-Alpha/);
  await story.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(
    story.getByRole('heading', { name: 'Beta has 0 samples' })
  ).toBeVisible();
  await expect(story).toHaveCSS('opacity', '1');
  await page.screenshot({ path: test.info().outputPath('fullscreen.png') });
  await story
    .getByRole('button', { name: 'Exit presentation', exact: true })
    .click();
  await expect(page.locator(':fullscreen')).toHaveCount(0);
  await expect(story).toHaveCount(0);
  await expect(page).not.toHaveURL(/present=1/);
  await expect(launch).toBeFocused();
});

test('leaving browser fullscreen closes the story and clears its route', async ({
  page,
}) => {
  await page.goto('/starter-data-app');
  const app = page.frameLocator('iframe');
  const launch = app.getByRole('button', {
    name: 'Present story',
    exact: true,
  });
  await launch.click();
  await expect(app.locator('html:fullscreen')).toBeVisible();
  await app
    .locator('html')
    .evaluate(element => element.ownerDocument.exitFullscreen());
  await expect(app.getByRole('dialog')).toHaveCount(0);
  await expect(page).not.toHaveURL(/present=1/);
  await expect(launch).toBeFocused();
});

test('a saved presentation opens without fullscreen or a user gesture', async ({
  page,
}) => {
  await page.goto('/starter-data-app?present=1&step=sample-count-Beta');
  const app = page.frameLocator('iframe');
  await expect(
    app.getByRole('dialog').getByRole('heading', { name: 'Beta has 0 samples' })
  ).toBeVisible();
  await expect(app.locator(':fullscreen')).toHaveCount(0);
  await expect(page.locator(':fullscreen')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(app.getByRole('dialog')).toHaveCount(0);
  await expect(page).not.toHaveURL(/present=1/);
});

test('a host denying fullscreen still allows the story to open and close', async ({
  page,
}) => {
  await page.goto('/starter-data-app?no-fullscreen=1');
  const app = page.frameLocator('iframe');
  await app.getByRole('button', { name: 'Present story', exact: true }).click();
  const story = app.getByRole('dialog');
  await expect(
    story.getByRole('heading', { name: 'Alpha has 3 samples' })
  ).toBeVisible();
  await expect(page.locator(':fullscreen')).toHaveCount(0);
  await story
    .getByRole('button', { name: 'Exit presentation', exact: true })
    .click();
  await expect(story).toHaveCount(0);
  await expect(page).not.toHaveURL(/present=1/);
});

test('closing a story leaves fullscreen entered by another control intact', async ({
  page,
}) => {
  await page.goto('/starter-data-app');
  const app = page.frameLocator('iframe');
  await app
    .getByRole('button', { name: 'Present story', exact: true })
    .waitFor();
  await page
    .getByRole('button', { name: 'Change theme', exact: true })
    .evaluate(button => {
      button.addEventListener(
        'click',
        () => void document.documentElement.requestFullscreen(),
        { once: true }
      );
    });
  await page.getByRole('button', { name: 'Change theme', exact: true }).click();
  await expect(page.locator('html:fullscreen')).toBeVisible();
  await app.getByRole('button', { name: 'Present story', exact: true }).click();
  await app
    .getByRole('button', { name: 'Exit presentation', exact: true })
    .click();
  await expect(page.locator('html:fullscreen')).toBeVisible();
  await page.evaluate(() => document.exitFullscreen());
});

test('a rejected fullscreen request falls back to the presentation modal', async ({
  page,
}) => {
  await page.goto('/starter-data-app');
  const app = page.frameLocator('iframe');
  const launch = app.getByRole('button', {
    name: 'Present story',
    exact: true,
  });
  await launch.evaluate(button => {
    button.ownerDocument.documentElement.requestFullscreen = () =>
      Promise.reject(new TypeError('Fullscreen request denied'));
  });
  await launch.click();
  const story = app.getByRole('dialog');
  await expect(
    story.getByRole('heading', { name: 'Alpha has 3 samples' })
  ).toBeVisible();
  await expect(app.locator(':fullscreen')).toHaveCount(0);
  await story
    .getByRole('button', { name: 'Exit presentation', exact: true })
    .click();
  await expect(story).toHaveCount(0);
});
