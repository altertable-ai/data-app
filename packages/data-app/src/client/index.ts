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
} from './data-client.ts';
export {
  type DataAppLocation,
  type AppLocation,
} from '../embed/client/location.ts';
export {
  createDataAppNavigation,
  getDataAppNavigation,
  type DataAppNavigation,
} from '../embed/client/navigation.ts';
export {
  createHttpTransport,
  DataAppError,
  type DataTransport,
} from './transport.ts';
export {
  createIframeTransport,
  installDataAppTransport,
  getDataAppTransport,
  type IframeTransport,
} from '../embed/client/iframe.ts';
export { createMessageClient } from '../embed/client/messages.ts';
export { type DataAppLogger } from '../embed/core/logger.ts';
export { createAnnotationClient } from '../embed/client/annotations.ts';
