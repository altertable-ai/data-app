export function chartColor(id: string): string {
  let hash = 2166136261;
  for (const codePoint of id)
    hash = Math.imul(hash ^ codePoint.codePointAt(0)!, 16777619);

  return `var(--atbl-chart-${((hash >>> 0) % 8) + 1})`;
}
