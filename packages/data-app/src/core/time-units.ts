import type { RelativeUnit } from './date-time-range.ts';

const second = 1_000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;

/** Fixed durations in UTC-rebased arithmetic; months and years are calendar-dependent. */
export const fixedUnitMilliseconds: Partial<Record<RelativeUnit, number>> &
  Record<'SECOND' | 'MINUTE' | 'HOUR' | 'DAY' | 'WEEK', number> = {
  SECOND: second,
  MINUTE: minute,
  HOUR: hour,
  DAY: day,
  WEEK: 7 * day,
};
