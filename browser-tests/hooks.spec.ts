import { expect, test } from '@playwright/test';

test('operation switches isolate pending, failed, and cached data and evidence', async ({
  page,
}) => {
  await page.goto('/hooks-app');
  await expect(page.getByTestId('state')).toHaveText('loading');
  await page.getByRole('button', { name: 'Resolve request' }).click();
  await expect(page.getByTestId('shown')).toHaveText('alpha');
  await page.getByRole('button', { name: 'Beta', exact: true }).click();
  await expect(page.getByTestId('state')).toHaveText('loading');
  await expect(page.getByTestId('shown')).toHaveText('none');
  await expect(page.getByTestId('evidence')).toHaveText('none');
  await page.getByRole('button', { name: 'Fail request' }).click();
  await expect(page.getByTestId('state')).toHaveText('error');
  await expect(page.getByTestId('shown')).toHaveText('none');
  await page.getByRole('button', { name: 'Alpha', exact: true }).click();
  await expect(page.getByTestId('shown')).toHaveText('alpha');
  await expect(page.getByTestId('evidence')).toHaveText('alpha-evidence');
  await page.getByRole('button', { name: 'Beta', exact: true }).click();
  await expect(page.getByTestId('shown')).toHaveText('none');
  await page.getByRole('button', { name: 'Resolve request' }).click();
  await expect(page.getByTestId('shown')).toHaveText('beta');
  await expect(page.getByTestId('evidence')).toHaveText('beta-evidence');
});

test('input changes retain the original input and data through refresh and failure', async ({
  page,
}) => {
  await page.goto('/hooks-app');
  await page.getByRole('button', { name: 'Resolve request' }).click();
  await expect(page.getByTestId('input')).toHaveText('1');
  await page.getByRole('button', { name: 'Change input' }).click();
  await expect(page.getByTestId('state')).toHaveText('updating');
  await expect(page.getByTestId('shown')).toHaveText('alpha');
  await expect(page.getByTestId('input')).toHaveText('1');
  await page.getByRole('button', { name: 'Fail request' }).click();
  await expect(page.getByTestId('state')).toHaveText('stale-error');
  await expect(page.getByTestId('input')).toHaveText('1');
  await page.getByRole('button', { name: 'Change input' }).click();
  await page.getByRole('button', { name: 'Resolve request' }).click();
  await expect(page.getByTestId('state')).toHaveText('ready');
  await expect(page.getByTestId('input')).toHaveText('3');
});

test('distinct clients isolate operation and facet results while the same client shares them', async ({
  page,
}) => {
  await page.goto('/hooks-app?client-cache');
  await expect(page.locator('body')).toHaveAttribute(
    'data-a-metric-calls',
    '1'
  );
  await expect(page.locator('body')).toHaveAttribute(
    'data-b-metric-calls',
    '1'
  );
  await expect(page.locator('body')).toHaveAttribute('data-a-facet-calls', '1');
  await expect(page.locator('body')).toHaveAttribute('data-b-facet-calls', '1');
  await page.getByRole('button', { name: 'Resolve A', exact: true }).click();
  await expect(page.getByTestId('a').getByTestId('value')).toHaveText('11');
  await expect(page.getByTestId('a-again').getByTestId('value')).toHaveText(
    '11'
  );
  await expect(page.getByTestId('b').getByTestId('value')).toHaveText(
    'pending'
  );
  await page.getByRole('button', { name: 'Resolve B', exact: true }).click();
  await expect(page.getByTestId('b').getByTestId('value')).toHaveText('22');
});

test('cancelling one client leaves another client request pending and able to succeed', async ({
  page,
}) => {
  await page.goto('/hooks-app?client-cache');
  await expect(page.locator('body')).toHaveAttribute(
    'data-a-metric-calls',
    '1'
  );
  await expect(page.locator('body')).toHaveAttribute(
    'data-b-metric-calls',
    '1'
  );
  await page
    .getByTestId('a')
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await expect(page.locator('body')).toHaveAttribute('data-a-aborted', 'true');
  await expect(page.locator('body')).not.toHaveAttribute(
    'data-b-aborted',
    'true'
  );
  await page.getByRole('button', { name: 'Resolve B', exact: true }).click();
  await expect(page.getByTestId('b').getByTestId('value')).toHaveText('22');
});

test('switching data clients clears previous-client data from the same observer', async ({
  page,
}) => {
  await page.goto('/hooks-app?client-cache');
  await expect(page.locator('body')).toHaveAttribute(
    'data-b-metric-calls',
    '1'
  );
  await page.getByRole('button', { name: 'Resolve A', exact: true }).click();
  await expect(page.getByTestId('a').getByTestId('value')).toHaveText('11');
  await page
    .getByRole('button', { name: 'Switch A client', exact: true })
    .click();
  await expect(page.getByTestId('a').getByTestId('value')).toHaveText(
    'pending'
  );
  await page.getByRole('button', { name: 'Resolve B', exact: true }).click();
  await expect(page.getByTestId('a').getByTestId('value')).toHaveText('22');
});

test('facet choices are fetched and displayed separately for each client', async ({
  page,
}) => {
  await page.goto('/hooks-app?client-cache');
  await expect(page.locator('body')).toHaveAttribute('data-a-facet-calls', '1');
  await expect(page.locator('body')).toHaveAttribute('data-b-facet-calls', '1');
  await page
    .getByTestId('a')
    .getByRole('button', { name: 'Category: All', exact: true })
    .click();
  await expect(
    page.getByRole('option', { name: 'A category', exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('option', { name: 'B category', exact: true })
  ).toHaveCount(0);
  await page
    .getByRole('searchbox', { name: 'Search category values' })
    .press('Escape');
  await page.keyboard.press('Escape');
  await page
    .getByTestId('b')
    .getByRole('button', { name: 'Category: All', exact: true })
    .click();
  await expect(
    page.getByRole('option', { name: 'B category', exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('option', { name: 'A category', exact: true })
  ).toHaveCount(0);
});
