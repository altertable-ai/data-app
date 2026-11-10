import type { Download, Page } from 'playwright';
import { expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

function requestedOperations(page: Page) {
  return page.evaluate(() =>
    (document.body.dataset.requests ?? '').split(' ').filter(Boolean).sort()
  );
}

function sectionResult(page: Page, title: string) {
  return page
    .getByRole('status', { name: `${title} result`, exact: true })
    .filter({ visible: true })
    .textContent();
}

test('a section requests its operation only once it scrolls near the viewport', async ({
  page,
}) => {
  await page.goto('/lazy-sections');
  await expect
    .poll(() => sectionResult(page, 'Trend'))
    .toBe('Trend for all regions');
  await expect
    .poll(() => requestedOperations(page))
    .toEqual(['summary:', 'trend:']);

  await page
    .getByRole('region', { name: 'Breakdown section', exact: true })
    .scrollIntoViewIfNeeded();

  await expect
    .poll(() => sectionResult(page, 'Breakdown'))
    .toBe('Breakdown for all regions');
  expect(await requestedOperations(page)).toEqual([
    'breakdown:',
    'summary:',
    'trend:',
  ]);
});

test('loaded sections follow shared filters while unseen sections stay idle', async ({
  page,
}) => {
  await page.goto('/lazy-sections');
  await expect
    .poll(() => sectionResult(page, 'Trend'))
    .toBe('Trend for all regions');

  await page
    .getByRole('searchbox', { name: 'Region', exact: true })
    .fill('west');

  await expect.poll(() => sectionResult(page, 'Trend')).toBe('Trend for west');
  expect(await requestedOperations(page)).toEqual([
    'summary:',
    'summary:west',
    'trend:',
    'trend:west',
  ]);

  await page
    .getByRole('region', { name: 'Breakdown section', exact: true })
    .scrollIntoViewIfNeeded();

  await expect
    .poll(() => sectionResult(page, 'Breakdown'))
    .toBe('Breakdown for west');
  expect(await requestedOperations(page)).not.toContain('breakdown:');
});

async function downloadedText(download: Download) {
  const chunks: Buffer[] = [];
  for await (const chunk of await download.createReadStream())
    chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

test('summary views load with the app and feed its story and export', async ({
  page,
}) => {
  await page.goto('/lazy-sections?summary');
  await expect
    .poll(() => requestedOperations(page))
    .toEqual(['breakdown:', 'summary:', 'trend:']);

  await page
    .getByRole('searchbox', { name: 'Region', exact: true })
    .fill('west');
  await page
    .getByRole('button', { name: 'Present story', exact: true })
    .click();
  const story = page.getByRole('dialog');
  await expect
    .poll(() =>
      story
        .getByRole('heading', { name: 'Breakdown for west', exact: true })
        .isVisible()
    )
    .toBe(true);
  await story
    .getByRole('button', { name: 'Exit presentation', exact: true })
    .click();

  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('breakdown-west.csv');
  expect(await downloadedText(download)).toBe('\uFEFFCount\r\n4\r\n');
});

test('a failed summary view blocks the story until a refresh recovers it', async ({
  page,
}) => {
  await page.goto('/lazy-sections?summary&failing=breakdown');
  const breakdown = page.getByRole('region', {
    name: 'Breakdown section',
    exact: true,
  });
  await breakdown.scrollIntoViewIfNeeded();
  await expect.poll(() => breakdown.getByRole('alert').isVisible()).toBe(true);
  const present = page.getByRole('button', {
    name: 'Present story',
    exact: true,
  });
  expect(await present.isDisabled()).toBe(true);

  await page.evaluate(() => (document.body.dataset.failing = ''));
  await page.getByRole('button', { name: 'Refresh data', exact: true }).click();

  await expect
    .poll(() => sectionResult(page, 'Breakdown'))
    .toBe('Breakdown for all regions');
  await expect.poll(() => present.isEnabled()).toBe(true);
});

test('a summary view must come from the client whose filter controls <DataApp> renders', async ({
  page,
}) => {
  await page.goto('/lazy-sections?summary&other-client');
  await expect
    .poll(() => page.getByRole('alert').textContent())
    .toContain(
      'Views inside <DataApp> must come from the same createDataHooks() client, which owns their filter controls.'
    );
});

test('a section view must come from the client whose filter controls <DataApp> renders', async ({
  page,
}) => {
  await page.goto('/lazy-sections?other-client');
  await expect
    .poll(() => page.getByRole('alert').textContent())
    .toContain(
      'Views inside <DataApp> must come from the same createDataHooks() client, which owns their filter controls.'
    );
});
