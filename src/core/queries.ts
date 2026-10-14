import { invariant } from '@/src/core/invariant';
import { isRecord, type ValidationIssue } from '@/src/core/validation';

export type QueryParameterValue = string | number | boolean | null;
type QueryDefinition = {
  statement: string;
  params: Readonly<Record<string, { defaultValue?: QueryParameterValue }>>;
};
export type QueryDefinitions = Readonly<Record<string, QueryDefinition>>;

/** Parameters are scalar SQL values, never identifiers or SQL fragments. */
export type QueryParameters = Readonly<Record<string, QueryParameterValue>>;

function isQueryParameterValue(value: unknown): value is QueryParameterValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

export function isQueryParameters(value: unknown): value is QueryParameters {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.values(value).every(isQueryParameterValue)
  );
}

/** Shared declaration validation for runtime snapshots and static manifests. */
export function validateQueries(value: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value))
    return [{ path: [], message: 'Expected a query registry object.' }];
  for (const [name, query] of Object.entries(value)) {
    if (!isRecord(query)) {
      issues.push({ path: [name], message: 'Expected a query object.' });
      continue;
    }
    if (
      !name.trim() ||
      typeof query.statement !== 'string' ||
      !query.statement.trim()
    )
      issues.push({
        path: [name, 'statement'],
        message: 'Queries need a name and SQL statement.',
      });
    if (!isRecord(query.params)) {
      issues.push({
        path: [name, 'params'],
        message: 'Expected parameter declarations as an object.',
      });
      continue;
    }
    for (const [key, declaration] of Object.entries(query.params)) {
      if (!isRecord(declaration)) {
        issues.push({
          path: [name, 'params', key],
          message: 'Expected a parameter declaration object.',
        });
        continue;
      }
      if (
        Object.hasOwn(declaration, 'defaultValue') &&
        !isQueryParameterValue(declaration.defaultValue)
      )
        issues.push({
          path: [name, 'params', key, 'defaultValue'],
          message: `Invalid default for parameter ${key} in query ${name}.`,
        });
    }
  }
  return issues;
}

/** Retain authored statements and defaults, rejecting empty SQL and invalid scalar defaults. */
export function snapshotQueries(
  definitions: QueryDefinitions
): QueryDefinitions {
  const [issue] = validateQueries(definitions);
  invariant(!issue, issue?.message ?? 'Invalid query registry.');
  return Object.freeze(
    Object.fromEntries(
      Object.entries(definitions).map(([name, query]) => {
        const params = Object.freeze(
          Object.fromEntries(
            Object.entries(query.params).map(([key, declaration]) => [
              key,
              Object.freeze({ ...declaration }),
            ])
          )
        );
        return [name, Object.freeze({ statement: query.statement, params })];
      })
    )
  );
}

/** Context owns protected values; callers supply filters; defaults fill remaining declarations. */
export function resolveQueryParameters(
  declarations: QueryDefinition['params'],
  values: Partial<QueryParameters>,
  context: QueryParameters
): QueryParameters {
  invariant(
    values && typeof values === 'object' && !Array.isArray(values),
    'Supply query parameter values as an object.'
  );
  for (const key of Object.keys(values)) {
    invariant(Object.hasOwn(declarations, key), `Unknown parameter ${key}.`);
    invariant(
      !Object.hasOwn(context, key),
      `Cannot override context parameter ${key}.`
    );
  }
  return Object.fromEntries(
    Object.entries(declarations).map(([key, declaration]) => {
      const value = Object.hasOwn(context, key)
        ? context[key]
        : Object.hasOwn(values, key)
          ? values[key]
          : declaration.defaultValue;
      invariant(value !== undefined, `Missing parameter ${key}.`);
      invariant(
        isQueryParameterValue(value),
        `Parameter ${key} must be a scalar value.`
      );
      return [key, value];
    })
  );
}
