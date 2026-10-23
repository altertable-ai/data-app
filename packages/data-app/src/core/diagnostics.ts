/** Failures observed during the checks and interactions actually exercised. */
export type AppFailure = {
  /** Mounted widget identity when multiple widgets share a label. */
  id?: string;
  kind: 'query' | 'operation' | 'render';
  name: string;
  message: string;
  source?: { file: string; line: number; column: number };
};
export type AppDiagnosticReport = {
  failures: AppFailure[];
  coverage: string[];
  pending: number;
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
  return {
    kind,
    name: diagnosticText(name, 120),
    message: diagnosticText(
      error instanceof Error ? error.message : 'Unknown failure'
    ),
    ...(error instanceof Error && sourceLocation(error.stack)
      ? { source: sourceLocation(error.stack)! }
      : {}),
  };
}

/** Extract one location, excluding stack text, URL parameters and local directory paths. */
function sourceLocation(stack?: string): AppFailure['source'] {
  const match = stack
    ?.split('\n')
    .slice(1)
    .join('\n')
    .match(/([^\s()]+):(\d+):(\d+)/);
  if (!match) return undefined;
  const file = match[1]!.split(/[/\\]/).at(-1)!;
  return {
    file: diagnosticText(file, 200),
    line: Number(match[2]),
    column: Number(match[3]),
  };
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
    !Array.isArray(report.coverage) ||
    report.coverage.length > 30 ||
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
    coverage: report.coverage.map(item => {
      if (typeof item !== 'string')
        throw new Error('Invalid diagnostic coverage');
      return diagnosticText(item, 200);
    }),
    pending: report.pending,
    truncated: report.truncated,
  };
}
