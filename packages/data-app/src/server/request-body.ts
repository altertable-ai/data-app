export class RequestBodyTooLargeError extends Error {}

/** Count encoded bytes before retaining chunks; cancellation also interrupts waiting reads. */
export async function readRequestBody(
  request: Request,
  maxBytes: number
): Promise<string> {
  const body = request.body;
  if (!body) return '';
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let abort: (() => void) | undefined;

  function cancelReader() {
    // The source's cancel algorithm may never settle; the handler must still respond.
    void reader.cancel().catch(() => {});
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
      if (size > maxBytes) {
        cancelReader();
        throw new RequestBodyTooLargeError();
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
