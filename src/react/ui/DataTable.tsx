import type { ComponentPropsWithRef, ReactNode } from 'react';
import { classNames } from '@/src/react/ui/classNames';
import { formatDateTime, parseDateTime } from '@/src/core/format';
import { useDateFormatting } from '@/src/react/date-formatting';
import { DateTimeTooltip } from '@/src/react/ui/DateTimeTooltip';
import { EmptyState } from '@/src/react/ui/EmptyState';
import type { EmptyContent } from '@/src/react/ui/presentation';
import { SearchField, type SearchFieldProps } from '@/src/react/ui/SearchField';

export type DataTableSearch = Pick<
  SearchFieldProps,
  'label' | 'placeholder' | 'value' | 'onChange' | 'resetValue' | 'inputProps'
> & {
  /** Number of available records before filtering or a display limit. */
  itemCount: number;
};
export type DataTableProps = ComponentPropsWithRef<'table'> & {
  searchable?: DataTableSearch;
};

/** Scrollable native table. Mark quantitative th/td cells with data-type="number";
 * the runtime aligns them to the end and uses tabular digits. */
export function DataTable({
  className,
  ref,
  searchable,
  ...props
}: DataTableProps) {
  return (
    <>
      {searchable &&
        (searchable.itemCount > 5 ||
          searchable.value !== (searchable.resetValue ?? '')) && (
          <SearchField
            label={searchable.label}
            placeholder={searchable.placeholder}
            value={searchable.value}
            onChange={searchable.onChange}
            resetValue={searchable.resetValue}
            inputProps={searchable.inputProps}
            size="compact"
            className="altertable-data-table-search"
          />
        )}
      <div className="altertable-data-table-scroll">
        <table
          {...props}
          ref={ref}
          className={classNames('altertable-data-table', className)}
        />
      </div>
    </>
  );
}

/** Accepts a fraction of the stated whole, using `formatPercent` semantics. */
export function DataTableShare({ value }: { value: number }) {
  const ratio = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  const label = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(ratio);

  return <span className="altertable-data-table-share">{label}</span>;
}

export type DataTableEmptyRowProps = EmptyContent & {
  colSpan: number;
};

export function DataTableEmptyRow({
  colSpan,
  title,
  description,
  action,
}: DataTableEmptyRowProps) {
  return (
    <tr className="altertable-data-table-empty-row">
      <td colSpan={colSpan}>
        <EmptyState
          title={title}
          description={description}
          action={action}
          variant="table"
        />
      </td>
    </tr>
  );
}

export type DataTableTimestampProps = {
  value: string | Date | number;
  children?: ReactNode;
  timeZone?: string;
  locale?: string;
  precision?: 'minute' | 'second';
};

export function DataTableTimestamp({
  value,
  children,
  timeZone,
  locale,
  precision,
}: DataTableTimestampProps) {
  const defaults = useDateFormatting({ timeZone, locale });
  const date = parseDateTime(value);
  if (!date) return <>{children ?? '—'}</>;
  const timestamp = date.toISOString();

  return (
    <DateTimeTooltip
      date={date}
      {...defaults}
      triggerProps={{
        className: 'altertable-data-table-timestamp',
        'data-atbl-control': 'help',
      }}
    >
      <time dateTime={timestamp}>
        {children ?? formatDateTime(date, { ...defaults, precision })}
      </time>
    </DateTimeTooltip>
  );
}
