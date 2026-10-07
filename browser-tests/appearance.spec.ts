import { expect, test, type Page } from '@playwright/test';

async function color(
  page: Page,
  selector: string,
  property: string,
  pseudo?: string
) {
  return page.locator(selector).evaluate(
    (element, { property, pseudo }) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d')!;
      context.fillStyle = getComputedStyle(element, pseudo).getPropertyValue(
        property
      );
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
    },
    { property, pseudo }
  );
}

function contrast(first: number[], second: number[]) {
  function luminance(rgb: number[]) {
    const linear = rgb.map(value => {
      const channel = value / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
  }
  const a = luminance(first),
    b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test('component injection preserves host controls and supports author overrides in either order', async ({
  page,
}) => {
  await page.goto('/appearance');
  await expect(page.getByRole('button', { name: 'Host control' })).toHaveCSS(
    'cursor',
    'default'
  );
  await expect(page.getByRole('button', { name: 'Host control' })).toHaveCSS(
    'font-size',
    '17px'
  );
  await expect(page.locator('.host-tabs .react-aria-Tab')).toHaveCSS(
    'border-bottom-width',
    '0px'
  );
  await expect(page.locator('body')).toHaveCSS('margin-top', '8px');
  await page.evaluate(() => {
    window.setAppearance({
      theme: 'dark',
      accentColor: '#ffcc00',
      density: 'spacious',
    });
    document.documentElement.setAttribute('data-override', '');
    document
      .querySelector('.altertable-button')!
      .setAttribute('data-override', '');
  });
  await expect(
    page.getByRole('button', { name: 'Action', exact: true })
  ).toHaveCSS('background-color', 'rgb(12, 34, 56)');
  await expect(
    page.getByRole('button', { name: 'Action', exact: true })
  ).toHaveCSS('cursor', 'crosshair');
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--atbl-accent')
        .trim()
    )
  ).toBe('#123456');
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--atbl-space-md')
        .trim()
    )
  ).toBe('23px');
  expect(
    await page.evaluate(() =>
      document.documentElement.style.getPropertyValue('--atbl-accent')
    )
  ).toBe('');
  await page.addStyleTag({
    content: ':root[data-override] { --atbl-cursor-action: grab; }',
  });
  await expect(
    page.getByRole('button', { name: 'Action', exact: true })
  ).toHaveCSS('cursor', 'grab');
});

test('native, React Aria, checkbox and chart controls share cursor and keyboard focus policies', async ({
  page,
}) => {
  await page.goto('/appearance');
  await expect(
    page.getByRole('button', { name: 'Action', exact: true })
  ).toHaveCSS('cursor', 'pointer');
  await expect(page.getByRole('button', { name: 'Chart action' })).toHaveCSS(
    'cursor',
    'pointer'
  );
  await expect(page.getByRole('button', { name: 'Definition' })).toHaveCSS(
    'cursor',
    'help'
  );
  await expect(page.getByRole('button', { name: 'Disabled action' })).toHaveCSS(
    'cursor',
    'default'
  );
  await expect(
    page.getByRole('checkbox', { name: 'Disabled checkbox' })
  ).toHaveCSS('cursor', 'default');
  await expect(page.getByRole('option', { name: 'Disabled option' })).toHaveCSS(
    'cursor',
    'default'
  );
  await expect(page.getByRole('option', { name: 'Focused option' })).toHaveCSS(
    'outline-offset',
    '-1px'
  );
  for (const name of ['Action', 'Chart action']) {
    await page.keyboard.press('Tab');
    await page.getByRole('button', { name, exact: true }).focus();
    await expect(page.getByRole('button', { name, exact: true })).toHaveCSS(
      'outline-style',
      'solid'
    );
    await expect(page.getByRole('button', { name, exact: true })).toHaveCSS(
      'outline-offset',
      '2px'
    );
  }
  await page
    .getByRole('checkbox', { name: 'Selected Muted explanation' })
    .focus();
  await expect(page.locator('.altertable-checkbox').first()).toHaveCSS(
    'outline-style',
    'solid'
  );
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(page.getByRole('option', { name: 'Focused option' })).toHaveCSS(
    'outline-style',
    'solid'
  );
});

