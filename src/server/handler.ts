import {
  executeDataOperation,
  toDataOperationFailure,
} from '@/src/core/operation';
import {
  DataSourceError,
  type DataOperations,
  type Lakehouse,
} from '@/src/core/contract';

/** Authorization result for one viewer request. A hosted adapter must scope its lakehouse client. */
export type RequestAccess = { lakehouse: Lakehouse; canDiscloseSql: boolean };

/**
 * Execute named operations on the server. The app supplies operations and viewer authorization.
 * JSON, Origin, and Fetch Metadata checks reject cross-site browser POSTs; they do not
 * authenticate another local process. SQL is returned only when both the operation and
 * authorization result permit disclosure.
 */
export function createDataHandler(
  operations: DataOperations,
  authorize: (request: Request, operation: string) => Promise<RequestAccess>
) {
  async function handleDataRequest(request: Request): Promise<Response> {
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/data/'))
      return new Response('Not found', { status: 404 });
    const encodedName = url.pathname.slice('/api/data/'.length);
    if (!encodedName || encodedName.includes('/'))
      return problem(404, 'not_found', 'Unknown data operation.', requestId);
    let name: string;
    try {
      name = decodeURIComponent(encodedName);
    } catch {
      return problem(404, 'not_found', 'Unknown data operation.', requestId);
    }
    if (!Object.hasOwn(operations, name))
      return problem(404, 'not_found', 'Unknown data operation.', requestId);
    if (request.method !== 'POST')
      return problem(405, 'method_not_allowed', 'Use POST.', requestId);
    if (
      request.headers
        .get('content-type')
        ?.split(';')[0]
        ?.trim()
        .toLowerCase() !== 'application/json'
    )
      return problem(
        415,
        'unsupported_media_type',
        'Use application/json.',
        requestId
      );
    const origin = request.headers.get('origin');
    const fetchSite = request.headers.get('sec-fetch-site');
    const fetchMode = request.headers.get('sec-fetch-mode');
    if (
      (origin !== null && origin !== url.origin) ||
      (fetchSite !== null && fetchSite !== 'same-origin') ||
      (fetchSite !== null && origin === null) ||
      (fetchMode !== null &&
        fetchMode !== 'cors' &&
        fetchMode !== 'same-origin')
    )
      return problem(
        403,
        'cross_origin_request',
        'The data request must come from this app.',
        requestId
      );
    let access: RequestAccess;
    try {
      access = await authorize(request, name);
    } catch {
      return problem(
        403,
        'forbidden',
        'You cannot run this data operation.',
        requestId
      );
    }
    const operation = operations[name]!;
    let input: unknown;
    if (request.signal.aborted)
      return problem(504, 'timeout', 'The data request timed out.', requestId);
    try {
      const body = await readInput(request);
      input = JSON.parse(body);
    } catch (error) {
      if (error instanceof InputTooLargeError)
        return problem(
          413,
          'input_too_large',
          'Input is too large.',
          requestId
        );

      return problem(
        400,
        'invalid_input',
        "Check this operation's inputs.",
        requestId
      );
    }
    const signal = request.signal;
    try {
      const { serializedBody } = await executeDataOperation(operation, input, {
        lakehouse: access.lakehouse,
        includeSql: access.canDiscloseSql,
        signal,
        requestId,
        operationName: name,
      });
      return new Response(serializedBody, {
        headers: {
          'cache-control': 'no-store',
          'content-type': 'application/json',
        },
      });
    } catch (error) {
      const source = error instanceof DataSourceError ? error : null;
      console.error(
        `Data operation ${name} failed (${requestId}): ${source ? `${source.reason}${source.status ? ` (${source.status})` : ''}${source.queryName ? ` in ${source.queryName}` : ''}` : error instanceof Error ? error.name : 'unknown'}`
      );
      const failure = toDataOperationFailure(error, signal.aborted);

      return problem(failure.status, failure.code, failure.message, requestId);
    }
  }

  return handleDataRequest;
}

function problem(
  status: number,
  code: string,
  message: string,
  requestId: string
): Response {
  return Response.json(
    { error: { code, message, requestId } },
    { status, headers: { 'cache-control': 'no-store' } }
  );
}

const MAX_INPUT_BYTES = 16_384;
class InputTooLargeError extends Error {}

/** Count encoded bytes before retaining chunks; cancellation also interrupts waiting reads. */
async function readInput(request: Request): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  let abort: (() => void) | undefined;

  function cancelReader() {
    // The source's cancel algorithm may never settle; the handler must still respond.
    void reader!.cancel().catch(() => {});
  }

  try {
    request.signal.throwIfAborted();
    const cancelled = new Promise<never>((_, reject) => {
      function rejectAborted() {
        reject(new Error('Request aborted.'));
        cancelReader();
      }
      abort = rejectAborted;
      request.signal.addEventListener('abort', rejectAborted, { once: true });
      if (request.signal.aborted) rejectAborted();
    });
    while (true) {
      const { done, value } = await Promise.race([reader.read(), cancelled]);
      if (done) break;
      size += value.byteLength;
      if (size > MAX_INPUT_BYTES) {
        cancelReader();
        throw new InputTooLargeError();
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return new TextDecoder().decode(bytes);
  } finally {
    if (abort) request.signal.removeEventListener('abort', abort);
    reader.releaseLock();
  }
}
