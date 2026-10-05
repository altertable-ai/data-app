import { invariant } from '@/src/core/invariant';
import {
  defineQueryVariables,
  type QueryVariableDefinitions,
} from '@/src/core/query-variables';
import { queryVariableNames } from '@/src/core/query-template';

export type DataAppRegistration = {
  queries: Record<string, string>;
  variables: QueryVariableDefinitions;
};

/** Validate separate, server-owned registration before saving or serving an app revision. */
export function defineDataAppRegistration(value: unknown): DataAppRegistration {
  const registration = value as DataAppRegistration;
  invariant(
    !!registration &&
      typeof registration === 'object' &&
      !Array.isArray(registration),
    'Expected app registration.'
  );
  invariant(
    Object.keys(registration).every(key =>
      ['queries', 'variables'].includes(key)
    ),
    'Unknown registration field.'
  );
  invariant(
    !!registration.queries &&
      typeof registration.queries === 'object' &&
      !Array.isArray(registration.queries),
    'Expected a query map.'
  );
  defineQueryVariables(registration.variables);
  for (const [name, statement] of Object.entries(registration.queries)) {
    invariant(
      !!name.trim() &&
        name.length <= 256 &&
        !['__proto__', 'constructor', 'prototype'].includes(name),
      'Invalid query name.'
    );
    queryVariableNames(statement, registration.variables);
  }
  return registration;
}
