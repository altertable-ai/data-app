import {
  defineOperation,
  parseEmptyInput,
  parseTrue,
} from '@altertable/data-app/contract';

/** A connectivity probe through the registered `connection-check` query. */
export function connectionOperation(name = 'connection-check') {
  return defineOperation({
    input: parseEmptyInput,
    output: parseTrue,
    checks: [{}],
    queryNames: { connection: name },
    policy: { maxQueryRows: 1, maxDurationMs: 15_000, exposeSql: true },
    async run({ query }): Promise<true> {
      await query(name, {});
      return true;
    },
  });
}
