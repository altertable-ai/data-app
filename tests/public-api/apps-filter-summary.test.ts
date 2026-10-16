import { expect } from 'vitest';
import { test } from '@/tests/public-api/browser';
import { scrollPastToolbar } from '@/tests/public-api/filter-summary';

test('toolbar editors and floating summaries disclose the same active scope without duplicating primary controls', async ({
  page,
}) => {
  const params = new URLSearchParams({
    start: '2026-03-10',
    end: '2026-03-12',
    secondaryRegion: '1',
    region: JSON.stringify({ kind: 'include', members: [['v', 'Europe']] }),
  });
  await page.goto(`/time-app?${params}`);
  const toolbar = page.getByRole('group', {
    name: 'View controls',
    exact: true,
  });
  const inline = toolbar.getByRole('group', {
    name: 'Active toolbar filters',
    exact: true,
  });
  const floating = page.getByRole('group', {
    name: 'Active filters',
    exact: true,
  });
  await inline
    .getByRole('button', { name: 'Region: Europe', exact: true })
    .waitFor();
  expect(await floating.count()).toBe(0);
  expect(
    await toolbar.getByRole('button', { name: /^Remove .* filter$/ }).count()
  ).toBe(0);
  expect(
    await toolbar
      .getByRole('button', { name: 'Choose dates Date range', exact: true })
      .count()
  ).toBe(1);
  expect(
    await inline
      .getByRole('button', { name: 'Remove Date range filter', exact: true })
      .count()
  ).toBe(0);
  await scrollPastToolbar(page);
  expect(
    await floating
      .getByRole('button', { name: 'Remove Date range filter', exact: true })
      .count()
  ).toBe(1);
  const region = floating.getByRole('button', {
    name: 'Open filters: Region: Europe',
    exact: true,
  });
  await region.click();
  const sheet = page.getByRole('dialog', { name: 'Filters', exact: true });
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();
  await expect.poll(() => sheet.count()).toBe(0);
  await expect
    .poll(() => region.evaluate(element => document.activeElement === element))
    .toBe(true);
  expect(
    await toolbar.evaluate(element => element.getBoundingClientRect().bottom)
  ).toBeLessThanOrEqual(0);
  await floating
    .getByRole('button', { name: 'Open filters', exact: true })
    .focus();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => floating.count()).toBe(0);
  await expect
    .poll(() =>
      toolbar
        .getByRole('button', { name: 'Filters (2 active)', exact: true })
        .evaluate(element => document.activeElement === element)
    )
    .toBe(true);
  await inline
    .getByRole('button', { name: 'Region: Europe', exact: true })
    .click();
  await page.getByRole('option', { name: 'All', exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.has('region'))
    .toBe(false);
  expect(new URL(page.url()).searchParams.get('start')).toBe('2026-03-10');
  await scrollPastToolbar(page);
  expect(
    await floating
      .getByRole('button', { name: 'Remove Region filter', exact: true })
      .count()
  ).toBe(0);
  await floating
    .getByRole('button', { name: 'Remove Date range filter', exact: true })
    .click();
  await expect.poll(() => floating.count()).toBe(0);
  await expect
    .poll(() =>
      toolbar
        .getByRole('button', { name: 'Filters', exact: true })
        .evaluate(
          element =>
            document.activeElement === element &&
            element.getBoundingClientRect().top >= -1
        )
    )
    .toBe(true);
});

