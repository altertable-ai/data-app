import { invariant } from '@/src/core/invariant';
import type { QueryResult } from '@/src/core/operation-types';

type QueryValues = {
  string: string;
  number: number;
  boolean: boolean;
  null: null;
};
/** Primitive values after decoding, independent of SQL storage types. */
export type QueryValueType = keyof QueryValues;
export type QueryField = { type: QueryValueType; nullable?: boolean };
export type QueryProjections = Readonly<Record<string, QueryField>>;
type QueryValue<Field extends QueryField> =
  | QueryValues[Field['type']]
  | (Field extends { nullable: true } ? null : never);
export type QueryRow<Projections extends QueryProjections> =
  Projections extends unknown
    ? { -readonly [Name in keyof Projections]: QueryValue<Projections[Name]> }
    : never;

export type QueryParameterValue = string | number | boolean | null;
/** Typed scalar parameters with optional fallback values. */
export type QueryParameter = {
  [Type in QueryValueType]:
    | { type: Type; nullable?: false; defaultValue?: QueryValues[Type] }
    | { type: Type; nullable: true; defaultValue?: QueryValues[Type] | null };
}[QueryValueType];

/** Callers may omit values supplied by host context or declaration defaults. */
export type QueryInputParameters<
  Params extends Readonly<Record<string, QueryParameter>>,
> = { [Name in keyof Params]?: QueryValue<Params[Name]> };
type QueryDefinition = {
  statement: string;
  params: Readonly<Record<string, QueryParameter>>;
  projections: QueryProjections;
};
export type QueryDefinitions = Readonly<Record<string, QueryDefinition>>;
export type IsUnion<Value, Whole = Value> = Value extends Whole
  ? [Whole] extends [Value]
    ? false
    : true
  : never;
export type KnownRecord<RecordType> = '__proto__' extends keyof RecordType
  ? never
  : string extends keyof RecordType
    ? never
    : Exclude<keyof RecordType, string> extends never
      ? true extends IsUnion<RecordType>
        ? never
        : RecordType
      : never;
type CheckedField<Field extends QueryField> =
  true extends IsUnion<Field>
    ? never
    : true extends IsUnion<Field['type']>
      ? never
      : 'nullable' extends keyof Field
        ? Field extends { nullable: infer Nullable }
          ? boolean extends Nullable
            ? never
            : Field
          : never
        : Field;

type CheckedParameters<
  Params extends Readonly<Record<string, QueryParameter>>,
> = KnownRecord<Params> & {
  [Name in keyof Params]: CheckedField<Params[Name]> &
    ('defaultValue' extends keyof Params[Name]
      ? undefined extends Params[Name]['defaultValue']
        ? never
        : Params[Name]
      : Params[Name]);
};

type CheckedProjections<Projections extends QueryProjections> =
  KnownRecord<Projections> &
    (keyof Projections extends never
      ? never
      : '' extends keyof Projections
        ? never
        : { [Name in keyof Projections]: CheckedField<Projections[Name]> });

/** Author declarations preserve finite names, fixed types, and one parameter map. */
export type CheckedQueries<Queries extends QueryDefinitions> =
  KnownRecord<Queries> &
    ('' extends keyof Queries ? never : unknown) & {
      [Name in keyof Queries]: KnownRecord<Queries[Name]> & {
        statement: Queries[Name]['statement'] extends ''
          ? never
          : Queries[Name]['statement'];
        params: CheckedParameters<Queries[Name]['params']>;
        projections: CheckedProjections<Queries[Name]['projections']>;
      };
    };
type FrozenField<Field extends QueryField> = Field extends unknown
  ? Readonly<Field>
  : never;
export type QuerySnapshot<Queries extends QueryDefinitions> = {
  readonly [Name in keyof Queries]: {
    readonly statement: Queries[Name]['statement'];
    readonly params: {
      readonly [Param in keyof Queries[Name]['params']]: FrozenField<
        Queries[Name]['params'][Param]
      >;
    };
    readonly projections: {
      readonly [Field in keyof Queries[Name]['projections']]: FrozenField<
        Queries[Name]['projections'][Field]
      >;
    };
  };
};

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

function snapshotField<Field extends QueryField>(
  field: Field
): Readonly<Field> {
  invariant(
    field &&
      typeof field === 'object' &&
      !Array.isArray(field) &&
      (field.type === 'string' ||
        field.type === 'number' ||
        field.type === 'boolean' ||
        field.type === 'null') &&
      (field.nullable === undefined || typeof field.nullable === 'boolean'),
    'Query fields need a supported type and a boolean nullable flag.'
  );
  return Object.freeze({ ...field });
}

