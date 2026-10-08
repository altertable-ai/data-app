import page from "#app/index.html";
import { serveLocalApp } from "@altertable/data-app/server/bun";
import { operations } from "#app/operations.ts";
import { DATA_APP_CONFIG as app } from "#config";

serveLocalApp({ page, operations, title: app.title });
