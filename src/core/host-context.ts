/** Presentation owned by the parent shell, delivered only over a trusted bridge. */
export type DataAppHostContext = {
  surface: 'altertable' | 'custom';
  colorScheme: 'light' | 'dark';
};

export function parseHostContext(
  value: unknown
): DataAppHostContext | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const context = value as DataAppHostContext;
  if (
    (context.surface !== 'altertable' && context.surface !== 'custom') ||
    (context.colorScheme !== 'light' && context.colorScheme !== 'dark')
  )
    return undefined;

  return { surface: context.surface, colorScheme: context.colorScheme };
}
