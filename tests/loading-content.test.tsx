import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  DataValue,
  MetricWidget,
  TableWidget,
  VisualizationWidget,
  type WidgetEvidence,
} from '@altertable/data-app/react';

const evidence: WidgetEvidence = { id: 'orders', queryNames: ['orders'] };

test('metric loading preserves static text and reserves only the value', () => {
  const html = renderToStaticMarkup(
    <MetricWidget label="Orders" description="Orders in any status." loading />
  );
  expect(html).toContain('Orders in any status.');
  expect(html).toContain('>Orders</h2>');
  expect(html).toContain('altertable-metric-loading-value');
  expect(html).toContain('aria-busy="true"');
  expect(html).not.toContain('altertable-content-skeleton-label');
});

test('bound chart loading keeps its heading without evaluating data', () => {
  let renders = 0;
  const html = renderToStaticMarkup(
    <VisualizationWidget
      title="Orders per day"
      description="Days without orders count as zero."
      reading={{ loading: true }}
      evidence={evidence}
      isEmpty={() => {
        throw new Error('No loading data');
      }}
      empty={{ title: 'No orders' }}
      skeleton={{ variant: 'ranking', rows: 3 }}
    >
      {() => {
        renders++;
        return 'ready';
      }}
    </VisualizationWidget>
  );
  expect(html).toContain('Orders per day');
  expect(html).toContain('Days without orders count as zero.');
  expect(html.match(/class="altertable-content-skeleton-row"/g)).toHaveLength(
    3
  );
  expect(html).not.toContain('Explore Orders per day');
  expect(html).not.toContain('No orders');
  expect(renders).toBe(0);
});

test('table loading preserves column headings and section attributes', () => {
  const html = renderToStaticMarkup(
    <TableWidget
      id="orders-table"
      title="Orders by country"
      description="All order statuses."
      reading={{ loading: true }}
      evidence={evidence}
      skeletonRows={2}
      columns={[
        {
          id: 'country',
          header: 'Country',
          cell: () => {
            throw new Error('No loading data');
          },
        },
      ]}
      rowKey={() => {
        throw new Error('No loading data');
      }}
      empty={{ title: 'No orders' }}
    />
  );
  expect(html).toContain('id="orders-table"');
  expect(html).toContain('Orders by country');
  expect(html).toContain('All order statuses.');
  expect(html).toContain('scope="col">Country</th>');
  expect(html.match(/class="altertable-skeleton"/g)).toHaveLength(2);
  expect(html).not.toContain('No orders');
});

test('inline readings retain static prose and render measured zero', () => {
  let renders = 0;
  function render(
    reading: { loading: true } | { loading: false; value: number }
  ) {
    return renderToStaticMarkup(
      <p>
        Orders:{' '}
        <DataValue reading={reading} loadingFallback={<span>pending</span>}>
          {value => {
            renders++;
            return value;
          }}
        </DataValue>{' '}
        in the last 7 days.
      </p>
    );
  }
  expect(render({ loading: true })).toContain('pending');
  expect(renders).toBe(0);
  const ready = render({ loading: false, value: 0 });
  expect(ready).toContain('>0</span>');
  expect(ready).toContain('in the last 7 days.');
  expect(ready).not.toContain('pending');
  expect(renders).toBe(1);
});
