import {
  formatCount,
  formatMetric,
  formatPercent,
} from '@altertable/data-app/format';
import { chartColor, Ranking } from '@altertable/data-app/react';
import type { CountryRevenue, OrderDay, OrderBand } from '@/dev/orders';

const currency = { kind: 'currency', currency: 'USD' } as const;
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Inline SVG needs an image role and accessible name. */
export function DailyLineChart({ days }: { days: readonly OrderDay[] }) {
  const width = 400;
  const height = 160;
  const paddingTop = 18;
  const paddingBottom = 22;
  const counts = days.map(day => day.orderCount);
  const max = Math.max(1, ...counts);
  const peakIndex = counts.indexOf(Math.max(...counts));
  function x(index: number) {
    return days.length > 1 ? (index / (days.length - 1)) * width : width / 2;
  }
  function y(count: number) {
    return (
      paddingTop + (1 - count / max) * (height - paddingTop - paddingBottom)
    );
  }
  const points = days
    .map((day, index) => `${x(index)},${y(day.orderCount)}`)
    .join(' ');
  const color = chartColor('orders');
  const first = days[0]?.day ?? '';
  const last = days.at(-1)?.day ?? '';
  const peak = days[peakIndex];
  const edgeTextAnchors: Record<number, 'start' | 'end'> = {
    [days.length - 1]: 'end',
    0: 'start',
  };
  const peakTextAnchor = edgeTextAnchors[peakIndex] ?? 'middle';
  return (
    <svg
      role="img"
      aria-label={`${formatCount(days.reduce((total, day) => total + day.orderCount, 0))} orders from ${first} to ${last}, peaking at ${formatCount(peak?.orderCount)} on ${peak?.day}.`}
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', height: 'auto', overflow: 'visible' }}
    >
      <line x1={0} x2={width} y1={y(0)} y2={y(0)} stroke="var(--atbl-border)" />
      <polygon
        points={`0,${y(0)} ${points} ${width},${y(0)}`}
        fill={color}
        opacity={0.15}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {peak && (
        <text
          x={x(peakIndex)}
          y={y(peak.orderCount) - 6}
          textAnchor={peakTextAnchor}
          fill="currentColor"
          fontSize={12}
        >
          {formatCount(peak.orderCount)}
        </text>
      )}
      <text x={0} y={height - 4} fill="var(--atbl-muted)" fontSize={11}>
        {first}
      </text>
      <text
        x={width}
        y={height - 4}
        textAnchor="end"
        fill="var(--atbl-muted)"
        fontSize={11}
      >
        {last}
      </text>
    </svg>
  );
}

function sliceColor(index: number) {
  return `var(--atbl-chart-${index + 1}, var(--atbl-accent))`;
}
function piePoint(angle: number) {
  return `${50 + 50 * Math.sin(angle)},${50 - 50 * Math.cos(angle)}`;
}
export function OrderValuePieChart({ bands }: { bands: readonly OrderBand[] }) {
  const total = bands.reduce((total, band) => total + band.orderCount, 0);
  let startAngle = 0;
  const slices: { band: OrderBand; start: number; end: number }[] = [];
  for (const band of bands) {
    const endAngle = startAngle + (band.orderCount / total) * 2 * Math.PI;
    slices.push({ band, start: startAngle, end: endAngle });
    startAngle = endAngle;
  }
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <svg
        role="img"
        aria-label={bands
          .map(
            band => `${band.band}: ${formatPercent(band.orderCount / total)}`
          )
          .join(', ')}
        viewBox="0 0 100 100"
        style={{ width: 140, height: 140, flex: 'none' }}
      >
        {slices.map(({ band, start, end }, index) =>
          bands.length === 1 ? (
            <circle
              key={band.band}
              cx={50}
              cy={50}
              r={50}
              fill={sliceColor(index)}
            />
          ) : (
            <path
              key={band.band}
              d={`M50,50 L${piePoint(start)} A50,50 0 ${end - start > Math.PI ? 1 : 0} 1 ${piePoint(end)} Z`}
              fill={sliceColor(index)}
              stroke="var(--atbl-surface)"
              strokeWidth={1}
            />
          )
        )}
      </svg>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          gap: 6,
          flex: '1 1 160px',
        }}
      >
        {slices.map(({ band }, index) => (
          <li
            key={band.band}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                flex: 'none',
                background: sliceColor(index),
              }}
            />
            <span style={{ flex: 1 }}>{band.band}</span>
            <span style={{ color: 'var(--atbl-muted)' }}>
              {formatCount(band.orderCount)} ·{' '}
              {formatPercent(band.orderCount / total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CountryRanking({
  countries,
}: {
  countries: readonly CountryRevenue[];
}) {
  return (
    <Ranking
      aria-label="Revenue by country"
      formatValue={value => formatMetric(value, currency)}
      items={countries.map(({ country, orderCount, revenue }) => ({
        id: country,
        label: country,
        value: revenue,
        detail: `${orderCount} orders`,
      }))}
    />
  );
}
