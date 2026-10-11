import { defineDataApp } from "@altertable/data-app";
export const dataApp = defineDataApp({
  title: "Live workspace explorer",
  description:
    "Browse real workspaces and data apps, compare inventory, and inspect recent updates.",
  scope: {
    organization: "Altertable",
    environment: "production",
  },
  appearance: {
    theme: "system",
    baseColor: "neutral",
  },
  dateFormatting: {
    locale: "en-GB",
    timeZone: "UTC",
  },
  queries: {
    workspaces: {
      statement:
        "WITH ac AS (SELECT organization_id, count(*) AS apps, max(updated_at) AS updated FROM app_pg.public.data_apps WHERE deleted_at IS NULL GROUP BY organization_id), ec AS (SELECT organization_id, count(*) AS environments FROM app_pg.public.environments WHERE deleted_at IS NULL GROUP BY organization_id)\nSELECT CAST(o.id AS VARCHAR) AS id, o.name, o.slug, CAST(coalesce(ec.environments,0) AS INTEGER) AS environments, CAST(coalesce(ac.apps,0) AS INTEGER) AS apps, strftime(o.created_at,'%Y-%m-%dT%H:%M:%S.%fZ') AS created, strftime(greatest(o.updated_at,coalesce(ac.updated,o.updated_at)),'%Y-%m-%dT%H:%M:%S.%fZ') AS updated FROM app_pg.public.organizations o LEFT JOIN ac ON ac.organization_id=o.id LEFT JOIN ec ON ec.organization_id=o.id WHERE o.deleted_at IS NULL ORDER BY greatest(o.updated_at,coalesce(ac.updated,o.updated_at)) DESC,o.id LIMIT 200",
      params: {},
    },
    apps: {
      statement:
        "WITH ac AS (SELECT organization_id, count(*) AS apps, max(updated_at) AS updated FROM app_pg.public.data_apps WHERE deleted_at IS NULL GROUP BY organization_id), ec AS (SELECT organization_id, count(*) AS environments FROM app_pg.public.environments WHERE deleted_at IS NULL GROUP BY organization_id)\nSELECT CAST(a.id AS VARCHAR) AS id,v.title,a.slug,o.name AS workspace,o.slug AS workspaceSlug,e.name AS environment,strftime(a.created_at,'%Y-%m-%dT%H:%M:%S.%fZ') AS created,strftime(a.updated_at,'%Y-%m-%dT%H:%M:%S.%fZ') AS updated FROM app_pg.public.data_apps a JOIN app_pg.public.data_app_versions v ON v.id=a.latest_version_id JOIN app_pg.public.organizations o ON o.id=a.organization_id JOIN app_pg.public.environments e ON e.id=a.environment_id LEFT JOIN ac ON ac.organization_id=o.id WHERE a.deleted_at IS NULL AND e.deleted_at IS NULL AND o.deleted_at IS NULL ORDER BY a.updated_at DESC,a.id LIMIT 200",
      params: {},
    },
    workspaceOptions: {
      statement:
        "SELECT slug AS value, CASE WHEN count(*) OVER (PARTITION BY name) > 1 THEN name || ' · ' || slug ELSE name END AS label FROM app_pg.public.organizations WHERE deleted_at IS NULL ORDER BY name,slug LIMIT 200",
      params: {},
    },
  },
});
