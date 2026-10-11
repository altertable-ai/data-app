import { useEffect, useState, type ReactNode } from 'react';
import { formatDateTime, parseDateTime } from '@/src/core/format';
import { useDateFormatting } from '@/src/react/date-formatting';
import { HelpPopover, type HelpPopoverProps } from '@/src/react/ui/HelpPopover';

export type DateTimeTooltipProps = {
  date: Date;

  timeZone?: string;
  locale?: string;
  children?: ReactNode;
} & Omit<HelpPopoverProps, 'trigger' | 'triggerLabel' | 'label' | 'children'>;

function relativeDate(date: Date, now: number, locale: string): string {
  const seconds = Math.round((date.getTime() - now) / 1000);
  const absolute = Math.abs(seconds);
  const [value, unit]: [number, Intl.RelativeTimeFormatUnit] =
    absolute < 60
      ? [seconds, 'second']
      : absolute < 3600
        ? [Math.round(seconds / 60), 'minute']
        : absolute < 86_400
          ? [Math.round(seconds / 3600), 'hour']
          : [Math.round(seconds / 86_400), 'day'];

  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
    value,
    unit
  );
}

/** Exact-time disclosure uses the same reporting zone and locale as other date displays. */
export function DateTimeTooltip({
  date,
  timeZone,
  locale,
  children,
  panelProps,
  ...props
}: DateTimeTooltipProps) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);

    return () => window.clearInterval(interval);
  }, []);

  const defaults = useDateFormatting({ locale, timeZone });
  if (!parseDateTime(date)) return <span>{children ?? '—'}</span>;
  const rows = [
    { label: `Time zone · ${defaults.timeZone}`, zone: defaults.timeZone },
    ...(defaults.timeZone === 'UTC' ? [] : [{ label: 'UTC', zone: 'UTC' }]),
  ];
  const timestamp = date.toISOString();

  return (
    <HelpPopover
      {...props}
      placement={props.placement ?? 'bottom'}
      panelProps={{
        ...panelProps,
        className: ['altertable-date-time-tooltip', panelProps?.className]
          .filter(Boolean)
          .join(' '),
      }}
      triggerLabel="Show exact date and time"
      label="Date and time details"
      trigger={
        children ?? (
          <time dateTime={timestamp}>
            {formatDateTime(date, { ...defaults, precision: 'second' })}
          </time>
        )
      }
    >
      <div className="altertable-date-time-rows">
        {rows.map(({ label, zone }) => (
          <span className="altertable-date-time-row" key={label}>
            <span className="altertable-date-time-label">{label}</span>
            <time dateTime={timestamp}>
              {formatDateTime(date, {
                locale: defaults.locale,
                timeZone: zone,
                precision: 'second',
              })}
            </time>
          </span>
        ))}
        <span className="altertable-date-time-row">
          <span className="altertable-date-time-label">Relative</span>
          <time dateTime={timestamp}>
            {relativeDate(date, now, defaults.locale)}
          </time>
        </span>
        <span className="altertable-date-time-row">
          <span className="altertable-date-time-label">Timestamp</span>
          <time dateTime={timestamp}>{date.getTime()}</time>
        </span>
      </div>
    </HelpPopover>
  );
}
