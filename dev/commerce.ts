import { defineDateRangeContract } from '@altertable/data-app/contract';

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

export const countries = [
  { value: 'AT', label: 'Austria' },
  { value: 'FI', label: 'Finland' },
  { value: 'FR', label: 'France' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
];
