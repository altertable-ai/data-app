import { parseAppDiagnosticReport } from '@altertable/data-app/internal';
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';

/** Resolve only this bootstrap's generated bundle locations. Never fetch maps or expose source content. */
export function createDiagnosticSourceMapper(javascript?: string) {
  let initialized = false;
  let map: TraceMap | undefined;
  return (value: unknown) => {
    const report = parseAppDiagnosticReport(value);
    for (const failure of report.failures) {
      const source = failure.source;
      if (!source || !/^altertable-data-app-[\w-]+\.js$/.test(source.file))
        continue;
      try {
        if (!initialized) {
          initialized = true;
          const inline = javascript?.match(
            /^\/\/[#@]\s*sourceMappingURL=data:application\/json(?:;charset=[\w-]+)?;base64,([^\s]+)\s*$/m
          );
          if (inline)
            map = new TraceMap(
              new TextDecoder().decode(
                Uint8Array.from(atob(inline[1]!), char => char.charCodeAt(0))
              )
            );
        }
        if (!map) continue;
        const original = originalPositionFor(map, {
          line: source.line,
          column: source.column - 1,
        });
        if (
          original.source &&
          original.line !== null &&
          original.column !== null &&
          Number.isSafeInteger(original.line) &&
          original.line > 0 &&
          Number.isSafeInteger(original.column) &&
          original.column >= 0
        )
          failure.source = {
            file: original.source,
            line: original.line,
            column: original.column + 1,
          };
      } catch {
        // Bad or absent mapping must not prevent repair of the observed failures.
      }
    }
    // Apply the same bounds/redaction to authored paths as generated locations.
    return parseAppDiagnosticReport(report);
  };
}
