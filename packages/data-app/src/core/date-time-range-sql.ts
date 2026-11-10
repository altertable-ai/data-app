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
function boundExpression(parameter: string, bound: 'from' | 'to'): string {
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

/** Calendar ranges bind inclusive ISO dates; their bounds become the same half-open
 * timestamps as datetime ranges: the start day's midnight through the day after the end. */
function dateBoundExpression(parameter: string, bound: 'from' | 'to'): string {
  const field = bound === 'from' ? 'start' : 'end';
  const day = `CAST(json_extract_string($${parameter}, '$.${field}') AS DATE)`;
  return bound === 'from'
    ? `CAST(${day} AS TIMESTAMP)`
    : `CAST(${day} + INTERVAL '1 day' AS TIMESTAMP)`;
}

export type RangeParameterKind = 'dateTimeRange' | 'dateRange';

/** Expand `$name.from` and `$name.to` for range parameters only in SQL code, leaving
 * quoted text and comments untouched. */
export function expandRangeParameters(
  statement: string,
  ranges: ReadonlyMap<string, RangeParameterKind>
): string {
  // SQL strings/identifiers, dollar-quoted strings, and comments are opaque to expansion.
  const token =
    /[eE]'(?:\\.|''|[^'\\])*'|'(?:''|[^'])*'|"(?:""|[^"])*"|\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$|--[^\n]*(?:\n|$)|\/\*|\$([A-Za-z_][A-Za-z0-9_]*)(?:\.(from|to)\b)?/g;
  let output = '';
  let position = 0;
  for (
    let match = token.exec(statement);
    match;
    match = token.exec(statement)
  ) {
    output += statement.slice(position, match.index);
    const text = match[0];
    if (text === '/*') {
      let depth = 1;
      let end = token.lastIndex;
      while (depth && end < statement.length) {
        if (statement.slice(end, end + 2) === '/*') {
          depth++;
          end += 2;
        } else if (statement.slice(end, end + 2) === '*/') {
          depth--;
          end += 2;
        } else end++;
      }
      output += statement.slice(match.index, end);
      token.lastIndex = end;
    } else if (/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$$/.test(text)) {
      const closing = statement.indexOf(text, token.lastIndex);
      const end = closing < 0 ? statement.length : closing + text.length;
      output += statement.slice(match.index, end);
      token.lastIndex = end;
    } else if (match[1] && ranges.has(match[1]) && match[2]) {
      const bound = match[2] as 'from' | 'to';
      output +=
        ranges.get(match[1]) === 'dateRange'
          ? dateBoundExpression(match[1], bound)
          : boundExpression(match[1], bound);
    } else output += text;
    position = token.lastIndex;
  }
  return output + statement.slice(position);
}
