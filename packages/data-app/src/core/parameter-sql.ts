import { boundExpression } from './date-time-range-sql.ts';

/** Parameters whose SQL references expand to expressions over their bound JSON value. */
export type StructuredParameter =
  | { type: 'dateTimeRange' }
  | { type: 'dimension'; valueType: 'string' | 'number' };

/** True for rows the selection keeps. Excluding values keeps missing values unless
 * missing itself is excluded, matching the picker's semantics. */
function selectionExpression(
  parameter: string,
  valueType: 'string' | 'number',
  column: string
): string {
  const json = `$${parameter}`;
  const values = `CAST(json_extract(${json}, '$.values') AS ${valueType === 'number' ? 'DOUBLE' : 'VARCHAR'}[])`;
  const missing = `CAST(json_extract(${json}, '$.missing') AS BOOLEAN)`;
  const listed = `list_contains(${values}, ${column})`;
  return `(CASE json_extract_string(${json}, '$.kind')
    WHEN 'all' THEN TRUE
    WHEN 'include' THEN CASE WHEN ${column} IS NULL THEN ${missing} ELSE ${listed} END
    WHEN 'exclude' THEN CASE WHEN ${column} IS NULL THEN NOT ${missing} ELSE NOT ${listed} END
  END)`;
}

/** Expand `$period.from`, `$period.to`, and `$country.matches(column)` references only
 * in SQL code, leaving quoted text and comments untouched. */
export function expandParameterReferences(
  statement: string,
  parameters: ReadonlyMap<string, StructuredParameter>
): string {
  // SQL strings/identifiers, dollar-quoted strings, and comments are opaque to expansion.
  const token =
    /[eE]'(?:\\.|''|[^'\\])*'|'(?:''|[^'])*'|"(?:""|[^"])*"|\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$|--[^\n]*(?:\n|$)|\/\*|\$([A-Za-z_][A-Za-z0-9_]*)(?:\.(from|to)\b|\.matches\(\s*([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)\s*\))?/g;
  let output = '';
  let position = 0;
  for (
    let match = token.exec(statement);
    match;
    match = token.exec(statement)
  ) {
    output += statement.slice(position, match.index);
    const text = match[0];
    const parameter = match[1] ? parameters.get(match[1]) : undefined;
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
    } else if (parameter?.type === 'dateTimeRange' && match[2]) {
      output += boundExpression(match[1]!, match[2] as 'from' | 'to');
    } else if (parameter?.type === 'dimension' && match[3]) {
      output += selectionExpression(match[1]!, parameter.valueType, match[3]);
    } else output += text;
    position = token.lastIndex;
  }
  return output + statement.slice(position);
}
