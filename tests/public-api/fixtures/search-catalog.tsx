import { defineDataApp } from '@altertable/data-app';
import { createDataClient } from '@altertable/data-app/client';
import type { DataOperation } from '@altertable/data-app/contract';
import { BarChart } from '@altertable/data-app/react/ui';
import {
  createDataHooks,
  createDataContext,
  DataApp,
  DataSection,
  Grid,
  MetricWidget,
  VisualizationWidget,
  Stack,
  TableWidget,
  searchVariable,
  type SearchVariable,
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
if (new URLSearchParams(location.search).has('manyPeople')) {
  catalog.people.push(
    ...['Ada', 'Alan', 'Amina', 'Anya', 'Asa'].map((name, index) => ({
      id: index + 4,
      name,
      team: 'Design',
    }))
  );
}
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
          projects: new URLSearchParams(location.search).has('noProjects')
            ? []
            : catalog.projects.filter(
                row =>
                  matches(row) &&
                  (!new URLSearchParams(location.search).has('singleProject') ||
                    row.name === 'Alpha')
              ),
        },
        requestId: 'catalog',
        queriedAt: '2026-10-11T00:00:00Z',
        queryIds: [],
        queries: [],
      },
    };
  },
});
const searchVariables: Record<string, SearchVariable> = {
  q: searchVariable({ key: 'q', label: 'Search workspace' }),
};
if (new URLSearchParams(location.search).has('secondSearch')) {
  searchVariables.notes = searchVariable({
    key: 'notes',
    label: 'Search notes',
  });
}
const view = createDataHooks(client).defineDataView({
  operation: 'catalog',
  variables: searchVariables,
  input: values => ({ q: values.q }),
  dataContext: createDataContext({ catalog: 'catalog' })({
    description: 'Illustrative people and projects.',
    glossary: {
      people: {
        term: 'People',
        definition: 'People matching the current search.',
        queryNames: ['catalog'],
      },
      projects: {
        term: 'Projects',
        definition: 'Projects matching the current search.',
        queryNames: ['catalog'],
      },
      activeProjects: {
        term: 'Active projects',
        definition: 'Matching projects whose status is Active.',
        queryNames: ['catalog'],
      },
    },
  }),
  describeInput: input =>
    input.q ? `Workspace matching ${input.q}` : 'Workspace',
  isEmpty: () => false,
  emptyFallback: { title: 'No matching records' },
});
const people = view.dataset({
  name: 'People',
  select: data => data.people,
  suggestions: {
    title: row => row.name,
    description: row => `Person · ${row.team}`,
  },
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
  suggestions: {
    title: row => row.name,
    description: row => `Project · ${row.status}`,
  },
  rowKey: row => row.id,
  columns: {
    name: { value: row => row.name },
    status: { value: row => row.status },
  },
  evidence: { id: 'projects', queryNames: ['catalog'] },
});
const peopleCount = view.metric(
  { id: 'people-count', glossaryId: 'people', format: { kind: 'count' } },
  data => ({ current: data.people.length })
);
const projectCount = view.metric(
  { id: 'project-count', glossaryId: 'projects', format: { kind: 'count' } },
  data => ({ current: data.projects.length })
);
const activeProjectCount = view.metric(
  {
    id: 'active-project-count',
    glossaryId: 'activeProjects',
    format: { kind: 'count' },
  },
  data => ({
    current: data.projects.filter(project => project.status === 'Active')
      .length,
  })
);

function distribution<Row>(
  rows: readonly Row[],
  category: (row: Row) => string
) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const label = category(row);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts].map(([label, value]) => ({ id: label, label, value }));
}
const teams = view.dataset({
  name: 'People by team',
  select: data => distribution(data.people, row => row.team),
  rowKey: row => row.id,
  columns: {
    team: { value: row => row.label },
    people: { value: row => row.value, format: { kind: 'count' } },
  },
  evidence: { id: 'teams', glossaryIds: ['people'] },
  emptyFallback: { title: 'No matching people' },
});
const statuses = view.dataset({
  name: 'Projects by status',
  select: data => distribution(data.projects, row => row.status),
  rowKey: row => row.id,
  columns: {
    status: { value: row => row.label },
    projects: { value: row => row.value, format: { kind: 'count' } },
  },
  evidence: { id: 'statuses', glossaryIds: ['projects'] },
  emptyFallback: { title: 'No matching projects' },
});
const content = view.content(source => (
  <Stack gap="lg">
    <Grid columns={3} minItemWidth="compact">
      <MetricWidget metric={peopleCount} source={source} />
      <MetricWidget metric={projectCount} source={source} />
      <MetricWidget metric={activeProjectCount} source={source} />
    </Grid>
    <Grid columns={2}>
      <VisualizationWidget dataset={teams} source={source}>
        {rows => (
          <BarChart items={rows} ariaLabel="People by team" unit="people" />
        )}
      </VisualizationWidget>
      <VisualizationWidget dataset={statuses} source={source}>
        {rows => (
          <BarChart
            items={rows}
            ariaLabel="Projects by status"
            unit="projects"
          />
        )}
      </VisualizationWidget>
    </Grid>
    <Grid columns={2}>
      <TableWidget dataset={people} source={source} pagination={false} />
      <TableWidget dataset={projects} source={source} pagination={false} />
    </Grid>
  </Stack>
));
const app = defineDataApp({
  title: 'Workspace explorer',
  description:
    'Find people and projects, compare teams and project status, and explore matching records. Sample data.',
  scope: { organization: 'Demo', environment: 'Preview' },
  queries: {},
});
function App() {
  return (
    <DataApp
      view={view}
      datasets={[people, projects]}
      story={snapshot => [
        {
          id: 'workspace-summary',
          headline: `${snapshot.data.people.length} people and ${snapshot.data.projects.length} projects match this search`,
          context:
            'Team and status distributions use the same matching records.',
          visual: (
            <VisualizationWidget dataset={statuses} source={snapshot}>
              {rows => (
                <BarChart
                  items={rows}
                  ariaLabel="Projects by status"
                  unit="projects"
                />
              )}
            </VisualizationWidget>
          ),
          evidence: statuses,
        },
      ]}
    >
      <DataSection content={content} />
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app, component: App });
