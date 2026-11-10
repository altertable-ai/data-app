import { defineDataApp } from '@altertable/data-app';
import {
  createDataHooks,
  createDataContext,
  DataApp,
  DataSection,
  TextWidget,
  VisualizationWidget,
} from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import {
  defineOperation,
  searchFilter,
  type TransportResponse,
} from '@altertable/data-app/contract';
import { KEY_SEPARATOR } from '@altertable/data-app/internal';
import { useState } from 'react';

const pending = new Map<string, (response: TransportResponse) => void>();
const version = searchFilter({
  key: 'version',
  label: 'Version',
  defaultValue: '1',
});
const policy = { maxQueryRows: 1, maxDurationMs: 1000 };
/** The fixture transport answers every operation; `run` never executes in the browser. */
async function answeredByTransport(): Promise<{ count: number }> {
  throw new Error('The fixture transport answers this operation.');
}
const operations = {
  alpha: defineOperation({
    queries: {},
    filters: { version },
    policy,
    run: answeredByTransport,
  }),
  beta: defineOperation({ queries: {}, policy, run: answeredByTransport }),
};
const client = createDataClient<typeof operations>({
  filters: { alpha: operations.alpha.filters },
  transport(name, input, signal) {
    const version =
      name === 'alpha' ? (input as { version: string }).version : 1;
    const key = [name, version].join(KEY_SEPARATOR);
    document.body.dataset[`${name}Requests`] = String(
      Number(document.body.dataset[`${name}Requests`] ?? 0) + 1
    );
    return new Promise((resolve, reject) => {
      signal?.addEventListener(
        'abort',
        () => {
          pending.delete(key);
          reject(signal.reason);
        },
        { once: true }
      );
      pending.set(key, resolve);
    });
  },
});
const hooks = createDataHooks(client);
const context = createDataContext({ alpha: 'alpha', beta: 'beta' })({
  description: 'Declared views',
  glossary: {},
});
const alpha = hooks.defineView({
  dataContext: context,
  operation: 'alpha',
  describeInput: input => `version ${input.version}`,
});
const betaContext = createDataContext({ beta: 'beta' })({
  description: 'Independent beta context',
  glossary: {
    betaCount: {
      term: 'Independent beta',
      definition: 'Only the beta section owns this glossary entry.',
      queryNames: ['beta'],
    },
  },
});
const beta = hooks.defineView({
  dataContext: betaContext,
  operation: 'beta',
  describeInput: () => 'beta',
});
const alphaDataset = alpha.dataset({
  name: 'Alpha',
  select: (data, input) => [{ ...data, version: input.version }],
  rowKey: () => 'alpha',
  columns: {
    count: { value: row => row.count },
    version: { value: row => row.version },
  },
  evidence: { id: 'alpha-data', queryNames: ['alpha'] },
});
const alphaContent = alpha.content(result => (
  <>
    <TextWidget title="Alpha" dataset={alphaDataset} source={result}>
      {rows => (
        <p data-testid="primary">
          {rows[0]!.count} for {rows[0]!.version}
        </p>
      )}
    </TextWidget>
    <VisualizationWidget
      title="Alpha visualization"
      dataset={alphaDataset}
      source={result}
      viewLabel="Alpha view"
      views={[
        {
          id: 'count',
          label: 'Count',
          render: rows => <p data-testid="primary-visual">{rows[0]?.count}</p>,
        },
        {
          id: 'doubled',
          label: 'Doubled',
          render: rows => (
            <p data-testid="primary-visual">{rows[0]!.count * 2}</p>
          ),
        },
      ]}
    />
  </>
));
const betaDataset = beta.dataset({
  name: 'Beta',
  select: data => [data],
  rowKey: () => 'beta',
  columns: { count: { value: row => row.count } },
  evidence: { id: 'beta', glossaryIds: ['betaCount'] },
});
const betaContent = beta.content(result => (
  <TextWidget dataset={betaDataset} source={result}>
    {rows => <p data-testid="secondary">{rows[0]!.count}</p>}
  </TextWidget>
));

function resolve(name: 'alpha' | 'beta', version: number) {
  pending.get([name, version].join(KEY_SEPARATOR))?.({
    status: 200,
    body: {
      data: { count: version },
      requestId: [name, version].join(KEY_SEPARATOR),
      queriedAt: '2026-10-07T00:00:00Z',
      queryIds: [],
      queries: [{ name, statement: `SELECT ${name}` }],
    },
  });
}

export const dataApp = defineDataApp({
  title: 'Declared views',
  description: 'Explore independent views and their request states.',
  scope: { organization: 'test', environment: 'test' },
  queries: {},
});

export function DeclaredApp() {
  const [shown, setShown] = useState(false);
  return (
    <DataApp view={alpha} story={() => []} datasets={[alphaDataset]}>
      <button onClick={() => resolve('alpha', 1)}>Resolve alpha 1</button>
      <button onClick={() => resolve('alpha', 2)}>Resolve alpha 2</button>
      <button onClick={() => resolve('beta', 1)}>Resolve beta</button>
      <button onClick={() => setShown(true)}>Show primary</button>
      {shown && <DataSection content={alphaContent} />}
      <DataSection content={betaContent} />
    </DataApp>
  );
}
