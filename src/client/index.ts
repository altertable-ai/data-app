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
import { createOperationTransport } from '@/src/client/operations';
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
import type {
  DataOperations,
  DisclosedQuery,
  Lakehouse,
} from '@/src/core/contract';

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

/** Named HTTP operations, or browser-owned operations executed through an authorized SQL bridge. */
export function createDataClient<Operations extends DataOperations>(
  options: {
    operations?: Operations;
    lakehouse?: Lakehouse;
    transport?: DataTransport;
    endpoint?: string;
    fetch?: typeof fetch;
  } = {}
): DataClient<Operations> {
  if (
    options.operations &&
    (options.transport ||
      options.endpoint !== undefined ||
      options.fetch !== undefined)
  )
    throw new Error(
      'Browser operations cannot be combined with an HTTP endpoint or operation transport.'
    );
  if (options.lakehouse && !options.operations)
    throw new Error('A lakehouse requires browser operations.');
  const http = createHttpTransport(options);
  const operationTransport = options.operations
    ? createOperationTransport(options.operations, options.lakehouse)
    : undefined;

  return {
    async query(name, input, { signal } = {}) {
      const transport =
        operationTransport ??
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
