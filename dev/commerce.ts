import { dateTimeRangeFilter } from '@altertable/data-app/contract';

// Six months of complete UTC days, matching the seed's UTC bounds.
const latest = new Date();
latest.setUTCDate(latest.getUTCDate() - 1);
const earliest = new Date(latest);
earliest.setUTCDate(earliest.getUTCDate() - 179);
const latestMidnight = new Date(
  `${latest.toISOString().slice(0, 10)}T00:00:00Z`
);
const presets = [1, 3, 7, 14, 30, 90].map(days => ({
  label: days === 1 ? 'Yesterday' : `Last ${days} complete days`,
  shortcut: days === 1 ? '-' : `${days}d`,
  range: {
    from: new Date(latestMidnight.getTime() - (days - 1) * 86_400_000),
    to: new Date(latestMidnight.getTime() + 86_400_000),
  },
}));
const last30 = presets.find(preset => preset.shortcut === '30d');
export const period = dateTimeRangeFilter({
  key: 'period',
  minDate: earliest.toISOString().slice(0, 10),
  maxDate: latest.toISOString().slice(0, 10),
  maxRangeDays: 90,
  comparison: 'off',
  presets,
  defaultValue: last30?.range ?? presets[0]!.range,
});

export const countries = [
  { value: 'AT', label: 'Austria' },
  { value: 'FI', label: 'Finland' },
  { value: 'FR', label: 'France' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
];
