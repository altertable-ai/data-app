import { parseDateTime } from '@altertable/data-app/format';
import { useDateFormatting } from '../date-formatting.ts';
import { useEffect, useState, type ReactNode } from 'react';
import {
  DateTimeTooltip,
  type DateTimeTooltipProps,
} from './DateTimeTooltip.tsx';

export type UpdatedAtProps = {
  timestamp: number;
  locale?: string;
  label?: string;
  children?: ReactNode;
} & Omit<DateTimeTooltipProps, 'date' | 'children'>;

export function UpdatedAt({
  timestamp,
  locale,
  label = 'Updated',
  children,
  triggerProps,
  ...props
}: UpdatedAtProps) {
  const defaults = useDateFormatting({ locale, timeZone: props.timeZone });
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);

    return () => window.clearInterval(interval);
  }, []);

  const elapsedMinutes = Math.floor(Math.max(0, now - timestamp) / 60_000);
  const relative = new Intl.RelativeTimeFormat(defaults.locale, {
    numeric: 'auto',
  });
  let age = 'just now';
  if (elapsedMinutes >= 1_440)
    age = relative.format(-Math.floor(elapsedMinutes / 1_440), 'day');
  else if (elapsedMinutes >= 60)
    age = relative.format(-Math.floor(elapsedMinutes / 60), 'hour');
  else if (elapsedMinutes >= 1)
    age = relative.format(-elapsedMinutes, 'minute');

  const date = parseDateTime(timestamp);
  if (!date) return <span>{children ?? `${label} —`}</span>;

  return (
    <DateTimeTooltip
      {...props}
      {...defaults}
      date={date}
      triggerProps={{
        ...triggerProps,
        className: ['altertable-updated-at', triggerProps?.className]
          .filter(Boolean)
          .join(' '),
      }}
    >
      {children ?? (
        <time dateTime={date.toISOString()}>
          {label} {age}
        </time>
      )}
    </DateTimeTooltip>
  );
}
