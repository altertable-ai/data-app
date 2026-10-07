import { expect } from 'vitest';
import { test } from '@/tests/public-api/browser';

test('primary and independent sections retain their own displayed input and inspection evidence', async ({
  page,
}) => {
  await page.goto('/declared-app');
  await page
    .getByRole('button', { name: 'Resolve alpha 1', exact: true })
    .click();
  await page.getByRole('button', { name: 'Resolve beta', exact: true }).click();
  await expect
    .poll(() =>
      page
        .getByRole('status', { name: 'Beta result', exact: true })
        .filter({ visible: true })
        .textContent()
    )
    .toBe('1');
  await page.getByRole('searchbox', { name: 'Version', exact: true }).fill('2');
  await page.getByRole('button', { name: 'Show primary', exact: true }).click();
  await expect
    .poll(() =>
      page
        .getByRole('status', { name: 'Alpha result', exact: true })
        .filter({ visible: true })
        .textContent()
    )
    .toBe('1 for 1');
  await page.getByRole('button', { name: 'Explore Beta', exact: true }).click();
  const inspection = page.getByRole('dialog');
  await expect
    .poll(() => inspection.textContent())
    .toContain('Only the beta section owns this glossary entry.');
  await inspection.getByRole('tab', { name: 'Queries', exact: true }).click();
  await expect.poll(() => inspection.textContent()).toContain('SELECT beta');
  await expect
    .poll(() => inspection.textContent())
    .not.toContain('SELECT alpha');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Resolve alpha 2', exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .getByRole('status', { name: 'Alpha result', exact: true })
        .filter({ visible: true })
        .textContent()
    )
    .toBe('2 for 2');
});

