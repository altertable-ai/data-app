import page from "#app/index.html";
import { serveLocalApp } from "@altertable/data-app/server/bun";
import { operations } from "#app/operations.ts";
import { dataApp } from "#config";
serveLocalApp({ page, operations, title: dataApp.title });
