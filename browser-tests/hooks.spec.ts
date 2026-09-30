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
