import type { QueryParameters, QueryParameterValue } from '@/src/core/queries';
import { invariant } from '@/src/core/invariant';

/** The HTTP query endpoint accepts SQL, so encode scalar values at this transport boundary. */
export function resolveHttpQuery(
  statement: string,
  params: QueryParameters = {}
): string {
  let result = '';
  let index = 0;
  while (index < statement.length) {
    const start = index;
    const char = statement[index]!;
    if (char === "'" || char === '"') {
      const escaped =
        char === "'" &&
        /[eE]/.test(statement[index - 1] ?? '') &&
        !/[A-Za-z_0-9$\u0080-\uFFFF]/.test(statement[index - 2] ?? '');
      index = quotedEnd(statement, index, char, escaped);
    } else if (statement.startsWith('--', index)) {
      const end = statement.slice(index + 2).search(/[\r\n]/);
      index = end === -1 ? statement.length : index + 2 + end;
    } else if (statement.startsWith('/*', index)) {
      index += 2;
      let depth = 1;
      while (index < statement.length && depth > 0) {
        if (statement.startsWith('/*', index)) {
          depth++;
          index += 2;
        } else if (statement.startsWith('*/', index)) {
          depth--;
          index += 2;
        } else index++;
      }
    } else if (
      char === '$' &&
      !/[A-Za-z_0-9$\u0080-\uFFFF]/.test(statement[index - 1] ?? '')
    ) {
      const rest = statement.slice(index);
      const delimiter = rest.match(
        /^\$(?:[A-Za-z_\u0080-\uFFFF][A-Za-z_0-9\u0080-\uFFFF]*)?\$/
      )?.[0];
      if (delimiter) {
        const end = statement.indexOf(delimiter, index + delimiter.length);
        index = end === -1 ? statement.length : end + delimiter.length;
      } else {
        const parameter = rest.match(
          /^\$([A-Za-z_\u0080-\uFFFF][A-Za-z_0-9\u0080-\uFFFF]*|[0-9]+)/
        );
        if (parameter) {
          const name = parameter[1]!;
          invariant(
            Object.hasOwn(params, name),
            `Missing query parameter ${name}.`
          );
          result += sqlValue(params[name]!);
          index += parameter[0].length;
          continue;
        }
        index++;
      }
    } else index++;
    result += statement.slice(start, index);
  }
  return result;
}

function quotedEnd(
  statement: string,
  start: number,
  quote: string,
  escaped: boolean
): number {
  let index = start + 1;
  while (index < statement.length) {
    if (escaped && statement[index] === '\\') index += 2;
    else if (statement[index] === quote) {
      index++;
      if (statement[index] === quote) index++;
      else {
        const continuation =
          quote === "'" ? continuedStringStart(statement, index) : undefined;
        if (continuation === undefined) return index;
        index = continuation;
      }
    } else index++;
  }
  return statement.length;
}

/** Newline-separated string segments retain the first segment's escape mode. */
function continuedStringStart(
  statement: string,
  start: number
): number | undefined {
  let index = start;
  let newline = false;
  while (index < statement.length) {
    const char = statement[index]!;
    if (/[ \t\r\n\f]/.test(char)) {
      newline ||= char === '\r' || char === '\n';
      index++;
    } else if (statement.startsWith('--', index)) {
      const end = statement.slice(index + 2).search(/[\r\n]/);
      if (end === -1) return undefined;
      index += 2 + end;
    } else break;
  }
  return newline && statement[index] === "'" ? index + 1 : undefined;
}

function sqlValue(value: QueryParameterValue): string {
  if (value === null) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') {
    invariant(Number.isFinite(value), 'Query parameter must be finite.');
    return value < 0 ? `(${value})` : String(value);
  }
  invariant(
    typeof value === 'string' && !value.includes('\0'),
    'Invalid query parameter string.'
  );
  return `'${value.replaceAll("'", "''")}'`;
}
