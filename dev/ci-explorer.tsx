import { defineDataApp } from '@altertable/data-app';
import { createDataClient } from '@altertable/data-app/client';
import {
  defineDateRangeContract,
  parseCount,
  parseLabel,
  type DimensionSelection,
} from '@altertable/data-app/contract';
import {
  createDataContext,
  createDataHooks,
  DataApp,
  DataSection,
  Grid,
  Stack,
  MetricWidget,
  TableWidget,
  TextContent,
  VisualizationWidget,
  injectDataAppStyles,
  mountDataApp,
} from '@altertable/data-app/react';
import { BarChart, LineChart, PieChart } from '@altertable/data-app/react/ui';

const app = defineDataApp({
  title: 'CI job explorer',
  description:
    'Investigate Altertable CI jobs from repository to workflow to job, then inspect the matching runs.',
  scope: { organization: 'altertable', environment: 'production' },
  dateFormatting: { timeZone: 'UTC' },
  queries: {
    repositories: {
      statement:
        "SELECT DISTINCT coalesce(repo, 'Repository not recorded') AS value, coalesce(repo, 'Repository not recorded') AS label FROM ci.main.job_runs WHERE ($member IS NULL OR coalesce(repo, 'Repository not recorded') = $member) ORDER BY label",
      params: { member: { defaultValue: null } },
    },
    workflows: {
      statement:
        "SELECT DISTINCT workflow_name AS value, workflow_name AS label FROM ci.main.job_runs WHERE coalesce(repo, 'Repository not recorded') = $repository AND workflow_name IS NOT NULL AND ($member IS NULL OR workflow_name = $member) ORDER BY label",
      params: { repository: {}, member: { defaultValue: null } },
    },
    jobs: {
      statement:
        "SELECT DISTINCT job_name AS value, job_name AS label FROM ci.main.job_runs WHERE coalesce(repo, 'Repository not recorded') = $repository AND workflow_name = $workflow AND job_name IS NOT NULL AND ($member IS NULL OR job_name = $member) ORDER BY label",
      params: { repository: {}, workflow: {}, member: { defaultValue: null } },
    },
    jobRuns: {
      statement:
        "SELECT id, coalesce(repo, 'Repository not recorded') AS repository, workflow_name AS workflow, job_name AS job, status, strftime(started_at, '%Y-%m-%dT%H:%M:%SZ') AS started_at, CASE WHEN duration_s >= 0 THEN duration_s ELSE NULL END AS duration_seconds FROM ci.main.job_runs WHERE started_at >= CAST($start AS DATE) AND started_at < CAST($end AS DATE) + INTERVAL 1 DAY AND ($repository IS NULL OR coalesce(repo, 'Repository not recorded') = $repository) AND ($workflow IS NULL OR workflow_name = $workflow) AND ($job IS NULL OR job_name = $job) AND ($status IS NULL OR status = $status) ORDER BY started_at DESC, id",
      params: {
        start: {},
        end: {},
        repository: { defaultValue: null },
        workflow: { defaultValue: null },
        job: { defaultValue: null },
        status: { defaultValue: null },
      },
    },
  },
});
const hierarchy = app.defineHierarchy({
  key: 'ci',
  label: 'CI scope',
  levels: [
    {
      id: 'repository',
      label: 'Repository',
      groupLabel: 'Repositories',
      valueType: 'string',
      source: { query: 'repositories' },
    },
    {
      id: 'workflow',
      label: 'Workflow',
      groupLabel: 'Workflows',
      valueType: 'string',
      source: { query: 'workflows' },
    },
    {
      id: 'job',
      label: 'Job',
      groupLabel: 'Jobs',
      valueType: 'string',
      source: { query: 'jobs' },
    },
  ],
});
// Deliberate historical investigation: seven complete UTC days with verified coverage.
const calendar = defineDateRangeContract({
  minDate: '2026-10-07',
  maxDate: '2026-10-13',
  maxRangeDays: 7,
  timeZone: 'UTC',
});
const parseInput = hierarchy.input(value => {
  const input = value as { period?: unknown; status?: unknown };
  return {
    period: calendar.parseRequest(input?.period),
    status: input?.status == null ? null : parseStatus(input.status),
  };
});
type Scope = ReturnType<typeof parseInput>;
type Status = 'success' | 'failure' | 'cancelled';
type JobRun = {
  id: string;
  repository: string;
  workflow: string;
  job: string;
  status: Status;
  startedAt: string;
  durationSeconds: number | null;
};
function parseStatus(value: unknown): Status {
  if (value !== 'success' && value !== 'failure' && value !== 'cancelled')
    throw new Error('Expected success, failure, or cancelled status.');
  return value;
}
function parseRuns(value: unknown): JobRun[] {
  if (!Array.isArray(value)) throw new Error('Expected job runs.');
  return value.map(entry => {
    const row = entry as Record<string, unknown>;
    const startedAt = parseLabel(row.startedAt);
    if (!Number.isFinite(Date.parse(startedAt)))
      throw new Error('Expected a UTC start time.');
    return {
      id: parseLabel(row.id),
      repository: parseLabel(row.repository),
      workflow: parseLabel(row.workflow),
      job: parseLabel(row.job),
      status: parseStatus(row.status),
      startedAt,
      durationSeconds:
        row.durationSeconds === null ? null : parseCount(row.durationSeconds),
    };
  });
}
function member(selection: DimensionSelection) {
  return selection.kind === 'all'
    ? null
    : selection.members[0]?.kind === 'value'
      ? selection.members[0].value
      : null;
}
const operations = {
  runs: app.defineOperation({
    input: parseInput,
    output: parseRuns,
    checks: [
      {
        period: calendar.request({ start: '2026-10-07', end: '2026-10-13' }),
        ci: hierarchy.defaultValue,
        status: null,
      },
    ],
    policy: { maxQueryRows: 20_001, maxDurationMs: 30_000 },
    async run({ query }, input) {
      const result = await query(
        'jobRuns',
        {
          ...input.period.range,
          repository: member(input.ci.selection.repository),
          workflow: member(input.ci.selection.workflow),
          job: member(input.ci.selection.job),
          status: input.status,
        },
        { limit: 20_001 }
      );
      if (result.rows.length > 20_000)
        throw new Error(
          'More than 20,000 jobs match. Narrow the period or CI scope to inspect all runs.'
        );
      return parseRuns(
        result.rows.map(
          ([
            id,
            repository,
            workflow,
            job,
            status,
            startedAt,
            durationSeconds,
          ]) => ({
            id,
            repository,
            workflow,
            job,
            status,
            startedAt,
            durationSeconds,
          })
        )
      );
    },
  }),
};
const dataContext = createDataContext(operations.runs.queryNames)({
  description:
    'Actual CI job executions from ci.main.job_runs. One row per job execution; workflow runs can contain several jobs. October 7–13, 2026 UTC.',
  glossary: {
    jobs: {
      term: 'Job executions',
      definition:
        'Every recorded CI job execution in the selected period and hierarchy. Includes successes, failures, and cancellations.',
      queryNames: ['jobRuns'],
    },
    failures: {
      term: 'Failed jobs',
      definition:
        'Job executions whose recorded status is failure. Cancelled jobs are excluded.',
      queryNames: ['jobRuns'],
    },
    duration: {
      term: 'Duration',
      definition:
        'Recorded duration in seconds. Negative source durations mean unavailable and are shown as missing.',
      queryNames: ['jobRuns'],
    },
  },
});
const { defineTimeView, defineDetailView } = createDataHooks(
  createDataClient({ operations })
);
const overview = defineTimeView({
  operation: 'runs',
  dataContext,
  time: { contract: calendar, defaultValue: { kind: 'preset', id: 'last-7' } },
  variables: { ci: hierarchy },
  input: values => ({ ...values, status: null }),
  isEmpty: rows => rows.length === 0,
  emptyFallback: { title: 'No CI jobs in this scope' },
});
function describeScope(input: Scope & { status?: Status | null }) {
  const selected = hierarchy.levels.flatMap(level => {
    const value = member(input.ci.selection[level.id]);
    return value === null ? [] : [`${level.label}: ${value}`];
  });
  return [
    calendar.describeInput(input.period.range),
    ...selected,
    ...(input.status ? [`Status: ${input.status}`] : []),
  ].join(' · ');
}
const runsView = defineDetailView({
  id: 'job-runs',
  title: 'Job executions',
  operation: 'runs',
  parseInput: operations.runs.input,
  dataContext,
  describeInput: describeScope,
  isEmpty: rows => rows.length === 0,
  emptyFallback: { title: 'No job executions match this scope' },
});
const records = runsView.dataset({
  name: 'Matching job executions',
  select: rows => rows,
  rowKey: row => row.id,
  columns: {
    job: { value: row => row.job },
    repository: { value: row => row.repository },
    workflow: { value: row => row.workflow },
    status: { value: row => row.status },
    startedAt: { value: row => row.startedAt, format: { kind: 'dateTime' } },
    durationSeconds: {
      label: 'Duration (s)',
      value: row => row.durationSeconds,
      format: { kind: 'count' },
    },
  },
  evidence: {
    id: 'job-records',
    glossaryIds: ['jobs', 'duration'],
    queryNames: ['jobRuns'],
  },
});
const recordsContent = runsView.content(source => (
  <TableWidget
    dataset={records}
    source={source}
    pagination={{ pageSize: 25 }}
    description="All matching job executions, newest first. Local search and pagination cover the complete returned population."
  />
));
const jobCount = overview.metric(
  {
    id: 'job-count',
    label: 'Job executions',
    glossaryId: 'jobs',
    format: { kind: 'count' },
  },
  rows => ({ current: rows.length })
);
const failureCount = overview.metric(
  {
    id: 'failure-count',
    label: 'Failed jobs',
    glossaryId: 'failures',
    format: { kind: 'count' },
  },
  rows => ({ current: rows.filter(row => row.status === 'failure').length })
);
const jobRecords = jobCount.records({
  target: runsView,
  input: displayed => displayed,
});
const failureRecords = failureCount.records({
  target: runsView,
  input: displayed => ({ ...displayed, status: 'failure' as const }),
});
function groupRows(rows: readonly JobRun[], key: (row: JobRun) => string) {
  const groups = new Map<
    string,
    { id: string; label: string; count: number }
  >();
  for (const row of rows) {
    const id = key(row);
    const group = groups.get(id) ?? { id, label: id, count: 0 };
    group.count++;
    groups.set(id, group);
  }
  return [...groups.values()].sort(
    (a, b) => b.count - a.count || a.id.localeCompare(b.id)
  );
}
const groups = overview.dataset({
  name: 'Job executions by CI scope',
  select: (rows, input) =>
    groupRows(rows, row => row[input.ci.groupBy]).map(row => ({
      ...row,
      level: input.ci.groupBy,
    })),
  rowKey: row => row.id,
  columns: {
    name: { value: row => row.label },
    jobs: { value: row => row.count, format: { kind: 'count' } },
  },
  evidence: { id: 'ci-groups', glossaryIds: ['jobs'], queryNames: ['jobRuns'] },
});
const days = overview.dataset({
  name: 'Job executions per day',
  select: (rows, input) => {
    const counts = new Map(
      groupRows(rows, row => row.startedAt.slice(0, 10)).map(row => [
        row.id,
        row.count,
      ])
    );
    const days = [];
    for (
      let date = new Date(input.period.range.start + 'T00:00:00Z');
      date.toISOString().slice(0, 10) <= input.period.range.end;
      date.setUTCDate(date.getUTCDate() + 1)
    ) {
      const day = date.toISOString().slice(0, 10);
      days.push({ id: day, label: day, count: counts.get(day) ?? 0 });
    }
    return days;
  },
  rowKey: row => row.id,
  columns: {
    day: { value: row => row.id, format: { kind: 'date' } },
    jobs: { value: row => row.count, format: { kind: 'count' } },
  },
  evidence: { id: 'ci-days', glossaryIds: ['jobs'], queryNames: ['jobRuns'] },
});
const statuses = overview.dataset({
  name: 'Job outcomes',
  select: rows =>
    groupRows(rows, row => row.status).map(row => ({
      ...row,
      status: parseStatus(row.id),
    })),
  rowKey: row => row.id,
  columns: {
    status: { value: row => row.label },
    jobs: { value: row => row.count, format: { kind: 'count' } },
  },
  evidence: {
    id: 'ci-statuses',
    glossaryIds: ['jobs', 'failures'],
    queryNames: ['jobRuns'],
  },
});
const target = overview.hierarchy('ci');
const groupActions = groups.actions(action => ({
  records: action.detail({
    label: 'View job executions',
    target: runsView,
    input: (row, displayed) => ({
      ...displayed,
      ci: hierarchy.filter(displayed.ci, { [row.level]: row.id }),
    }),
  }),
  filter: action.filter({
    label: row => `Filter to this ${row.level}`,
    target,
    values: row => ({ [row.level]: row.id }),
  }),
  descend: action.descend({ target, member: row => row.id }),
}));
const dayActions = days.actions(action => ({
  records: action.detail({
    label: 'View job executions',
    target: runsView,
    input: (row, displayed) => ({
      ...displayed,
      period: calendar.request({ start: row.id, end: row.id }),
    }),
  }),
}));
const statusActions = statuses.actions(action => ({
  records: action.detail({
    label: 'View job executions',
    target: runsView,
    input: (row, displayed) => ({ ...displayed, status: row.status }),
  }),
}));
const content = overview.content(source => (
  <Stack>
    <TextContent>
      <p>
        Explore actual Altertable CI activity for October 7–13, 2026 UTC.
        Repository → Workflow → Job narrows the scope. Open a metric, day, or
        outcome to inspect every contributing job execution.
      </p>
      <p>
        Missing repository values remain “Repository not recorded”; no
        repository is inferred. Negative durations are treated as unavailable.
      </p>
    </TextContent>
    <Grid columns={2}>
      <MetricWidget metric={jobCount} source={source} records={jobRecords} />
      <MetricWidget
        metric={failureCount}
        source={source}
        records={failureRecords}
      />
    </Grid>
    <VisualizationWidget
      dataset={groups}
      source={source}
      actions={groupActions}
      title={
        source.loading
          ? 'CI job executions'
          : `Job executions by ${hierarchy.level(source.input.ci).groupLabel.toLowerCase()}`
      }
    >
      {(rows, actions) => (
        <BarChart
          ariaLabel="CI hierarchy"
          unit="jobs"
          items={rows.map(row => ({ ...row, value: row.count }))}
          itemActions={actions}
        />
      )}
    </VisualizationWidget>
    <Grid columns={2}>
      <VisualizationWidget
        dataset={days}
        source={source}
        actions={dayActions}
        description="Select a UTC day to inspect its job executions, including zero-activity days."
      >
        {(rows, actions) => (
          <LineChart
            ariaLabel="Daily CI jobs"
            unit="jobs"
            items={rows.map(row => ({ ...row, value: row.count }))}
            itemActions={actions}
          />
        )}
      </VisualizationWidget>
      <VisualizationWidget
        dataset={statuses}
        source={source}
        actions={statusActions}
        description="Select a slice or its legend to inspect that outcome."
      >
        {(rows, actions) => (
          <PieChart
            ariaLabel="CI outcomes"
            unit="jobs"
            items={rows.map(row => ({ ...row, value: row.count }))}
            itemActions={actions}
          />
        )}
      </VisualizationWidget>
    </Grid>
  </Stack>
));
function App() {
  return (
    <DataApp
      view={overview}
      datasets={[groups, days, statuses]}
      details={[recordsContent]}
      story={snapshot => [
        {
          id: 'ci-summary',
          headline: `${snapshot.data.filter(row => row.status === 'failure').length} failed job executions`,
          context: `${snapshot.data.length} jobs in ${describeScope(snapshot.input)}. Workflow runs can contain several jobs.`,
          evidence: groups,
          visual: (
            <TableWidget
              dataset={statuses}
              source={snapshot}
              pagination={false}
            />
          ),
        },
      ]}
    >
      <DataSection content={content} />
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app, component: App });
