/**
 * React bindings and UI; load the stylesheet separately in the browser entry.
 * @module @altertable/data-app/react
 * @see https://github.com/altertable-ai/data-app/blob/main/docs/react.md
 */
export { mountDataApp, DataAppProvider } from '@/src/react/mount';
export { createDataHooks } from '@/src/react/hooks';
export { defineDataContent } from '@/src/react/content';
export type { DataContentState } from '@/src/react/content';
export type {
  DataViewDefinition,
  ResolvedVariables,
  ViewBindings,
} from '@/src/react/view';
export * from '@/src/react/ui/index';
