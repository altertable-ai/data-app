import { createExternalLinkHandler } from '@altertable/data-app-embed';
import {
  createMessageRouter,
  openExternalLinkRoute,
} from '@altertable/data-app/contract';
import { describe, expect, test } from 'vitest';

describe('external link policy', () => {
  test.each([
    'javascript:alert(1)',
    'data:text/html,hi',
    'http://example.com',
    '//example.com',
    '/report',
    'https:example.com',
    'https://user:secret@example.com',
    'https://example.com\\@evil.test',
    'https://example.com/\nreport',
    '',
    'https://example.com/' + 'a'.repeat(8192),
  ])('rejects unsafe destination %s', url => {
    expect(() => openExternalLinkRoute.input({ url })).toThrow();
  });
  test('normalizes HTTPS destinations and rejects invalid responses', () => {
    expect(
      openExternalLinkRoute.input({ url: 'https://EXAMPLE.com:443/report' })
    ).toEqual({ url: 'https://example.com/report' });
    expect(() =>
      openExternalLinkRoute.output('success', { url: '' })
    ).toThrow();
  });
  test('host rejects destinations outside its exact origin policy before touching the DOM', async () => {
    const router = createMessageRouter(
      { 'navigation:openExternal': openExternalLinkRoute },
      {
        'navigation:openExternal': createExternalLinkHandler({
          window: {} as Window,
          allowedOrigins: ['https://example.com'],
        }),
      }
    );
    for (const url of [
      'https://example.com.evil.test/',
      'https://example.com:444/',
      'https://evil.test/',
    ])
      await expect(
        router.dispatch(
          { route: 'navigation:openExternal', payload: { url } },
          { signal: new AbortController().signal }
        )
      ).rejects.toMatchObject({ code: 'forbidden' });
  });
});
