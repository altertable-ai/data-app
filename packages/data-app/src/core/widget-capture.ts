import { isRecord } from './record.ts';

/** The focused widget's state. Ready includes its fitted content height in CSS pixels. */
export type DataAppWidgetCaptureState =
  | { state: 'loading' | 'empty' | 'error'; widgetId: string }
  | { state: 'ready'; widgetId: string; height: number }
  | { state: 'invalid-target' };

export type WidgetCaptureRenderState =
  | Exclude<DataAppWidgetCaptureState, { state: 'ready' }>
  | { state: 'ready'; widgetId: string };

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
