import {
  createDataClient,
  type DataClientOptions,
} from '@altertable/data-app/client';
import {
  connectionCheck,
  type ConnectionOperation,
  type Lakehouse,
} from '@altertable/data-app/contract';

// Compile-only assertions: invalid configurations must never run.
async function verifyClientOptions(
  lakehouse: Lakehouse,
  request: typeof fetch
) {
  const operations = {
    connection: connectionCheck({
      connection: {
        projections: { connection_check: { type: 'number' } } as const,
        statement: 'SELECT 1',
        params: {},
      },
    }),
  };
  // @ts-expect-error The connection helper does not declare arbitrary query names.
  void operations.connection.queryNames.invented;
  const external = createDataClient({ operations });
  const externalData: true = (await external.query('connection', {})).data;
  void externalData;
  // @ts-expect-error An operation registry is required.
  createDataClient<typeof operations>({});
  const setup = createDataClient<{ connection: ConnectionOperation }>({
    operations,
  });
  const setupData: true = (await setup.query('connection', {})).data;
  void setupData;
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
  createDataClient({ operations, transport: request });
  // @ts-expect-error Browser operations cannot select an HTTP endpoint.
  createDataClient({ operations, endpoint: '/api/data' });
  // @ts-expect-error Browser operations cannot supply an HTTP fetch implementation.
  createDataClient({ operations, fetch: request });
  // @ts-expect-error A registry is required even when supplying a lakehouse.
  createDataClient({ lakehouse, endpoint: '/api/data' });
  // @ts-expect-error Browser clients retain the operation's inferred input contract.
  await browser.query('connection', { unexpected: 1 });
  // @ts-expect-error Browser clients retain the operation's inferred name contract.
  await browser.query('missing', {});

  return data;
}

void verifyClientOptions;
