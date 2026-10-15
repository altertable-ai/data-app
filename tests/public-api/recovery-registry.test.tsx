import { renderToString } from 'react-dom/server';
import { expect, test } from 'vitest';
import { createDataClient } from '@altertable/data-app/client';
import type { DataOperation } from '@altertable/data-app/contract';
import {
  createDataContext,
  createDataHooks,
  DataApp,
  searchVariable,
} from '@altertable/data-app/react';

const { defineDataView } =
  createDataHooks(
    createDataClient<{ activity: DataOperation<{ search: string }, number> }>()
  );
const dataContext = createDataContext({ activity: 'activity' })({
  description: 'Registry contracts',
  glossary: {},
});
function view(variables: { search: ReturnType<typeof searchVariable> }) {
  return defineDataView({
    operation: 'activity',
    dataContext,
    variables,
    describeInput: input => input.search,
    isEmpty: () => false,
    emptyFallback: { title: 'No activity' },
  });
}

test('cross-view variables reject conflicting definitions for the same input name', () => {
  const first = view({ search: searchVariable({ key: 'first' }) });
  const second = view({ search: searchVariable({ key: 'second' }) });
  const dataset = first.dataset({
    name: 'Activity',
    select: data => [data],
    rowKey: () => 'activity',
    evidence: { id: 'activity', queryNames: ['activity'] },
    columns: { count: { value: value => value } },
  });
  expect(() =>
    renderToString(
      <DataApp views={{ first, second }} datasets={[dataset]} story={() => []}>
        {null}
      </DataApp>
    )
  ).toThrow('Variable search conflicts across views');
});

test('cross-view variables reject duplicate URL keys under distinct input names', () => {
  const first = view({ search: searchVariable({ key: 'shared' }) });
  const second = defineDataView({
    operation: 'activity',
    dataContext,
    variables: { query: searchVariable({ key: 'shared' }) },
    input: values => ({ search: values.query }),
    describeInput: input => input.search,
    isEmpty: () => false,
    emptyFallback: { title: 'No activity' },
  });
  const dataset = first.dataset({
    name: 'Activity',
    select: data => [data],
    rowKey: () => 'activity',
    evidence: { id: 'activity', queryNames: ['activity'] },
    columns: { count: { value: value => value } },
  });
  expect(() =>
    renderToString(
      <DataApp views={{ first, second }} datasets={[dataset]} story={() => []}>
        {null}
      </DataApp>
    )
  ).toThrow('duplicate URL key');
});

test('custom failure feedback preserves a support ID and hides private diagnostics', async () => {
  const { DataAppError } = await import('@altertable/data-app/client');
  const { getDataFailure } = await import('@altertable/data-app/react');
  const denied = getDataFailure(
    new DataAppError(
      'private connection details',
      'source_forbidden',
      'request-7'
    )
  );
  expect(denied).toMatchObject({
    code: 'source_forbidden',
    retryable: false,
    requestId: 'request-7',
  });
  expect(denied.message).not.toContain('private');
  const failed = getDataFailure(new Error('private SQL statement'));
  expect(failed).toMatchObject({ code: 'request_failed', retryable: true });
  expect(failed.message).not.toContain('SQL');
});
