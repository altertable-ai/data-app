import { createDataClient } from '@altertable/data-app/client';
import {
  createDataHooks,
  createDataContext,
  DataApp,
  DataSection,
  MetricWidget,
  VisualizationWidget,
  TableWidget,
  TextWidget,
  Grid,
  Stack,
  injectDataAppStyles,
  mountDataApp,
} from '@altertable/data-app/react';
import { BarChart } from '@altertable/data-app/react/ui';
import { supportApp, teams, workloadBy, operations } from '@/dev/support';
const client = createDataClient({ operations });
const { defineDataView, defineDetailView } = createDataHooks(client);
const context = createDataContext(operations.overview.queryNames)({
  description: 'Current support workload by assigned region, queue, and agent.',
  glossary: {
    backlog: {
      term: 'Open backlog',
      definition: 'Open and pending tickets. Resolved tickets are excluded.',
      queryNames: ['summary', 'workload', 'tickets'],
    },
    overdue: {
      term: 'Overdue tickets',
      definition: 'Open or pending tickets whose due time has passed.',
      queryNames: ['summary', 'workload'],
    },
  },
});
const view = defineDataView({
  operation: 'overview',
  describeInput: input => teams.describe?.(input.teams) ?? 'All support teams',
  variables: { teams, workloadBy },
  dataContext: context,
  isEmpty: data => data.groups.length === 0,
  emptyFallback: { title: 'No teams match this selection' },
});
const groups = view.dataset({
  name: 'Team workload',
  select: data => data.groups,
  rowKey: row => row.id,
  columns: {
    team: { value: row => row.label },
    backlog: { value: row => row.backlog, format: { kind: 'count' } },
    overdue: { value: row => row.overdue, format: { kind: 'count' } },
  },
  evidence: {
    id: 'workload',
    queryNames: ['workload'],
    glossaryIds: ['backlog', 'overdue'],
  },
});
const tickets = view.dataset({
  name: 'Priority tickets',
  select: data => data.tickets,
  rowKey: row => row.id,
  columns: {
    ticket: { value: row => row.id },
    subject: { value: row => row.subject },
    queue: { value: row => row.queue },
    agent: { value: row => row.agent },
    priority: { value: row => row.priority },
    status: { value: row => row.status },
    due: { value: row => row.dueAt, format: { kind: 'dateTime' } },
  },
  evidence: {
    id: 'tickets',
    queryNames: ['tickets'],
    glossaryIds: ['backlog'],
  },
});
const backlog = view.metric(
  {
    id: 'backlog',
    label: 'Open backlog',
    glossaryId: 'backlog',
    format: { kind: 'count' },
  },
  data => ({ current: data.backlog })
);
const overdue = view.metric(
  {
    id: 'overdue',
    label: 'Overdue tickets',
    glossaryId: 'overdue',
    format: { kind: 'count' },
  },
  data => ({ current: data.overdue })
);
const ticketContext = createDataContext(operations.ticket.queryNames)({
  description: 'The selected ticket within the displayed team scope.',
  glossary: {},
});
const detail = defineDetailView({
  id: 'ticket',
  title: 'Ticket details',
  operation: 'ticket',
  parseInput: operations.ticket.input,
  dataContext: ticketContext,
  describeInput: input => `Ticket #${input.ticketId}`,
  isEmpty: data => data === null,
  emptyFallback: { title: 'Ticket is not available in this scope' },
});
const detailContent = detail.content(source =>
  source.loading || !source.data ? null : (
    <Stack>
      <p>
        <strong>{source.data.subject}</strong>
      </p>
      <p>
        {source.data.queue} · {source.data.agent}
      </p>
      <p>
        {source.data.priority} priority · {source.data.status}
      </p>
      <p>
        Due{' '}
        {new Intl.DateTimeFormat('en', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'UTC',
        }).format(new Date(source.data.dueAt))}{' '}
        UTC
      </p>
    </Stack>
  )
);
const exploration = view.breakdown('workloadBy');
const groupActions = groups.actions(action => ({
  filter: action.filter({
    label: row => `Filter to this ${row.level}`,
    target: exploration,
    values: row =>
      row.level === 'region'
        ? { region: row.id }
        : row.level === 'queue'
          ? { queue: Number(row.id) }
          : { agent: Number(row.id) },
  }),
  descend: action.descend({
    target: exploration,
    member: row => (row.level === 'region' ? row.id : Number(row.id)),
  }),
}));
const ticketActions = tickets.actions(action => ({
  details: action.detail({
    label: 'View ticket',
    target: detail,
    input: (row, input) => ({ ...input, ticketId: row.id }),
  }),
}));
const content = view.content(source => (
  <Stack>
    <TextWidget
      dataset={groups}
      source={source}
      title="Today’s support workload"
    >
      {() =>
        source.loading ? null : (
          <p>
            {source.data.overdue} overdue tickets need attention across{' '}
            {source.data.backlog} open or pending tickets. Review queues, then
            investigate individual tickets.
          </p>
        )
      }
    </TextWidget>
    <Grid columns={2}>
      <MetricWidget metric={backlog} source={source} />
      <MetricWidget metric={overdue} source={source} />
    </Grid>
    <VisualizationWidget
      dataset={groups}
      breakdown={exploration}
      source={source}
      actions={groupActions}
      title={
        source.loading
          ? 'Open backlog'
          : `Open backlog by ${workloadBy.level(source.input.workloadBy, source.input.teams).groupLabel.toLowerCase()}`
      }
      description="Explore a team to focus the workload or break it down further."
    >
      {(rows, actions) => (
        <BarChart
          ariaLabel="Support workload"
          unit="tickets"
          items={rows.map(row => ({ ...row, value: row.backlog }))}
          itemActions={actions}
        />
      )}
    </VisualizationWidget>
    <TableWidget
      dataset={tickets}
      source={source}
      actions={ticketActions}
      title="Priority tickets"
      description="Up to 50 open or pending tickets, ordered by priority then due time. Dates are UTC."
      pagination={{ pageSize: 10 }}
    />
  </Stack>
));
function App() {
  return (
    <DataApp
      view={view}
      datasets={[groups, tickets]}
      details={[detailContent]}
      story={snapshot => [
        {
          id: 'backlog',
          headline: `${snapshot.data.overdue} overdue tickets need attention`,
          context: `${snapshot.data.backlog} open or pending tickets in the selected teams.`,
          visual: (
            <TableWidget
              dataset={groups}
              source={snapshot}
              pagination={false}
            />
          ),
          evidence: groups,
        },
      ]}
    >
      <DataSection content={content} />
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app: supportApp, component: App });
