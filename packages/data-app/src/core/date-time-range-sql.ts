import { serializeDateTimeRange } from './date-time-range-value.ts';
import type { DateTimeRange } from './date-time-range.ts';
import { invariant } from './invariant.ts';

/** DuckDB timestamp expressions using the query session's timezone for relative anchors.
 * Absolute fields remain UTC-rebased TIMESTAMP values. Start is inclusive, end exclusive.
 */
export function dateTimeRangeSql(
  range: DateTimeRange,
  parameter = 'period'
): { from: string; to: string; params: Record<string, string> } {
  invariant(
    /^[A-Za-z_][A-Za-z0-9_]*$/.test(parameter),
    'Use a SQL parameter name.'
  );
  return {
    from: boundExpression(parameter, 'from'),
    to: boundExpression(parameter, 'to'),
    params: { [parameter]: serializeDateTimeRange(range) },
  };
}
export function boundExpression(
  parameter: string,
  bound: 'from' | 'to'
): string {
  const json = `$${parameter}`;
  const path = `$.${bound}`;
  const anchor = `json_extract_string(${json}, '${path}.anchor')`;
  const base = `CASE WHEN json_type(${json}, '${path}') = 'VARCHAR' THEN CAST(json_extract_string(${json}, '${path}') AS TIMESTAMP)
    WHEN ${anchor} = 'RELATIVE_ANCHOR_START_OF_TODAY' THEN date_trunc('day', localtimestamp)
    WHEN ${anchor} = 'RELATIVE_ANCHOR_START_OF_YESTERDAY' THEN date_trunc('day', localtimestamp) - INTERVAL '1 day'
    WHEN ${anchor} = 'RELATIVE_ANCHOR_START_OF_TOMORROW' THEN date_trunc('day', localtimestamp) + INTERVAL '1 day'
    WHEN ${anchor} = 'RELATIVE_ANCHOR_START_OF_WEEK' THEN date_trunc('week', localtimestamp)
    WHEN ${anchor} = 'RELATIVE_ANCHOR_START_OF_MONTH' THEN date_trunc('month', localtimestamp)
    WHEN ${anchor} = 'RELATIVE_ANCHOR_START_OF_YEAR' THEN date_trunc('year', localtimestamp)
    WHEN ${anchor} = 'RELATIVE_ANCHOR_NOW' THEN localtimestamp
    ELSE ${bound === 'from' ? "TIMESTAMP '-infinity'" : 'localtimestamp'} END`;
  const item = `json_extract(${json}, '${path}.offset[' || i::VARCHAR || ']')`;
  const amount = `CAST(json_extract_string(${item}, '$.amount') AS INTEGER)`;
  const interval = `CASE json_extract_string(${item}, '$.unit') ${['SECOND', 'MINUTE', 'HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'].map(unit => `WHEN '${unit}' THEN ${amount} * INTERVAL '1 ${unit}'`).join(' ')} ELSE INTERVAL '0 seconds' END`;
  return `(WITH RECURSIVE bounds(i, value) AS (
    SELECT 0, ${base}
    UNION ALL SELECT i + 1, value + ${interval} FROM bounds
    WHERE i < COALESCE(json_array_length(${json}, '${path}.offset'), 0)
  ) SELECT value FROM bounds ORDER BY i DESC LIMIT 1)`;
}
