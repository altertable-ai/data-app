/**
 * Framework-neutral iframe hosting and sandboxed bundle initialization.
 * @module @altertable/data-app-embed
 * @see https://github.com/altertable-ai/data-app/blob/main/docs/embed.md
 */
export { attachDataAppBridge, type DataAppBridgeOptions } from './bridge.ts';
export {
  type DataAppHost,
  type DataAppConnection,
  type DataAppStatus,
  type DataAppDiagnostic,
} from './host.ts';
export { type DataAppSource } from './source.ts';
export { startDataAppBootstrap } from './bootstrap.ts';
export { createNavigationHandler } from './navigation.ts';
export { createSqlQueryHandler } from './sql.ts';
export { type DataAppPresentation } from '@altertable/data-app/internal';
export { type DataAppLogger } from '@altertable/data-app/client';
