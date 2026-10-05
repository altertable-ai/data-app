import { fromDate, getDayOfWeek } from '@internationalized/date';
import { invariant } from '@/src/core/invariant';
import {
  parseVariableValue,
  type AbsoluteOrRelativeDateTime,
  type QueryVariableBindings,
  type QueryVariableDefinitions,
  type QueryVariableBinding,
} from '@/src/core/query-variables';

type Placeholder = {
  name: string;
  helper?: 'equals' | 'not_equals' | 'between';
  column?: string;
  quoted: boolean;
};
const identifier = '[A-Za-z_][A-Za-z0-9_]*';
const column = `(?:${identifier}|"(?:[^"]|"")+")(?:\\.(?:${identifier}|"(?:[^"]|"")+"))*`;

/** Only placeholders in SQL code are expanded. A quoted INTERVAL placeholder is the platform's date_trunc form. */
function transform(
  statement: string,
  replace: (placeholder: Placeholder) => string
): string {
  invariant(
    typeof statement === 'string' && !!statement.trim(),
    'Expected a SQL statement.'
  );
  let output = '';
  let i = 0;
  while (i < statement.length) {
    const rest = statement.slice(i);
    if (rest.startsWith('--')) {
      const end = statement.indexOf('\n', i);
      output += statement.slice(i, end < 0 ? statement.length : end);
      i = end < 0 ? statement.length : end;
    } else if (rest.startsWith('/*')) {
      let depth = 1;
      let end = i + 2;
      while (end < statement.length && depth) {
        if (statement.startsWith('/*', end)) {
          depth++;
          end += 2;
        } else if (statement.startsWith('*/', end)) {
          depth--;
          end += 2;
        } else end++;
      }
      invariant(depth === 0, 'Unterminated SQL comment.');
      output += statement.slice(i, end);
      i = end;
    } else if (rest.startsWith('{{')) {
      const end = statement.indexOf('}}', i + 2);
      invariant(end >= 0, 'Unterminated SQL variable.');
      const expression = statement.slice(i + 2, end).trim();
      const simple = new RegExp(`^${identifier}$`).test(expression);
      const helper = expression.match(
        new RegExp(
          `^(equals|not_equals|between)\\(\\s*(${column})\\s*,\\s*(${identifier})\\s*\\)$`,
          'i'
        )
      );
      invariant(simple || helper, 'Invalid SQL variable or helper.');
      output += replace(
        simple
          ? { name: expression, quoted: false }
          : {
              name: helper![3]!,
              helper: helper![1]!.toLowerCase() as Placeholder['helper'],
              column: helper![2],
              quoted: false,
            }
      );
      i = end + 2;
    } else if (
      rest[0] === "'" ||
      rest[0] === '"' ||
      /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.test(rest)
    ) {
      const quote =
        rest.match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/)?.[0] ?? rest[0]!;
      let end = i + quote.length;
      while (end < statement.length) {
        if (statement.startsWith(quote, end)) {
          if (quote.length === 1 && statement.startsWith(quote + quote, end)) {
            end += 2;
            continue;
          }
          break;
        }
        // Escape strings have dialect-specific semantics; templates do not support them.
        if (statement[end] === '\\' && quote === "'")
          throw new Error('Use standard SQL strings in templates.');
        end++;
      }
      invariant(
        end < statement.length,
        'Unterminated SQL string or identifier.'
      );
      const contents = statement.slice(i + quote.length, end);
      const interval =
        quote === "'" &&
        contents.match(new RegExp(`^\\{\\{\\s*(${identifier})\\s*\\}\\}$`));
      if (interval)
        output += `'${replace({ name: interval[1]!, quoted: true })}'`;
      else {
        invariant(
          !contents.includes('{{'),
          'SQL variables must be outside quotes, except INTERVAL.'
        );
        output += statement.slice(i, end + quote.length);
      }
      i = end + quote.length;
    } else {
      output += statement[i];
      i++;
    }
  }
  return output;
}

export function queryVariableNames(
  statement: string,
  definitions: QueryVariableDefinitions
): string[] {
  const names = new Set<string>();
  transform(statement, placeholder => {
    invariant(
      definitions.some(definition => definition.name === placeholder.name),
      `Undefined variable: ${placeholder.name}.`
    );
    const type = definitions.find(
      definition => definition.name === placeholder.name
    )!.type;
    invariant(
      !placeholder.quoted || type === 'INTERVAL',
      'Only INTERVAL placeholders may be quoted.'
    );
    invariant(
      placeholder.helper !== 'between' || type === 'DATETIMERANGE',
      'between() requires DATETIMERANGE.'
    );
    invariant(
      !['equals', 'not_equals'].includes(placeholder.helper ?? '') ||
        type !== 'DATETIMERANGE',
      'Use between() for DATETIMERANGE.'
    );
    names.add(placeholder.name);
    return '';
  });
  return [...names];
}

