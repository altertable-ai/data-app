# Server

Import `createDataHandler` and the `RequestAccess` type from
`@altertable/data-app/server`. The handler accepts a Web `Request` and returns a
`Promise<Response>`. This entry can be imported in Node and Bun without loading
React or the Bun local-development adapter.

```ts
import { createDataHandler } from '@altertable/data-app/server';
import { operations } from './operations';

export const handleDataRequest = createDataHandler(
  operations,
  async (request, operation) => {
    const viewer = await authenticate(request);
    return {
      lakehouse: await lakehouseFor(viewer, operation),
      canDiscloseSql: false,
    };
  }
);
```

The app supplies `authenticate` and `lakehouseFor`, then routes `/api/data/*`
requests to the handler. Authorize every viewer and operation, and scope the
returned lakehouse to the viewer's permitted data. Origin and Fetch Metadata
checks reject cross-site browser requests; they do not authenticate viewers.

The handler validates operation input and output, enforces query row and duration
bounds, propagates cancellation, and returns request IDs with errors. SQL is
disclosed only when both the operation policy and `canDiscloseSql` allow it.
Keep credentials and operation implementations on the server.

See [operation contracts](contract.md), the [client](client.md), and the
[local Bun adapter](server-bun.md).

## Request input limits

JSON request bodies are limited to **16,384 encoded bytes**, including multibyte
UTF-8 content. The handler counts bytes as it reads and cancels remaining
consumption on overflow; it does not rely on `Content-Length`. Authorization
runs before reading. Request cancellation interrupts waiting reads. Invalid or
interrupted bodies return `400/invalid_input`; oversized bodies return
`413/input_too_large`.

`maxDurationMs` bounds execution after input parsing. It does not add a separate
body-read deadline. The hosting runtime controls the size of individual chunks.
