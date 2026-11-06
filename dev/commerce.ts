import {
  dateTimeRangeVariable,
  defineDateRangeContract,
} from '@altertable/data-app/contract';
import { availableDatePresets } from '@altertable/data-app/internal';

// Six months of complete UTC days, matching the seed's UTC bounds.
const latest = new Date();
latest.setUTCDate(latest.getUTCDate() - 1);
const earliest = new Date(latest);
earliest.setUTCDate(earliest.getUTCDate() - 179);
export const calendar = defineDateRangeContract({
  minDate: earliest.toISOString().slice(0, 10),
  maxDate: latest.toISOString().slice(0, 10),
  maxRangeDays: 90,
  timeZone: 'UTC',
});

const presets = availableDatePresets(calendar.bounds()).map(preset => ({
  label: preset.label,
  shortcut: preset.id.startsWith('last-') ? `${preset.id.slice(5)}d` : '-',
  range: {
    from: new Date(`${preset.range.start}T00:00:00Z`),
    to: new Date(
      new Date(`${preset.range.end}T00:00:00Z`).getTime() + 86_400_000
    ),
  },
}));
const last30 = presets.find(preset => preset.shortcut === '30d');
export const period = dateTimeRangeVariable({
  key: 'period',
  contract: calendar,
  allowComparison: true,
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
