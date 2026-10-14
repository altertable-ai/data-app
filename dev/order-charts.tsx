import {
  formatCount,
  formatMetric,
  pluralize,
} from '@altertable/data-app/format';
import { Ranking } from '@altertable/data-app/react';
import { LineChart, PieChart } from '@altertable/data-app/react/ui';
import type { CountryRevenue, OrderDay, OrderBand } from '@/dev/orders';

const dayLabel = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const currency = { kind: 'currency', currency: 'USD' } as const;
export function DailyLineChart({ days }: { days: readonly OrderDay[] }) {
  return (
    <LineChart
      ariaLabel="Orders per day"
      unit="orders"
      formatValue={value => formatCount(value, { compact: true })}
      items={days.map(day => ({
        id: day.day,
        label: dayLabel.format(new Date(day.day)),
        value: day.orderCount,
      }))}
    />
  );
}
export function OrderValuePieChart({ bands }: { bands: readonly OrderBand[] }) {
  return (
    <PieChart
      ariaLabel="Order value distribution"
      unit="orders"
      formatValue={value => formatCount(value, { compact: true })}
      items={bands.map(band => ({
        id: band.band,
        label: band.band,
        value: band.orderCount,
      }))}
    />
  );
}
export function CountryRanking({
  countries,
}: {
  countries: readonly CountryRevenue[];
}) {
  return (
    <Ranking
      aria-label="Paid revenue by country"
      formatValue={value => formatMetric(value, currency)}
      items={countries.map(({ country, orderCount, revenue }) => ({
        id: country,
        label: country,
        value: revenue,
        detail: `${formatCount(orderCount)} ${pluralize(orderCount, 'order')}`,
      }))}
    />
  );
}
