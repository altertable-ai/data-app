export type TableIdentifier = { catalog: string; schema: string; name: string };
export type ColumnIdentifier<TableId extends string = string> = {
  table: TableId;
  name: string;
};

export type DataIdentifierDefinition =
  | ({ kind: 'table' } & TableIdentifier)
  | {
      kind: 'column';
      tableId: `tables.${string}`;
      table: TableIdentifier;
      name: string;
    };

type IdentifierId<
  Tables extends Record<string, TableIdentifier>,
  Columns extends Record<
    string,
    ColumnIdentifier<Extract<keyof Tables, string>>
  >,
> =
  | `tables.${Extract<keyof Tables, string>}`
  | {
      [
        Id in Extract<keyof Columns, string>
      ]: `columns.${Columns[Id]['table']}.${Id}`;
    }[Extract<keyof Columns, string>];

function qualifiedName(definition: DataIdentifierDefinition): string {
  const table = definition.kind === 'table' ? definition : definition.table;
  const path = [table.catalog, table.schema, table.name].join('.');

  return definition.kind === 'column' ? `${path}.${definition.name}` : path;
}

/** Aliases are nonempty and dot-free so qualified IDs stay unambiguous. */
type CheckedAliases<Aliases extends object> = {
  [
    Alias in keyof Aliases as Alias extends '' | `${string}.${string}`
      ? Alias
      : never
  ]: never;
};

/** Register exact source names once; returned JSX IDs are checked against this registry. */
export function defineDataIdentifiers<
  const Tables extends Record<string, TableIdentifier>,
  const Columns extends Record<
    string,
    ColumnIdentifier<Extract<keyof Tables, string>>
  >,
>({
  tables,
  columns,
}: {
  tables: Tables & CheckedAliases<Tables>;
  columns: Columns & CheckedAliases<Columns>;
}) {
  type Id = IdentifierId<Tables, Columns>;
  const definitions: Record<string, DataIdentifierDefinition> =
    Object.create(null);

  for (const [id, table] of Object.entries(tables))
    definitions[`tables.${id}`] = { kind: 'table', ...table };
  for (const [id, column] of Object.entries(columns)) {
    const table = tables[column.table];
    definitions[`columns.${column.table}.${id}`] = {
      kind: 'column',
      tableId: `tables.${column.table}`,
      table,
      name: column.name,
    };
  }

  // Every Id names a definition registered above.
  const registered: Record<Id, DataIdentifierDefinition> = definitions;

  function DataIdentifier({
    id,
    display,
  }: {
    id: Id;
    display?: 'short' | 'qualified';
  }) {
    const definition: DataIdentifierDefinition = registered[id];
    const qualified = qualifiedName(definition);
    const shown =
      display ?? (definition.kind === 'table' ? 'qualified' : 'short');
    const table = definition.kind === 'table' ? definition : definition.table;
    const prefix =
      definition.kind === 'table'
        ? [table.catalog, table.schema]
        : [table.catalog, table.schema, table.name];

    return (
      <code
        className="altertable-data-identifier"
        data-kind={definition.kind}
        title={qualified}
        data-identifier-id={id}
      >
        {shown === 'qualified' && (
          <span className="altertable-data-identifier-path">
            {prefix.map((segment, index) => (
              <span key={index}>
                {segment}.<wbr />
              </span>
            ))}
          </span>
        )}
        <span className="altertable-data-identifier-name">
          {definition.name}
        </span>
      </code>
    );
  }

  return {
    definitions: registered as Readonly<typeof registered>,
    DataIdentifier,
  };
}
