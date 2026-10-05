import { connectionCheck } from "@altertable/data-app/contract";

/** Browser-owned operation. Its SQL lives only in queries.json on the local host. */
export const operations = { connection: connectionCheck() };
