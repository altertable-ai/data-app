import { expect } from 'vitest';
import { test } from '@/tests/public-api/browser';

for (const width of [375, 1280]) {
  test(`a report remains readable at ${width}px while loading, empty, failed, ready and stale`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    let respond: ((data: number[] | null) => void) | undefined;
    await page.route('**/layout-data/activity', async route => {
      const data = await new Promise<number[] | null>(resolve => {
        respond = resolve;
      });
      if (data === null)
        await route.fulfill({
          status: 503,
          json: {
            error: { code: 'unavailable', message: 'Activity unavailable' },
          },
        });
      else
        await route.fulfill({
          json: {
            data,
            requestId: 'activity',
            queriedAt: '2026-10-07T00:00:00Z',
            queryIds: [],
            queries: [],
          },
        });
    });
    async function readable() {
      await expect
        .poll(() =>
          page.getByRole('heading', { name: 'Activity overview' }).isVisible()
        )
        .toBe(true);
      const geometry = await page.getByRole('main').evaluate(element => {
        const rect = element.getBoundingClientRect();
        const sections = element.querySelector(
          '[aria-label="Report sections"]'
        )!;
        const children = [...sections.children].map(child =>
          child.getBoundingClientRect()
        );
        return {
          left: rect.left,
          right: rect.right,
          width: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          gaps: children
            .slice(1)
            .map((child, index) => child.top - children[index]!.bottom),
        };
      });
      expect(geometry.left).toBeGreaterThan(0);
      expect(geometry.right).toBeLessThan(geometry.width);
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width);
      expect(geometry.gaps.every(gap => gap > 0)).toBe(true);
    }
    await page.goto('/layout');
    await expect
      .poll(() =>
        page
          .getByRole('group', { name: 'Page actions', exact: true })
          .filter({ hasText: 'Loading data' })
          .isVisible()
      )
      .toBe(true);
    await readable();
    await expect.poll(() => Boolean(respond)).toBe(true);
    respond!(null);
    await expect
      .poll(() =>
        page
          .getByRole('alert')
          .filter({ hasText: 'Couldn’t load results' })
          .isVisible()
      )
      .toBe(true);
    await readable();
    respond = undefined;
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect.poll(() => Boolean(respond)).toBe(true);
    respond!([]);
    await expect
      .poll(() =>
        page
          .getByRole('main')
          .getByText('No activity', { exact: true })
          .isVisible()
      )
      .toBe(true);
    await readable();
    respond = undefined;
    await page
      .getByRole('button', { name: 'Refresh data', exact: true })
      .click();
    await expect.poll(() => Boolean(respond)).toBe(true);
    respond!([42]);
    const cards = page.getByLabel('Activity cards');
    await expect.poll(() => cards.isVisible()).toBe(true);
    await readable();
    const positions = await cards.evaluate(element =>
      [...element.children].map(child => {
        const rect = child.getBoundingClientRect();
        return {
          left: rect.left,
          width: rect.width,
          top: rect.top,
          bottom: rect.bottom,
        };
      })
    );
    expect(positions[1]!.top).toBeGreaterThan(positions[0]!.bottom);
    expect(Math.abs(positions[0]!.left - positions[1]!.left)).toBeLessThan(1);
    if (width === 375)
      expect(Math.abs(positions[0]!.width - positions[1]!.width)).toBeLessThan(
        1
      );
    else expect(positions[0]!.width).toBeGreaterThan(positions[1]!.width);
    respond = undefined;
    await page
      .getByRole('button', { name: 'Refresh data', exact: true })
      .click();
    await expect.poll(() => Boolean(respond)).toBe(true);
    await readable();
    expect(
      await cards
        .getByRole('region', { name: 'Events', exact: true })
        .filter({ hasText: '42' })
        .count()
    ).toBe(2);
    respond!(null);
    await expect
      .poll(() =>
        page
          .getByRole('alert')
          .filter({ hasText: /Couldn’t refresh/ })
          .isVisible()
      )
      .toBe(true);
    await readable();
    expect(
      await cards
        .getByRole('region', { name: 'Events', exact: true })
        .filter({ hasText: '42' })
        .count()
    ).toBe(2);
  });
}