test('a bound visualization retains its selected view and displayed data while refreshing', async ({
  page,
}) => {
  await page.goto('/declared-app');
  await page.getByRole('button', { name: 'Show primary', exact: true }).click();
  await page
    .getByRole('button', { name: 'Resolve alpha 1', exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .getByRole('status', {
          name: 'Alpha visualization result',
          exact: true,
        })
        .filter({ visible: true })
        .textContent()
    )
    .toBe('1');
  await page.getByRole('tab', { name: 'Doubled', exact: true }).click();
  await expect
    .poll(() =>
      page
        .getByRole('status', {
          name: 'Alpha visualization result',
          exact: true,
        })
        .filter({ visible: true })
        .textContent()
    )
    .toBe('2');
  await page.getByRole('searchbox', { name: 'Version', exact: true }).fill('2');
  await expect
    .poll(() =>
      page
        .getByRole('status', {
          name: 'Alpha visualization result',
          exact: true,
        })
        .filter({ visible: true })
        .textContent()
    )
    .toBe('2');
  await page
    .getByRole('button', { name: 'Resolve alpha 2', exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .getByRole('status', {
          name: 'Alpha visualization result',
          exact: true,
        })
        .filter({ visible: true })
        .textContent()
    )
    .toBe('4');
});

test('repeated public widgets share one inspection sheet and controlled inspection follows its owner', async ({
  page,
}) => {
  await page.goto('/inspection-app?controlled');
  await page
    .getByRole('button', { name: 'Explore Summary', exact: true })
    .click();
  await expect.poll(() => page.getByRole('dialog').count()).toBe(1);
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Explore Repeated count', exact: true })
    .click();
  await expect.poll(() => page.getByRole('dialog').count()).toBe(1);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Accept open', exact: true }).click();
  await expect
    .poll(() =>
      page
        .getByRole('dialog')
        .getByRole('heading', { name: 'Controlled', exact: true })
        .isVisible()
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Accept close', exact: true }).click();
  await expect.poll(() => page.getByRole('dialog').count()).toBe(0);
});

test('calendar and dimension controls preserve comparisons, measured zero, and URL state', async ({
  page,
}) => {
  await page.goto('/time-app');
  await expect
    .poll(() =>
      page
        .getByRole('main')
        .getByText(/^Displayed period: Mar 4–6, 2026 UTC/)
        .isVisible()
    )
    .toBe(true);
  await page.getByRole('button', { name: /^Choose dates/ }).click();
  await page
    .getByRole('checkbox', {
      name: 'Compare with previous period',
      exact: true,
    })
    .check();
  await page.keyboard.press('Escape');
  await expect.poll(() => page.url()).toContain('compare=previous');
  await page.getByRole('button', { name: 'Region: All', exact: true }).click();
  await page.getByRole('option', { name: 'Europe', exact: true }).click();
  await expect
    .poll(() =>
      page
        .getByRole('status', { name: 'Measured events', exact: true })
        .filter({ hasText: 'Measured events: 0' })
        .isVisible()
    )
    .toBe(true);
  await expect
    .poll(() =>
      page
        .getByRole('main')
        .getByText(/^Displayed period: Mar 4–6, 2026 UTC/)
        .isVisible()
    )
    .toBe(true);
  const selected = page.url();
  await page.reload();
  await expect
    .poll(() =>
      page
        .getByRole('button', { name: 'Region: Europe', exact: true })
        .isVisible()
    )
    .toBe(true);
  await expect.poll(() => page.url()).toBe(selected);
  await page.goto('/time-app?start=invalid&end=invalid&region=forged');
  await expect
    .poll(() =>
      page
        .getByRole('main')
        .getByText(/^Displayed period: Mar 4–6, 2026 UTC/)
        .isVisible()
    )
    .toBe(true);
});

test('separate data clients isolate their results and facet choices when an app switches clients', async ({
  page,
}) => {
  await page.goto('/clients');
  const selected = page.getByRole('region', {
    name: 'Selected client',
    exact: true,
  });
  const independent = page.getByRole('region', {
    name: 'Independent client',
    exact: true,
  });
  await page.getByRole('button', { name: 'Resolve A', exact: true }).click();
  await expect
    .poll(() =>
      selected
        .getByRole('status', { name: 'A count', exact: true })
        .filter({ hasText: 'A: 11' })
        .isVisible()
    )
    .toBe(true);
  await expect
    .poll(() =>
      independent.getByRole('status', { name: 'A count', exact: true }).count()
    )
    .toBe(0);
  await page
    .getByRole('button', { name: 'Category: All', exact: true })
    .click();
  await expect
    .poll(() =>
      page.getByRole('option', { name: 'A category', exact: true }).isVisible()
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.getByRole('option', { name: 'B category', exact: true }).count()
    )
    .toBe(0);
  await page
    .getByRole('searchbox', { name: 'Search category values', exact: true })
    .press('Escape');
  await page.keyboard.press('Escape');
  await expect
    .poll(() =>
      page
        .getByRole('dialog', { name: 'Category options', exact: true })
        .count()
    )
    .toBe(0);
  await page
    .getByRole('button', { name: 'Switch client', exact: true })
    .click();
  await expect
    .poll(() =>
      selected.getByRole('status', { name: 'A count', exact: true }).count()
    )
    .toBe(0);
  await page.getByRole('button', { name: 'Resolve B', exact: true }).click();
  await expect
    .poll(() =>
      selected
        .getByRole('status', { name: 'B count', exact: true })
        .filter({ hasText: 'B: 22' })
        .isVisible()
    )
    .toBe(true);
  await expect
    .poll(() =>
      independent
        .getByRole('status', { name: 'B count', exact: true })
        .filter({ hasText: 'B: 22' })
        .isVisible()
    )
    .toBe(true);
  await page
    .getByRole('button', { name: 'Category: All', exact: true })
    .click();
  await expect
    .poll(() =>
      page.getByRole('option', { name: 'B category', exact: true }).isVisible()
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.getByRole('option', { name: 'A category', exact: true }).count()
    )
    .toBe(0);
});
