import {
  dateTimeRangeFilter,
  defineDateRangeContract,
  displayChoice,
} from '@altertable/data-app/contract';

// Declare each filter once in this browser-safe module: operations read them on
// the server, and the browser client renders their controls.
const calendar = defineDateRangeContract({
  minDate: '2026-01-05',
  maxDate: '2026-03-29',
  maxRangeDays: 28,
  timeZone: 'UTC',
});
const findingPeriod = {
  from: new Date('2026-03-09T00:00:00Z'),
  to: new Date('2026-03-16T00:00:00Z'),
};
const period = dateTimeRangeFilter({
  key: 'period',
  contract: calendar,
  allowComparison: true,
  defaultValue: findingPeriod,
  presets: [{ label: 'Finding period', range: findingPeriod }],
});
const grain = displayChoice({
  key: 'grain',
  label: 'Grain',
  defaultValue: 'day',
  options: [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
  ],
  presentation: { control: 'widget' },
});
const breakdown = displayChoice({
  key: 'breakdown',
  label: 'Breakdown',
  defaultValue: 'segment',
  options: [
    { id: 'segment', label: 'Segment' },
    { id: 'group', label: 'Group' },
  ],
  presentation: { control: 'widget' },
});

/** The filters each operation reads. */
export const operationFilters = {
  sampleTotal: { period },
  samplesOverTime: { period, grain },
  samplesByMember: { period, breakdown },
  sampleRows: { period, grain, breakdown },
};
