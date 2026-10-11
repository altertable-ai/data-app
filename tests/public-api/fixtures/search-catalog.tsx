import { defineDataApp } from '@altertable/data-app';
import { createDataClient } from '@altertable/data-app/client';
import type { DataOperation } from '@altertable/data-app/contract';
import {
  createDataHooks,
  createDataContext,
  DataApp,
  DataSection,
  Stack,
  TableWidget,
  searchVariable,
  injectDataAppStyles,
  mountDataApp,
} from '@altertable/data-app/react';

const catalog = {
  people: [
    { id: 1, name: 'Alice', team: 'Design' },
    { id: 2, name: 'Amira', team: 'Engineering' },
    { id: 3, name: 'Bob', team: 'Support' },
  ],
  projects: [
    { id: 1, name: 'Alpha', status: 'Active' },
    { id: 2, name: 'Alpine', status: 'Planning' },
    { id: 3, name: 'Budget', status: 'Complete' },
  ],
};
const client = createDataClient<{
  catalog: DataOperation<{ q: string }, typeof catalog>;
}>({
  async transport(_name, value) {
    document.body.dataset.requests = String(
      Number(document.body.dataset.requests ?? 0) + 1
    );
    const { q } = value as { q: string };
    function matches(row: { name: string }) {
      return row.name.toLowerCase().includes(q.toLowerCase());
    }
    return {
      status: 200,
      body: {
        data: {
          people: catalog.people.filter(matches),
          projects: catalog.projects.filter(matches),
        },
        requestId: 'catalog',
        queriedAt: '2026-10-11T00:00:00Z',
        queryIds: [],
        queries: [],
      },
    };
  },
});
const view = createDataHooks(client).defineDataView({
  operation: 'catalog',
  variables: { q: searchVariable({ key: 'q', label: 'Search workspace' }) },
  dataContext: createDataContext({ catalog: 'catalog' })({
    description: 'Illustrative people and projects.',
    glossary: {},
  }),
  describeInput: input =>
    input.q ? `Workspace matching ${input.q}` : 'Workspace',
  isEmpty: () => false,
  emptyFallback: { title: 'No matching records' },
});
const people = view.dataset({
  name: 'People',
  select: data => data.people,
  rowKey: row => row.id,
  columns: {
    name: { value: row => row.name },
    team: { value: row => row.team },
  },
  evidence: { id: 'people', queryNames: ['catalog'] },
});
const projects = view.dataset({
  name: 'Projects',
  select: data => data.projects,
  rowKey: row => row.id,
  columns: {
    name: { value: row => row.name },
    status: { value: row => row.status },
  },
  evidence: { id: 'projects', queryNames: ['catalog'] },
});
const suggestions = [
  people.suggestions({
    title: row => row.name,
    description: row => `Person · ${row.team}`,
  }),
  projects.suggestions({
    title: row => row.name,
    description: row => `Project · ${row.status}`,
  }),
];
const content = view.content(source => (
  <Stack gap="md">
    <TableWidget dataset={people} source={source} pagination={false} />
    <TableWidget dataset={projects} source={source} pagination={false} />
  </Stack>
));
const app = defineDataApp({
  title: 'Workspace explorer',
  description: 'Search people and projects together. Sample data.',
  scope: { organization: 'Demo', environment: 'Preview' },
  queries: {},
});
function App() {
  return (
    <DataApp
      view={view}
      datasets={[people, projects]}
      searchSuggestions={suggestions}
      story={() => []}
    >
      <DataSection content={content} />
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app, component: App });
