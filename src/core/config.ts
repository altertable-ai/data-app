/**
 * App identity and display scope shared by browser and server.
 * @module @altertable/data-app/config
 * @see https://github.com/altertable-ai/data-app/blob/main/docs/config.md
 */
export type DataAppConfig = {
  title: string;
  scope: { organization: string; environment: string };
  appearance: unknown;
};

export function dataAppTitle(
  config: Pick<DataAppConfig, 'title' | 'scope'>
): string {
  return `${config.title} • ${config.scope.organization}/${config.scope.environment} • Altertable app`;
}
