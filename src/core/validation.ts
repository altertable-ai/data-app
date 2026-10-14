export type ValidationIssue = { path: (string | number)[]; message: string };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function checkFields(
  value: Record<string, unknown>,
  fields: readonly string[],
  path: (string | number)[],
  issues: ValidationIssue[]
): void {
  for (const key of Object.keys(value)) {
    if (!fields.includes(key))
      issues.push({ path: [...path, key], message: `Unknown field ${key}.` });
  }
}
