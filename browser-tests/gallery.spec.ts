import { expect, test } from '@playwright/test';

test('gallery preserves control defaults, status, and keyboard selection', async ({
  page,
}) => {
  await page.goto('/gallery?view=filters');
  await expect(
    page.getByRole('heading', { name: 'Data app gallery' })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Disabled action', exact: true })
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Disabled categories: HTTP', exact: true })
  ).toBeDisabled();
  const checkbox = page.getByRole('checkbox', {
    name: 'Include archived records',
    exact: true,
  });
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  await checkbox.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(
    page.locator('#controls .altertable-checkbox').first()
  ).toHaveCSS('outline-width', '1px');
  await page
    .getByRole('button', {
      name: 'Loading categories: Choose categories',
      exact: true,
    })
    .click();
  let dialog = page.getByRole('dialog', { name: 'Loading categories options' });
  await expect(dialog.locator('.altertable-combobox-skeletons')).toBeVisible();
  await expect(
    dialog.locator('.altertable-search-input-spinner')
  ).toBeVisible();
  await expect(dialog.getByRole('option')).toHaveCount(0);
  await dialog.getByRole('searchbox').press('Escape');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Complete loading', exact: true })
    .click();
  await page
    .getByRole('button', {
      name: 'Loading categories: Choose categories',
      exact: true,
    })
    .click();
  dialog = page.getByRole('dialog', { name: 'Loading categories options' });
  await expect(dialog.getByRole('option')).toHaveCount(3);
  await dialog.getByRole('searchbox').press('Escape');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Failed categories: HTTP', exact: true })
    .click();
  dialog = page.getByRole('dialog', { name: 'Failed categories options' });
  await expect(dialog.locator('.altertable-request-hint-message')).toHaveText(
    'Couldn’t load values'
  );
  await expect(
    dialog.getByRole('option', { name: 'Postgres', exact: true })
  ).toBeEnabled();
  await dialog.getByRole('button', { name: 'Try again' }).click();
  await expect(dialog.locator('.altertable-request-hint-message')).toHaveCount(
    0
  );
  await dialog.getByRole('searchbox').press('Escape');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Categories: Choose categories', exact: true })
    .click();
  dialog = page.getByRole('dialog', { name: 'Categories options' });
  const search = dialog.getByRole('searchbox');
  const missing = dialog.getByRole('option', {
    name: 'No value Records without a category value',
  });
  await expect
    .poll(() =>
      missing.evaluate(
        element => getComputedStyle(element, '::before').borderTopWidth
      )
    )
    .toBe('1px');
  await expect(missing).toHaveCSS(
    'border-radius',
    await dialog
      .getByRole('option', { name: 'HTTP', exact: true })
      .evaluate(element => getComputedStyle(element).borderRadius)
  );
  await page.screenshot({
    path: `/tmp/runtime-gallery-divider-${test.info().project.name}.png`,
  });
  await search.fill('No value');
  await expect(dialog.getByRole('option')).toHaveCount(1);
  await expect
    .poll(() =>
      missing.evaluate(
        element => getComputedStyle(element, '::before').borderTopWidth
      )
    )
    .toBe('0px');
  await search.fill('');
  await search.focus();
  await expect(dialog.locator('.altertable-search-input-wrap')).toHaveCSS(
    'outline-style',
    'none'
  );
  await search.press('ArrowDown');
  await expect(
    dialog.getByRole('option', { name: 'HTTP', exact: true })
  ).toBeFocused();
  await expect(
    dialog.getByRole('option', { name: 'HTTP', exact: true })
  ).toHaveCSS('outline-width', '1px');
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await expect(
    dialog.getByRole('option', { name: 'Other', exact: true })
  ).toBeDisabled();
  await dialog.getByRole('button', { name: 'Clear selection' }).click();
  await expect(dialog).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Categories: Choose categories', exact: true })
    .click();
  await expect(
    dialog.getByRole('option', { name: 'Other', exact: true })
  ).toBeEnabled();
  await search.fill('does not exist');
  await expect(
    dialog.getByText('No matching values', { exact: true }).last()
  ).toBeVisible();
});

