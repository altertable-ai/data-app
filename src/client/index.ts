/**
 * Typed clients for HTTP and iframe delivery; safe to import in the browser.
 * @module @altertable/data-app/client
 * @see https://github.com/altertable-ai/data-app/blob/main/docs/client.md
 */
import { executeHostedOperation } from '@/src/client/host-operation';
import { localFrameBridge } from '@/src/client/iframe';
import {
  createHttpTransport,
  DataAppError,
  type DataTransport,
} from '@/src/client/transport';
import type { TransportResponse } from '@/src/core/bridge';
import type { DataOperations, DisclosedQuery } from '@/src/core/contract';

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

function readDataResponse<Output, Input = unknown>(
  response: TransportResponse,
  input: Input,
  signal?: AbortSignal
): DataResponse<Output, Input> {
  const ok = response.status >= 200 && response.status < 300;
  let body: Omit<DataResponse<Output, Input>, 'input'> & {
    error?: { code: string; message: string; requestId?: string };
  };
  try {
    const parsed: unknown = response.body;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))
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
}

/**
 * Browser client for named operations. It sends an operation name and input, never SQL
 * or lakehouse credentials.
 *
 * Pass the same `operations` registry the server uses when this app may run in a host
 * that does not implement `data:query`. HTTP and a working `data:query` transport still
 * win. The registry runs in the browser only after that route fails with `unknown_route`;
 * each statement is then sent to the host without credentials.
 */
export function createDataClient<Operations extends DataOperations>(
  options: {
    transport?: DataTransport;
    endpoint?: string;
    fetch?: typeof fetch;
    operations?: Operations;
  } = {}
): DataClient<Operations> {
  const http = createHttpTransport(options);
  let hostExecution = false;

  function transportFor() {
    return (
      options.transport ??
      (options.endpoint !== undefined || options.fetch !== undefined
        ? http
        : (localFrameBridge()?.transport ?? http))
    );
  }

  async function query<Name extends keyof Operations & string>(
    name: Name,
    input: InputOf<Operations[Name]>,
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<
    DataResponse<OutputOf<Operations[Name]>, InputOf<Operations[Name]>>
  > {
    function finish(response: TransportResponse) {
      return readDataResponse(response, input, signal) as DataResponse<
        OutputOf<Operations[Name]>,
        InputOf<Operations[Name]>
      >;
    }

    if (hostExecution && options.operations) {
      return finish(
        await executeHostedOperation(options.operations, name, input, signal)
      );
    }
    const transport = transportFor();
    try {
      return finish(await transport(name, input, signal));
    } catch (error) {
      if (
        options.operations &&
        transport !== http &&
        error instanceof DataAppError &&
        error.code === 'unknown_route'
      ) {
        hostExecution = true;

        return finish(
          await executeHostedOperation(options.operations, name, input, signal)
        );
      }
      throw error;
    }
  }

  return { query };
}

export type { DataAppLocation, AppLocation } from '@/src/client/location';

export {
  createDataAppNavigation,
  getDataAppNavigation,
  type DataAppNavigation,
} from '@/src/client/navigation';
