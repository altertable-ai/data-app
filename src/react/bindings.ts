import type { EvidenceDeclaration } from '@/src/react/ui/data-context';
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

export type DatasetDefinition<Data, Input, Row, Evidence = WidgetEvidence> = {
  name: string;
  select: (data: Data, input: Input) => readonly Row[];
  columns: Record<string, DatasetColumn<NoInfer<Row>>>;
  rowKey: (row: NoInfer<Row>) => string | number;
  evidence: Evidence;
  emptyFallback?: EmptyContent;
};

/** Authoring references are registered by the owning view. */
export type DatasetDeclaration<Data, Input, Row> = DatasetDefinition<
  Data,
  Input,
  Row,
  EvidenceDeclaration
>;

export class ExportDataset<Data, Input> {
  #csv: (snapshot: DisplayedSnapshot<Data, Input>) => CsvTable;
  constructor(
    readonly name: string,
    csv: (snapshot: DisplayedSnapshot<Data, Input>) => CsvTable
  ) {
    this.#csv = csv;
  }
  static csv<Data, Input>(
    dataset: ExportDataset<Data, Input>,
    snapshot: DisplayedSnapshot<Data, Input>
  ) {
    return dataset.#csv(snapshot);
  }
}

export class Dataset<Data, Input, Row> extends ExportDataset<Data, Input> {
  readonly evidence: WidgetEvidence;
  #select: (data: Data, input: Input) => readonly Row[];
  #table: {
    title: string;
    columns: [TableWidgetColumn<Row>, ...TableWidgetColumn<Row>[]];
    rowKey: (row: Row) => string | number;
    evidence: WidgetEvidence;
    emptyFallback: EmptyContent;
  };
  constructor(definition: DatasetDefinition<Data, Input, Row>) {
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

    super(definition.name, snapshot => ({
      name: definition.name,
      columns: fields.map(column => column.label),
      rows: select(snapshot.data, snapshot.input).map(row =>
        fields.map(column => column.value(row))
      ),
    }));
    this.evidence = definition.evidence;
    this.#select = select;
    this.#table = {
      title: definition.name,
      columns,
      rowKey,
      evidence: definition.evidence,
      emptyFallback: definition.emptyFallback ?? { title: 'No results' },
    };
  }
  read = <Source extends ViewSource<Data, Input>>(source: Source) => {
    return readSource<Data, Input, readonly Row[], Source>(
      source,
      this.#select
    );
  };
  static table<Data, Input, Row>(
    dataset: Dataset<Data, Input, Row>,
    source: ViewSource<Data, Input>
  ) {
    return { ...dataset.#table, reading: dataset.read(source) };
  }
}

export function bindDataset<Data, Input, Row>(
  definition: DatasetDefinition<Data, Input, Row>
) {
  return new Dataset(definition);
}

export function datasetTable<Data, Input, Row>(
  dataset: Dataset<Data, Input, Row>,
  source: ViewSource<Data, Input>
) {
  return Dataset.table(dataset, source);
}
export function datasetCsv<Data, Input>(
  dataset: ExportDataset<Data, Input>,
  snapshot: DisplayedSnapshot<Data, Input>
) {
  return ExportDataset.csv(dataset, snapshot);
}

export class Metric<Data, Input> {
  #select: (data: Data, input: Input) => MetricValues;
  #date?: (input: Input) => DateRangeRequest;
  constructor(
    readonly definition: MetricDefinition,
    select: (data: Data, input: Input) => MetricValues,
    date?: (input: Input) => DateRangeRequest
  ) {
    this.#select = select;
    this.#date = date;
  }
  read = <Source extends ViewSource<Data, Input>>(source: Source) => {
    return readSource<
      Data,
      Input,
      MetricValues & { period?: DateRangeRequest },
      Source
    >(source, (data, input) => {
      const values = this.#select(data, input);
      invariant(
        values.previous === undefined || this.#date,
        'Metric comparisons require a view date binding.'
      );
      return { ...values, period: this.#date?.(input) };
    });
  };
}
export function bindMetric<Data, Input>(
  definition: MetricDefinition,
  select: (data: Data, input: Input) => MetricValues,
  date?: (input: Input) => DateRangeRequest
) {
  return new Metric(definition, select, date);
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
    tables: datasets.map(dataset => datasetCsv(dataset, snapshot)) as [
      CsvTable,
      ...CsvTable[],
    ],
  };
}
