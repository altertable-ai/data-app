import { isRecord } from './record.ts';

/** The focused widget's state. Ready includes its fitted content height in CSS pixels. */
export type DataAppWidgetCaptureState =
  | { state: 'loading' | 'empty' | 'error'; widgetId: string }
  | { state: 'ready'; widgetId: string; height: number }
  | { state: 'invalid-target' };

export type WidgetCaptureRenderState =
  | Exclude<DataAppWidgetCaptureState, { state: 'ready' }>
  | { state: 'ready'; widgetId: string };

export function isWidgetId(id: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
}

/** Returns undefined for normal navigation and null for an invalid widget link. */
export function readWidgetId(
  search: URLSearchParams
): string | null | undefined {
  const [id, ...duplicates] = search.getAll('widget');
  if (id === undefined) return undefined;
  return duplicates.length === 0 && isWidgetId(id) ? id : null;
}

export const reportWidgetCapture = Symbol.for('altertable.reportWidgetCapture');

export function widgetCaptureRequest(state: unknown, search: string) {
  if (
    isRecord(state) &&
    typeof state.search === 'string' &&
    new URLSearchParams(state.search).toString() === search &&
    typeof state.widgetCaptureRequest === 'string'
  )
    return state.widgetCaptureRequest;
  return undefined;
}
