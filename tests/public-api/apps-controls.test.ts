import { expect } from 'vitest';
import { test } from '@/tests/public-api/browser';

test('single and multiple searchable values preserve their selection behavior', async ({
  page,
}) => {
  await page.goto('/controls');
  await page
    .getByRole('button', { name: 'Country: United Kingdom', exact: true })
    .click();
  const list = page.getByRole('listbox', {
    name: 'Country values',
    exact: true,
  });
  const triggerWidth = await page
    .getByRole('button', { name: 'Country: United Kingdom', exact: true })
    .evaluate(element => element.getBoundingClientRect().width);
  const panelWidth = await page
    .getByRole('dialog')
    .evaluate(element => element.getBoundingClientRect().width);
  expect(Math.abs(panelWidth - triggerWidth)).toBeGreaterThan(20);
  const rows = await list.getByRole('option').evaluateAll(elements =>
    elements.map(element => ({
      top: element.getBoundingClientRect().top,
      bottom: element.getBoundingClientRect().bottom,
    }))
  );
  expect(rows[1]!.top - rows[0]!.bottom).toBeGreaterThanOrEqual(1);
  expect(await list.getAttribute('aria-multiselectable')).not.toBe('true');
  expect(await list.getByRole('option', { selected: true }).count()).toBe(1);
  await page.getByRole('searchbox').fill('France');
  await page.getByRole('searchbox').press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.getByRole('dialog').count()).toBe(0);
  await page
    .getByRole('button', { name: 'Country: France', exact: true })
    .click();
  await list.getByRole('option', { name: 'All', exact: true }).click();
  expect(
    await page
      .getByRole('button', { name: 'Country: All', exact: true })
      .count()
  ).toBe(1);
  await page
    .getByRole('button', { name: 'Countries: France', exact: true })
    .click();
  const multiple = page.getByRole('listbox', {
    name: 'Countries values',
    exact: true,
  });
  expect(await multiple.getAttribute('aria-multiselectable')).toBe('true');
  await multiple
    .getByRole('option', { name: 'United Kingdom', exact: true })
    .click();
  expect(await multiple.getByRole('option', { selected: true }).count()).toBe(
    2
  );
  await multiple.getByRole('option', { name: 'France', exact: true }).click();
  expect(await multiple.getByRole('option', { selected: true }).count()).toBe(
    1
  );
  await page.getByRole('searchbox').focus();
  await page.keyboard.press('Escape');
  await expect.poll(() => page.getByRole('dialog').count()).toBe(0);
  expect(
    await page
      .getByRole('button', { name: 'Countries: United Kingdom', exact: true })
      .count()
  ).toBe(1);
});

test('menus distinguish exclusive choices, toggles, and commands with keyboard focus return', async ({
  page,
}) => {
  await page.goto('/controls');
  const trigger = page.getByRole('button', {
    name: 'Display options',
    exact: true,
  });
  await trigger.focus();
  await trigger.press('ArrowDown');
  const menu = page.getByRole('menu', { name: 'Display options', exact: true });
  expect(
    await menu.getByRole('menuitemradio', { checked: true }).textContent()
  ).toBe('Highest first');
  expect(await menu.getByRole('menuitemcheckbox').count()).toBe(0);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(() => menu.count()).toBe(0);
  await expect
    .poll(() => trigger.evaluate(element => element === document.activeElement))
    .toBe(true);
  await trigger.click();
  expect(
    await menu
      .getByRole('menuitemradio', { name: 'Lowest first' })
      .getAttribute('aria-checked')
  ).toBe('true');
  expect(
    await menu
      .getByRole('menuitem', { name: 'Unavailable' })
      .getAttribute('aria-disabled')
  ).toBe('true');
  await menu.getByRole('menuitem', { name: 'Refresh', exact: true }).click();
  expect(
    await page.getByRole('status', { name: 'Refresh count' }).textContent()
  ).toBe('1');
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect.poll(() => menu.count()).toBe(0);
  await expect
    .poll(() => trigger.evaluate(element => element === document.activeElement))
    .toBe(true);
  await page
    .getByRole('button', { name: 'Visible columns', exact: true })
    .click();
  await page
    .getByRole('menuitemcheckbox', { name: 'Count', exact: true })
    .click();
  expect(
    await page.getByRole('menuitemcheckbox', { checked: true }).count()
  ).toBe(2);
});

test('mobile text controls retain a 16px floor and picker search keeps a stable divider', async ({
  mobilePage: page,
}) => {
  await page.goto('/controls');
  await page
    .getByRole('button', { name: 'Country: United Kingdom', exact: true })
    .click();
  const search = page.getByRole('searchbox');
  expect(
    await search.evaluate(element =>
      parseFloat(getComputedStyle(element).fontSize)
    )
  ).toBeGreaterThanOrEqual(16);
  function divider() {
    return search.evaluate(
      element => getComputedStyle(element.parentElement!).borderBottomColor
    );
  }
  const focused = await divider();
  await search.evaluate(element => element.blur());
  await search.hover();
  expect(await divider()).toBe(focused);
  await search.focus();
  expect(await divider()).toBe(focused);
  await page.setViewportSize({ width: 820, height: 900 });
  expect(
    await search.evaluate(element =>
      parseFloat(getComputedStyle(element).fontSize)
    )
  ).toBeGreaterThanOrEqual(16);
});
