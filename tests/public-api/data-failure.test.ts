import { expect, test } from 'vitest';

test('custom failure feedback preserves a support ID and hides private diagnostics', async () => {
  const { DataAppError } = await import('@altertable/data-app/client');
  const { getDataFailure } = await import('@altertable/data-app/react');
  const denied = getDataFailure(
    new DataAppError(
      'private connection details',
      'source_forbidden',
      'request-7'
    )
  );
  expect(denied).toMatchObject({
    code: 'source_forbidden',
    retryable: false,
    requestId: 'request-7',
  });
  expect(denied.message).not.toContain('private');
  const failed = getDataFailure(new Error('private SQL statement'));
  expect(failed).toMatchObject({ code: 'request_failed', retryable: true });
  expect(failed.message).not.toContain('SQL');
});
