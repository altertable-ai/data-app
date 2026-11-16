/** A non-null, non-array object, as parsed from JSON or received over the bridge. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
