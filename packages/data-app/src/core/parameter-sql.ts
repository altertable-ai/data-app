/** Find SDK-only parameter syntax in SQL code, ignoring strings and comments. */
export function unsupportedParameterReference(
  statement: string
): string | null {
  const token =
    /[eE]'(?:\\.|''|[^'\\])*'|'(?:''|[^'])*'|"(?:""|[^"])*"|\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$|--[^\n]*(?:\n|$)|\/\*|\$([A-Za-z_][A-Za-z0-9_]*)(?:\.(from|to)\b|\.matches\(\s*([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)\s*\))?/g;
  for (
    let match = token.exec(statement);
    match;
    match = token.exec(statement)
  ) {
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
      token.lastIndex = end;
    } else if (/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$$/.test(text)) {
      const closing = statement.indexOf(text, token.lastIndex);
      token.lastIndex = closing < 0 ? statement.length : closing + text.length;
    } else if (match[1] && (match[2] || match[3])) return text;
  }
  return null;
}
