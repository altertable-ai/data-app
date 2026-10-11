import { classNames } from '@/src/react/ui/classNames';
import type { ComponentPropsWithRef } from 'react';
import {
  formatDate,
  formatDateTime,
  parseDateTime,
  type DateFormat,
} from '@/src/core/format';
import { useDateFormatting } from '@/src/react/date-formatting';
import { DateTimeTooltip } from '@/src/react/ui/DateTimeTooltip';

export type DateDisplayProps = {
  value: string | Date | number | null | undefined;
  /** Calendar dates stay dates; instants require a Date, epoch milliseconds, or an offset-bearing ISO string. */
  format?: DateFormat;
} & Omit<ComponentPropsWithRef<'time'>, 'children' | 'dateTime'>;

/** Readable dates with exact-time disclosure for instants; invalid or ambiguous values render as missing. */
export function DateDisplay({
  value,
  format = { kind: 'dateTime' },
  className,
  ...props
}: DateDisplayProps) {
  const defaults = useDateFormatting(format);
  if (format.kind === 'date') {
    const label = formatDate(typeof value === 'string' ? value : null, {
      ...format,
      locale: defaults.locale,
    });
    const date =
      typeof value === 'string' ? parseDateTime(`${value}T00:00:00Z`) : null;
    if (!date)
      return (
        <span
          {...props}
          className={classNames('altertable-date-display', className)}
        >
          {label}
        </span>
      );
    return (
      <time
        {...props}
        className={classNames('altertable-date-display', className)}
        dateTime={value as string}
      >
        {label}
      </time>
    );
  }
  const date = parseDateTime(value);
  const label = formatDateTime(value, { ...format, ...defaults });
  if (!date || label === (format.missing ?? '—'))
    return (
      <span
        {...props}
        className={classNames('altertable-date-display', className)}
      >
        {label}
      </span>
    );
  return (
    <DateTimeTooltip
      date={date}
      {...defaults}
      triggerProps={{
        className: 'altertable-date-display-trigger',
        'data-atbl-control': 'help',
        'aria-label': `Show exact date and time: ${label}`,
      }}
    >
      <time
        {...props}
        className={classNames('altertable-date-display', className)}
        dateTime={date.toISOString()}
      >
        {label}
      </time>
    </DateTimeTooltip>
  );
}
