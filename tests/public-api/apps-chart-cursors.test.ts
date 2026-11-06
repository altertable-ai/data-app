import { expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

test('opted-in time charts share only mouse cursors at exact timestamps', async ({
  page,
}) => {
  await page.goto('/chart-cursors');
  function chart(name: string) {
    return page.getByRole('region', { name, exact: true });
  }
  function cursor(name: string) {
    return chart(name).locator('[data-atbl-internal-linked-cursor="true"]');
  }
  await chart('Linked bar')
    .getByRole('button', { name: 'Minute 1: 11 requests', exact: true })
    .hover();
  for (const name of [
    'Linked line',
    'Linked area',
    'Linked composed',
    'Numeric composed',
  ]) {
    await expect.poll(() => cursor(name).count()).toBe(1);
  }
  for (const name of [
    'Linked bar',
    'Missing timestamp',
    'Opted out',
    'Independent group',
    'Independent peer',
    'Outside group',
  ]) {
    expect(await cursor(name).count()).toBe(0);
  }
  expect(await page.getByRole('tooltip').count()).toBe(1);
  expect(await page.getByRole('tooltip').textContent()).toContain('Minute 1');
  await chart('Linked bar')
    .getByRole('button', { name: 'Minute 1: 11 requests', exact: true })
    .click();
  expect(await cursor('Linked line').count()).toBe(1);
  await page
    .getByRole('button', { name: 'Refresh dashboard 0' })
    .evaluate(element => {
      if (element instanceof HTMLElement) element.click();
    });
  expect(await cursor('Linked line').count()).toBe(1);
  await page.mouse.move(950, 10);
  await expect
    .poll(() =>
      page.locator('[data-atbl-internal-linked-cursor="true"]').count()
    )
    .toBe(0);

  // Each chart type can be the source, including an inferred ISO time axis.
  for (const name of [
    'Linked line',
    'Linked area',
    'Linked composed',
    'Numeric composed',
  ]) {
    if (name.includes('composed')) {
      const plot = chart(name).getByRole('application');
      await plot.scrollIntoViewIfNeeded();
      const bounds = await plot.boundingBox();
      await page.mouse.move(
        bounds!.x + bounds!.width / 2,
        bounds!.y + bounds!.height / 2
      );
    } else {
      await chart(name)
        .getByRole('button', { name: 'Minute 1: 11 requests', exact: true })
        .scrollIntoViewIfNeeded();
      const position = await chart(name)
        .locator('[data-atbl-internal-sample="1"]')
        .evaluate(element => {
          const matrix = (element as SVGGraphicsElement).getScreenCTM()!;
          return { x: matrix.e, y: matrix.f };
        });
      await page.mouse.move(position.x, position.y);
    }
    await expect.poll(() => cursor('Linked bar').count()).toBe(1);
    const band = cursor('Linked bar');
    const bandBounds = await band.boundingBox();
    const barBounds = await chart('Linked bar')
      .locator('.recharts-bar-rectangle')
      .nth(1)
      .boundingBox();
    expect(bandBounds!.x).toBeCloseTo(barBounds!.x, 1);
    expect(bandBounds!.width).toBeCloseTo(barBounds!.width, 1);
    expect(bandBounds!.height).toBeGreaterThan(barBounds!.height);
    expect(await band.getAttribute('fill-opacity')).toBe('0.14');
    expect(await cursor(name).count()).toBe(0);
    await page.mouse.move(950, 10);
  }
  await chart('Independent group')
    .getByRole('button', { name: 'Minute 1: 11 requests', exact: true })
    .hover();
  await expect.poll(() => cursor('Independent peer').count()).toBe(1);
  for (const name of [
    'Linked bar',
    'Linked line',
    'Linked area',
    'Linked composed',
  ]) {
    expect(await cursor(name).count()).toBe(0);
  }
  await chart('Linked bar')
    .getByRole('button', { name: 'Minute 1: 11 requests', exact: true })
    .hover();
  await expect.poll(() => cursor('Linked line').count()).toBe(1);
  await page
    .getByRole('button', { name: 'Remove source' })
    .evaluate(element => {
      if (element instanceof HTMLElement) element.click();
    });
  await expect
    .poll(() =>
      page.locator('[data-atbl-internal-linked-cursor="true"]').count()
    )
    .toBe(0);
});

test('touch and keyboard inspection stay local', async ({
  page,
  mobilePage,
}) => {
  await mobilePage.goto('/chart-cursors');
  await mobilePage
    .getByRole('button', { name: 'Minute 1: 11 requests', exact: true })
    .first()
    .tap();
  expect(
    await mobilePage
      .locator('[data-atbl-internal-linked-cursor="true"]')
      .count()
  ).toBe(0);
  await page.goto('/chart-cursors');
  await page
    .getByRole('region', { name: 'Linked composed', exact: true })
    .getByRole('application')
    .focus();
  await page.keyboard.press('ArrowRight');
  expect(
    await page.locator('[data-atbl-internal-linked-cursor="true"]').count()
  ).toBe(0);
});