test('preset themes and brand foregrounds have sufficient contrast and theme portals', async ({
  page,
}) => {
  await page.goto('/appearance');
  for (const baseColor of ['neutral', 'slate', 'warm'] as const) {
    for (const theme of ['light', 'dark'] as const) {
      await page.evaluate(options => window.setAppearance(options), {
        baseColor,
        theme,
      });
      const background = await color(
        page,
        '.altertable-metric-widget',
        'background-color'
      );
      const text = await color(page, '.altertable-metric-widget', 'color');
      const muted = await color(page, '.altertable-checkbox small', 'color');
      expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5);
      const focus = await color(
        page,
        '.altertable-tabs .react-aria-Tab',
        'outline-color'
      );
      expect(contrast(focus, background)).toBeGreaterThanOrEqual(3);
      const mark = await color(
        page,
        '.altertable-selectable-bars-bar',
        'background-color'
      );
      expect(contrast(mark, background)).toBeGreaterThanOrEqual(3);
      expect(await color(page, '[role=tooltip]', 'background-color')).toEqual(
        background
      );
      expect(contrast(muted, background)).toBeGreaterThanOrEqual(4.5);
    }
  }
  for (const options of [
    { theme: 'light', accentColor: '#ffcc00' },
    { theme: 'light', accentColor: '#112233' },
    { theme: 'light', accentColor: 'gold' },
    { theme: 'light', accentColor: 'rgb(12, 34, 56)' },
    { theme: 'dark', accentColor: '#112233' },
    { theme: 'dark', darkAccentColor: '#112233' },
  ] as const) {
    await page.evaluate(options => window.setAppearance(options), options);
    const tick = await color(
      page,
      '.altertable-selection-mark',
      'border-top-color',
      '::after'
    );
    const accent = await color(
      page,
      '.altertable-selection-mark',
      'background-color'
    );
    expect(contrast(tick, accent)).toBeGreaterThanOrEqual(4.5);
  }
});

test('palette changes populate all eight chart slots and remove stale colors', async ({
  page,
}) => {
  await page.goto('/appearance');
  await page.evaluate(() =>
    window.setAppearance({ chartColors: ['#112233', '#aabbcc'] })
  );
  for (let index = 1; index <= 8; index++)
    expect(
      await color(page, `[data-chart='${index}']`, 'background-color')
    ).toEqual(index % 2 ? [17, 34, 51] : [170, 187, 204]);
  await page.evaluate(() =>
    window.setAppearance({ chartColors: ['#445566'], theme: 'dark' })
  );
  for (let index = 1; index <= 8; index++)
    expect(
      await color(page, `[data-chart='${index}']`, 'background-color')
    ).toEqual([143, 153, 163]);
  await page.evaluate(() => window.setAppearance({}));
  expect(await color(page, "[data-chart='7']", 'background-color')).toEqual([
    40, 95, 192,
  ]);
  expect(await color(page, "[data-chart='8']", 'background-color')).toEqual([
    169, 83, 25,
  ]);
});

test('system theme changes update presets and cleanup restores prior document state', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/appearance');
  await page.evaluate(() => {
    document.documentElement.style.setProperty(
      '--atbl-input-accent',
      '#abcdef'
    );
    document.documentElement.setAttribute('data-atbl-density', 'compact');
    window.setAppearance({ theme: 'system', density: 'spacious' });
  });
  await expect(page.locator('html')).toHaveAttribute(
    'data-atbl-theme',
    'light'
  );
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-atbl-theme', 'dark');
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  await page.evaluate(() => window.clearAppearance());
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-atbl-appearance'
  );
  await expect(page.locator('html')).not.toHaveAttribute('data-atbl-theme');
  await expect(page.locator('html')).toHaveAttribute(
    'data-atbl-density',
    'compact'
  );
  expect(
    await page.evaluate(() =>
      document.documentElement.style.getPropertyValue('--atbl-input-accent')
    )
  ).toBe('#abcdef');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).not.toHaveAttribute('data-atbl-theme');
});

test('default grids retain a single column', async ({ page }) => {
  await page.goto('/appearance');
  const first = await page
    .getByText('First grid item', { exact: true })
    .boundingBox();
  const second = await page
    .getByText('Second grid item', { exact: true })
    .boundingBox();
  expect(second!.y).toBeGreaterThanOrEqual(first!.y + first!.height);
  expect(second!.x).toBe(first!.x);
  expect(second!.width).toBe(first!.width);
});

