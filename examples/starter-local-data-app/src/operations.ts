import { defineOperation, parseEmptyInput, parseTrue } from "@altertable/data-app/contract";
import { queryNames } from "#app/query-names.ts";

/** Connectivity probe only: its successful query supplies no analytical result. Replace it with
 * bounded, validated operations that cover the questions the finished app will answer. */
export const operations = {
  connection: defineOperation({
    input: parseEmptyInput,
    output: parseTrue,
    checks: [{}],
    queryNames,
    policy: { maxQueryRows: 1, maxDurationMs: 15_000, exposeSql: true },
    async run({ query }): Promise<true> {
      await query(queryNames.connection, {});
      return true;
    },
  }),
};
