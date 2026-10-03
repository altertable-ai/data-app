import { invariant } from '@/src/core/invariant';
import {
  defineQueryVariables,
  type QueryVariableDefinitions,
} from '@/src/core/query-variables';
import { queryVariableNames } from '@/src/core/query-template';
import type { DataOperations } from '@/src/core/operation-types';

export type DataAppRegistration = {
  queries: Record<string, string>;
  variables: QueryVariableDefinitions;
};

/** Full replacement metadata for hosted app creation/update; query IDs are the existing query names. */
export function getDataAppRegistration(
  operations: DataOperations
): DataAppRegistration {
  const queries: Record<string, string> = Object.create(null);
  const variables: QueryVariableDefinitions = Object.create(null);
  for (const operation of Object.values(operations)) {
    invariant(
      operation.queries,
      'Hosted operations must declare their query statements.'
    );
    for (const [name, definition] of Object.entries(
      operation.variables ?? {}
    )) {
      invariant(
        !Object.hasOwn(variables, name) ||
          JSON.stringify(variables[name]) === JSON.stringify(definition),
        `Conflicting variable: ${name}.`
      );
      variables[name] = definition;
    }
    for (const [name, statement] of Object.entries(operation.queries)) {
      invariant(
        !Object.hasOwn(queries, name) || queries[name] === statement,
        `Conflicting query: ${name}.`
      );
      queries[name] = statement;
      queryVariableNames(statement, operation.variables ?? {});
    }
  }
  defineQueryVariables(variables);
  return { queries, variables };
}