test('a report formats values, searches all loaded rows and paginates the visible table', async ({
  page,
}) => {
  await page.goto('/static');
  await expect
    .poll(() =>
      page
        .getByRole('region', { name: 'Total events', exact: true })
        .textContent()
    )
    .toContain('12,345');
  await expect
    .poll(() =>
      page
        .getByRole('region', { name: 'Conversion', exact: true })
        .textContent()
    )
    .toContain('11.6%');
  await expect
    .poll(() =>
      page
        .getByRole('region', { name: 'Unavailable', exact: true })
        .textContent()
    )
    .toContain('—');
  await expect
    .poll(() =>
      page
        .getByRole('row', { name: 'Measured zero 0', exact: true })
        .isVisible()
    )
    .toBe(true);
  const search = page.getByRole('searchbox', { name: 'Search groups' });
  await search.fill('Group 9');
  await expect
    .poll(() =>
      page.getByRole('row', { name: 'Group 9 9', exact: true }).isVisible()
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.getByRole('row', { name: 'Measured zero 0', exact: true }).count()
    )
    .toBe(0);
  await search.fill('missing');
  await expect
    .poll(() =>
      page
        .getByRole('main')
        .getByText('No matching results', { exact: true })
        .isVisible()
    )
    .toBe(true);
  await search.fill('cafe');
  await expect
    .poll(() =>
      page
        .getByRole('row', { name: 'Café <table> 1234', exact: true })
        .isVisible()
    )
    .toBe(true);
  await search.fill('');
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect
    .poll(() =>
      page.getByRole('row', { name: 'Group 9 9', exact: true }).isVisible()
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.getByRole('row', { name: 'Café <table> 1234', exact: true }).count()
    )
    .toBe(0);
  await page
    .getByRole('button', { name: 'Previous page', exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .getByRole('row', { name: 'Café <table> 1234', exact: true })
        .isVisible()
    )
    .toBe(true);
});

test('a report explicitly installs styles under CSP and can style another document independently', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/styles');
  const grid = page.getByLabel('Report grid');
  await expect.poll(() => grid.count()).toBe(1);
  expect(
    await grid.evaluate(element => getComputedStyle(element).display)
  ).toBe('block');
  await page
    .getByRole('button', { name: 'Style other report', exact: true })
    .click();
  const other = page.frameLocator('iframe').getByLabel('Report grid');
  await expect
    .poll(() => other.evaluate(element => getComputedStyle(element).display))
    .toBe('grid');
  expect(
    await grid.evaluate(element => getComputedStyle(element).display)
  ).toBe('block');
  await page.getByRole('button', { name: 'Style report', exact: true }).click();
  await expect
    .poll(() => grid.evaluate(element => getComputedStyle(element).display))
    .toBe('grid');
  await page.getByRole('button', { name: 'Style report', exact: true }).click();
  expect(
    await page
      .getByRole('status', { name: 'Stylesheet installation', exact: true })
      .textContent()
  ).toBe('Reused stylesheet');
  expect(errors).toEqual([]);
});

test('a report formats missing values, precise ratios, localized numbers and calendar ranges without ambiguity', async ({
  page,
}) => {
  await page.goto('/static');
  for (const row of [
    'Rounded number 12.35',
    'Negative zero 0',
    'Compact count 12.3K',
    'Fractional count —',
    'Negative count —',
    'Nonfinite value —',
    'Custom missing label Unknown',
    'Small ratio 0.12%',
    'Tiny positive ratio <0.01%',
    'Tiny negative ratio >−0.01%',
    'Measured zero ratio 0%',
    'Currency $12.50',
    'Localized number 1.234,5',
    'Same month Sep 25–27, 2026',
    'Cross month Aug 30–Sep 28, 2026',
    'Cross year Dec 30, 2025–Jan 2, 2026',
    'Single day Sep 28, 2026',
    'Singular label 1 event',
    'Plural label 0 events',
  ]) {
    await expect
      .poll(() => page.getByRole('row', { name: row, exact: true }).isVisible())
      .toBe(true);
  }
});

test('an author can override public control tokens and apply and restore appearance', async ({
  page,
}) => {
  await page.goto('/appearance');
  const action = page.getByRole('button', {
    name: 'Custom action',
    exact: true,
  });
  await expect
    .poll(() => action.evaluate(element => getComputedStyle(element).height))
    .toBe('60px');
  const originalColor = await action.evaluate(
    element => getComputedStyle(element).color
  );
  await page
    .getByRole('button', { name: 'Apply appearance', exact: true })
    .click();
  await expect
    .poll(() => action.evaluate(element => getComputedStyle(element).color))
    .toBe('rgb(51, 102, 153)');
  await page
    .getByRole('button', { name: 'Restore appearance', exact: true })
    .click();
  await expect
    .poll(() => action.evaluate(element => getComputedStyle(element).color))
    .toBe(originalColor);
});

