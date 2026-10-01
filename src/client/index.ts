/**
 * Typed clients for HTTP and iframe delivery; safe to import in the browser.
 * @module @altertable/data-app/client
 * @see https://github.com/altertable-ai/data-app/blob/main/docs/client.md
 */
import {
  createHttpTransport,
  DataAppError,
  type DataTransport,
} from '@/src/client/transport';
import { localFrameBridge } from '@/src/client/iframe';
export {
  createHttpTransport,
  DataAppError,
  type DataTransport,
} from '@/src/client/transport';
export {
  createIframeTransport,
  installDataAppTransport,
  getDataAppTransport,
  type IframeTransport,
} from '@/src/client/iframe';
export { createMessageClient } from '@/src/client/messages';
import type { DataOperations, DisclosedQuery } from '@/src/core/contract';

export type InputOf<T> = T extends { input: (value: unknown) => infer Input }
  ? Input
  : never;
export type OutputOf<T> = T extends { output: (value: unknown) => infer Output }
  ? Output
  : never;

/**
 * Parsed operation data and query evidence. `queries` is present only when SQL disclosure is
 * allowed.
 */
export type DataResponse<Output, Input = unknown> = {
  data: Output;
  /** The exact browser input that produced this response. Never infer it from current controls. */
  input: Input;
  requestId: string;
  queriedAt: string;
  queryIds: string[];
  queries?: DisclosedQuery[];
};

export type DataClient<Operations extends DataOperations> = {
  query<Name extends keyof Operations & string>(
    name: Name,
    input: InputOf<Operations[Name]>,
    options?: { signal?: AbortSignal }
  ): Promise<
    DataResponse<OutputOf<Operations[Name]>, InputOf<Operations[Name]>>
  >;
};

/** Browser client for named operations; it sends inputs, never SQL or lakehouse credentials. */
export function createDataClient<Operations extends DataOperations>(
  options: {
    transport?: DataTransport;
    endpoint?: string;
    fetch?: typeof fetch;
  } = {}
): DataClient<Operations> {
  const http = createHttpTransport(options);

  return {
    async query(name, input, { signal } = {}) {
      const transport =
        options.transport ??
        (options.endpoint !== undefined || options.fetch !== undefined
          ? http
          : (localFrameBridge()?.transport ?? http));
      const response = await transport(name, input, signal);
      const ok = response.status >= 200 && response.status < 300;
      let body: Omit<
        DataResponse<OutputOf<Operations[typeof name]>>,
        'input'
      > & {
        error?: { code: string; message: string; requestId?: string };
      };
      try {
        const parsed: unknown = response.body;
        if (
          parsed === null ||
          typeof parsed !== 'object' ||
          Array.isArray(parsed)
        )
          throw new Error('Invalid response envelope.');
        body = parsed as typeof body;
      } catch (error) {
        if (signal?.aborted) throw error;
        throw new DataAppError(
          ok ? 'The data response was invalid.' : 'Could not load data.',
          ok ? 'invalid_response' : 'request_failed'
        );
      }
      if (!ok)
        throw new DataAppError(
          body.error?.message ?? 'Could not load data.',
          body.error?.code ?? 'request_failed',
          body.error?.requestId
        );

      return { ...body, input };
    },
  };
}

export type { DataAppLocation, AppLocation } from '@/src/client/location';

export {
  createDataAppNavigation,
  getDataAppNavigation,
  type DataAppNavigation,
} from '@/src/client/navigation';

export type { DataAppPresentation } from '@/src/core/presentation';
