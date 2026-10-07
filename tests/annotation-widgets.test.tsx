import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import {
  DataAppProvider,
  MetricWidget,
  TableWidget,
  VisualizationWidget,
} from '@altertable/data-app/react/ui';
import type { MetricDefinition } from '@altertable/data-app/react';

function renderWidget(children: ReactNode) {
  return renderToStaticMarkup(<DataAppProvider>{children}</DataAppProvider>);
}

test('widget targets retain their evidence identity when loading becomes ready', () => {
  const metric: MetricDefinition = {
    id: 'revenue',
    label: 'Revenue',
    format: { kind: 'count' },
    evidence: { id: 'revenue', queryNames: ['counts'] },
  };
  for (const loading of [true, false]) {
    const reading = loading
      ? { loading: true as const }
      : { loading: false as const, value: [{ id: 'row' }] };
    const metricMarkup = renderWidget(
      <MetricWidget
        metric={metric}
        reading={
          loading
            ? { loading: true }
            : { loading: false, value: { current: 42 } }
        }
      />
    );
    expect(metricMarkup).toContain('data-annotation-id="revenue"');
    const visualMarkup = renderWidget(
      <VisualizationWidget
        title="Trend"
        evidence={{ id: 'trend', queryNames: ['counts'] }}
        reading={reading}
        isEmpty={rows => rows.length === 0}
        emptyFallback={{ title: 'No data' }}
      >
        {() => <p>Trend values</p>}
      </VisualizationWidget>
    );
    expect(visualMarkup).toContain('data-annotation-id="trend"');
    const tableMarkup = renderWidget(
      <TableWidget
        title="Rows"
        evidence={{ id: 'rows', queryNames: ['counts'] }}
        reading={reading}
        rowKey={row => row.id}
        columns={[{ id: 'id', header: 'ID', cell: row => row.id }]}
        emptyFallback={{ title: 'No rows' }}
      />
    );
    expect(tableMarkup).toContain('data-annotation-id="rows"');
  }
});
