import { useState, type ComponentPropsWithRef, type ReactNode } from 'react';
import { invariant } from '@/src/core/invariant';
import type { WidgetEvidence } from '@/src/react/ui/WidgetEvidence';
import type { WidgetStatus } from '@/src/react/ui/RequestHint';
import { VisualizationWidget } from '@/src/react/ui/VisualizationWidget';
import {
  DataTable,
  DataTableEmptyRow,
  type DataTableSearch,
} from '@/src/react/ui/DataTable';
import type { EmptyContent } from '@/src/react/ui/presentation';
import {
  searchItems,
  type SearchHit,
  type SearchItemsOptions,
} from '@/src/react/ui/searchItems';
import type { DataReading } from '@/src/core/reading';
import { formatCount, pluralize } from '@/src/core/format';
import { Skeleton } from '@/src/react/ui/Skeleton';
import { AppIcon } from '@/src/react/ui/icons';
import { Button } from '@/src/react/ui/Button';
import { Tooltip } from '@/src/react/ui/Tooltip';

export type TableWidgetColumn<Row> = {
  /** Stable, nonempty identity; unique within this table. */
  id: string;
  header: ReactNode;
  type?: 'number' | 'datetime';
  /** Render this column's value for one row. The table owns its cell element and semantics. */
  cell: (row: Row, hit?: SearchHit<Row>) => ReactNode;
};

export type TableWidgetSearch<Row> = Omit<DataTableSearch, 'itemCount'> &
  Pick<SearchItemsOptions<Row>, 'attributes' | 'mode' | 'fuzzyThreshold'>;

export type TableDisplayMode =
  | {
      /** Positive integer preview cap after search; disables pagination. */
      limit: number;
      pagination?: never;
    }
  | {
      /** Local pagination after search: 10 rows by default, false shows all supplied rows.
       * pageSize must be a positive integer. Counts refer only to supplied rows.
       * The widget owns bottom-footer controls and shares the current page with inspection. */
      pagination?: { pageSize: number } | false;
      limit?: never;
    };

type TableWidgetBaseProps<Row> = {
  title: ReactNode;
  annotationId?: string;
  count?: number;
  description?: ReactNode;
  columns: readonly [TableWidgetColumn<Row>, ...TableWidgetColumn<Row>[]];
  /** Unique, nonempty row identity. Numeric keys must be finite; 1 and "1" collide. */
  rowKey: (row: Row) => string | number;
  status?: WidgetStatus;
  action?: ReactNode;
  evidence?: WidgetEvidence;
  search?: TableWidgetSearch<Row>;
  /** Valid result with no rows; the header remains visible. */
  emptyFallback: EmptyContent;
} & TableDisplayMode &
  Omit<ComponentPropsWithRef<'section'>, 'about' | 'title' | 'children'>;

/** Composes VisualizationWidget with DataTable, search, and local pagination.
 * Columns own header and body semantics; the first column is the row header.
 * Use DataTable inside VisualizationWidget directly for custom table markup. */
export type TableWidgetProps<Row> = TableWidgetBaseProps<Row> &
  (
    | { rows: readonly Row[]; reading?: never; skeletonRows?: never }
    | {
        reading: DataReading<readonly Row[]>;
        rows?: never;
        skeletonRows?: number;
        evidence: WidgetEvidence;
      }
  );

export function TableWidget<Row>(props: TableWidgetProps<Row>) {
  const { pagination, limit, columns } = props;
  invariant(
    !pagination ||
      (Number.isSafeInteger(pagination.pageSize) && pagination.pageSize >= 1),
    'TableWidget pagination.pageSize must be a positive integer.'
  );
  invariant(
    limit === undefined || (Number.isSafeInteger(limit) && limit >= 1),
    'TableWidget limit must be a positive integer.'
  );
  const columnIds = columns.map(column => column.id);
  invariant(
    columnIds.length > 0 &&
      columnIds.every(id => !!id.trim()) &&
      new Set(columnIds).size === columnIds.length,
    'TableWidget column IDs must be nonempty and unique.'
  );

  if (props.reading) {
    const { reading, skeletonRows, ...rest } = props;
    return (
      <TableWidgetContent
        {...rest}
        rows={reading.loading ? [] : reading.value}
        loading={reading.loading}
        skeletonRows={skeletonRows}
      />
    );
  }

  return <TableWidgetContent {...props} />;
}

