import { formatDate } from "@altertable/data-app/format";
import { dataApp } from "#config";
import { createDataClient } from "@altertable/data-app/client";
import { LineChart, useAppVariables } from "@altertable/data-app/react/ui";
import {
  createDataHooks,
  DataApp,
  DataSection,
  TableWidget,
  MetricWidget,
  VisualizationWidget,
  SectionHeading,
  Stack,
  Grid,
  Ranking,
  choiceVariable,
  searchVariable,
} from "@altertable/data-app/react";
import type { operations } from "#app/operations.ts";
import { dataContext, DataIdentifier } from "#app/data-context.ts";
import { calendar, hasApps, organization } from "#app/variables.ts";
const hooks = createDataHooks(createDataClient<typeof operations>());
const variables = {
  q: searchVariable({ key: "q", label: "Search workspaces and apps" }),
  organization,
  hasApps,
  sort: choiceVariable({
    key: "sort",
    label: "Sort by",
    defaultValue: "updated",
    options: [
      { id: "updated", label: "Last updated" },
      { id: "name", label: "Name" },
    ],
    presentation: { group: "display" },
  }),
};
const view = hooks.defineTimeView({
  operation: "inventory",
  dataContext,
  time: {
    contract: calendar,
    defaultValue: { kind: "dates", start: "2026-09-01", end: "2026-10-11" },
  },
  variables,
  input(values) {
    return {
      period: values.period,
      q: values.q,
      organization: values.organization,
      hasApps: values.hasApps,
      sort: values.sort as "name" | "updated",
    };
  },
  bindings: { period: (input) => input.period },
  isEmpty: () => false,
  emptyFallback: { title: "No matching records" },
});
const workspaces = view.dataset({
  name: "Workspaces",
  select: (data) => data.workspaces,
  rowKey: (row) => row.id,
  columns: {
    name: { label: "Workspace", value: (row) => row.name },
    slug: { label: "Workspace ID", value: (row) => row.slug },
    environments: { value: (row) => row.environments, format: { kind: "count" } },
    apps: { label: "Total apps", value: (row) => row.apps, format: { kind: "count" } },
    created: { value: (row) => row.created, format: { kind: "dateTime" } },
    updated: { value: (row) => row.updated, format: { kind: "dateTime" } },
  },
  evidence: { id: "workspaces", glossaryIds: ["workspaces"] },
  emptyFallback: { title: "No matching workspaces" },
  suggestions: { title: (row) => row.name, description: (row) => `Workspace · ${row.apps} apps` },
});
const apps = view.dataset({
  name: "Data apps",
  select: (data) => data.apps,
  rowKey: (row) => row.id,
  columns: {
    title: { label: "Data app", value: (row) => row.title },
    slug: { label: "App ID", value: (row) => row.slug },
    workspace: { value: (row) => row.workspace },
    environment: { value: (row) => row.environment },
    updated: { value: (row) => row.updated, format: { kind: "dateTime" } },
  },
  evidence: { id: "apps", glossaryIds: ["apps"] },
  emptyFallback: { title: "No matching data apps" },
  suggestions: {
    title: (row) => row.title,
    description: (row) => `${row.workspace} · ${row.environment}`,
  },
});
const workspaceCount = view.metric(
  { id: "workspace-count", glossaryId: "workspaces", format: { kind: "count" } },
  (data) => ({ current: data.workspaces.length }),
);
const appCount = view.metric(
  { id: "app-count", glossaryId: "apps", format: { kind: "count" } },
  (data) => ({ current: data.apps.length }),
);
const environmentCount = view.metric(
  { id: "environment-count", glossaryId: "environments", format: { kind: "count" } },
  (data) => ({ current: data.workspaces.reduce((total, row) => total + row.environments, 0) }),
);
const appsByWorkspace = view.dataset({
  name: "Apps by workspace",
  select(data) {
    const groups = new Map<string, { id: string; label: string; value: number }>();
    for (const row of data.apps) {
      const item = groups.get(row.workspaceSlug) ?? {
        id: row.workspaceSlug,
        label: row.workspace,
        value: 0,
      };
      item.value++;
      groups.set(row.workspaceSlug, item);
    }
    return [...groups.values()].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  },
  rowKey: (row) => row.id,
  columns: { workspace: { value: (row) => row.label }, apps: { value: (row) => row.value } },
  evidence: { id: "apps-by-workspace", glossaryIds: ["apps"] },
  emptyFallback: { title: "No apps to compare" },
});
const updates = view.dataset({
  name: "Updates by month",
  select(data, input) {
    const counts = new Map<string, number>();
    const month = new Date(`${input.period.range.start.slice(0, 7)}-01T00:00:00Z`);
    while (month.toISOString().slice(0, 7) <= input.period.range.end.slice(0, 7)) {
      counts.set(month.toISOString().slice(0, 7), 0);
      month.setUTCMonth(month.getUTCMonth() + 1);
    }
    for (const row of [...data.workspaces, ...data.apps]) {
      const month = row.updated.slice(0, 7);
      counts.set(month, (counts.get(month) ?? 0) + 1);
    }
    return [...counts]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({
        id: month,
        label: formatDate(`${month}-01`, dataApp.dateFormatting),
        value,
      }));
  },
  rowKey: (row) => row.id,
  columns: { month: { value: (row) => row.label }, records: { value: (row) => row.value } },
  evidence: { id: "monthly-updates", queryNames: ["workspaces", "apps"] },
  emptyFallback: { title: "No updates in this period" },
});
function WorkspaceTables({ source }: { source: Parameters<typeof workspaces.read>[0] }) {
  const filters = useAppVariables({ organization, hasApps });
  const active =
    !source.loading &&
    (source.input.organization.kind !== "all" || source.input.hasApps.kind !== "all");
  return (
    <Stack>
      <TableWidget
        dataset={apps}
        source={source}
        headingLevel={3}
        onClearFilters={active ? filters.clearAll : undefined}
        noMatchesFallback={{
          title: "No matching data apps",
          description: "Try another search, workspace, or update period.",
        }}
      />
      <TableWidget
        dataset={workspaces}
        source={source}
        headingLevel={3}
        onClearFilters={active ? filters.clearAll : undefined}
        noMatchesFallback={{
          title: "No matching workspaces",
          description: "Try another search or clear the workspace and app filters.",
        }}
      />
    </Stack>
  );
}
const content = view.content((source) => (
  <Stack gap="lg">
    <SectionHeading>Matching inventory</SectionHeading>
    <Grid columns={3} minItemWidth="compact">
      <MetricWidget metric={workspaceCount} source={source} headingLevel={3} />
      <MetricWidget metric={appCount} source={source} headingLevel={3} />
      <MetricWidget metric={environmentCount} source={source} headingLevel={3} />
    </Grid>
    <Grid columns={2}>
      <VisualizationWidget dataset={appsByWorkspace} source={source} headingLevel={3}>
        {(rows) => <Ranking items={rows.slice(0, 8)} aria-label="Apps by workspace" />}
      </VisualizationWidget>
      <VisualizationWidget dataset={updates} source={source} headingLevel={3}>
        {(rows) => (
          <LineChart items={rows} unit="records" ariaLabel="Latest record updates by month" />
        )}
      </VisualizationWidget>
    </Grid>
    <SectionHeading>Browse records</SectionHeading>
    <WorkspaceTables source={source} />
  </Stack>
));
export function App() {
  return (
    <DataApp
      footer={
        <>
          <p>
            Live metadata from <DataIdentifier id="tables.organizations" /> and{" "}
            <DataIdentifier id="tables.dataApps" />. Each list is limited to 200 records.
          </p>
          <p>
            <strong>Interpretation.</strong> Workspace totals reflect current inventory; the period
            filters records by their update time. Monthly counts describe each record’s latest
            update, not an activity log.
          </p>
        </>
      }
      view={view}
      datasets={[workspaces, apps, appsByWorkspace, updates]}
      story={(snapshot) => [
        {
          id: "inventory",
          headline: `${snapshot.data.workspaces.length} workspaces and ${snapshot.data.apps.length} apps match this selection`,
          context: view.scope(snapshot),
          visual: (
            <Grid columns={2}>
              <MetricWidget metric={workspaceCount} source={snapshot} />
              <MetricWidget metric={appCount} source={snapshot} />
            </Grid>
          ),
          evidence: workspaces,
        },
        {
          id: "apps-by-workspace",
          headline: "Where the matching apps live",
          context: "Counts use the displayed app records.",
          visual: (
            <VisualizationWidget dataset={appsByWorkspace} source={snapshot}>
              {(rows) => <Ranking items={rows.slice(0, 8)} aria-label="Apps by workspace" />}
            </VisualizationWidget>
          ),
          evidence: appsByWorkspace,
        },
      ]}
    >
      <DataSection content={content} />
    </DataApp>
  );
}
