import { invariant } from '@/src/core/invariant';

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

/** Retain authored statements and defaults, rejecting empty SQL and invalid scalar defaults. */
export function snapshotQueries(
  definitions: QueryDefinitions
): QueryDefinitions {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(definitions).map(([name, query]) => {
        invariant(
          !!name.trim() && !!query.statement.trim(),
          'Queries need a name and SQL statement.'
        );
        const params = Object.freeze(
          Object.fromEntries(
            Object.entries(query.params).map(([key, declaration]) => {
              invariant(
                !Object.hasOwn(declaration, 'defaultValue') ||
                  isQueryParameterValue(declaration.defaultValue),
                `Invalid default for parameter ${key} in query ${name}.`
              );
              return [key, Object.freeze({ ...declaration })];
            })
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
