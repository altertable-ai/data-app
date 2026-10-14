import { defineDataApp } from '@altertable/data-app';
import {
  parseCount,
  parseLabel,
  type HierarchyStateOf,
  type DimensionSelection,
} from '@altertable/data-app/contract';
export const supportApp = defineDataApp({
  title: 'Support workload',
  description:
    'Explore open tickets and overdue work across regions, queues, and agents.',
  scope: { organization: 'demo', environment: 'sample' },
  dateFormatting: { timeZone: 'UTC' },
  queries: {
    regions: {
      statement:
        'SELECT DISTINCT region AS value, region AS label FROM support.queues WHERE ($member IS NULL OR region=$member) ORDER BY region',
      params: { member: { defaultValue: null } },
    },
    queues: {
      statement:
        'SELECT id AS value, name AS label FROM support.queues WHERE region=$region AND ($member IS NULL OR id=$member) ORDER BY name',
      params: { region: {}, member: { defaultValue: null } },
    },
    agents: {
      statement:
        'SELECT a.id AS value, a.name AS label FROM support.agents a JOIN support.queues q ON q.id=a.queue_id WHERE q.region=$region AND a.queue_id=$queue AND ($member IS NULL OR a.id=$member) ORDER BY a.name',
      params: { region: {}, queue: {}, member: { defaultValue: null } },
    },
    summary: {
      statement:
        "SELECT count(*) FILTER (WHERE t.status!='Resolved') AS backlog, count(*) FILTER (WHERE t.status!='Resolved' AND t.due_at<current_timestamp) AS overdue FROM support.tickets t JOIN support.agents a ON a.id=t.agent_id JOIN support.queues q ON q.id=a.queue_id WHERE ($region IS NULL OR q.region=$region) AND ($queue IS NULL OR q.id=$queue) AND ($agent IS NULL OR a.id=$agent)",
      params: {
        region: { defaultValue: null },
        queue: { defaultValue: null },
        agent: { defaultValue: null },
      },
    },
    workload: {
      statement:
        "SELECT CASE $groupBy WHEN 'region' THEN q.region WHEN 'queue' THEN CAST(q.id AS VARCHAR) ELSE CAST(a.id AS VARCHAR) END AS id, CASE $groupBy WHEN 'region' THEN q.region WHEN 'queue' THEN q.name ELSE a.name END AS label, count(t.id) FILTER (WHERE t.status!='Resolved') AS backlog, count(t.id) FILTER (WHERE t.status!='Resolved' AND t.due_at<current_timestamp) AS overdue FROM support.agents a JOIN support.queues q ON q.id=a.queue_id LEFT JOIN support.tickets t ON t.agent_id=a.id WHERE ($region IS NULL OR q.region=$region) AND ($queue IS NULL OR q.id=$queue) AND ($agent IS NULL OR a.id=$agent) GROUP BY 1,2 ORDER BY backlog DESC,label",
      params: {
        region: { defaultValue: null },
        queue: { defaultValue: null },
        agent: { defaultValue: null },
        groupBy: {},
      },
    },
    tickets: {
      statement:
        "SELECT t.id,t.subject,q.name AS queue,a.name AS agent,t.priority,t.status,CAST(t.created_at AS VARCHAR) AS created_at,CAST(t.due_at AS VARCHAR) AS due_at FROM support.tickets t JOIN support.agents a ON a.id=t.agent_id JOIN support.queues q ON q.id=a.queue_id WHERE t.status!='Resolved' AND ($region IS NULL OR q.region=$region) AND ($queue IS NULL OR q.id=$queue) AND ($agent IS NULL OR a.id=$agent) ORDER BY CASE t.priority WHEN 'Urgent' THEN 0 WHEN 'High' THEN 1 ELSE 2 END,t.due_at,t.id",
      params: {
        region: { defaultValue: null },
        queue: { defaultValue: null },
        agent: { defaultValue: null },
      },
    },
    ticket: {
      statement:
        'SELECT t.id,t.subject,q.name AS queue,a.name AS agent,t.priority,t.status,CAST(t.created_at AS VARCHAR) AS created_at,CAST(t.due_at AS VARCHAR) AS due_at FROM support.tickets t JOIN support.agents a ON a.id=t.agent_id JOIN support.queues q ON q.id=a.queue_id WHERE t.id=$ticketId AND ($region IS NULL OR q.region=$region) AND ($queue IS NULL OR q.id=$queue) AND ($agent IS NULL OR a.id=$agent)',
      params: {
        ticketId: {},
        region: { defaultValue: null },
        queue: { defaultValue: null },
        agent: { defaultValue: null },
      },
    },
  },
});
export const teams = supportApp.defineHierarchy({
  key: 'teams',
  label: 'Support teams',
  levels: [
    {
      id: 'region',
      label: 'Region',
      groupLabel: 'Regions',
      valueType: 'string',
      source: { query: 'regions' },
    },
    {
      id: 'queue',
      label: 'Queue',
      groupLabel: 'Queues',
      valueType: 'number',
      source: {
        query: 'queues',
      },
    },
    {
      id: 'agent',
      label: 'Agent',
      groupLabel: 'Agents',
      valueType: 'number',
      source: {
        query: 'agents',
      },
    },
  ],
});
export type SupportInput = { teams: HierarchyStateOf<typeof teams> };
export type Workload = {
  level: 'region' | 'queue' | 'agent';
  id: string;
  label: string;
  backlog: number;
  overdue: number;
};
export type Ticket = {
  id: number;
  subject: string;
  queue: string;
  agent: string;
  priority: string;
  status: string;
  createdAt: string;
  dueAt: string;
};
export type Overview = {
  backlog: number;
  overdue: number;
  groups: Workload[];
  tickets: Ticket[];
};
function member(selection: DimensionSelection) {
  const value = selection.kind === 'all' ? undefined : selection.members[0];
  return value?.kind === 'value' ? value.value : null;
}
function params(input: SupportInput) {
  return {
    region: member(input.teams.selection.region),
    queue: member(input.teams.selection.queue),
    agent: member(input.teams.selection.agent),
  };
}
function utcTime(value: unknown) {
  const date = new Date(parseLabel(value).replace(' ', 'T') + 'Z');
  if (!Number.isFinite(date.getTime()))
    throw Error('Expected a UTC timestamp.');
  return date.toISOString();
}
function ticket(row: unknown[]): Ticket {
  return {
    id: parseCount(row[0]),
    subject: parseLabel(row[1]),
    queue: parseLabel(row[2]),
    agent: parseLabel(row[3]),
    priority: parseLabel(row[4]),
    status: parseLabel(row[5]),
    createdAt: utcTime(row[6]),
    dueAt: utcTime(row[7]),
  };
}
export const operations = {
  overview: supportApp.defineOperation({
    input: teams.input(() => ({})),
    output: value => value as Overview,
    checks: [{ teams: teams.defaultValue }],
    policy: { maxQueryRows: 200, maxDurationMs: 15000 },
    async run({ query }, input) {
      const scope = params(input);
      const [summary, workload, tickets] = await Promise.all([
        query('summary', scope),
        query('workload', { ...scope, groupBy: input.teams.groupBy }),
        query('tickets', scope, { limit: 50 }),
      ]);
      const totals = summary.rows[0]!;
      return {
        backlog: parseCount(totals[0]),
        overdue: parseCount(totals[1]),
        groups: workload.rows.map(row => ({
          level: input.teams.groupBy,
          id: parseLabel(row[0]),
          label: parseLabel(row[1]),
          backlog: parseCount(row[2]),
          overdue: parseCount(row[3]),
        })),
        tickets: tickets.rows.map(ticket),
      };
    },
  }),
  ticket: supportApp.defineOperation({
    input: teams.input(value => {
      const id = parseCount((value as { ticketId: unknown }).ticketId);
      if (id < 1) throw Error('Expected ticket ID.');
      return { ticketId: id };
    }),
    output: value => value as Ticket | null,
    checks: [{ teams: teams.defaultValue, ticketId: 4001 }],
    policy: { maxQueryRows: 200, maxDurationMs: 15000 },
    async run({ query }, input) {
      const result = await query('ticket', {
        ...params(input),
        ticketId: input.ticketId,
      });
      return result.rows[0] ? ticket(result.rows[0]) : null;
    },
  }),
};