test('active secondary filters edit directly and preserve unrelated URL state', async ({
  page,
}) => {
  const params = new URLSearchParams({
    q: 'retained',
    'revenue-by': 'country',
    country: JSON.stringify({ kind: 'include', members: [['v', 'fr']] }),
    region: JSON.stringify({ kind: 'include', members: [['v', 'eu']] }),
  });
  await page.goto(`/exploration?${params}`);
  const toolbar = page.getByRole('group', {
    name: 'View controls',
    exact: true,
  });
  const inline = toolbar.getByRole('group', {
    name: 'Active toolbar filters',
    exact: true,
  });
  await inline
    .getByRole('button', { name: 'Region: Europe', exact: true })
    .click();
  expect(
    await page.getByRole('dialog', { name: 'Filters', exact: true }).count()
  ).toBe(0);
  await page.getByRole('option', { name: 'America', exact: true }).click();
  await inline
    .getByRole('button', { name: 'Region: America', exact: true })
    .waitFor();
  expect(JSON.parse(new URL(page.url()).searchParams.get('region')!)).toEqual({
    kind: 'include',
    members: [['v', 'us']],
  });
  await inline
    .getByRole('button', { name: 'Country: France', exact: true })
    .click();
  await page.getByRole('option', { name: 'All', exact: true }).click();
  await expect
    .poll(() =>
      inline
        .getByRole('button', { name: 'Country: France', exact: true })
        .count()
    )
    .toBe(0);
  expect(new URL(page.url()).searchParams.has('country')).toBe(false);
  expect(new URL(page.url()).searchParams.get('q')).toBe('retained');
  expect(new URL(page.url()).searchParams.get('revenue-by')).toBe('country');
  await toolbar.getByRole('button', { name: /^Filters/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Filters', exact: true });
  await sheet
    .getByRole('button', { name: 'Country: All', exact: true })
    .waitFor();
});

test('clearing a secondary filter through its editor removes the toolbar control', async ({
  page,
}) => {
  const country = JSON.stringify({ kind: 'include', members: [['v', 'fr']] });
  await page.goto(`/exploration?${new URLSearchParams({ country })}`);
  const toolbar = page.getByRole('group', {
    name: 'View controls',
    exact: true,
  });
  const inline = toolbar.getByRole('group', {
    name: 'Active toolbar filters',
    exact: true,
  });
  await inline
    .getByRole('button', { name: 'Country: France', exact: true })
    .click();
  expect(
    await page.getByRole('dialog', { name: 'Filters', exact: true }).count()
  ).toBe(0);
  await page.getByRole('option', { name: 'All', exact: true }).click();
  await expect.poll(() => inline.count()).toBe(0);
  expect(new URL(page.url()).searchParams.has('country')).toBe(false);
  await expect
    .poll(() =>
      toolbar
        .getByRole('button', { name: 'Filters', exact: true })
        .evaluate(element => document.activeElement === element)
    )
    .toBe(true);
});

test('floating filters respect touch targets and portrait and landscape safe areas', async ({
  mobilePage: page,
}) => {
  const session = await page.context().newCDPSession(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const country = JSON.stringify({ kind: 'include', members: [['v', 'fr']] });
  await page.goto(`/exploration?${new URLSearchParams({ country })}`);
  const floating = page.getByRole('group', {
    name: 'Active filters',
    exact: true,
  });
  for (const { width, left, right, bottom, fontSize = 16 } of [
    { width: 320, left: 0, right: 0, bottom: 34 },
    { width: 375, left: 0, right: 0, bottom: 34 },
    { width: 667, left: 44, right: 0, bottom: 21 },
    { width: 667, left: 0, right: 44, bottom: 21 },
    { width: 320, left: 0, right: 0, bottom: 34, fontSize: 32 },
  ]) {
    await page.setViewportSize({ width, height: 320 });
    await session.send('Emulation.setSafeAreaInsetsOverride', {
      insets: { top: 0, left, right, bottom },
    });
    await page.addStyleTag({ content: `:root { font-size: ${fontSize}px; }` });
    await scrollPastToolbar(page);
    const bounds = await floating.boundingBox();
    const horizontalInset = Math.max(left, right) + 16;
    expect(bounds!.x).toBeGreaterThanOrEqual(horizontalInset - 1);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
      width - horizontalInset + 1
    );
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
      320 - bottom - 16 + 1
    );
    const targets = await floating.getByRole('button').evaluateAll(elements =>
      elements.map(element => {
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      })
    );
    for (const target of targets) {
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
    }
    expect(
      await floating.evaluate(
        element => element.scrollWidth <= element.clientWidth
      )
    ).toBe(true);
    expect(
      await floating.evaluate(
        element => getComputedStyle(element).transitionProperty
      )
    ).toBe('opacity');
    // Page-end actions must scroll fully above the floating controls.
    const attribution = page.getByRole('link', {
      name: 'Powered by Altertable',
      exact: true,
    });
    await attribution.focus();
    const footerBounds = await attribution.boundingBox();
    const barBounds = await floating.boundingBox();
    expect(footerBounds!.y + footerBounds!.height).toBeLessThan(barBounds!.y);
  }
  await page.addStyleTag({ content: ':root { font-size: 16px; }' });
  await floating
    .getByRole('button', { name: 'Open filters', exact: true })
    .tap();
  const sheet = page.getByRole('dialog', { name: 'Filters', exact: true });
  await sheet.getByRole('button', { name: 'Done', exact: true }).tap();
  await expect.poll(() => sheet.count()).toBe(0);
  await floating
    .getByRole('button', { name: 'Remove Country filter', exact: true })
    .tap();
  await expect.poll(() => floating.count()).toBe(0);
});
