export function chartColor(id: string): string {
  let hash = 2_166_136_261;
  for (const codePoint of id)
    hash = Math.imul(hash ^ codePoint.codePointAt(0)!, 16_777_619);

  return `var(--atbl-chart-${((hash >>> 0) % 8) + 1})`;
}

export const chartBarFill =
  'var(--atbl-chart-fill, color-mix(in srgb, var(--atbl-chart-1) 75%, var(--atbl-surface)))';
