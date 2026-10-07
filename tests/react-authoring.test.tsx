import { defineDataContent } from '@/src/react/content';
import { defineAppVariables } from '@/src/react/ui/variables';
import { ContentSkeleton } from '@/src/react/ui/ContentSkeleton';
import { WidgetViewTabs } from '@/src/react/ui/WidgetViewTabs';
import { calendarMetricComparison } from '@/src/react/ui/metric-comparison';
import { expect, test } from 'bun:test';
import { renderToStaticMarkup as renderMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { DataAppProvider } from '@altertable/data-app/react/ui';
import {
  defineDateRangeContract,
  defineQueryNames,
} from '@altertable/data-app/contract';
import {
  createDataContext,
  dateRangeVariable,
  textVariable,
  TextContent,
} from '@altertable/data-app/react';
import { MetricWidget, TextWidget } from '@altertable/data-app/react/ui';
import { describeViewInput, type DataViewDefinition } from '@/src/react/view';

function renderToStaticMarkup(content: ReactNode) {
  return renderMarkup(<DataAppProvider>{content}</DataAppProvider>);
}

const calendar = defineDateRangeContract({
  minDate: '2026-01-01',
  maxDate: '2026-03-31',
  maxRangeDays: 31,
  timeZone: 'UTC',
});

test('date requests derive a comparison and reject forged or unavailable ranges', () => {
  const variable = dateRangeVariable({
    key: 'period',
    contract: calendar,
    comparison: true,
    defaultValue: { kind: 'dates', start: '2026-03-01', end: '2026-03-03' },
  });
  const request = variable.input({
    ...variable.defaultValue,
    comparison: 'previous',
  });
  expect(request.comparison).toEqual({
    start: '2026-02-26',
    end: '2026-02-28',
  });
  expect(calendar.parseRequest(JSON.parse(JSON.stringify(request)))).toEqual(
    request
  );
  expect(variable.describeInput(request)).toBe('Mar 1–3, 2026 UTC');
  expect(() =>
    calendar.parseRequest({ ...request, comparison: request.range })
  ).toThrow('preceding');
  expect(() =>
    calendar.request({ start: '2026-01-01', end: '2026-01-03' }, true)
  ).toThrow('coverage');
  expect(() =>
    calendar.parseRequest({ range: { start: '2026-02-30', end: '2026-03-03' } })
  ).toThrow();
  const definition = {
    operation: 'activity',
    variables: { period: variable },
    input({ period }: { period: typeof request }) {
      return period;
    },
    date: {
      variable: 'period',
      input(input: typeof request) {
        return input;
      },
    },
    isEmpty(data: { count: number }) {
      return data.count === 0;
    },
    emptyFallback: { title: 'No activity' },
  } satisfies DataViewDefinition<
    'activity',
    { period: typeof variable },
    typeof request,
    { count: number }
  >;
  expect(describeViewInput<typeof request>(definition)(request)).toBe(
    'Mar 1–3, 2026 UTC'
  );
  expect(() =>
    describeViewInput({
      ...definition,
      variables: { first: variable, second: variable },
    })
  ).toThrow('date range variable');
  expect(
    describeViewInput({
      ...definition,
      describeInput() {
        return 'custom period';
      },
    })(request)
  ).toBe('custom period');
});

test('comparison labels follow displayed inputs and distinguish unavailable from zero', () => {
  const input = calendar.request(
    { start: '2026-03-01', end: '2026-03-03' },
    true
  );
  const format = { kind: 'count' } as const;
  expect(
    calendarMetricComparison(
      { ...input, comparison: null },
      { current: 12, previous: 7, format }
    )
  ).toBeUndefined();
  const available = calendarMetricComparison(input, {
    current: 12,
    previous: 0,
    format,
  });
  expect(available).toMatchObject({
    current: { formattedValue: '12', periodLabel: 'Mar 1–3, 2026' },
    previous: { value: 0, formattedValue: '0', periodLabel: 'Feb 26–28, 2026' },
  });
  const unavailable = calendarMetricComparison(input, {
    current: 12,
    previous: null,
    format,
  });
  expect(unavailable?.previous).toMatchObject({
    value: null,
    formattedValue: 'Not available',
  });
  expect(
    renderToStaticMarkup(
      <MetricWidget
        label="Orders"
        value={12}
        format={format}
        comparison={unavailable}
      />
    )
  ).toContain('Previous period unavailable');
});

test('variables cannot overwrite navigation, inspection, or presentation routes', () => {
  for (const key of ['view', 'about', 'tab', 'present', 'step']) {
    expect(() => defineAppVariables({ search: textVariable({ key }) })).toThrow(
      'reserved'
    );
  }
  expect(() =>
    defineAppVariables({
      first: textVariable({ key: 'q' }),
      second: textVariable({ key: 'q' }),
    })
  ).toThrow('duplicate');
});

test('context validates glossary queries and binds widget evidence to its registries', () => {
  const define = createDataContext(defineQueryNames({ orders: 'orders' }));
  const context = define({
    description: 'Orders',
    glossary: {
      completed: {
        term: 'Completed',
        definition: 'Completed orders',
        queryNames: ['orders'],
      },
    },
  });
  expect(
    context.evidence({
      id: 'total',
      glossaryIds: ['completed'],
      queryNames: ['orders'],
    }).glossaryIds
  ).toEqual(['completed']);
  expect(() =>
    context.evidence({ id: ' ', glossaryIds: ['completed'] })
  ).toThrow('Evidence needs a nonempty ID');
  expect(
    context.finding({
      id: 'finding',
      headline: 'Orders rose',
      visual: <p>12 orders</p>,
      evidence: {
        id: 'finding',
        glossaryIds: ['completed'],
        queryNames: ['orders'],
      },
    }).evidence.queryNames
  ).toEqual(['orders']);
  expect(() =>
    context.finding({
      id: 'bad',
      headline: 'Bad',
      visual: null,
      evidence: {
        id: 'bad',
        // @ts-expect-error Story query references must belong to the registered query names.
        queryNames: ['unknown'],
      },
    })
  ).toThrow('Unknown query');
  expect(() =>
    define({
      description: 'Orders',
      glossary: {
        // @ts-expect-error Unknown glossary queries fail at authoring time and at runtime.
        bad: { term: 'Bad', definition: 'Bad', queryNames: ['unknown'] },
      },
    })
  ).toThrow('Unknown query');
});

test('one composition renders skeleton structure without any result values', () => {
  const content = defineDataContent<{ count: number }, { period: string }>(
    state => (
      <section>
        <h2>Orders</h2>
        {state.loading ? (
          <ContentSkeleton variant="ranking" rows={6} />
        ) : (
          <p>
            {state.data.count} in {state.input.period}
          </p>
        )}
      </section>
    )
  );
  const loading = renderToStaticMarkup(content.loadingFallback);
  expect(
    loading.match(/class="altertable-content-skeleton-row"/g)
  ).toHaveLength(6);
  expect(loading).not.toContain('120');
  expect(
    renderToStaticMarkup(content.children({ count: 120 }, { period: 'March' }))
  ).toContain('120 in March');
});

test('an empty widget tab renders its authored fallback', () => {
  const markup = renderToStaticMarkup(
    <WidgetViewTabs
      label="Views"
      selectedKey="orders"
      onSelectionChange={() => {}}
      views={[
        {
          id: 'orders',
          label: 'Orders',
          isEmpty: true,
          emptyFallback: { title: 'No orders' },
          content: <p>Must not render</p>,
        },
      ]}
    />
  );
  expect(markup).toContain('No orders');
  expect(markup).not.toContain('Must not render');
});

test('narrative content binds values and scope without evaluating loading data', () => {
  let calls = 0;
  const content = defineDataContent<{ count: number }, { region: string }>(
    result => (
      <TextWidget
        title="Activity explained"
        evidence={{ id: 'activity-explanation', queryNames: ['activity'] }}
        reading={result.select((data, input) => {
          calls++;
          return { count: data.count, region: input.region };
        })}
      >
        {({ count, region }) => (
          <p>
            {count === 0
              ? `No activity in ${region}`
              : `${count} active people in ${region}`}
          </p>
        )}
      </TextWidget>
    )
  );
  const loading = renderToStaticMarkup(content.loadingFallback);
  expect(calls).toBe(0);
  expect(loading).toContain('aria-busy="true"');
  expect(loading).toContain('altertable-text-widget-skeleton');
  expect(loading).not.toContain('active people');
  expect(loading).toContain('altertable-data-widget');
  expect(loading).toContain('Activity explained');
  expect(
    renderToStaticMarkup(content.children({ count: 12 }, { region: 'Europe' }))
  ).toContain('12 active people in Europe');
  expect(
    renderToStaticMarkup(content.children({ count: 0 }, { region: 'Asia' }))
  ).toContain('No activity in Asia');
  expect(calls).toBe(2);
});

test('static narrative accepts rich prose without requiring a heading or evidence', () => {
  const markup = renderToStaticMarkup(
    <TextContent aria-label="Introduction">
      <p>
        Explore <strong>adoption</strong> by region.
      </p>
      <ul>
        <li>Start with activity.</li>
      </ul>
      <a href="#features">Compare features</a>
    </TextContent>
  );
  expect(markup).toContain('aria-label="Introduction"');
  expect(markup).toContain('<strong>adoption</strong>');
  expect(markup).toContain('<li>Start with activity.</li>');
  expect(markup).not.toContain('<h2');
  expect(markup).not.toContain('aria-labelledby');
});

test('static text widgets compose the shared frame around prose', () => {
  const markup = renderToStaticMarkup(
    <TextWidget
      title="How to explore"
      description="Start here"
      action={<button>Next</button>}
      footer={<p>Source coverage</p>}
    >
      <p>
        Compare the <strong>regions</strong> below.
      </p>
    </TextWidget>
  );
  expect(markup).toContain('altertable-data-widget');
  expect(markup).toContain('altertable-text-content');
  expect(markup).toContain('How to explore');
  expect(markup).toContain('Start here');
  expect(markup).toContain('<button>Next</button>');
  expect(markup).toContain('Source coverage');
});
