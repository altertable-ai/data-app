import { expect } from 'vitest';
import { test } from '@/tests/public-api/browser';

test('mixed chart series describe their measures and inspect the same monthly values with the keyboard', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Monthly revenue, forecast, and conversion',
    exact: true,
  });
  const legend = chart.getByRole('list', { name: 'Chart legend', exact: true });
  await expect.poll(() => legend.getByRole('listitem').count()).toBe(3);
  for (const name of ['Revenue (€k)', 'Forecast (€k)', 'Conversion (%)']) {
    await expect
      .poll(() => legend.getByText(name, { exact: true }).isVisible())
      .toBe(true);
  }
  await page.setViewportSize({ width: 320, height: 900 });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth
      )
    )
    .toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await chart.getByRole('application').focus();
  await expect
    .poll(() => chart.getByRole('tooltip').textContent())
    .toContain('Jan');
  await expect
    .poll(() => chart.getByRole('tooltip').textContent())
    .toContain('42');
  await expect
    .poll(() => chart.getByRole('tooltip').textContent())
    .toContain('2.4');
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => chart.getByRole('tooltip').textContent())
    .toContain('Feb');
  await expect
    .poll(() => chart.getByRole('tooltip').textContent())
    .toContain('48');
});

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
  await expect.poll(() => legend.getByRole('listitem').count()).toBe(6);
  const more = legend.getByRole('button', { name: '+7 more', exact: true });
  await expect.poll(() => more.getAttribute('aria-expanded')).toBe('false');
  const lastSeries = await legend.getByRole('listitem').nth(4).boundingBox();
  const overflow = await legend.getByRole('listitem').nth(5).boundingBox();
  expect(Math.abs(lastSeries!.y - overflow!.y)).toBeLessThan(1);
  await more.click();
  await expect.poll(() => legend.getByRole('listitem').count()).toBe(13);
  await expect
    .poll(() => legend.getByText('Webhooks', { exact: true }).isVisible())
    .toBe(true);
  const fewer = legend.getByRole('button', { name: 'Show fewer', exact: true });
  await expect.poll(() => fewer.getAttribute('aria-expanded')).toBe('true');
  await fewer.click();
  await expect.poll(() => legend.getByRole('listitem').count()).toBe(6);
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
  await legend.getByRole('button', { name: '+7 more', exact: true }).tap();
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
  await expect.poll(() => legend.getByRole('listitem').count()).toBe(6);
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

test('standalone charts retain formatted hover and tap inspection, zero values, and scroll dismissal', async ({
  page,
  mobilePage,
}) => {
  for (const [current, touch] of [
    [page, false],
    [mobilePage, true],
  ] as const) {
    await current.setViewportSize({ width: 320, height: 900 });
    await current.goto('/chart-legends');
    for (const name of [
      'Standalone bar',
      'Standalone line',
      'Standalone area',
    ]) {
      const chart = current.getByRole('region', {
        name: `${name} basic example`,
        exact: true,
      });
      const point = chart.getByRole('button', {
        name: 'Wed: 8.0 ms',
        exact: true,
      });
      if (touch) await point.tap();
      else await point.hover();
      await expect
        .poll(() => current.getByRole('tooltip').textContent())
        .toContain('8.0 ms');
      expect(await point.getAttribute('tabindex')).toBe('-1');
      await current.keyboard.press('Escape');
      await expect.poll(() => current.getByRole('tooltip').count()).toBe(0);
      const zero = chart.getByRole('button', {
        name: 'Tue: 0.0 ms',
        exact: true,
      });
      if (touch) await zero.tap();
      else await zero.hover();
      await expect
        .poll(() => current.getByRole('tooltip').textContent())
        .toContain('0.0 ms');
      await current.evaluate(() => window.dispatchEvent(new Event('scroll')));
      await expect.poll(() => current.getByRole('tooltip').count()).toBe(0);
    }
    const pie = current.getByRole('region', {
      name: 'Standalone pie basic example',
      exact: true,
    });
    const slice = pie.getByRole('button', {
      name: 'Wed: 8.0 ms, 66.7%',
      exact: true,
    });
    if (touch) await slice.tap();
    else await slice.hover();
    await expect
      .poll(() => current.getByRole('tooltip').textContent())
      .toContain('8.0 ms');
    await expect
      .poll(() => current.getByRole('tooltip').textContent())
      .toContain('66.7%');
    await current.keyboard.press('Escape');
    await expect.poll(() => current.getByRole('tooltip').count()).toBe(0);
  }
});