test('gallery widget and inspection show chart tooltips and share view changes', async ({
  page,
  isMobile,
}) => {
  await page.goto('/gallery');
  const widget = page.locator('.altertable-data-widget').filter({
    has: page.getByRole('heading', { name: 'Weekly activity', exact: true }),
  });
  const trigger = widget.getByRole('button', {
    name: 'Explore Weekly activity',
  });
  if (isMobile) await trigger.tap();
  else await trigger.click();
  const sheet = page.getByRole('dialog', {
    name: 'Weekly activity',
    exact: true,
  });
  const sheetPoint = sheet.getByRole('button', {
    name: 'Wednesday: 8 events',
    exact: true,
  });
  if (isMobile) await sheetPoint.tap();
  else await sheetPoint.hover();
  await expect(sheet.getByRole('tooltip')).toContainText('8 events');
  await page.keyboard.press('Escape');
  await expect(sheet.getByRole('tooltip')).toHaveCount(0);
  await expect(sheet).toBeVisible();
  await sheet.getByRole('tab', { name: 'Summary', exact: true }).click();
  await expect(
    sheet.getByText(
      '20 events this week, concentrated on Monday and Wednesday. Tuesday had no recorded activity.',
      { exact: true }
    )
  ).toBeVisible();
  await sheet.getByRole('button', { name: 'Close panel', exact: true }).click();
  await expect(sheet).not.toBeVisible();
  await expect(trigger).toBeFocused();
  const body = widget.locator(':scope > .altertable-data-widget-body');
  await expect(
    body.getByRole('tab', { name: 'Summary', exact: true })
  ).toHaveAttribute('aria-selected', 'true');
  await body.getByRole('tab', { name: 'Chart', exact: true }).click();
  const bodyPoint = body.getByRole('button', {
    name: 'Wednesday: 8 events',
    exact: true,
  });
  if (isMobile) await bodyPoint.tap();
  else await bodyPoint.hover();
  await expect(page.getByRole('tooltip')).toContainText('8 events');
});

