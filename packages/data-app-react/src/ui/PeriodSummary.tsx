import { type ReportingPeriod } from '@altertable/data-app/contract';
import {
  formatDateRange,
  formatDateTime,
  parseDateTime,
  type DateTimeFormatOptions,
} from '@altertable/data-app/format';

import { useDateFormatting } from '../date-formatting.ts';
import { classNames } from './classNames.ts';
import { AppIcon } from './icons.ts';
export { type ReportingPeriod } from '@altertable/data-app/contract';

export type PeriodComparison =
  | { kind: 'previous' }
  | { kind: 'period'; period: ReportingPeriod };

export type PeriodSummaryProps = {
  period: ReportingPeriod;
  comparison?: PeriodComparison;
  className?: string;
};

function duration(
  period: Extract<ReportingPeriod, { kind: 'rolling' }>
): string {
  return `${period.amount} ${period.unit}${period.amount === 1 ? '' : 's'}`;
}

function label(
  period: ReportingPeriod,
  options: DateTimeFormatOptions = {}
): string {
  if (period.kind === 'rolling') return `Last ${duration(period)}`;

  return formatDateRange(period, options);
}

function comparisonLabel(
  period: ReportingPeriod,
  comparison: PeriodComparison,
  options: DateTimeFormatOptions
): string {
  if (comparison.kind === 'period') {
    if (comparison.period.kind === 'calendar')
      return label(comparison.period, options);

    return `${duration(comparison.period)} ending ${formatDateTime(comparison.period.end, options)}`;
  }

  return period.kind === 'rolling'
    ? `Previous ${duration(period)}`
    : 'Previous period';
}

function reportingPeriodText(
  period: ReportingPeriod,
  options: DateTimeFormatOptions = {}
): string {
  if (period.kind === 'calendar')
    return `${label(period, options)} in ${period.timeZone}`;
  const end = parseDateTime(period.end);
  if (!end) return label(period, options);
  const start = new Date(
    end.getTime() -
      period.amount * (period.unit === 'hour' ? 3_600_000 : 86_400_000)
  );

  return `${label(period, options)}, ${formatDateTime(start, options)} to ${formatDateTime(end, options)} in ${options.timeZone ?? 'UTC'}`;
}

/** Read-only period context for the variable bar, including exact bounds for assistive technology. */
export function PeriodSummary({
  period,
  comparison,
  className,
}: PeriodSummaryProps) {
  const options = useDateFormatting();
  const comparisonText = comparison
    ? comparisonLabel(period, comparison, options)
    : null;
  const comparisonDetail =
    comparison?.kind === 'period'
      ? reportingPeriodText(comparison.period, options)
      : comparisonText;

  return (
    <p className={classNames('altertable-period-summary', className)}>
      <span className="altertable-sr-only">
        {`Reporting period: ${reportingPeriodText(period, options)}${comparisonDetail ? `, compared with ${comparisonDetail}` : ''}`}
      </span>
      <span aria-hidden="true" className="altertable-period-summary-visible">
        <AppIcon
          name={period.kind === 'rolling' ? 'clock' : 'calendar'}
          size={16}
        />
        <span className="altertable-period-summary-current">
          {label(period, options)}
        </span>
        {comparisonText && (
          <>
            <span className="altertable-period-summary-vs" aria-hidden="true">
              vs
            </span>
            <span>{comparisonText}</span>
          </>
        )}
      </span>
    </p>
  );
}
