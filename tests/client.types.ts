import {
  createDataClient,
  type DataClientOptions,
  type DataTransport,
} from '@/src/client/index';
import { connectionCheck, type Lakehouse } from '@/src/core/contract';

// Compile-only assertions: invalid configurations must never run.
async function verifyClientOptions(
  lakehouse: Lakehouse,
  transport: DataTransport,
  request: typeof fetch
) {
  const operations = { connection: connectionCheck() };
  createDataClient<typeof operations>();
  createDataClient<typeof operations>({});
  createDataClient<typeof operations>({ transport });
  createDataClient<typeof operations>({
    endpoint: '/api/data',
    fetch: request,
  });
  createDataClient<typeof operations>({
    transport,
    endpoint: '/api/data',
    fetch: request,
  });
  const browser = createDataClient({ operations });
  const injected = createDataClient({ operations, lakehouse });
  const data: true = (await injected.query('connection', {})).data;
  const options: DataClientOptions<typeof operations> = {
    operations,
    lakehouse,
  };
  createDataClient(options);

  // @ts-expect-error A lakehouse requires an operation registry.
  createDataClient({ lakehouse });
  // @ts-expect-error Browser operations cannot select a named-operation transport.
  createDataClient({ operations, transport });
  // @ts-expect-error Browser operations cannot select an HTTP endpoint.
  createDataClient({ operations, endpoint: '/api/data' });
  // @ts-expect-error Browser operations cannot supply an HTTP fetch implementation.
  createDataClient({ operations, fetch: request });
  const mixed = { operations, lakehouse, transport };
  // @ts-expect-error Mixed configurations must also be rejected when supplied as variables.
  createDataClient(mixed);
  const orphanedLakehouse = { lakehouse, endpoint: '/api/data' };
  // @ts-expect-error Named-operation delivery cannot carry a browser lakehouse.
  createDataClient(orphanedLakehouse);
  // @ts-expect-error Browser clients retain the operation's inferred input contract.
  await browser.query('connection', { unexpected: 1 });
  // @ts-expect-error Browser clients retain the operation's inferred name contract.
  await browser.query('missing', {});

  return data;
}

void verifyClientOptions;
