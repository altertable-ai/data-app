/**
 * Typed clients for HTTP and iframe delivery; safe to import in the browser.
 * @module @altertable/data-app/client
 * @see https://github.com/altertable-ai/data-app/blob/main/docs/client.md
 */
export {
  createDataClient,
  type InputOf,
  type OutputOf,
  type DataResponse,
  type DataClient,
  type DataClientOptions,
  DataAppError,
} from '../authoring/client.ts';
export { createHttpTransport, type DataTransport } from './transport.ts';
export { type DataAppLocation, type AppLocation } from './location.ts';
export {
  createDataAppNavigation,
  getDataAppNavigation,
  type DataAppNavigation,
} from './navigation.ts';
export {
  createIframeTransport,
  installDataAppTransport,
  getDataAppTransport,
  type IframeTransport,
} from './iframe.ts';
export { createMessageClient } from './messages.ts';
export { type DataAppLogger } from '../core/logger.ts';
export { createAnnotationClient } from './annotations.ts';
export { appDiagnostics } from './diagnostics.ts';
export {
  type AppFailure,
  type AppDiagnosticReport,
} from '../core/diagnostics.ts';