/** Snapshot the query's SQL, parameter defaults, and decoded result contract. */
export function snapshotQueries<const Queries extends QueryDefinitions>(
  definitions: Queries
): QuerySnapshot<Queries> {
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
              return [key, snapshotField(declaration)];
            })
          )
        );
        const projectionEntries = Object.entries(query.projections);
        invariant(
          projectionEntries.length > 0 &&
            projectionEntries.every(([alias]) => !!alias.trim()),
          'Queries need at least one named projection.'
        );
        return [
          name,
          Object.freeze({
            statement: query.statement,
            params,
            projections: Object.freeze(
              Object.fromEntries(
                projectionEntries.map(([alias, field]) => [
                  alias,
                  snapshotField(field),
                ])
              )
            ),
          }),
        ];
      })
    )
  ) as QuerySnapshot<Queries>;
}

/** Decode each returned cell once, matching aliases independently of result order. */
export function decodeQueryResult<Projections extends QueryProjections>(
  result: QueryResult,
  projections: Projections
): QueryResult<QueryRow<Projections>> {
  if (
    !result ||
    !Array.isArray(result.columns) ||
    !Array.isArray(result.rows) ||
    (result.queryId !== undefined && typeof result.queryId !== 'string')
  ) {
    throw new Error('Query result must contain columns and rows.');
  }
  const returnedColumns = Array.from(result.columns, column => {
    if (
      !column ||
      typeof column !== 'object' ||
      Array.isArray(column) ||
      typeof column.name !== 'string' ||
      (column.type !== undefined && typeof column.type !== 'string')
    ) {
      throw new Error(
        'Query result columns must have names and optional type strings.'
      );
    }
    return {
      name: column.name,
      ...(column.type === undefined ? {} : { type: column.type }),
    };
  });
  const names = returnedColumns.map(column => column.name);
  const rows = Array.from(result.rows, row => {
    if (!Array.isArray(row) || row.length !== names.length) {
      throw new Error('Query result row has the wrong width.');
    }
    return Object.fromEntries(
      names.map((name, index) => [
        name,
        castQueryCell(row[index], projections[name]),
      ])
    ) as QueryRow<Projections>;
  });
  return {
    columns: returnedColumns,
    rows,
    ...(result.queryId === undefined ? {} : { queryId: result.queryId }),
  };
}

function castQueryCell(
  value: unknown,
  field: QueryField | undefined
): string | number | boolean | null {
  if (field === undefined) {
    if (
      typeof value === 'string' ||
      typeof value === 'boolean' ||
      typeof value === 'number'
    )
      return value;
    if (value === null) return null;
    return JSON.stringify(value);
  }

  if (
    value === null &&
    (field.nullable === true || field.nullable === undefined)
  )
    return null;

  switch (field.type) {
    case 'string':
      return String(value);
    case 'number': {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
      return '##ERROR##';
    }
    case 'boolean':
      return Boolean(value);
    case 'null':
      return null;
  }
}

/** Host context supplies protected values; callers and defaults fill the remaining parameters. */
export function resolveQueryParameters(
  declarations: Readonly<Record<string, QueryParameter>>,
  values: Partial<QueryParameters>,
  context: QueryParameters
): QueryParameters {
  if (!values || typeof values !== 'object' || Array.isArray(values))
    throw new Error('Supply query parameter values as an object.');
  for (const key of Object.keys(values)) {
    if (!Object.hasOwn(declarations, key))
      throw new Error(`Unknown parameter ${key}.`);
    if (Object.hasOwn(context, key))
      throw new Error(`Cannot override context parameter ${key}.`);
  }
  return Object.fromEntries(
    Object.entries(declarations).map(([key, declaration]) => {
      const value = Object.hasOwn(context, key)
        ? context[key]
        : Object.hasOwn(values, key) && values[key] !== undefined
          ? values[key]
          : declaration.defaultValue;
      if (value === undefined) throw new Error(`Missing parameter ${key}.`);
      const nullable =
        declaration.type === 'null' || declaration.nullable === true;
      const primitive = declaration.type;
      if (
        !(value === null
          ? nullable
          : typeof value === primitive && isQueryParameterValue(value))
      )
        throw new Error(`Parameter ${key} does not match ${declaration.type}.`);
      return [key, value];
    })
  );
}
