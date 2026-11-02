import { createExternalLinkHandler } from '@altertable/data-app-embed';
import {
  navigateNewTab,
  navigateNewWindow,
  navigateNewWindowOrTab,
} from '@altertable/data-app/client';
import {
  createMessageRouter,
  openExternalLinkRoute,
  resolveExternalLinkTarget,
} from '@altertable/data-app/contract';
import { afterEach, describe, expect, test, vi } from 'vitest';

afterEach(() => vi.unstubAllGlobals());

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

test.each([
  { target: 'other' },
  { target: null },
  { target: 'event' },
  {
    target: 'event',
    keys: { shiftKey: 'true', ctrlKey: false, metaKey: false },
  },
  { target: 'event', keys: { shiftKey: false } },
])('rejects malformed navigation intent %j', intent => {
  expect(() =>
    openExternalLinkRoute.input({ url: 'https://example.com', ...intent })
  ).toThrow();
});

test('serializes only original modifier keys and resolves Shift first', () => {
  const request = openExternalLinkRoute.input({
    url: 'https://example.com',
    target: 'event',
    keys: {
      shiftKey: true,
      ctrlKey: true,
      metaKey: true,
      target: { nodeName: 'A' },
    },
  });
  expect(request).toEqual({
    url: 'https://example.com/',
    target: 'event',
    keys: { shiftKey: true, ctrlKey: true, metaKey: true },
  });
  expect(resolveExternalLinkTarget(request)).toBe('window');
  expect(resolveExternalLinkTarget({ url: 'https://example.com' })).toBe('tab');
});

test('standalone helpers open synchronously and request the appropriate browser surface', async () => {
  const host = {
    open: vi.fn(),
    get parent(): unknown {
      return this;
    },
  };
  vi.stubGlobal('window', host);
  const tab = navigateNewTab('https://example.com');
  expect(host.open).toHaveBeenLastCalledWith(
    'https://example.com/',
    '_blank',
    'noopener,noreferrer'
  );
  await expect(tab).resolves.toBe('opened');
  const popup = navigateNewWindow('https://example.com');
  expect(host.open).toHaveBeenLastCalledWith(
    'https://example.com/',
    '_blank',
    'popup,noopener,noreferrer'
  );
  await expect(popup).resolves.toBe('opened');
  await expect(
    navigateNewWindowOrTab('https://example.com', {
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
    })
  ).resolves.toBe('ignored');
  expect(host.open).toHaveBeenCalledTimes(2);
  await expect(navigateNewTab('javascript:alert(1)')).rejects.toThrow();
  const controller = new AbortController();
  controller.abort();
  await expect(
    navigateNewWindow('https://example.com', { signal: controller.signal })
  ).rejects.toThrow();
  expect(host.open).toHaveBeenCalledTimes(2);
});

test('helpers do not bypass an unavailable iframe bridge', async () => {
  const open = vi.fn();
  vi.stubGlobal('window', { parent: {}, open });
  await expect(navigateNewTab('https://example.com')).rejects.toMatchObject({
    code: 'bridge_unavailable',
  });
  expect(open).not.toHaveBeenCalled();
});
