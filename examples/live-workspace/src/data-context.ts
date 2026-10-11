import { createDataContext, defineDataIdentifiers } from "@altertable/data-app/react";
export const { definitions: identifiers, DataIdentifier } = defineDataIdentifiers({
  tables: {
    organizations: { catalog: "app_pg", schema: "public", name: "organizations" },
    dataApps: { catalog: "app_pg", schema: "public", name: "data_apps" },
    versions: { catalog: "app_pg", schema: "public", name: "data_app_versions" },
  },
  columns: {},
});
export const dataContext = createDataContext({
  workspaces: "workspaces",
  apps: "apps",
  workspaceOptions: "workspaceOptions",
})({
  identifiers,
  description:
    "Live inventory from app_pg.public.organizations, environments, data_apps and their current versions. Metadata timestamps are UTC.",
  glossary: {
    workspaces: {
      term: "Workspaces",
      definition:
        "Active organizations matching search and their latest organization or app update in the period.",
      queryNames: ["workspaces"],
    },
    apps: {
      term: "Data apps",
      definition:
        "Active apps matching search and their update time in the period. Titles come from their latest version.",
      queryNames: ["apps"],
    },
    environments: {
      term: "Environments",
      definition: "Current active environments belonging to the displayed workspaces.",
      queryNames: ["workspaces"],
    },
  },
});
