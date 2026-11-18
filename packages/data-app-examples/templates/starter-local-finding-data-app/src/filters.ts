import {
  choiceFilter,
  dateTimeRangeFilter,
  displayChoice,
} from '@altertable/data-app/contract';
import { formatDateRange } from '@altertable/data-app/format';

const findingPeriod = {
  from: new Date('2026-03-09T00:00:00Z'),
  to: new Date('2026-03-16T00:00:00Z'),
};
export function periodLabel(range: { from: Date; to: Date }) {
  return formatDateRange({
    start: range.from.toISOString().slice(0, 10),
    end: new Date(range.to.getTime() - 1).toISOString().slice(0, 10),
  });
}
export const findingPeriodLabel = periodLabel(findingPeriod);
export const periodFilter = dateTimeRangeFilter({
  key: 'period',
  defaultValue: findingPeriod,
  comparison: 'on',
  minDate: '2026-01-05',
  maxDate: '2026-03-29',
  maxRangeDays: 28,
  presets: [{ label: 'Finding period', range: findingPeriod }],
});
export const groupName = choiceFilter({
  key: 'group',
  label: 'Group',
  defaultValue: 'Alpha',
  options: [
    { id: 'all', label: 'All groups' },
    { id: 'Alpha', label: 'Alpha' },
    { id: 'Beta', label: 'Beta' },
  ],
});
export const grain = displayChoice({
  key: 'grain',
  label: 'Grain',
  defaultValue: 'day',
  options: [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
  ],
  presentation: { control: 'widget' },
});
export const breakdown = displayChoice({
  key: 'breakdown',
  label: 'Breakdown',
  defaultValue: 'segment',
  options: [
    { id: 'segment', label: 'Segment' },
    { id: 'group', label: 'Group' },
  ],
  presentation: { control: 'widget' },
});

export const operationFilters = {
  sampleTotals: { period: periodFilter, groupName },
  samplesOverTime: { period: periodFilter, groupName, grain },
  samplesByMember: { period: periodFilter, groupName, breakdown },
  sampleRows: { period: periodFilter, groupName, grain, breakdown },
};