function TableWidgetContent<Row>({
  title,
  count,
  description,
  columns,
  rows,
  rowKey,
  action,
  evidence,
  search,
  limit,
  pagination,
  emptyFallback,
  loading = false,
  skeletonRows = 5,
  ...props
}: TableWidgetBaseProps<Row> & {
  rows: readonly Row[];
  loading?: boolean;
  skeletonRows?: number;
}) {
  const keys = rows.map(rowKey);
  invariant(
    keys.every(key =>
      typeof key === 'string' ? !!key.trim() : Number.isFinite(key)
    ) && new Set(keys.map(String)).size === keys.length,
    'TableWidget row keys must be nonempty and unique.'
  );
  const rowKeys = JSON.stringify(keys);

  const pageSize =
    pagination === false || limit !== undefined
      ? null
      : (pagination?.pageSize ?? 10);
  const [pageState, setPageState] = useState({
    page: 0,
    rowKeys,
    searchValue: search?.value,
    pageSize,
  });
  if (
    pageState.rowKeys !== rowKeys ||
    pageState.searchValue !== search?.value ||
    pageState.pageSize !== pageSize
  ) {
    setPageState({ page: 0, rowKeys, searchValue: search?.value, pageSize });
  }
  const hits = search
    ? searchItems(rows, search.value, {
        attributes: search.attributes,
        mode: search.mode,
        fuzzyThreshold: search.fuzzyThreshold,
      })
    : rows.map(item => ({ item, score: 0, matches: {} }));
  const pageCount = pageSize
    ? Math.max(1, Math.ceil(hits.length / pageSize))
    : 1;
  const page = Math.min(pageState.page, pageCount - 1);
  const start = pageSize ? page * pageSize : 0;
  const visible = hits.slice(
    start,
    pageSize ? start + pageSize : Math.max(0, limit ?? hits.length)
  );
  const searchable = search && {
    label: search.label,
    placeholder: search.placeholder,
    value: search.value,
    onChange: search.onChange,
    resetValue: search.resetValue,
    itemCount: rows.length,
  };
  const table = (
    <>
      <DataTable
        searchable={loading ? undefined : searchable}
        aria-busy={loading || undefined}
      >
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column.id} scope="col" data-type={column.type}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody aria-hidden={loading || undefined}>
          {loading ? (
            Array.from(
              {
                length: Math.min(
                  100,
                  Math.max(0, Math.trunc(skeletonRows) || 0)
                ),
              },
              (_, row) => (
                <tr key={row}>
                  {columns.map(column => (
                    <td key={column.id} data-type={column.type}>
                      <Skeleton style={{ width: '70%', height: '1em' }} />
                    </td>
                  ))}
                </tr>
              )
            )
          ) : visible.length === 0 ? (
            <DataTableEmptyRow colSpan={columns.length} {...emptyFallback} />
          ) : (
            visible.map(hit => (
              <tr key={rowKey(hit.item)}>
                {columns.map((column, index) =>
                  index === 0 ? (
                    <th key={column.id} scope="row" data-type={column.type}>
                      {column.cell(hit.item, hit)}
                    </th>
                  ) : (
                    <td key={column.id} data-type={column.type}>
                      {column.cell(hit.item, hit)}
                    </td>
                  )
                )}
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
    </>
  );
  const pager = pageSize && pageCount > 1 && (
    <nav className="altertable-table-pagination" aria-label="Table pages">
      <span className="altertable-table-pagination-range">
        {formatCount(start + 1)}–{formatCount(start + visible.length)} of{' '}
        {formatCount(hits.length)} {pluralize(hits.length, 'result')}
      </span>
      <span className="altertable-table-pagination-controls">
        <span>
          Page {page + 1} of {pageCount}
        </span>
        <Tooltip content="Previous page">
          <Button
            size="icon-compact"
            aria-label="Previous page"
            disabled={page === 0}
            onClick={() =>
              setPageState({
                page: page - 1,
                rowKeys,
                searchValue: search?.value,
                pageSize,
              })
            }
          >
            <AppIcon name="previousMonth" size={16} />
          </Button>
        </Tooltip>
        <Tooltip content="Next page">
          <Button
            size="icon-compact"
            aria-label="Next page"
            disabled={page >= pageCount - 1}
            onClick={() =>
              setPageState({
                page: page + 1,
                rowKeys,
                searchValue: search?.value,
                pageSize,
              })
            }
          >
            <AppIcon name="nextMonth" size={16} />
          </Button>
        </Tooltip>
      </span>
    </nav>
  );

  return (
    <VisualizationWidget
      {...props}
      title={title}
      annotationId={props.annotationId ?? evidence?.id}
      count={loading ? undefined : count}
      description={description}
      action={action}
      evidence={loading ? undefined : evidence}
      aria-busy={loading || props['aria-busy']}
      footer={pager}
      visual={<div className="altertable-table-widget-content">{table}</div>}
    />
  );
}
