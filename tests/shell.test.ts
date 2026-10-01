import { expect, test } from 'bun:test';
import { attachDataAppShell } from '@/src/embed/shell';

function iframe() {
  const host = Object.assign(new EventTarget(), {
    location: {
      href: 'https://host.example/report',
      origin: 'https://host.example',
      search: '',
      hash: '',
    },
  }) as unknown as Window;
  const attributes = new Map<string, string>();
  const frame = Object.assign(new EventTarget(), {
    ownerDocument: { defaultView: host },
    contentWindow: { postMessage() {} },
    setAttribute(name: string, value: string) {
      attributes.set(name, value);
    },
    src: '',
    referrerPolicy: '',
  }) as unknown as HTMLIFrameElement;

  return { frame, attributes };
}

test('shell rejects non-HTTP sources and URL apps sharing the host origin', () => {
  const { frame } = iframe();
  for (const url of [
    'javascript:alert(1)',
    'file:///app.html',
    'https://host.example/app',
  ]) {
    expect(() =>
      attachDataAppShell({
        iframe: frame,
        source: { type: 'url', url },
        async onMessage() {
          return null;
        },
      })
    ).toThrow();
  }
});

test('shell reports startup failure and cleanup cancels pending startup timers', async () => {
  const { frame, attributes } = iframe();
  const statuses: string[] = [];
  const host = attachDataAppShell({
    iframe: frame,
    source: {
      type: 'bundle',
      bootstrapUrl: '/runtime',
      javascript: '',
      revision: '1',
    },
    async onMessage() {
      return null;
    },
    onStatusChange(value) {
      return statuses.push(value);
    },
    startupTimeoutMs: 10,
  });
  expect(attributes.get('sandbox')).toBe('allow-scripts');
  expect(frame.referrerPolicy).toBe('no-referrer');
  await Bun.sleep(30);
  expect(statuses).toEqual(['connecting', 'failed']);
  host.dispose();
  const next = attachDataAppShell({
    iframe: frame,
    source: { type: 'url', url: 'https://app.example/report' },
    async onMessage() {
      return null;
    },
    onStatusChange(value) {
      return statuses.push(value);
    },
    startupTimeoutMs: 10,
  });
  expect(new URL(frame.src).searchParams.get('__altertable_parent')).toBe(
    'https://host.example'
  );
  next.dispose();
  await Bun.sleep(30);
  expect(statuses).toEqual(['connecting', 'failed', 'connecting']);
});
