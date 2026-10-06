/** Built-in types from the Altertable frontend's VariableValueType contract. */
export const variableValueTypes = [
  'STRING',
  'INTEGER',
  'FLOAT',
  'BOOLEAN',
  'INTERVAL',
  'DURATION',
  'DATETIME',
  'DATETIMERANGE',
] as const;
export type VariableValueType = (typeof variableValueTypes)[number];
export const histogramIntervals = [
  'HOURLY',
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'YEARLY',
] as const;
export type HistogramInterval = (typeof histogramIntervals)[number];
export const durationUnits = ['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'] as const;
export type DurationUnit = (typeof durationUnits)[number];
export const relativeUnits = ['SECOND', 'MINUTE', ...durationUnits] as const;
export type RelativeUnit = (typeof relativeUnits)[number];
export const relativeAnchors = [
  'RELATIVE_ANCHOR_NOW',
  'RELATIVE_ANCHOR_START_OF_TODAY',
  'RELATIVE_ANCHOR_START_OF_YESTERDAY',
  'RELATIVE_ANCHOR_START_OF_TOMORROW',
  'RELATIVE_ANCHOR_START_OF_WEEK',
  'RELATIVE_ANCHOR_START_OF_MONTH',
  'RELATIVE_ANCHOR_START_OF_YEAR',
] as const;
export type RelativeAnchor = (typeof relativeAnchors)[number];
export type Duration = { amount: number; unit: DurationUnit };
export type RelativeOffset = { amount: number; unit: RelativeUnit };
export type RelativeDateTime = {
  anchor: RelativeAnchor;
  offset: RelativeOffset[];
};
export type AbsoluteOrRelativeDateTime = Date | RelativeDateTime;
export type DateTimeRange = {
  from?: AbsoluteOrRelativeDateTime | null;
  to?: AbsoluteOrRelativeDateTime | null;
};
export type VariableValues = {
  STRING: string;
  INTEGER: number;
  FLOAT: number;
  BOOLEAN: boolean;
  INTERVAL: HistogramInterval;
  DURATION: Duration;
  DATETIME: AbsoluteOrRelativeDateTime;
  DATETIMERANGE: DateTimeRange;
};
export type VariableValue<Type extends VariableValueType = VariableValueType> =
  VariableValues[Type];
export type QueryVariableDefinition<
  Type extends VariableValueType = VariableValueType,
> = {
  [Key in Type]: {
    name: string;
    type: Key;
    options?: readonly (VariableValue<Key> | null)[];
  } & (
    | { nullable: true; default: VariableValue<Key> | null }
    | { nullable: false; default: VariableValue<Key> }
  );
}[Type];
export type QueryVariableDefinitions = readonly QueryVariableDefinition[];
export type QueryVariableValues<Definitions extends QueryVariableDefinitions> =
  {
    [Definition in Definitions[number] as Definition['name']]:
      | VariableValue<Definition['type']>
      | (Definition extends { nullable: true } ? null : never);
  };
export type DataAppRegistration = {
  queries: Record<string, string>;
  variables: QueryVariableDefinitions;
};