test('option lists use the base palette and honor inherited selection overrides', async ({
  page,
}) => {
  await page.goto('/appearance');
  await page
    .getByRole('button', { name: 'Apply appearance', exact: true })
    .click();
  const triggers = ['Name Sort by', 'Segment: Enterprise'];
  for (const customized of [false, true]) {
    if (customized)
      await page
        .getByRole('button', { name: 'Customize selection', exact: true })
        .click();
    for (const name of triggers) {
      await page.getByRole('button', { name, exact: true }).click();
      await page.mouse.move(0, 0);
      const option = page.getByRole('option', { selected: true });
      await expect
        .poll(() =>
          option.evaluate(element => {
            const style = getComputedStyle(element);
            return [style.backgroundColor, style.color];
          })
        )
        .toEqual(
          customized
            ? ['rgb(51, 102, 153)', 'rgb(255, 255, 255)']
            : ['rgb(41, 45, 49)', 'rgb(242, 243, 244)']
        );
      await page.keyboard.press('Escape');
      await expect.poll(() => page.getByRole('option').count()).toBe(0);
    }
  }
});

test('neutral defaults agree before and after theme application and open triggers have a steady state', async ({
  page,
}) => {
  await page.goto('/appearance');
  const accent = page.getByRole('button', {
    name: 'Custom action',
    exact: true,
  });
  const original = await accent.evaluate(
    element => getComputedStyle(element).color
  );
  for (const theme of ['light', 'dark']) {
    await page
      .getByRole('button', { name: `Apply neutral ${theme}`, exact: true })
      .click();
    await expect
      .poll(() => accent.evaluate(element => getComputedStyle(element).color))
      .toBe(theme === 'light' ? original : 'rgb(242, 243, 244)');
    for (const name of ['Name Sort by', 'Segment: Enterprise', 'Orders: Any']) {
      const trigger = page.getByRole('button', { name, exact: true });
      await trigger.click();
      await page.mouse.move(0, 0);
      await expect
        .poll(() =>
          trigger.evaluate(element => {
            const s = getComputedStyle(element);
            return [s.backgroundColor, s.borderColor];
          })
        )
        .toEqual(
          theme === 'dark'
            ? ['rgb(32, 35, 38)', 'rgb(174, 181, 188)']
            : ['rgb(255, 255, 255)', 'rgb(104, 112, 120)']
        );
      await page.keyboard.press('Escape');
      await expect
        .poll(() => trigger.getAttribute('aria-expanded'))
        .toBe('false');
    }
  }
  await page
    .getByRole('button', { name: 'Apply appearance', exact: true })
    .click();
  const outcome = page
    .getByRole('figure', { name: 'Revenue comparison' })
    .getByText('100.0% vs previous period', { exact: true });
  await expect
    .poll(() => outcome.evaluate(element => getComputedStyle(element).color))
    .toBe('rgb(107, 195, 154)');
  await page
    .getByRole('button', { name: 'Customize status', exact: true })
    .click();
  await expect
    .poll(() => outcome.evaluate(element => getComputedStyle(element).color))
    .toBe('rgb(128, 64, 192)');
});

test('active live updates keep their semantic foreground, dot and border across themes', async ({
  page,
}) => {
  await page.goto('/appearance');
  const live = page.getByRole('button', {
    name: 'Pause live updates',
    exact: true,
  });
  for (const customized of [false, true]) {
    if (customized)
      await page
        .getByRole('button', { name: 'Customize status', exact: true })
        .click();
    for (const theme of ['light', 'dark']) {
      await page
        .getByRole('button', { name: `Apply neutral ${theme}`, exact: true })
        .click();
      await page.mouse.move(0, 0);
      const positive = customized
        ? 'rgb(128, 64, 192)'
        : theme === 'light'
          ? 'rgb(20, 120, 98)'
          : 'rgb(107, 195, 154)';
      await expect
        .poll(() =>
          live.evaluate(element => [
            getComputedStyle(element).color,
            getComputedStyle(element.querySelector('svg')!).color,
            getComputedStyle(element, '::after').backgroundColor,
            getComputedStyle(element.closest('.altertable-live-control')!)
              .borderColor,
          ])
        )
        .toEqual([positive, positive, positive, positive]);
    }
  }
});

