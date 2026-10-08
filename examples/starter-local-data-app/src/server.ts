import page from "#app/index.html";
import { serveLocalApp } from "@altertable/data-app/server/bun";
import { operations } from "#app/operations.ts";
import app from "#config";

// Registered SQL is read from queries.json beside this file.
serveLocalApp({ page, operations, title: app.title });
