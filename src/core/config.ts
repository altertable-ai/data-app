/**
 * App identity and display scope shared by browser and server.
 * @module @altertable/data-app/config
 */
import type { AppearanceOptions } from '@/src/core/appearance';

export type DataAppConfig = {
  title: string;
  /** Display labels; scope does not grant data access. */
  scope: { organization: string; environment: string };
  appearance: AppearanceOptions;
};

export function dataAppTitle(
  config: Pick<DataAppConfig, 'title' | 'scope'>
): string {
  return `${config.title} • ${config.scope.organization}/${config.scope.environment} • Altertable app`;
}
