import { Comparison } from '@altertable/data-app-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';

function render(current: number, previous: number) {
  const html = renderToStaticMarkup(
    <Comparison
      label="Net revenue"
      current={{ value: current, formattedValue: String(current) }}
      previous={{ value: previous, formattedValue: String(previous) }}
      favorableDirection="up"
    />
  );
  return {
    html,
    tracks: [
      ...html.matchAll(
        /altertable-comparison-track"><span style="width:([^"]+)"/g
      ),
    ].map(([, width]) => width),
  };
}

test('an improvement from a negative baseline reads as favorable', () => {
  const { html } = render(-5, -10);
  expect(html).toMatch(/data-tone="good"[^>]*>.*50\.0% vs previous period/);
});

test('fractional values fill the tracks relative to the larger value', () => {
  expect(render(0.12, 0.1).tracks).toEqual(['100%', `${(0.1 / 0.12) * 100}%`]);
  expect(render(-5, 10).tracks).toEqual(['0%', '100%']);
});

test('custom period labels preserve calendar and proper-name capitalization', () => {
  const html = renderToStaticMarkup(
    <Comparison
      label="Samples"
      current={{
        value: 307000,
        formattedValue: '307,000',
        periodLabel: 'Mar 9–15, 2026',
      }}
      previous={{
        value: 216000,
        formattedValue: '216,000',
        periodLabel: 'Mar 2–8, 2026',
      }}
    />
  );
  expect(html).toContain('42.1% vs Mar 2–8, 2026');
});