/** Resolve all relative values against one clock, with Monday as the platform's start of week. */
export function resolveVariableDateTime(
  value: AbsoluteOrRelativeDateTime,
  { now = new Date(), timeZone = 'UTC' }: { now?: Date; timeZone?: string } = {}
): Date {
  if (value instanceof Date) return value;
  let date = fromDate(now, timeZone);
  if (value.anchor !== 'RELATIVE_ANCHOR_NOW')
    date = date.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
  switch (value.anchor) {
    case 'RELATIVE_ANCHOR_START_OF_YESTERDAY':
      date = date.subtract({ days: 1 });
      break;
    case 'RELATIVE_ANCHOR_START_OF_TOMORROW':
      date = date.add({ days: 1 });
      break;
    case 'RELATIVE_ANCHOR_START_OF_WEEK':
      date = date.subtract({ days: getDayOfWeek(date, 'en-GB') });
      break;
    case 'RELATIVE_ANCHOR_START_OF_MONTH':
      date = date.set({ day: 1 });
      break;
    case 'RELATIVE_ANCHOR_START_OF_YEAR':
      date = date.set({ month: 1, day: 1 });
      break;
  }
  for (const { amount, unit } of value.offset) {
    const key = {
      SECOND: 'seconds',
      MINUTE: 'minutes',
      HOUR: 'hours',
      DAY: 'days',
      WEEK: 'weeks',
      MONTH: 'months',
      YEAR: 'years',
    }[unit];
    date = date.add({ [key]: amount });
  }
  const resolved = date.toDate();
  invariant(
    Number.isFinite(resolved.getTime()),
    'Date is outside the supported range.'
  );
  return resolved;
}

/** DuckDB SQL construction for local/server adapters. Hosted iframes send IDs and values instead. */
export function buildQueryStatement(
  statement: string,
  bindings: QueryVariableBindings,
  { now = new Date(), timeZone = 'UTC' }: { now?: Date; timeZone?: string } = {}
): string {
  const definitions = Object.entries(bindings).map(([name, binding]) => ({
    name,
    type: binding.type,
    nullable: binding.value === null,
    default: binding.value,
  })) as QueryVariableDefinitions;
  queryVariableNames(statement, definitions);
  function literal(value: string) {
    return `'${value.replaceAll("'", "''")}'`;
  }
  function timestamp(value: AbsoluteOrRelativeDateTime) {
    return literal(
      resolveVariableDateTime(value, { now, timeZone }).toISOString()
    );
  }
  function sql(binding: QueryVariableBinding): string {
    if (binding.value === null) return 'NULL';
    const value = parseVariableValue(binding.type, binding.value);
    binding = { ...binding, value } as QueryVariableBinding;
    if (binding.value === null) return 'NULL';
    switch (binding.type) {
      case 'STRING':
        return literal(value as string);
      case 'INTEGER':
      case 'FLOAT':
        return String(binding.value);
      case 'BOOLEAN':
        return value ? 'TRUE' : 'FALSE';
      case 'INTERVAL':
        return (
          {
            HOURLY: 'hour',
            DAILY: 'day',
            WEEKLY: 'week',
            MONTHLY: 'month',
            QUARTERLY: 'quarter',
            YEARLY: 'year',
          } as const
        )[binding.value];
      case 'DURATION':
        return `INTERVAL ${binding.value.amount} ${binding.value.unit}`;
      case 'DATETIME':
        return timestamp(binding.value);
      case 'DATETIMERANGE':
        return `${timestamp(binding.value.from ?? new Date(0))} AND ${timestamp(binding.value.to ?? now)}`;
    }
  }
  return transform(statement, ({ name, helper, column: field, quoted }) => {
    const binding = bindings[name]!;
    if (quoted) {
      invariant(binding.value !== null, 'Quoted INTERVAL cannot be null.');
      return sql(binding);
    }
    if (!helper) return sql(binding);
    if (helper === 'between') {
      invariant(
        binding.type === 'DATETIMERANGE',
        'between() requires DATETIMERANGE.'
      );
      const range =
        binding.value === null
          ? null
          : parseVariableValue('DATETIMERANGE', binding.value);
      if (!range || (!range.from && !range.to)) return `${field} IS NULL`;
      if (!range.from) return `${field} < ${timestamp(range.to!)}`;
      if (!range.to) return `${field} > ${timestamp(range.from)}`;
      return `${field} BETWEEN ${timestamp(range.from)} AND ${timestamp(range.to)}`;
    }
    if (binding.value === null)
      return `${field} IS ${helper === 'equals' ? '' : 'NOT '}NULL`;
    return `${field} ${helper === 'equals' ? '=' : '!='} ${sql(binding)}`;
  });
}
