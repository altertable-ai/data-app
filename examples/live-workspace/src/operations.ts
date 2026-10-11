import { dataApp } from "#config";
import { calendar, organization, hasApps } from "#app/variables.ts";
import {
  parseEmptyInput,
  parseDimensionSelection,
  parseBooleanSelection,
  type DimensionSelection,
  type BooleanSelection,
  rowsAsRecords,
  type DateRangeRequest,
} from "@altertable/data-app/contract";
export type Input = {
  period: DateRangeRequest;
  q: string;
  organization: DimensionSelection<string>;
  hasApps: BooleanSelection;
  sort: "name" | "updated";
};
export type Workspace = {
  id: string;
  name: string;
  slug: string;
  environments: number;
  apps: number;
  created: string;
  updated: string;
};
export type AppRecord = {
  id: string;
  title: string;
  slug: string;
  workspace: string;
  workspaceSlug: string;
  environment: string;
  created: string;
  updated: string;
};
export type Inventory = { workspaces: Workspace[]; apps: AppRecord[] };
function parseInput(value: unknown): Input {
  if (!value || typeof value !== "object") throw new Error("Expected inventory inputs.");
  const v = value as Record<string, unknown>;
  if (typeof v.q !== "string" || v.q.length > 200 || (v.sort !== "name" && v.sort !== "updated"))
    throw new Error("Invalid inventory filters.");
  return {
    period: calendar.parseRequest(v.period),
    q: v.q,
    organization: parseDimensionSelection(v.organization, organization),
    hasApps: parseBooleanSelection(v.hasApps, hasApps),
    sort: v.sort,
  };
}
function parseRows<Row>(
  value: unknown,
  strings: readonly string[],
  counts: readonly string[] = [],
): Row[] {
  if (!Array.isArray(value)) throw new Error("Expected rows.");
  return value.map((row) => {
    if (
      !row ||
      typeof row !== "object" ||
      strings.some((key) => typeof (row as Record<string, unknown>)[key] !== "string") ||
      counts.some((key) => !Number.isInteger((row as Record<string, unknown>)[key]))
    )
      throw new Error("Unexpected inventory row.");
    return row as Row;
  });
}
function filterInventory(data: Inventory, input: Input): Inventory {
  const member = input.organization.kind === "include" ? input.organization.members[0] : undefined;
  const workspace = member?.kind === "value" ? member.value : null;
  const query = input.q.toLocaleLowerCase();
  const inPeriod = (date: string) =>
    date.slice(0, 10) >= input.period.range.start && date.slice(0, 10) <= input.period.range.end;
  const matches = (text: string) => text.toLocaleLowerCase().includes(query);
  const apps = data.apps.filter(
    (row) =>
      inPeriod(row.updated) &&
      (!workspace || row.workspaceSlug === workspace) &&
      (input.hasApps.kind !== "is" || input.hasApps.value) &&
      (matches(row.title) || matches(row.workspace) || matches(row.slug)),
  );
  const appWorkspaces = new Set(apps.map((row) => row.workspaceSlug));
  const workspaces = data.workspaces.filter(
    (row) =>
      inPeriod(row.updated) &&
      (!workspace || row.slug === workspace) &&
      (input.hasApps.kind !== "is" || row.apps > 0 === input.hasApps.value) &&
      (matches(row.name) || matches(row.slug) || appWorkspaces.has(row.slug)),
  );
  apps.sort((a, b) =>
    input.sort === "name"
      ? a.title.localeCompare(b.title) || a.id.localeCompare(b.id)
      : b.updated.localeCompare(a.updated) || a.id.localeCompare(b.id),
  );
  workspaces.sort((a, b) =>
    input.sort === "name"
      ? a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
      : b.updated.localeCompare(a.updated) || a.id.localeCompare(b.id),
  );
  return { workspaces, apps };
}

export const operations = {
  inventory: dataApp.defineOperation<Input, Inventory>({
    input: parseInput,
    output(value: unknown): Inventory {
      const v = value as Inventory;
      return {
        workspaces: parseRows<Workspace>(
          v.workspaces,
          ["id", "name", "slug", "created", "updated"],
          ["environments", "apps"],
        ),
        apps: parseRows<AppRecord>(v.apps, [
          "id",
          "title",
          "slug",
          "workspace",
          "workspaceSlug",
          "environment",
          "created",
          "updated",
        ]),
      };
    },
    checks: [
      {
        period: calendar.request({ start: "2026-09-01", end: "2026-10-11" }),
        q: "",
        organization: { kind: "all" },
        hasApps: { kind: "all" },
        sort: "updated",
      },
      {
        period: calendar.request({ start: "2026-09-01", end: "2026-10-11" }),
        q: "taxi",
        organization: { kind: "all" },
        hasApps: { kind: "is", value: true },
        sort: "name",
      },
      {
        period: calendar.request({ start: "2026-09-01", end: "2026-10-11" }),
        q: "no-such-workspace-xyz",
        organization: { kind: "all" },
        hasApps: { kind: "all" },
        sort: "name",
      },
    ],
    policy: { maxQueryRows: 400, maxDurationMs: 20000 },
    async run({ query }, input) {
      const [workspaces, apps] = await Promise.all([
        query("workspaces", {}, { limit: 200 }),
        query("apps", {}, { limit: 200 }),
      ]);
      const raw = {
        workspaces: parseRows<Workspace>(
          rowsAsRecords(workspaces, [
            "id",
            "name",
            "slug",
            "environments",
            "apps",
            "created",
            "updated",
          ]),
          ["id", "name", "slug", "created", "updated"],
          ["environments", "apps"],
        ),
        apps: parseRows<AppRecord>(
          rowsAsRecords(apps, [
            "id",
            "title",
            "slug",
            "workspace",
            "workspaceSlug",
            "environment",
            "created",
            "updated",
          ]),
          ["id", "title", "slug", "workspace", "environment", "created", "updated"],
        ),
      };
      return filterInventory(raw, input);
    },
  }),
  "workspace-options": dataApp.defineOperation({
    input: parseEmptyInput,
    output(value: unknown) {
      return parseRows<{ value: string; label: string }>(value, ["value", "label"]);
    },
    checks: [{}],
    policy: { maxQueryRows: 200, maxDurationMs: 15000 },
    async run({ query }) {
      return parseRows<{ value: string; label: string }>(
        rowsAsRecords(await query("workspaceOptions", {}), ["value", "label"]),
        ["value", "label"],
      );
    },
  }),
};