test('local derived defaults compose and explicit tokens retain precedence', async ({
  page,
}) => {
  await page.goto('/appearance');
  const local = page.getByRole('region', {
    name: 'Local appearance',
    exact: true,
  });
  const input = local.getByRole('searchbox', { name: 'Local search' });
  const outcome = local
    .getByRole('figure', { name: 'Local revenue comparison' })
    .getByText('50.0% vs previous period', { exact: true });
  for (const overridden of [false, true]) {
    if (overridden)
      await page
        .getByRole('button', { name: 'Override local defaults', exact: true })
        .click();
    expect(await input.evaluate(el => getComputedStyle(el).fontSize)).toBe(
      overridden ? '24px' : '20px'
    );
    expect(await outcome.evaluate(el => getComputedStyle(el).color)).toBe(
      overridden ? 'rgb(128, 64, 192)' : 'rgb(0, 0, 255)'
    );
  }
  await local
    .getByRole('button', { name: 'Name Local ordering', exact: true })
    .click();
  const menu = page.getByRole('listbox', { name: 'Local ordering values' });
  expect(await menu.evaluate(el => getComputedStyle(el).fontSize)).toBe('13px');
});

test('layout spacing is independent of widget padding', async ({ page }) => {
  await page.goto('/appearance');
  const layout = page.getByLabel('Spacing layout', { exact: true });
  expect(await layout.evaluate(el => getComputedStyle(el).gap)).toBe('40px');
  const heading = layout.getByRole('heading', {
    name: 'Padding example',
    exact: true,
  });
  expect(
    await heading.evaluate(
      el => getComputedStyle(el.parentElement!.parentElement!).paddingLeft
    )
  ).toBe('12px');
});

test('compact controls and selected-control elevation follow appearance presets', async ({
  page,
}) => {
  await page.goto('/appearance');
  const compact = page.getByRole('button', {
    name: 'Compact action',
    exact: true,
  });
  const regular = page.getByRole('button', {
    name: 'Custom action',
    exact: true,
  });
  const defaultControl = page.getByRole('button', {
    name: 'Override local defaults',
    exact: true,
  });
  for (const [density, height] of [
    ['compact', '26px'],
    ['comfortable', '30px'],
    ['spacious', '34px'],
  ]) {
    await page
      .getByRole('button', { name: `Apply density ${density}`, exact: true })
      .click();
    expect(await compact.evaluate(el => getComputedStyle(el).minHeight)).toBe(
      height
    );
    expect(await regular.evaluate(el => getComputedStyle(el).minHeight)).toBe(
      '60px'
    );
    expect(
      await defaultControl.evaluate(el => getComputedStyle(el).minHeight)
    ).toBe(`${parseInt(height!, 10) + 8}px`);
  }
  const shadows: string[] = [];
  for (const elevation of ['flat', 'subtle', 'raised']) {
    await page
      .getByRole('button', {
        name: `Apply elevation ${elevation}`,
        exact: true,
      })
      .click();
    shadows.push(await compact.evaluate(el => getComputedStyle(el).boxShadow));
  }
  expect(shadows[0]).toBe('none');
  expect(shadows[1]).not.toBe('none');
  expect(shadows[2]).not.toBe(shadows[1]);
  await page
    .getByRole('button', { name: 'Open appearance sheet', exact: true })
    .click();
  expect(
    await page
      .getByRole('heading', { name: 'Appearance sheet', exact: true })
      .evaluate(el => getComputedStyle(el).fontSize)
  ).toBe('20px');
});

