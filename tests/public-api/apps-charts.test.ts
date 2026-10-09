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

test('product analytics charts preserve frontend funnel stacks, numeric retention offsets, and branch exploration', async ({
  page,
  mobilePage,
}) => {
  for (const current of [page, mobilePage]) {
    await current.emulateMedia({ reducedMotion: 'reduce' });
    await current.setViewportSize({ width: 320, height: 900 });
    await current.goto('/chart-legends');
    const funnel = current.getByRole('region', {
      name: 'Activation funnel plot',
      exact: true,
    });
    await funnel.getByRole('application').focus();
    await current.keyboard.press('ArrowRight');
    await expect
      .poll(() => funnel.getByRole('tooltip').textContent())
      .toContain('Signed up');
    await expect
      .poll(() => funnel.getByRole('tooltip').textContent())
      .toContain('600 of 1,000 users');
    const retention = current.getByRole('region', {
      name: 'Weekly retention plot',
      exact: true,
    });
    await retention.getByRole('application').focus();
    await current.keyboard.press('ArrowRight');
    await expect
      .poll(() => retention.getByRole('tooltip').textContent())
      .toContain('Sep 8: 60% · 48 / 80 users · Incomplete period');
    await current.keyboard.press('ArrowRight');
    await expect
      .poll(() => retention.getByRole('tooltip').textContent())
      .toContain('Sep 1: 0% · 0 / 100 users');
    await expect
      .poll(() => retention.getByRole('tooltip').textContent())
      .toContain('Sep 8: Not observed');
    await current.keyboard.press('ArrowRight');
    await expect
      .poll(() => retention.getByRole('tooltip').textContent())
      .toContain('Week 7');
    const journey = current.getByRole('region', {
      name: 'Onboarding journey',
      exact: true,
    });
    async function activateBranch(name: string) {
      const button = journey.getByRole('button', { name, exact: true });
      if (current === mobilePage) await button.tap();
      else await button.click();
    }
    await expect
      .poll(() =>
        journey
          .getByRole('region', {
            name: 'Signed up, step 1, 1,060 users',
            exact: true,
          })
          .count()
      )
      .toBe(1);
    expect(
      await journey.getByRole('region', { name: /Report created/ }).count()
    ).toBe(0);
    await activateBranch('More after Workspace created, step 2');
    await expect
      .poll(() =>
        journey
          .getByRole('button', {
            name: 'Less after Workspace created, step 2',
            exact: true,
          })
          .getAttribute('aria-expanded')
      )
      .toBe('true');
    await expect
      .poll(() =>
        journey
          .getByRole('region', {
            name: 'Report created, step 3, 460 users',
            exact: true,
          })
          .count()
      )
      .toBe(1);
    await expect
      .poll(() =>
        journey
          .getByRole('region', {
            name: 'Drop-off, step 3, 180 users',
            exact: true,
          })
          .count()
      )
      .toBe(1);
    await activateBranch('More after Report created, step 3');
    await activateBranch('More after Subscribed, step 4');
    await expect
      .poll(() =>
        journey
          .getByRole('region', {
            name: 'Converted, step 5, 460 users',
            exact: true,
          })
          .count()
      )
      .toBe(1);
    await activateBranch('Less after Workspace created, step 2');
    await expect
      .poll(() =>
        journey.getByRole('region', { name: /Report created/ }).count()
      )
      .toBe(0);
    await activateBranch('Show more events at step 2');
    await expect
      .poll(() =>
        journey
          .getByRole('region', {
            name: 'Settings, step 2, 20 users',
            exact: true,
          })
          .count()
      )
      .toBe(1);
    expect(
      await journey
        .getByRole('button', {
          name: 'More after Settings, step 2',
          exact: true,
        })
        .count()
    ).toBe(0);
    await activateBranch('More after Search, step 2');
    await expect
      .poll(() =>
        journey
          .getByRole('region', {
            name: 'Signed up, step 3, 30 users',
            exact: true,
          })
          .count()
      )
      .toBe(1);
    await current
      .getByRole('button', { name: 'Switch to dark theme', exact: true })
      .click();
    await expect
      .poll(() =>
        current.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth
        )
      )
      .toBe(true);
    await current.evaluate(() => {
      document.documentElement.style.fontSize = '24px';
    });
    await expect
      .poll(() =>
        current.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth
        )
      )
      .toBe(true);
  }
});

test('funnel inspection follows the hovered or tapped conversion and drop-off portion', async ({
  page,
  mobilePage,
}) => {
  for (const [current, touch] of [
    [page, false],
    [mobilePage, true],
  ] as const) {
    await current.setViewportSize({ width: 1280, height: 900 });
    await current.goto('/chart-legends');
    const plot = current.getByRole('region', {
      name: 'Activation funnel plot',
      exact: true,
    });
    await plot.scrollIntoViewIfNeeded();
    const visited = await plot
      .getByText('Visited', { exact: true })
      .boundingBox();
    const signedUp = await plot
      .getByText('Signed up', { exact: true })
      .boundingBox();
    const zero = await plot.getByText('0%', { exact: true }).boundingBox();
    const hundred = await plot.getByText('100%', { exact: true }).boundingBox();
    const center = signedUp!.x + signedUp!.width / 2;
    const band = center - (visited!.x + visited!.width / 2);
    const x = center - band / 4;
    const bottom = zero!.y + zero!.height / 2;
    const top = hundred!.y + hundred!.height / 2;
    for (const [rate, expected] of [
      [0.3, '600 of 1,000 users'],
      [0.8, '400 of 1,000 users'],
    ] as const) {
      const y = bottom - (bottom - top) * rate;
      if (touch) await current.touchscreen.tap(x, y);
      else await current.mouse.move(x, y);
      await expect
        .poll(() => plot.getByRole('tooltip').textContent())
        .toContain(expected);
      expect(await plot.getByRole('tooltip').textContent()).not.toContain(
        'Paid plan'
      );
      await expect
        .poll(() => plot.getByRole('tooltip').textContent())
        .toContain(rate === 0.3 ? '60% conversion' : '40% drop-off');
    }
    await plot.getByRole('application').focus();
    await current.keyboard.press('ArrowRight');
    await expect
      .poll(() => plot.getByRole('tooltip').textContent())
      .toContain('Paid plan');
  }
});

test('chart frames suppress pointer focus outlines and restore keyboard focus', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  for (const name of ['Activation funnel plot', 'Weekly retention plot']) {
    const plot = page
      .getByRole('region', { name, exact: true })
      .getByRole('application');
    await plot.focus();
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(() =>
        plot.evaluate(element => getComputedStyle(element).outlineStyle)
      )
      .toBe('solid');
    await plot.click({ position: { x: 10, y: 10 } });
    await plot.focus();
    await expect
      .poll(() =>
        plot.evaluate(element => getComputedStyle(element).outlineStyle)
      )
      .toBe('none');
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(() =>
        plot.evaluate(element => getComputedStyle(element).outlineStyle)
      )
      .toBe('solid');
  }
});
