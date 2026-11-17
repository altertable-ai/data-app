import { DataAppError, type DataClient } from '@altertable/data-app/client';
import {
  defineDataOperationRoute,
  MessageRoutingError,
  type DataOperations,
  type FilterCollection,
  type TransportResponse,
} from '@altertable/data-app/contract';

export type FixtureTransport = (
  operation: string,
  input: unknown,
  signal?: AbortSignal
) => Promise<TransportResponse>;

const route = defineDataOperationRoute();

/** Supply controlled responses to UI fixtures without exposing an operation transport in the SDK. */
export function createTransportFixtureClient<
  Operations extends DataOperations,
>({
  filters = {},
  transport,
}: {
  filters?: Readonly<Record<string, FilterCollection>>;
  transport: FixtureTransport;
}): DataClient<Operations> {
  return {
    filters,
    async query(
      name: string,
      input: unknown,
      options?: { signal?: AbortSignal }
    ) {
      const response = await transport(name, input, options?.signal);
      try {
        const result = route.output(response, { operation: name, input });
        return { ...(result.body as object), input };
      } catch (error) {
        if (error instanceof MessageRoutingError)
          throw new DataAppError(error.message, error.code, error.requestId);
        throw error;
      }
    },
  } as unknown as DataClient<Operations>;
}

export function fixtureHttpTransport(endpoint: string): FixtureTransport {
  return async (operation, input, signal) => {
    const response = await fetch(
      `${endpoint}/${encodeURIComponent(operation)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
        signal,
      }
    );
    return { status: response.status, body: await response.json() };
  };
}
