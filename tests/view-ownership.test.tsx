import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataApp } from '@/src/react/ui/DataApp';
import { DataSection } from '@/src/react/ui/DataSection';
import { DeclaredView } from '@/src/react/view-runtime';

function withWindow(run: () => void) {
  const frame = { location: new URL('https://app.example.com') };
  Object.assign(frame, { top: frame });
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: frame,
  });
  try {
    run();
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
}

test('the primary section reuses exactly the app result and independent declarations execute separately', () =>
  withWindow(() => {
    let primaryCalls = 0;
    let secondaryCalls = 0;
    const primaryResult = {
      view: { kind: 'ready' as const, data: 1, input: 'old' },
      refetch() {},
      cancel() {},
      refreshing: false,
      emptyFallback: { title: 'Empty' },
    };
    const primary = Object.assign(
      new DeclaredView(() => {
        primaryCalls++;
        return primaryResult;
      }),
      { scope: () => 'old' }
    );
    const secondary = new DeclaredView(() => {
      secondaryCalls++;
      return {
        ...primaryResult,
        view: {
          kind: 'stale-error' as const,
          data: 2,
          displayedInput: 'secondary',
          requestedInput: 'new',
          error: new Error('Failed'),
          message: 'Secondary refresh failed',
        },
      };
    });
    const dataset = {
      name: 'Values',
      csv({ data, input }: { data: number; input: string }) {
        expect(data).toBe(1);
        expect(input).toBe('old');
        return { name: 'Values', columns: ['Value'], rows: [[data]] };
      },
    };
    const html = renderToStaticMarkup(
      <DataApp
        view={primary}
        config={{
          title: 'Test',
          scope: { organization: 'a', environment: 'b' },
          appearance: {},
        }}
        dataContext={{ description: 'Test', glossary: {} }}
        datasets={[dataset]}
        story={() => []}
      >
        <DataSection view={primary} loadingFallback={null}>
          {(data, input) => (
            <p>
              {data}:{input}
            </p>
          )}
        </DataSection>
        <DataSection view={secondary} loadingFallback={null}>
          {(data, input) => (
            <p>
              {data}:{input}
            </p>
          )}
        </DataSection>
      </DataApp>
    );
    expect(primaryCalls).toBe(1);
    expect(secondaryCalls).toBe(1);
    expect(html).toContain('1');
    expect(html).toContain('old');
    expect(html).toContain('secondary');
    expect(html).toContain('Secondary refresh failed');
  }));
