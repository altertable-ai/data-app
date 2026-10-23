/** Failures observed during the checks and interactions actually exercised. */
export type AppFailure = {
  /** Mounted widget identity when multiple widgets share a label. */
  id?: string;
  kind: 'query' | 'operation' | 'render';
  name: string;
  message: string;
  /** Sanitized filename and one-based line/column. Source contents are never included. */
  source?: { file: string; line: number; column: number };
};
export type AppDiagnosticReport = {
  /** Current observed failures, limited to 30 entries. */
  failures: AppFailure[];
  /** Observed checks that have not finished. */
  pending: number;
  /** Failures omitted from this report's bounded failure list. */
  truncated: number;
};

/** Omit query values, URL parameters and common credential forms from error text. */
function diagnosticText(value: string, limit = 800) {
  const text = value
    .replace(/https?:\/\/[^\s)]+/g, url => {
      try {
        const parsed = new URL(url);
        return `${parsed.origin}${parsed.pathname}`;
      } catch {
        return '[url]';
      }
    })
    .replace(
      /\b((?:set-cookie|cookie|(?:x-)?api[-_]?key)\s*[:=]\s*)[^\r\n]*/gi,
      '$1[redacted]'
    )
    .replace(
      /\b((?:proxy-)?authorization\s*[:=]\s*)(?:(?:bearer|basic)\s+)?(?:"[^"\n]*"|'[^'\n]*'|[^\s,;]+)/gi,
      '$1[redacted]'
    )
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(
      /\b(bearer\s+|(?:password|token|secret)\s*[:=]\s*)(?:"[^"\n]*"|'[^'\n]*'|[^\s,;]+)/gi,
      '$1[redacted]'
    )
    .replace(/\b[\w.-]+\s*=\s*[^\s,;]+/g, '[parameter]')
    .replace(/(['"`])[^\n]*?\1/g, '[value]');
  return text.length > limit ? `${text.slice(0, limit)}… [truncated]` : text;
}

export function appFailure(
  kind: AppFailure['kind'],
  name: string,
  error: unknown
): AppFailure {
  const source =
    error instanceof Error ? sourceLocation(error.stack) : undefined;

  return {
    kind,
    name: diagnosticText(name, 120),
    message: diagnosticText(
      error instanceof Error ? error.message : 'Unknown failure'
    ),
    ...(source ? { source } : {}),
  };
}

const MAX_STACK_LENGTH = 16_384;

/** Extract one location, excluding stack text, URL parameters and local directory paths. */
function sourceLocation(stack?: string): AppFailure['source'] {
  // Inspect a bounded stack prefix; malformed frame tokens must not cause backtracking.
  const frames = stack?.slice(0, MAX_STACK_LENGTH).split('\n').slice(1) ?? [];
  if (stack && stack.length > MAX_STACK_LENGTH) frames.pop();
  for (const frame of frames) {
    for (const token of frame.split(/[\s()]+/)) {
      const columnSeparator = token.lastIndexOf(':');
      const lineSeparator = token.lastIndexOf(':', columnSeparator - 1);
      if (lineSeparator < 1 || columnSeparator <= lineSeparator) continue;
      const lineText = token.slice(lineSeparator + 1, columnSeparator);
      const columnText = token.slice(columnSeparator + 1);
      if (!/^\d+$/.test(lineText) || !/^\d+$/.test(columnText)) continue;
      const line = Number(lineText);
      const column = Number(columnText);
      if (
        !Number.isSafeInteger(line) ||
        line < 1 ||
        !Number.isSafeInteger(column) ||
        column < 1
      )
        continue;
      const file = token.slice(0, lineSeparator).split(/[/\\]/).at(-1)!;

      return { file: diagnosticText(file, 200), line, column };
    }
  }

  return undefined;
}
function parseSource(value: unknown): AppFailure['source'] {
  if (!value || typeof value !== 'object')
    throw new Error('Invalid source location');
  const source = value as NonNullable<AppFailure['source']>;
  if (
    typeof source.file !== 'string' ||
    !Number.isSafeInteger(source.line) ||
    source.line < 1 ||
    !Number.isSafeInteger(source.column) ||
    source.column < 1
  )
    throw new Error('Invalid source location');
  return {
    file: diagnosticText(
      source.file.split(/[?#]/, 1)[0]!.split(/[/\\]/).at(-1)!,
      200
    ),
    line: source.line,
    column: source.column,
  };
}

/** Validate and project iframe reports. Unknown fields (including query inputs) never cross this boundary. */
export function parseAppDiagnosticReport(value: unknown): AppDiagnosticReport {
  if (!value || typeof value !== 'object')
    throw new Error('Invalid diagnostic report');
  const report = value as AppDiagnosticReport;
  if (
    !Array.isArray(report.failures) ||
    report.failures.length > 30 ||
    !Number.isSafeInteger(report.pending) ||
    report.pending < 0 ||
    !Number.isSafeInteger(report.truncated) ||
    report.truncated < 0
  )
    throw new Error('Invalid diagnostic report');
  return {
    failures: report.failures.map(failure => {
      if (
        !failure ||
        !['query', 'operation', 'render'].includes(failure.kind) ||
        typeof failure.name !== 'string' ||
        typeof failure.message !== 'string'
      )
        throw new Error('Invalid diagnostic failure');
      return {
        kind: failure.kind,
        ...(typeof failure.id === 'string'
          ? { id: diagnosticText(failure.id, 120) }
          : {}),
        name: diagnosticText(failure.name, 120),
        message: diagnosticText(failure.message),
        ...(failure.source ? { source: parseSource(failure.source) } : {}),
      };
    }),
    pending: report.pending,
    truncated: report.truncated,
  };
}