for (const width of [320, 1280]) {
  test(`app content keeps bottom breathing room with and without its footer at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const embedded of [true, false]) {
      await page.goto(embedded ? '/bundle-host' : '/static');
      const app = embedded ? page.frameLocator('iframe') : page;
      await expect.poll(() => app.getByRole('main').isVisible()).toBe(true);
      const geometry = await app.getByRole('main').evaluate(main => {
        const body = main.querySelector('.altertable-app-body')!;
        return {
          padding: Number.parseFloat(getComputedStyle(main).paddingBottom),
          gap:
            main.getBoundingClientRect().bottom -
            body.getBoundingClientRect().bottom,
          footer: !!document.querySelector('.altertable-app-footer'),
        };
      });
      expect(geometry.footer).toBe(!embedded);
      expect(geometry.padding).toBeGreaterThanOrEqual(64);
      expect(geometry.gap).toBeGreaterThanOrEqual(geometry.padding - 1);
    }
  });
}

test('table counts follow search before pagination and empty search recovers focus', async ({
  page,
}) => {
  await page.goto('/static');
  const table = page.getByRole('region', {
    name: 'Events by group',
    exact: true,
  });
  const heading = table.getByRole('heading', {
    name: 'Events by group',
    exact: true,
  });
  await expect.poll(() => heading.textContent()).toContain('12');
  await table.getByRole('button', { name: 'Next page', exact: true }).click();
  expect(await heading.textContent()).toContain('12');
  const search = table.getByRole('searchbox', { name: 'Search groups' });
  await search.fill('Group 9');
  await expect.poll(() => heading.textContent()).toContain('1');
  await search.fill('missing');
  await expect.poll(() => heading.textContent()).toContain('0');
  await table
    .getByRole('button', { name: 'Clear search', exact: true })
    .click();
  await expect.poll(() => heading.textContent()).toContain('12');
  await expect
    .poll(() => search.evaluate(element => element === document.activeElement))
    .toBe(true);
  expect(
    await table
      .getByRole('row', { name: 'Café <table> 1234', exact: true })
      .isVisible()
  ).toBe(true);
  expect(
    await table
      .getByRole('button', { name: 'Clear filters', exact: true })
      .count()
  ).toBe(0);
});

test('table counts support explicit totals, hiding, previews, and unfiltered empty data', async ({
  page,
}) => {
  const heading = page.getByRole('heading', {
    name: 'Events by group',
    exact: true,
  });
  await page.goto('/static?server-total');
  await expect.poll(() => heading.textContent()).toContain('123');
  await page.getByRole('searchbox', { name: 'Search groups' }).fill('Group 9');
  expect(await heading.textContent()).toContain('123');
  await page.goto('/static?server-total&hide-count');
  await expect.poll(() => heading.textContent()).toBe('Events by group');
  await page.goto('/static?preview-table');
  await expect.poll(() => heading.textContent()).toContain('12');
  expect(
    await page
      .getByRole('region', { name: 'Events by group', exact: true })
      .getByRole('row')
      .count()
  ).toBe(3);
  await page.goto('/static?empty-table');
  await expect.poll(() => heading.textContent()).toContain('0');
  const empty = page.getByRole('region', {
    name: 'Events by group',
    exact: true,
  });
  expect(
    await empty.getByText('No events yet', { exact: true }).isVisible()
  ).toBe(true);
  expect(await empty.getByRole('button', { name: /^Clear/ }).count()).toBe(0);
});

test('table loading omits counts and search recovery preserves authored actions and reset values', async ({
  page,
}) => {
  await page.goto('/static?loading-table&server-total');
  const region = page.getByRole('region', {
    name: 'Events by group',
    exact: true,
  });
  expect(await region.getByRole('heading').textContent()).toBe(
    'Events by group'
  );
  expect(await region.getByRole('button', { name: /^Clear/ }).count()).toBe(0);
  await page.goto('/static?custom-empty-action&search-default');
  const search = region.getByRole('searchbox', { name: 'Search groups' });
  await search.fill('missing');
  expect(
    await region
      .getByRole('button', { name: 'Clear search', exact: true })
      .count()
  ).toBe(0);
  expect(
    await region.getByText('No groups match', { exact: true }).isVisible()
  ).toBe(true);
  expect(
    await region
      .getByText('Choose another group name.', { exact: true })
      .isVisible()
  ).toBe(true);
  expect(
    await region
      .getByRole('link', { name: 'Read help', exact: true })
      .isVisible()
  ).toBe(true);
  await search.fill('also missing');
  await region
    .getByRole('button', { name: 'Clear search', exact: true })
    .click();
  await expect.poll(() => search.inputValue()).toBe('missing');
  expect(
    await region
      .getByRole('button', { name: 'Clear search', exact: true })
      .count()
  ).toBe(0);
});

test('table recovery focuses the active mount and falls back when the search input disappears', async ({
  page,
}) => {
  await page.goto('/static?inspectable-table');
  const region = page.getByRole('region', {
    name: 'Events by group',
    exact: true,
  });
  const search = region.getByRole('searchbox', { name: 'Search groups' });
  await search.fill('missing');
  await region
    .getByRole('button', { name: 'Explore Events by group', exact: true })
    .click();
  const inspection = page.getByRole('dialog', {
    name: 'Events by group',
    exact: true,
  });
  await inspection
    .getByRole('button', { name: 'Clear search', exact: true })
    .click();
  await expect
    .poll(() =>
      inspection
        .getByRole('searchbox')
        .evaluate(element => element === document.activeElement)
    )
    .toBe(true);
  await inspection
    .getByRole('button', { name: 'Close panel', exact: true })
    .click();
  await expect.poll(() => inspection.count()).toBe(0);
  await search.fill('missing');
  await region
    .getByRole('button', { name: 'Clear search', exact: true })
    .click();
  await expect
    .poll(() => search.evaluate(element => element === document.activeElement))
    .toBe(true);
  await page.goto('/static?few-rows&initial-search=missing');
  await region
    .getByRole('button', { name: 'Clear search', exact: true })
    .click();
  await expect.poll(() => region.getByRole('searchbox').count()).toBe(0);
  await expect
    .poll(() =>
      region
        .getByRole('table')
        .evaluate(element => element === document.activeElement)
    )
    .toBe(true);
});