test('computed defaults compose local inputs and preserve explicit ancestor overrides', async ({
  page,
}) => {
  await page.goto('/appearance');
  await page.evaluate(() => {
    const button =
      document.querySelector<HTMLButtonElement>('.altertable-button')!;
    button.dataset.atblInternalSurface = 'control';
    button.style.setProperty('--atbl-focus-color', '#ff0000');
    button.style.setProperty('--atbl-accent', '#ff0000');
    button.setAttribute('data-focus-visible', '');
    button.setAttribute('aria-pressed', 'true');
  });
  const button = page.getByRole('button', { name: 'Action', exact: true });
  await expect(button).toHaveCSS('outline-color', 'rgb(255, 0, 0)');
  await expect
    .poll(() =>
      color(page, '.altertable-button:not(:disabled)', 'background-color')
    )
    .toEqual([255, 224, 224]);
  await page.evaluate(() => window.setAppearance({ theme: 'dark' }));
  await expect
    .poll(() =>
      color(page, '.altertable-button:not(:disabled)', 'background-color')
    )
    .toEqual([81, 27, 30]);
  await page.addStyleTag({
    content:
      ':root { --atbl-focus-outline: 3px dashed blue; --atbl-control-selected-surface: #123456; }',
  });
  await expect(button).toHaveCSS('outline-width', '3px');
  await expect(button).toHaveCSS('outline-style', 'dashed');
  await expect(button).toHaveCSS('outline-color', 'rgb(0, 0, 255)');
  await expect(button).toHaveCSS('background-color', 'rgb(18, 52, 86)');
});

test('local layout spacing and overlay selection defaults resolve at consumption', async ({
  page,
}) => {
  await page.goto('/appearance');
  await page.evaluate(() => {
    const grid = document.querySelector<HTMLElement>('.altertable-grid')!;
    grid.style.setProperty('--atbl-space-md', '41px');
    grid.style.setProperty('--atbl-space-lg', '47px');
    const overlay = document.querySelector<HTMLElement>(
      '.altertable-combobox-popover'
    )!;
    overlay.style.setProperty('--atbl-accent', '#ff0000');
    const option = overlay.querySelector<HTMLElement>('[data-focus-visible]')!;
    option.dataset.atblInternalSurface = 'option';
    option.setAttribute('data-selected', '');
  });
  await expect(page.locator('.altertable-grid')).toHaveCSS('row-gap', '41px');
  expect(
    await color(page, "[role='option'][data-selected]", 'background-color')
  ).toEqual([255, 224, 224]);
});

test('native and Aria state paint excludes disabled hover and keeps busy geometry', async ({
  page,
}) => {
  await page.goto('/gallery?view=filters');
  const disabled = page.getByRole('button', {
    name: 'Disabled categories: HTTP',
    exact: true,
  });
  const before = await disabled.evaluate(
    element => getComputedStyle(element).backgroundColor
  );
  await expect(disabled).toHaveCSS('opacity', '0.5');
  await disabled.hover();
  await expect(disabled).toHaveCSS('background-color', before);
  await page.goto('/appearance');
  const action = page.getByRole('button', { name: 'Action', exact: true });
  const bounds = await action.boundingBox();
  await action.evaluate(element => element.setAttribute('aria-busy', 'true'));
  await expect(action).toHaveCSS('cursor', 'progress');
  expect(await action.boundingBox()).toEqual(bounds);
  await action.evaluate(element => element.setAttribute('disabled', ''));
  await expect(action).toHaveCSS('cursor', 'default');
});

test('search fields apply hover borders only while enabled', async ({
  page,
}) => {
  await page.goto('/gallery?view=filters');
  const field = page.locator('.altertable-search-input-wrap:visible').first();
  await field.evaluate(element =>
    (element as HTMLElement).style.setProperty(
      '--atbl-control-hover-border',
      'rgb(255, 0, 0)'
    )
  );
  await field.hover();
  await expect(field).toHaveCSS('border-top-color', 'rgb(255, 0, 0)');
  await page.mouse.move(0, 0);
  const idleBorder = await field.evaluate(
    element => getComputedStyle(element).borderTopColor
  );
  await field
    .locator('input')
    .evaluate(element => ((element as HTMLInputElement).disabled = true));
  await field.hover();
  await expect(field).toHaveCSS('border-top-color', idleBorder);
});

test('density changes control geometry without shrinking typography', async ({
  page,
}) => {
  await page.goto('/appearance');
  const button = page.getByRole('button', { name: 'Action', exact: true });
  const heights: number[] = [];
  for (const density of ['compact', 'comfortable', 'spacious'] as const) {
    await page.evaluate(density => window.setAppearance({ density }), density);
    heights.push((await button.boundingBox())!.height);
    await expect(button).toHaveCSS('font-size', '13px');
  }
  heights.forEach((height, index) =>
    expect(height).toBeCloseTo([34, 38, 42][index]!, 2)
  );
});
