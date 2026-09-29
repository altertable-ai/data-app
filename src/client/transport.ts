import type { TransportResponse } from '@/src/core/bridge';

export type DataTransport = (
  operation: string,
  input: unknown,
  signal?: AbortSignal
) => Promise<TransportResponse>;

// A bootstrap and its app may bundle independent copies in the same window.
const errorBrand = Symbol.for('@altertable/data-app/DataAppError');

export class DataAppError extends Error {
  readonly [errorBrand] = true;

  static [Symbol.hasInstance](value: unknown): boolean {
    return (
      value instanceof Error &&
      (value as { [errorBrand]?: unknown })[errorBrand] === true
    );
  }

  constructor(
    message: string,
    public readonly code: string,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = 'DataAppError';
  }
}

export function createHttpTransport({
  endpoint = '/api/data',
  fetch: request = globalThis.fetch,
}: {
  endpoint?: string;
  fetch?: typeof fetch;
} = {}): DataTransport {
  async function requestData(
    operation: string,
    input: unknown,
    signal?: AbortSignal
  ): Promise<TransportResponse> {
    const response = await request(
      `${endpoint.replace(/\/$/, '')}/${encodeURIComponent(operation)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
        signal,
      }
    );
    try {
      return { status: response.status, body: await response.json() };
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new DataAppError(
        response.ok ? 'The data response was invalid.' : 'Could not load data.',
        response.ok ? 'invalid_response' : 'request_failed'
      );
    }
  }

  return requestData;
}
