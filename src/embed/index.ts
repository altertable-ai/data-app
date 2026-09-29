/**
 * Framework-neutral iframe hosting and sandboxed bundle initialization.
 * @module @altertable/data-app/embed
 * @see https://github.com/altertable-ai/data-app/blob/main/docs/embed.md
 */
export { attachDataAppBridge } from '@/src/embed/host';
export type {
  DataAppConnection,
  DataAppStatus,
  DataAppDiagnostic,
} from '@/src/embed/host';
export { attachDataAppShell } from '@/src/embed/shell';
export type { DataAppSource, DataAppShellOptions } from '@/src/embed/shell';
export { startDataAppBootstrap } from '@/src/embed/bootstrap';
export { createNavigationHandler } from '@/src/embed/navigation';
