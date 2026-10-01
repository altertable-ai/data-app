/**
 * Framework-neutral iframe hosting and sandboxed bundle initialization.
 * @module @altertable/data-app/embed
 * @see https://github.com/altertable-ai/data-app/blob/main/docs/embed.md
 */
export { attachDataAppBridge } from '@/src/embed/bridge';
export type { DataAppBridgeOptions } from '@/src/embed/bridge';
export type {
  DataAppHost,
  DataAppConnection,
  DataAppStatus,
  DataAppDiagnostic,
} from '@/src/embed/host';
export type { DataAppSource } from '@/src/embed/source';
export { startDataAppBootstrap } from '@/src/embed/bootstrap';
export { createNavigationHandler } from '@/src/embed/navigation';

export { createSqlQueryHandler } from '@/src/embed/sql';

export type { DataAppPresentation } from '@/src/core/presentation';
export type { DataAppLogger } from '@/src/core/logger';
