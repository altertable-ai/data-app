import type { ReactNode } from 'react';
import type { DateRangeRequest } from '@/src/core/contract';
import type { DataView, DisplayedSnapshot } from '@/src/core/data-view';
import { formatMetric } from '@/src/core/format';
import type { MetricFormat } from '@/src/core/format';
import type { DataReading, MetricValues } from '@/src/core/reading';
import { invariant } from '@/src/core/invariant';
import type { CsvCell, CsvTable, CsvExport } from '@/src/react/ui/csv-export';
import type { MetricDefinition } from '@/src/react/ui/metric';
import type { EmptyContent } from '@/src/react/ui/presentation';
import type { TableWidgetColumn } from '@/src/react/ui/TableWidget';
import type { WidgetEvidence } from '@/src/react/ui/WidgetEvidence';

/** Displayed data, or an initial loading reading. Pending filter values are never a source. */
export type ViewSource<Data, Input> =
  | { loading: true }
  | { loading?: false; data: Data; input: Input };
type SourceReading<Source, Value> = Source extends { loading: true }
  ? { loading: true }
  : { loading: false; value: Value };

function readSource<Data, Input, Value, Source extends ViewSource<Data, Input>>(
  source: Source,
  select: (data: Data, input: Input) => Value
): SourceReading<Source, Value> {
  // The generic return preserves a ready snapshot's value for story authors.
  return (
    source.loading
      ? { loading: true }
      : { loading: false, value: select(source.data, source.input) }
  ) as SourceReading<Source, Value>;
}

/** Keys supply IDs; accessors supply raw CSV values. Formats affect display only. */
export type DatasetColumn<Row> = { label?: string } & (
  | { value: (row: Row) => CsvCell; format?: (row: Row) => ReactNode }
  | { value: (row: Row) => number | null | undefined; format: MetricFormat }
);

export type DatasetDefinition<Data, Input, Row> = {
  name: string;
  select: (data: Data, input: Input) => readonly Row[];
  columns: Record<string, DatasetColumn<NoInfer<Row>>>;
  rowKey: (row: NoInfer<Row>) => string | number;
  evidence: WidgetEvidence;
  emptyFallback?: EmptyContent;
};

export function bindDataset<Data, Input, Row>(
  definition: DatasetDefinition<Data, Input, Row>
) {
  invariant(!!definition.name.trim(), 'A dataset needs a name.');
  const ids = Object.keys(definition.columns);
  invariant(
    ids.length > 0 && ids.every(id => !!id.trim()),
    'A dataset needs nonempty column IDs.'
  );
  const { select, rowKey } = definition;
  const fields = Object.entries(definition.columns).map(([id, column]) => ({
    ...column,
    id,
    label:
      column.label?.trim() ||
      id
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/^./u, letter => letter.toUpperCase()) ||
      id,
  }));
  const columns = fields.map(column => ({
    id: column.id,
    header: column.label,
    type:
      column.format && typeof column.format !== 'function'
        ? ('number' as const)
        : undefined,
    cell(row: Row): ReactNode {
      if (typeof column.format === 'function') return column.format(row);
      const value = column.value(row);
      if (value === null || value === undefined) return '—';
      return column.format
        ? formatMetric(value as number, column.format)
        : String(value);
    },
  })) as [TableWidgetColumn<Row>, ...TableWidgetColumn<Row>[]];

  function read<Source extends ViewSource<Data, Input>>(source: Source) {
    return readSource<Data, Input, readonly Row[], Source>(source, select);
  }

  return {
    name: definition.name,
    evidence: definition.evidence,
    read,
    /** Core table props; pagination, search, descriptions, and actions remain app choices. */
    props<Source extends ViewSource<Data, Input>>(source: Source) {
      return {
        title: definition.name,
        columns,
        rowKey,
        evidence: definition.evidence,
        emptyFallback: definition.emptyFallback ?? { title: 'No results' },
        reading: read(source),
      };
    },
    /** Raw displayed values, independent of table formatting. */
    csv(snapshot: DisplayedSnapshot<Data, Input>): CsvTable {
      return {
        name: definition.name,
        columns: fields.map(column => column.label),
        rows: select(snapshot.data, snapshot.input).map(row =>
          fields.map(column => column.value(row))
        ),
      };
    },
  };
}

export function bindMetric<Data, Input>(
  definition: MetricDefinition,
  select: (data: Data, input: Input) => MetricValues,
  date?: (input: Input) => DateRangeRequest
) {
  function read<Source extends ViewSource<Data, Input>>(source: Source) {
    return readSource<
      Data,
      Input,
      MetricValues & { period?: DateRangeRequest },
      Source
    >(source, (data, input) => {
      const values = select(data, input);
      invariant(
        values.previous === undefined || date,
        'Metric comparisons require a view date binding.'
      );
      return { ...values, period: date?.(input) };
    });
  }

  return {
    definition,
    read,
    props<Source extends ViewSource<Data, Input>>(source: Source) {
      return { metric: definition, reading: read(source) };
    },
  };
}

export function displayedScope<Data, Input>(
  view: DataView<Data, Input>,
  describeInput: (input: Input) => string
): DataReading<string> {
  if (view.kind === 'loading' || view.kind === 'error')
    return { loading: true };
  const input =
    view.kind === 'updating' || view.kind === 'stale-error'
      ? view.displayedInput
      : view.input;
  return { loading: false, value: describeInput(input) };
}

export type ExportDataset<Data, Input> = {
  name: string;
  csv: (snapshot: DisplayedSnapshot<Data, Input>) => CsvTable;
};

export function exportDatasets<Data, Input>(
  datasets: readonly [
    ExportDataset<Data, Input>,
    ...ExportDataset<Data, Input>[],
  ],
  snapshot: DisplayedSnapshot<Data, Input>,
  scope: string,
  appTitle: string
): CsvExport {
  const name = datasets.length === 1 ? datasets[0].name : appTitle;
  const filename =
    `${name}-${scope}`
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 200) || 'data';
  return {
    filename,
    tables: datasets.map(dataset => dataset.csv(snapshot)) as [
      CsvTable,
      ...CsvTable[],
    ],
  };
}
