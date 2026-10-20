import { formatNumber, type MetricFormat } from '@altertable/data-app/format';
import { createContext } from 'react';

export const ChartValueFormat = createContext<MetricFormat | undefined>(
  undefined
);

/** Use one magnitude for every tick, and enough precision to distinguish them. */
export function axisValueFormatter(
  values: readonly number[],
  format?: MetricFormat
) {
  const magnitude = Math.max(0, ...values.map(Math.abs));
  const compact =
    format?.kind !== 'ratio' &&
    !(format?.kind === 'count' && format.compact === false);
  const exponent =
    compact && magnitude >= 1000
      ? Math.min(12, Math.floor(Math.log10(magnitude) / 3) * 3)
      : 0;
  const divisor = 10 ** exponent;
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  const step = sorted
    .slice(1)
    .reduce(
      (minimum, value, index) => Math.min(minimum, value - sorted[index]!),
      Infinity
    );
  const displayStep = (step / divisor) * (format?.kind === 'ratio' ? 100 : 1);
  const digits =
    Number.isFinite(displayStep) && displayStep > 0
      ? Math.min(20, Math.max(0, -Math.floor(Math.log10(displayStep)) + 1))
      : 2;
  const locale = format?.locale ?? 'en-US';
  const options: Intl.NumberFormatOptions = {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
    ...(format?.kind === 'currency'
      ? { style: 'currency', currency: format.currency }
      : {}),
    ...(format?.kind === 'ratio' ? { style: 'percent' } : {}),
  };
  const suffix = ['', 'k', 'M', 'B', 'T'][exponent / 3]!;
  const formatter = new Intl.NumberFormat(locale, options);
  return (value: unknown) => {
    if (typeof value !== 'number') return String(value);
    if (!Number.isFinite(value)) return formatNumber(value);
    const parts = formatter.formatToParts(value === 0 ? 0 : value / divisor);
    const index = parts.findLastIndex(
      part => part.type === 'integer' || part.type === 'fraction'
    );
    return parts
      .map((part, i) => part.value + (i === index && value !== 0 ? suffix : ''))
      .join('');
  };
}
