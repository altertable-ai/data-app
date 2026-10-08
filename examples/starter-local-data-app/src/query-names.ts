import { defineQueryNames } from "@altertable/data-app/contract";

/** Registered query IDs shared by server operations and browser evidence; SQL lives in queries.json. */
export const queryNames = defineQueryNames({ connection: "connection-check" });