test('gallery uses shared defaults in both themes and narrow containers', async ({
  page,
}) => {
  await page.goto('/gallery?view=filters');
  const action = page.getByRole('button', { name: 'Hint action', exact: true });
  const backgrounds: string[] = [];
  for (const theme of ['light', 'dark'] as const) {
    if (theme === 'dark') {
      await page.getByRole('button', { name: 'Switch to dark theme' }).click();
      await expect
        .poll(() =>
          action.evaluate(element => getComputedStyle(element).backgroundColor)
        )
        .not.toBe(backgrounds[0]);
    }
    const surfaceColor = await page
      .locator('#widgets .altertable-data-widget')
      .first()
      .evaluate(element => getComputedStyle(element).backgroundColor);
    await expect(action).toHaveCSS('background-color', surfaceColor);
    backgrounds.push(surfaceColor);
    await action.press('Tab');
    await action.focus();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();
    await expect(action).toHaveAttribute(
      'aria-describedby',
      (await tooltip.getAttribute('id')) ?? ''
    );
    await expect(action).toHaveCSS('outline-width', '1px');
    await action.press('Escape');
    await expect(tooltip).not.toBeVisible();
    await page.getByRole('tab', { name: 'App layout', exact: true }).click();
    const narrow = page.getByTestId('narrow-controls');
    const bounds = await narrow.evaluate(element => ({
      width: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.width + 1);
    await page.screenshot({
      path: `/tmp/runtime-gallery-${test.info().project.name}-${theme}.png`,
      fullPage: true,
    });
    await page
      .getByRole('tab', { name: 'Filters & actions', exact: true })
      .click();
  }
  expect(backgrounds[0]).not.toBe(backgrounds[1]);
});

test('picker refresh and failure keep cached choices and retry in fixed slots', async ({
  page,
}) => {
  await page.goto('/gallery?view=filters');
  await page
    .getByRole('button', { name: 'Start picker cycle', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Cycling categories: HTTP', exact: true })
    .click();
  const dialog = page.getByRole('dialog', {
    name: 'Cycling categories options',
  });
  const option = dialog.getByRole('option', { name: 'HTTP', exact: true });
  const input = dialog.getByRole('searchbox');
  // The panel can reposition at viewport edges; cached choices stay fixed inside it.

  async function optionOffset() {
    return (await option.boundingBox())!.y - (await dialog.boundingBox())!.y;
  }
  const initial = await optionOffset();
  await expect(
    dialog.locator('.altertable-search-input-spinner')
  ).toBeVisible();
  await expect(input).toBeFocused();
  expect(Math.abs((await optionOffset()) - initial)).toBeLessThanOrEqual(1);
  const hint = dialog.locator('.altertable-request-hint');
  await expect(hint).toHaveAttribute('data-state', 'error');
  await expect(option).toBeEnabled();
  expect(Math.abs((await optionOffset()) - initial)).toBeLessThanOrEqual(1);
  const message = await hint
    .locator('.altertable-request-hint-message')
    .boundingBox();
  const retry = await hint
    .getByRole('button', { name: 'Try again' })
    .boundingBox();
  expect(retry!.y).toBeGreaterThan(message!.y + message!.height);
  const hintBox = await hint.boundingBox();
  expect(
    Math.abs(retry!.x + retry!.width / 2 - (hintBox!.x + hintBox!.width / 2))
  ).toBeLessThanOrEqual(1);
  await hint.getByRole('button', { name: 'Try again' }).click();
  await expect(hint).toHaveCount(0);
  expect(Math.abs((await optionOffset()) - initial)).toBeLessThanOrEqual(1);
});

test('widget refresh slots preserve data, geometry and inspection feedback', async ({
  page,
}) => {
  await page.goto('/gallery?view=states');
  const widget = page.locator('.altertable-data-widget').filter({
    has: page.getByRole('heading', { name: 'Stable activity', exact: true }),
  });
  const body = widget.locator(':scope > .altertable-data-widget-body');
  const initial = await body.evaluate(
    element => element.getBoundingClientRect().top + window.scrollY
  );
  const bounds = await widget.boundingBox();
  for (const button of [
    'Widget updating',
    'Widget failed',
    'Long widget failure',
    'Widget ready',
  ]) {
    await page.getByRole('button', { name: button, exact: true }).click();
    expect(
      Math.abs(
        (await body.evaluate(
          element => element.getBoundingClientRect().top + window.scrollY
        )) - initial
      )
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs((await widget.boundingBox())!.height - bounds!.height)
    ).toBeLessThanOrEqual(1);
    await expect(body).toContainText('42 events remain visible.');
  }
  await page
    .getByRole('button', { name: 'Widget failed', exact: true })
    .click();
  await widget.getByRole('button', { name: 'Explore Stable activity' }).click();
  const sheet = page.getByRole('dialog', {
    name: 'Stable activity',
    exact: true,
  });
  await expect(sheet.getByRole('alert')).toContainText('Couldn’t refresh');
  await sheet.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(sheet.locator('.altertable-widget-status')).toHaveAttribute(
    'data-state',
    'idle'
  );
});

test('gallery spans all UI families and handles empty, overflow and request recovery', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/gallery?view=filters');
  expect(await page.locator('.gallery-case').count()).toBeGreaterThanOrEqual(
    65
  );
  await page
    .getByRole('button', { name: 'Many categories: Category 100', exact: true })
    .click();
  const picker = page.getByRole('dialog', { name: 'Many categories options' });
  await expect(picker.getByRole('option')).toHaveCount(100);
  const scroll = picker.locator('.altertable-combobox-options');
  expect(
    await scroll.evaluate(
      element => element.scrollHeight > element.clientHeight
    )
  ).toBe(true);
  await picker.getByRole('searchbox').fill('nonexistent');
  await expect(picker.locator('.altertable-combobox-empty')).toHaveText(
    'No matching values'
  );
  await picker.getByRole('searchbox').press('Escape');
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Request states', exact: true }).click();
  const request = page.getByRole('region', {
    name: 'Fixture request',
    exact: true,
  });
  await page.getByRole('button', { name: 'loading', exact: true }).click();
  await expect(request.locator('.altertable-content-skeleton')).toBeVisible();
  await page.getByRole('button', { name: 'error', exact: true }).click();
  await request.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(request).toContainText('42 recorded events');
  await page.getByRole('button', { name: 'empty', exact: true }).click();
  await expect(request.getByText('No records', { exact: true })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
  expect(errors).toEqual([]);
});

test('gallery respects reduced motion and retry without cached data', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/gallery?view=filters');
  await page
    .getByRole('button', { name: 'Refreshing categories: HTTP', exact: true })
    .click();
  let dialog = page.getByRole('dialog', {
    name: 'Refreshing categories options',
  });
  await expect(dialog.locator('.altertable-search-input-spinner')).toHaveCSS(
    'animation-name',
    'none'
  );
  await dialog.getByRole('searchbox').press('Escape');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', {
      name: 'No cached categories: Select categories',
      exact: true,
    })
    .click();
  dialog = page.getByRole('dialog', { name: 'No cached categories options' });
  await expect(dialog.getByRole('alert')).toContainText('Couldn’t load values');
  await dialog.getByRole('button', { name: 'Try again' }).click();
  await expect(dialog.locator('.altertable-combobox-skeletons')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Try again' })).toHaveCount(
    0
  );
  await expect(dialog.getByRole('option')).toHaveCount(3);
  await dialog.getByRole('searchbox').press('Escape');
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Request states', exact: true }).click();
  const title = page.getByText('Nothing to show yet', { exact: true });
  const description = page.getByText(
    'A description has quieter typography than its title.',
    {
      exact: true,
    }
  );
  expect(
    await title.evaluate(element => getComputedStyle(element).fontWeight)
  ).toBe('600');
  expect(
    await title.evaluate(element =>
      parseFloat(getComputedStyle(element).fontSize)
    )
  ).toBeGreaterThan(
    await description.evaluate(element =>
      parseFloat(getComputedStyle(element).fontSize)
    )
  );
});

test('clear closes the picker and idle panels have no feedback gap', async ({
  page,
}) => {
  await page.goto('/gallery?view=filters');
  await page
    .getByRole('button', { name: 'Resettable category: HTTP', exact: true })
    .click();
  const dialog = page.getByRole('dialog', {
    name: 'Resettable category options',
  });
  await expect(dialog.locator('.altertable-request-hint')).toHaveCount(0);
  await dialog.getByRole('option', { name: 'Postgres', exact: true }).click();
  await page
    .getByRole('button', { name: 'Resettable category: Postgres', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: 'Clear selection', exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Resettable category: HTTP', exact: true })
  ).toBeFocused();
  await expect(
    page.getByRole('button', { name: 'Compact ghost action', exact: true })
  ).toHaveAttribute('data-variant', 'ghost');
  await expect(
    page.getByRole('button', { name: 'Compact ghost action', exact: true })
  ).toHaveAttribute('data-size', 'compact');
});

test('widget toolbar owns shimmer, retry tooltip and stable action positions', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/gallery?view=states');
  const widget = page.locator('.altertable-data-widget').filter({
    has: page.getByRole('heading', { name: 'Stable activity', exact: true }),
  });
  const toolbar = widget.locator('.altertable-data-widget-help');
  const status = toolbar.locator(':scope > .altertable-widget-status');
  const inspect = widget.getByRole('button', {
    name: 'Explore Stable activity',
  });
  const initial = await inspect.boundingBox();
  await page
    .getByRole('button', { name: 'Widget updating', exact: true })
    .click();
  await expect(toolbar.getByRole('status')).toHaveText('Refreshing');
  await expect(toolbar).toHaveCSS('opacity', '1');
  await expect(status.locator('svg')).toHaveCount(0);
  await expect(status.locator('.altertable-widget-status-shimmer')).toHaveCSS(
    'animation-name',
    'none'
  );
  await page
    .getByRole('button', { name: 'Widget failed', exact: true })
    .click();
  expect(
    Math.abs((await inspect.boundingBox())!.x - initial!.x)
  ).toBeLessThanOrEqual(1);
  const retry = status.getByRole('button', { name: 'Retry', exact: true });
  await inspect.focus();
  await inspect.press('Tab');
  await expect(retry).toBeFocused();
  await expect(page.getByRole('tooltip')).toContainText(
    'Try again to refresh these results.'
  );
  await page.screenshot({
    path: `/tmp/runtime-toolbar-retry-${test.info().project.name}.png`,
  });
  await retry.click();
  await expect(status).toHaveAttribute('data-state', 'idle');
});

test('standalone viewers retain their chosen theme after reload', async ({
  page,
}) => {
  await page.goto('/gallery');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  await expect(
    page.getByRole('button', { name: 'Switch to light theme' })
  ).toBeVisible();
});

test('widgets keep inspection on headings and suppress unneeded empty chrome', async ({
  page,
}) => {
  await page.goto('/gallery?view=states');
  const widget = page.locator('.altertable-data-widget').filter({
    has: page.getByRole('heading', { name: 'Stable activity', exact: true }),
  });
  const heading = widget.getByRole('heading', {
    name: 'Stable activity',
    exact: true,
  });
  await expect(
    heading.getByRole('button', { name: 'Explore Stable activity' })
  ).toBeVisible();
  await expect(
    widget.locator(
      '.altertable-data-widget-help .altertable-widget-heading-trigger'
    )
  ).toHaveCount(0);
  const table = page.locator('.altertable-data-widget').filter({
    has: page.getByRole('heading', { name: 'Stable table', exact: true }),
  });
  await expect(
    table.getByRole('navigation', { name: 'Table pages' })
  ).toHaveCount(0);
  const emptyChart = page.locator('.gallery-case').filter({
    has: page.getByRole('heading', { name: 'Empty chart', exact: true }),
  });
  await expect(
    emptyChart.locator('.altertable-selectable-bars-help')
  ).toHaveCount(0);
  const error = page
    .locator('.altertable-status-panel[data-status="error"]')
    .first();
  await expect(error).toHaveCSS('border-top-width', '0px');
  await page
    .getByRole('tab', { name: 'Filters & actions', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Resettable category: HTTP', exact: true })
    .click();
  const search = page
    .getByRole('dialog', { name: 'Resettable category options' })
    .locator('.altertable-search-input-wrap');
  await expect(search).toHaveCSS('border-top-width', '0px');
  await expect(search).toHaveCSS('border-bottom-width', '1px');
  const divider = await search.evaluate(
    element => getComputedStyle(element).borderBottomColor
  );
  await expect(search.locator(':scope > svg')).toHaveCSS('opacity', '1');
  await search.getByRole('searchbox').press('ArrowDown');
  await expect(search).toHaveCSS('border-bottom-color', divider);
  await expect(search.locator(':scope > svg')).toHaveCSS('opacity', '0.65');
  await expect(page.locator('.altertable-combobox-popover')).toHaveCSS(
    'overflow',
    'hidden'
  );
});

test('menu search aligns labels and Escape blurs empty searches', async ({
  page,
}) => {
  await page.goto('/gallery');
  const tableSearch = page.getByRole('searchbox', {
    name: 'Search table records',
  });
  await tableSearch.focus();
  await tableSearch.press('Escape');
  await expect(tableSearch).not.toBeFocused();
  await page
    .getByRole('tab', { name: 'Filters & actions', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Resettable category: HTTP', exact: true })
    .click();
  const dialog = page.getByRole('dialog', {
    name: 'Resettable category options',
  });
  const search = dialog.getByRole('searchbox');
  await search.fill('HTTP');
  const inputBox = await search.boundingBox();
  const labelBox = await dialog
    .locator('.altertable-combobox-option-content')
    .boundingBox();
  expect(Math.abs(inputBox!.x - labelBox!.x)).toBeLessThanOrEqual(1);
  await search.fill('');
  await search.press('Escape');
  await expect(search).not.toBeFocused();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('gallery categories support keyboard navigation, links, and persistent demo state', async ({
  page,
}) => {
  await page.goto('/gallery');
  const tabs = page.getByRole('tablist', { name: 'Gallery categories' });
  await expect(tabs.getByRole('tab')).toHaveCount(8);
  await expect(
    page.locator(
      '[data-testid="gallery-tabs"] > .react-aria-TabPanels > .react-aria-TabPanel:not([data-inert])'
    )
  ).toHaveCount(1);
  await expect(
    page.getByRole('tabpanel', { name: 'Overview', exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: 'Monday accounts for 60% of recorded activity',
    })
  ).toBeVisible();
  await tabs.getByRole('tab', { name: 'Overview', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    tabs.getByRole('tab', { name: 'Widgets', exact: true })
  ).toBeFocused();
  await expect(page).toHaveURL(/view=widgets/);
  await page.keyboard.press('ArrowRight');
  await expect(
    tabs.getByRole('tab', { name: 'Filters & actions', exact: true })
  ).toBeFocused();
  await expect(page).toHaveURL(/view=filters/);
  const checkbox = page.getByRole('checkbox', {
    name: 'Include archived records',
    exact: true,
  });
  await checkbox.check();
  await tabs.getByRole('tab', { name: 'Metrics', exact: true }).click();
  await expect(checkbox).not.toBeVisible();
  await tabs
    .getByRole('tab', { name: 'Filters & actions', exact: true })
    .click();
  await expect(checkbox).toBeChecked();
  await page.goBack();
  await expect(
    tabs.getByRole('tab', { name: 'Metrics', exact: true })
  ).toHaveAttribute('aria-selected', 'true');
  await page.reload();
  await expect(
    tabs.getByRole('tab', { name: 'Metrics', exact: true })
  ).toHaveAttribute('aria-selected', 'true');
  await page.evaluate(() => {
    window.location.hash = 'dates';
  });
  await expect(
    tabs.getByRole('tab', { name: 'Filters & actions', exact: true })
  ).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.getByRole('heading', {
      name: 'Dates, periods and freshness',
      exact: true,
    })
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/view=metrics$/);
  await expect(
    tabs.getByRole('tab', { name: 'Metrics', exact: true })
  ).toHaveAttribute('aria-selected', 'true');
  await page.goForward();
  await expect(page).toHaveURL(/view=filters#dates$/);
  await expect(
    tabs.getByRole('tab', { name: 'Filters & actions', exact: true })
  ).toHaveAttribute('aria-selected', 'true');
  await tabs.getByRole('tab', { name: 'Metrics', exact: true }).click();
  await page.reload();
  await expect(
    tabs.getByRole('tab', { name: 'Metrics', exact: true })
  ).toHaveAttribute('aria-selected', 'true');
  await page.goto('/gallery?view=unknown');
  await expect(
    tabs.getByRole('tab', { name: 'Overview', exact: true })
  ).toHaveAttribute('aria-selected', 'true');
});

test('every gallery category renders in both themes without page overflow', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/gallery');
  const tabs = page.getByRole('tablist', { name: 'Gallery categories' });
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark')
      await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    for (const label of [
      'Overview',
      'Widgets',
      'Filters & actions',
      'Metrics',
      'Tables & charts',
      'Request states',
      'Stories & evidence',
      'App layout',
    ]) {
      await tabs.getByRole('tab', { name: label, exact: true }).click();
      const panel = page.getByRole('tabpanel', { name: label, exact: true });
      await expect(panel).toBeVisible();
      await expect(
        panel.getByRole('heading', { level: 2 }).first()
      ).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        width: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
      const main = await page.locator('.altertable-app-main').boundingBox();
      const footer = await page
        .locator(
          '.altertable-app-layout > .altertable-app-footer .altertable-app-footer-inner'
        )
        .boundingBox();
      expect(Math.abs(main!.x - footer!.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(main!.width - footer!.width)).toBeLessThanOrEqual(1);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `/tmp/gallery-${test.info().project.name}-${theme}-${label.toLowerCase().replaceAll(/[^a-z]+/g, '-')}.png`,
      });
    }
  }
  expect(errors).toEqual([]);
});

test('text widgets share the frame and retain narrative scope through region changes', async ({
  page,
}) => {
  await page.goto('/gallery#text');
  const section = page.getByRole('region', {
    name: 'Text widgets',
    exact: true,
  });
  const narrative = section
    .locator('.altertable-text-widget')
    .filter({ hasText: 'Activity for this selection' });
  await expect(narrative).toContainText('42 people were active in Europe.');
  await expect(narrative).toHaveCSS('border-top-width', '1px');
  await section
    .getByRole('button', { name: 'Narrative region: Europe' })
    .click();
  await page.getByRole('option', { name: 'Asia', exact: true }).click();
  await expect(narrative).toContainText('42 people were active in Europe.');
  await section.getByRole('button', { name: 'Fail text refresh' }).click();
  await expect(section.getByRole('alert')).toContainText('Europe');
  await expect(narrative).toContainText('42 people were active in Europe.');
  await section.getByRole('button', { name: 'Resolve text request' }).click();
  await expect(narrative).toContainText('18 people were active in Asia.');
  await section.getByRole('button', { name: 'Show zero activity' }).click();
  await expect(narrative).toContainText('No activity was recorded in Asia.');
  await section.getByRole('button', { name: 'Initial text loading' }).click();
  await expect(narrative).toHaveAttribute('aria-busy', 'true');
  await expect(
    narrative.locator('.altertable-text-widget-skeleton')
  ).toBeVisible();
  await expect(narrative).toHaveCSS('border-top-width', '1px');
  await expect(narrative).not.toContainText('No activity was recorded');
});

test('widget insets align across metrics, visualizations, and loading states', async ({
  page,
}) => {
  await page.goto('/gallery');
  const metric = page.locator('.altertable-metric-widget').first();
  const header = page.locator('.altertable-data-widget-header').first();
  const body = page
    .locator('.altertable-data-widget-body[data-padding="inset"]')
    .first();
  const padding = await metric
    .locator('.altertable-data-widget-header')
    .evaluate(element => getComputedStyle(element).paddingLeft);
  for (const frame of [header, body]) {
    await expect(frame).toHaveCSS('padding-left', padding);
    await expect(frame).toHaveCSS('padding-right', padding);
  }
  const valueInset = await metric.evaluate(element => {
    const value = element.querySelector(
      ':scope > .altertable-data-widget-body .altertable-metric-value'
    )!;
    return (
      value.getBoundingClientRect().left - element.getBoundingClientRect().left
    );
  });
  expect(valueInset).toBeCloseTo(parseFloat(padding) + 1, 0);
  await expect(header).toHaveCSS('padding-top', padding);
  await metric
    .getByRole('button', { name: 'Explore Recorded events', exact: true })
    .click();
  const inspection = page.getByRole('dialog');
  await expect(inspection.getByText('20', { exact: true })).toBeVisible();
  await expect(
    inspection.getByText('12 on Monday · 8 on Wednesday', { exact: true })
  ).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('tab', { name: 'Request states', exact: true }).click();
  const panel = page.getByRole('tabpanel', { name: 'Request states' });
  for (const selector of [
    '.altertable-metric-widget.altertable-content-skeleton',
    '.altertable-data-widget.altertable-content-skeleton',
  ]) {
    const skeleton = panel.locator(selector).first();
    await expect(skeleton).toHaveCSS('padding-left', padding);
    await expect(skeleton).toHaveCSS('padding-right', padding);
  }
  await page.getByRole('tab', { name: 'Metrics', exact: true }).click();
  const loadingWidget = page.getByRole('region', {
    name: 'Loading metric',
    exact: true,
  });
  await expect(loadingWidget).toHaveAttribute('aria-busy', 'true');
  await expect(
    loadingWidget.locator('.altertable-content-skeleton-body')
  ).toBeVisible();
  for (const part of [
    '.altertable-data-widget-header',
    '.altertable-data-widget-body',
  ]) {
    await expect(loadingWidget.locator(part)).toHaveCSS(
      'padding-left',
      padding
    );
    await expect(loadingWidget.locator(part)).toHaveCSS(
      'padding-right',
      padding
    );
  }
});

test('prose links have pointer and keyboard affordances', async ({ page }) => {
  await page.goto('/gallery#text');
  const link = page.getByRole('link', {
    name: 'Explore the dashboard composition',
    exact: true,
  });
  await expect(link).toHaveCSS('text-decoration-thickness', '1px');
  await link.hover();
  await expect(link).toHaveCSS('text-decoration-thickness', '2px');
  await page.mouse.move(0, 0);
  await link.focus();
  await expect(link).toHaveCSS('outline-width', '1px');
  await expect(link).toHaveCSS('outline-style', 'solid');
});

test('Widgets tab shows composable data displays in the shared frame', async ({
  page,
}) => {
  await page.goto('/gallery');
  await page.getByRole('tab', { name: 'Widgets', exact: true }).click();
  await expect(page).toHaveURL(/\/gallery\?view=widgets$/);
  await expect(
    page.getByRole('tablist', { name: 'Gallery categories' })
  ).toHaveCount(1);
  const panel = page.getByRole('tabpanel', { name: 'Widgets', exact: true });
  await expect(
    panel.getByRole('region', { name: /basic example$/ })
  ).toHaveCount(9);
  for (const name of [
    'Comparison',
    'Ranking',
    'Breakdown',
    'BarChart',
    'LineChart',
    'AreaChart',
    'PieChart',
    'ScatterChart',
    'DataTable',
  ]) {
    await expect(
      panel.getByRole('heading', { name, exact: true })
    ).toBeVisible();
  }
  await expect(
    panel.getByText(/^(Latest|Selected|Preview|Largest)$/)
  ).toHaveCount(0);
  await expect(panel.getByText(/Use arrow keys to move/)).toHaveCount(0);
  await expect(
    panel.getByRole('button', { name: 'Clear selection' })
  ).toHaveCount(0);
  await expect(
    panel
      .getByRole('region', { name: 'Charts', exact: true })
      .getByRole('region', { name: /basic example$/ })
  ).toHaveCount(5);
  await expect(
    panel
      .getByRole('region', { name: 'Custom visualizations', exact: true })
      .getByRole('region', { name: /basic example$/ })
  ).toHaveCount(4);
  await expect(panel.getByRole('table')).toHaveCount(1);
  await expect(panel.getByRole('rowheader', { name: 'Monday' })).toBeVisible();
  await page.reload();
  await expect(panel).toBeVisible();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  await expect(page).toHaveURL(/\/gallery\?view=overview$/);
  await expect(
    page.getByRole('tablist', { name: 'Gallery categories' })
  ).toBeVisible();
});

for (const [name, first, second, value] of [
  ['BarChart', 'Web: 84 orders', 'App: 112 orders', '84 orders'],
  ['LineChart', 'Mon: 180 ms', 'Tue: 165 ms', '180 ms'],
  ['AreaChart', 'Jan: 120 GB', 'Feb: 155 GB', '120 GB'],
  [
    'PieChart',
    'Direct: 4,000 visits, 40%',
    'Organic search: 3,200 visits, 32%',
    '4,000 visits',
  ],
  [
    'ScatterChart',
    'Atlas: Request volume 120 requests, Response time 145 ms',
    'Birch: Request volume 240 requests, Response time 160 ms',
    'Response time: 145 ms',
  ],
]) {
  test(`${name} exposes pointer tooltips without keyboard inspection`, async ({
    page,
    isMobile,
  }) => {
    await page.goto('/gallery?view=widgets');
    const chart = page.getByRole('region', {
      name: `${name} basic example`,
      exact: true,
    });
    const point = chart.getByRole('button', { name: first, exact: true });
    const next = chart.getByRole('button', { name: second, exact: true });
    if (isMobile) {
      await point.tap();
      await expect(page.getByRole('tooltip')).toContainText(value);
      await point.tap();
      await expect(page.getByRole('tooltip')).toHaveCount(0);
      await point.tap();
      await chart.getByRole('heading', { name, exact: true }).tap();
      await expect(page.getByRole('tooltip')).toHaveCount(0);
    } else {
      await point.hover();
      await expect(page.getByRole('tooltip')).toContainText(value);
      await point.click();
      await chart.getByRole('heading', { name, exact: true }).hover();
      await expect(page.getByRole('tooltip')).toHaveCount(0);
    }
    await expect(point).toHaveAttribute('tabindex', '-1');
    await expect(next).toHaveAttribute('tabindex', '-1');
    await page.mouse.move(0, 0);
    await page.keyboard.press('Tab');
    await point.focus();
    await expect(
      page.locator('[role=tooltip][data-variant=chart]')
    ).toHaveCount(0);
    if (isMobile) await next.tap();
    else await next.hover();
    await expect(page.getByRole('tooltip')).toHaveCount(1);
    await page.evaluate(() => window.scrollBy(0, 150));
    await expect(page.getByRole('tooltip')).toHaveCount(0);
  });
}

test('pie slice tooltips emphasize only the inspected category', async ({
  page,
  isMobile,
}) => {
  await page.goto('/gallery?view=widgets');
  const pie = page.getByRole('region', {
    name: 'PieChart basic example',
    exact: true,
  });
  const slices = pie.locator('.altertable-pie-slice');
  if (isMobile) await slices.first().tap({ position: { x: 70, y: 70 } });
  else await slices.first().hover({ position: { x: 70, y: 70 } });
  await expect(page.getByRole('tooltip')).toContainText('Direct');
  await expect(slices.first()).toHaveCSS('opacity', '1');
  await expect(slices.nth(1)).toHaveCSS('opacity', '0.3');
  if (isMobile) {
    await pie.locator('svg').tap({ position: { x: 110, y: 190 } });
    await expect(page.getByRole('tooltip')).toContainText('Organic search');
    await expect(slices.nth(1)).toHaveCSS('opacity', '1');
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await expect(slices.nth(1)).toHaveCSS('opacity', '1');
});

test('former component gallery links open the Widgets tab', async ({
  page,
}) => {
  await page.goto('/gallery/components');
  await expect(page).toHaveURL(/\/gallery\?view=widgets$/);
  await expect(
    page.getByRole('tab', { name: 'Widgets', exact: true })
  ).toHaveAttribute('aria-selected', 'true');
});

for (const width of [375, 600, 960, 1280]) {
  test(`Widgets uses responsive app layout at ${width}px`, async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Explicit widths cover the responsive layout.');
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/gallery?view=widgets');
    const panel = page.getByRole('tabpanel', { name: 'Widgets', exact: true });
    const geometry = await panel.evaluate(element => {
      const cards = [
        ...element.querySelectorAll('[aria-label$="basic example"]'),
      ];
      const rects = cards.map(card => {
        const { x, y, width, height, right } = card.getBoundingClientRect();
        return { x, y, width, height, right };
      });
      const chartGrid = cards[0]!
        .closest('.altertable-grid')!
        .getBoundingClientRect();
      const line = element.querySelector('.altertable-trend-scroll')!;
      return {
        rects,
        chartWidth: chartGrid.width,
        pageWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        lineWidth: line.clientWidth,
        lineScroll: line.scrollWidth,
      };
    });
    const [bar, line, , , scatter] = geometry.rects;
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.pageWidth + 1);
    for (const card of geometry.rects) {
      expect(card.x).toBeGreaterThanOrEqual(0);
      expect(card.right).toBeLessThanOrEqual(geometry.pageWidth);
    }
    if (width >= 960) {
      expect(Math.abs(bar!.y - line!.y)).toBeLessThan(1);
      expect(line!.x).toBeGreaterThan(bar!.right);
      expect(geometry.lineScroll).toBeLessThanOrEqual(geometry.lineWidth + 1);
    } else {
      expect(line!.y).toBeGreaterThanOrEqual(bar!.y + bar!.height);
      expect(Math.abs(bar!.x - line!.x)).toBeLessThan(1);
    }
    expect(Math.abs(scatter!.width - geometry.chartWidth)).toBeLessThan(1);
  });
}

test('chart tooltips dismiss when their chart scrolls horizontally', async ({
  page,
  isMobile,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/gallery?view=widgets');
  const chart = page.getByRole('region', {
    name: 'LineChart basic example',
    exact: true,
  });
  const point = chart.getByRole('button', { name: 'Wed: 210 ms', exact: true });
  if (isMobile) await point.tap();
  else await point.hover();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await chart.locator('.altertable-trend-scroll').evaluate(element => {
    if (element.scrollWidth <= element.clientWidth)
      throw new Error('Expected an overflowing chart');
    element.scrollLeft = element.scrollLeft ? 0 : element.scrollWidth;
  });
  await expect(page.getByRole('tooltip')).toHaveCount(0);
});
