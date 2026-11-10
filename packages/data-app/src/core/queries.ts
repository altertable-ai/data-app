import {
  parseDateTimeRange,
  serializeDateTimeRange,
} from './date-time-range-value.ts';
import type { DateTimeRange } from './date-time-range.ts';
import type { DimensionSelection } from './dimension.ts';
import { invariant } from './invariant.ts';
import type { QueryResult } from './operation-types.ts';
import {
  expandParameterReferences,
  type StructuredParameter,
} from './parameter-sql.ts';

export const MAX_QUERY_ROWS = 10_000;

const QUERY_CAST_ERROR = '##ERROR##';

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
export type QueryRow<Projections extends QueryProjections> = {
  -readonly [Name in keyof Projections]: QueryValue<Projections[Name]>;
};

export type QueryParameterValue = string | number | boolean | null;
/** Typed scalar, datetime-range, or dimension parameters with optional fallback values.
 * Reference a range's bounds as `$name.from` (inclusive) and `$name.to` (exclusive),
 * and a dimension selection as `$name.matches(column)`. */
export type QueryParameter =
  | {
      /** A dimension filter's `DimensionSelection`; `$name.matches(column)` is true
       * for the rows it keeps, including missing-value and exclusion semantics. */
      type: 'dimension';
      valueType: 'string' | 'number';
      nullable?: false;
      defaultValue?: never;
    }
  | {
      type: 'dateTimeRange';
      nullable?: false;
      /** Absolute defaults may use canonical UTC ISO strings (including milliseconds) for static manifests. Snapshots hydrate them into Dates. */
      defaultValue?: {
        [Bound in keyof DateTimeRange]: DateTimeRange[Bound] | string;
      };
    }
  | {
      [Type in QueryValueType]:
        | { type: Type; nullable?: false; defaultValue?: QueryValues[Type] }
        | {
            type: Type;
            nullable: true;
            defaultValue?: QueryValues[Type] | null;
          };
    }[QueryValueType];

/** Callers may omit values supplied by host context or declaration defaults. */
export type QueryInputParameters<
  Params extends Readonly<Record<string, QueryParameter>>,
> = {
  [Name in keyof Params]?: Params[Name] extends { type: 'dateTimeRange' }
    ? DateTimeRange
    : Params[Name] extends { type: 'dimension'; valueType: 'number' }
      ? DimensionSelection<number>
      : Params[Name] extends { type: 'dimension' }
        ? DimensionSelection<string>
        : Params[Name] extends QueryField
          ? QueryValue<Params[Name]>
          : never;
};
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
type CheckedField<Field extends { type: string; nullable?: boolean }> =
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
type FrozenField<Field extends { type: string; nullable?: boolean }> =
  Field extends { type: 'dimension' }
    ? Readonly<Field>
    : Field extends { type: 'dateTimeRange' }
      ? Readonly<{
          [Key in keyof Field]: Key extends 'defaultValue'
            ? DateTimeRange
            : Field[Key];
        }>
      : Field extends unknown
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

/** Bind a selection as JSON the expanded predicate reads: kind, listed values, and
 * whether missing values are listed. */
function serializeSelection(
  key: string,
  valueType: 'string' | 'number',
  value: unknown
): string {
  const selection = (
    typeof value === 'string' ? JSON.parse(value) : value
  ) as DimensionSelection;
  const valid =
    !!selection &&
    typeof selection === 'object' &&
    (selection.kind === 'all' ||
      ((selection.kind === 'include' || selection.kind === 'exclude') &&
        Array.isArray(selection.members) &&
        selection.members.length > 0 &&
        selection.members.every(
          member =>
            member?.kind === 'missing' ||
            (member?.kind === 'value' &&
              (valueType === 'number'
                ? typeof member.value === 'number' &&
                  Number.isFinite(member.value)
                : typeof member.value === 'string'))
        )));
  if (!valid)
    throw new Error(
      `Parameter ${key} is not a ${valueType} dimension selection.`
    );
  if (selection.kind === 'all') return JSON.stringify({ kind: 'all' });
  return JSON.stringify({
    kind: selection.kind,
    values: selection.members.flatMap(member =>
      member.kind === 'value' ? [member.value] : []
    ),
    missing: selection.members.some(member => member.kind === 'missing'),
  });
}

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
              if (
                declaration.type === 'dateTimeRange' ||
                declaration.type === 'dimension'
              )
                invariant(
                  /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) &&
                    (declaration as { nullable?: boolean }).nullable !== true,
                  'Range and dimension parameters require a SQL parameter name and cannot be nullable.'
                );
              if (declaration.type === 'dimension') {
                invariant(
                  (declaration.valueType === 'string' ||
                    declaration.valueType === 'number') &&
                    !Object.hasOwn(declaration, 'defaultValue'),
                  `Dimension parameter ${key} in query ${name} needs a string or number valueType and no default.`
                );
                return [key, Object.freeze({ ...declaration })];
              }
              invariant(
                !Object.hasOwn(declaration, 'defaultValue') ||
                  (declaration.type === 'dateTimeRange'
                    ? !!parseDateTimeRange(declaration.defaultValue)
                    : isQueryParameterValue(declaration.defaultValue)),
                `Invalid default for parameter ${key} in query ${name}.`
              );
              return [
                key,
                declaration.type === 'dateTimeRange'
                  ? Object.freeze({
                      ...declaration,
                      ...(declaration.defaultValue === undefined
                        ? {}
                        : {
                            defaultValue: parseDateTimeRange(
                              declaration.defaultValue
                            ),
                          }),
                    })
                  : snapshotField(declaration),
              ];
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
            statement: expandParameterReferences(
              query.statement,
              new Map(
                Object.entries(query.params).flatMap(([key, p]) =>
                  p.type === 'dateTimeRange' || p.type === 'dimension'
                    ? [[key, p as StructuredParameter]]
                    : []
                )
              )
            ),
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

  if (value === null && field.nullable !== false) return null;

  switch (field.type) {
    case 'string':
      return String(value);
    case 'number': {
      const number = Number(value);
      return Number.isFinite(number) ? number : QUERY_CAST_ERROR;
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
  values: Readonly<
    Record<
      string,
      QueryParameterValue | DateTimeRange | DimensionSelection | undefined
    >
  >,
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
      if (declaration.type === 'dimension')
        return [key, serializeSelection(key, declaration.valueType, value)];
      if (declaration.type === 'dateTimeRange')
        return [
          key,
          serializeDateTimeRange(
            parseDateTimeRange(
              typeof value === 'string' ? JSON.parse(value) : value
            )
          ),
        ];
      const nullable =
        declaration.type === 'null' || declaration.nullable === true;
      if (
        !(value === null
          ? nullable
          : typeof value === declaration.type && isQueryParameterValue(value))
      )
        throw new Error(`Parameter ${key} does not match ${declaration.type}.`);
      return [key, value as QueryParameterValue];
    })
  );
}
