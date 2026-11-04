import { expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

test('crowded automatic legends reserve a cell for expansion and restore their compact list', async ({
  page,
}) => {
  await page.setViewportSize({ width: 960, height: 900 });
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Response time across twelve services',
    exact: true,
  });
  const legend = chart.getByRole('list', { name: 'Chart legend', exact: true });
  await expect.poll(() => legend.getByRole('listitem').count()).toBe(4);
  const more = legend.getByRole('button', { name: '+9 more', exact: true });
  await expect.poll(() => more.getAttribute('aria-expanded')).toBe('false');
  const lastSeries = await legend.getByRole('listitem').nth(2).boundingBox();
  const overflow = await legend.getByRole('listitem').nth(3).boundingBox();
  expect(Math.abs(lastSeries!.y - overflow!.y)).toBeLessThan(1);
  await more.click();
  await expect.poll(() => legend.getByRole('listitem').count()).toBe(13);
  await expect
    .poll(() => legend.getByText('Webhooks', { exact: true }).isVisible())
    .toBe(true);
  const fewer = legend.getByRole('button', { name: 'Show fewer', exact: true });
  await expect.poll(() => fewer.getAttribute('aria-expanded')).toBe('true');
  await fewer.click();
  await expect.poll(() => legend.getByRole('listitem').count()).toBe(4);
});

test('independent legends preserve complete long names and expand on a phone', async ({
  mobilePage: page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/chart-legends');
  const legend = page.getByRole('list', {
    name: 'Regional services legend',
    exact: true,
  });
  const label = legend.getByText('API — production workspaces in Europe (ms)', {
    exact: true,
  });
  await expect.poll(() => label.isVisible()).toBe(true);
  expect(await label.getAttribute('title')).toBe(
    'API — production workspaces in Europe (ms)'
  );
  expect(
    await label.evaluate(element => element.scrollWidth > element.clientWidth)
  ).toBe(true);
  await legend.getByRole('button', { name: '+9 more', exact: true }).tap();
  await expect.poll(() => legend.getByRole('listitem').count()).toBe(13);
  await expect
    .poll(() =>
      legend
        .getByText('Analytics — production workspaces in North America (ms)', {
          exact: true,
        })
        .isVisible()
    )
    .toBe(true);
  await page
    .getByRole('button', { name: 'Switch to dark theme', exact: true })
    .tap();
  await legend.getByRole('button', { name: 'Show fewer', exact: true }).tap();
  await expect.poll(() => legend.getByRole('listitem').count()).toBe(4);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth
      )
    )
    .toBe(true);
});

test('crowded legends fill two rows and keep overflow in the final column on resize', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const legend = page
    .getByRole('region', {
      name: 'Response time across twelve services',
      exact: true,
    })
    .getByRole('list', { name: 'Chart legend', exact: true });
  for (const width of [1440, 960, 480, 320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(async () => {
        const cells = await legend.getByRole('listitem').evaluateAll(items =>
          items.map(item => {
            const box = item.getBoundingClientRect();
            return { y: box.y, right: box.right, text: item.textContent };
          })
        );
        const rows = new Set(cells.map(cell => Math.round(cell.y))).size;
        const firstRow = cells.filter(
          cell => Math.abs(cell.y - cells[0]!.y) < 1
        ).length;
        const right = Math.max(...cells.map(cell => cell.right));
        return (
          cells.length <= 8 &&
          cells.at(-1)!.text === `+${13 - cells.length} more` &&
          rows === 2 &&
          cells.length === firstRow * 2 &&
          Math.abs(cells.at(-1)!.right - right) < 1
        );
      })
      .toBe(true);
  }
});

test('authored legends describe measures without controls and pie legends can be omitted', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const legend = page.getByRole('list', { name: 'Measures', exact: true });
  expect(await legend.getByRole('listitem').textContent()).toBe(
    'Response time (ms)'
  );
  expect(await legend.getByRole('button').count()).toBe(0);
  expect(await legend.getByRole('img').count()).toBe(0);
  const pie = page.getByRole('region', {
    name: 'Standalone pie basic example',
    exact: true,
  });
  const categories = pie.getByRole('list', {
    name: 'Standalone pie plot legend',
    exact: true,
  });
  expect(await categories.getByRole('listitem').count()).toBe(3);
  await pie
    .getByRole('button', { name: 'Hide pie legend', exact: true })
    .click();
  expect(await categories.count()).toBe(0);
  expect(
    await pie
      .getByRole('region', { name: 'Standalone pie plot', exact: true })
      .isVisible()
  ).toBe(true);
  await pie
    .getByRole('button', { name: 'Show pie legend', exact: true })
    .click();
  expect(await categories.getByRole('listitem').count()).toBe(3);
});

for (const kind of [
  'line',
  'area',
  'bar',
  'scatter',
  'native-key',
  'native-accessor',
  'native-shared',
]) {
  test(`${kind} legend preserves series state through sorting, renaming, and removal`, async ({
    page,
  }) => {
    await page.goto('/chart-legends');
    const example = page.getByRole('region', {
      name: `${kind} legend identity basic example`,
      exact: true,
    });
    const alpha = example.getByRole('textbox', {
      name: 'Alpha note',
      exact: true,
    });
    const beta = example.getByRole('textbox', {
      name: 'Beta note',
      exact: true,
    });
    await alpha.fill('Alpha reading');
    await beta.fill('Beta reading');
    await example
      .getByRole('button', { name: 'Reverse legend', exact: true })
      .click();
    await expect
      .poll(() =>
        example
          .getByRole('textbox')
          .evaluateAll(inputs =>
            inputs.map(input => input.getAttribute('aria-label'))
          )
      )
      .toEqual(['Beta note', 'Alpha note']);
    expect(await alpha.inputValue()).toBe('Alpha reading');
    expect(await beta.inputValue()).toBe('Beta reading');
    await example
      .getByRole('button', { name: 'Rename Alpha', exact: true })
      .click();
    await expect
      .poll(() =>
        example
          .getByRole('textbox', { name: 'First note', exact: true })
          .inputValue()
      )
      .toBe('Alpha reading');
    await example
      .getByRole('button', { name: 'Remove Alpha', exact: true })
      .click();
    await expect.poll(() => example.getByRole('textbox').count()).toBe(1);
    expect(await beta.inputValue()).toBe('Beta reading');
  });
}

test('legend controls stay separate from plot inspection', async ({ page }) => {
  await page.goto('/chart-legends');
  const example = page.getByRole('region', {
    name: 'line legend identity basic example',
    exact: true,
  });
  const plot = example.getByRole('application');
  const tooltip = example.getByRole('tooltip');
  await plot.focus();
  await expect.poll(() => tooltip.getByRole('listitem').count()).toBe(2);
  const note = example.getByRole('textbox', {
    name: 'Alpha note',
    exact: true,
  });
  await note.hover();
  await expect.poll(() => tooltip.getByRole('listitem').count()).toBe(2);
  await note.fill('Inspect both measures');
  expect(await note.inputValue()).toBe('Inspect both measures');
  await plot.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => tooltip.getByRole('listitem').count()).toBe(2);
});
