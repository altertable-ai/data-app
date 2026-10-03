import { Combobox, type ComboboxOption } from '@/src/react/ui/Combobox';
import { DateTimeValueSelector } from '@/src/react/ui/query-dates/DateTimeValueSelector';
import { DateTimeRangeValueSelector } from '@/src/react/ui/query-dates/DateTimeRangeValueSelector';
import {
  histogramIntervals,
  parseQueryVariable,
  type AbsoluteOrRelativeDateTime,
  type DateTimeRange,
  type Duration,
  type QueryVariableDefinition,
  type VariableValue,
  type VariableValueType,
} from '@/src/core/query-variables';

export type VariableValueSelectorProps<
  Type extends VariableValueType = VariableValueType,
> = {
  label: string;
  definition: QueryVariableDefinition<Type>;
  value: VariableValue<NoInfer<Type>> | null;
  onChange: (value: VariableValue<NoInfer<Type>> | null) => void;
};
type ValueProps<Value> = {
  label: string;
  value: Value | null;
  onChange: (value: Value | null) => void;
  nullable?: boolean;
  options?: readonly (Value | null)[];
};
const intervalLabels = ['Hour', 'Day', 'Week', 'Month', 'Quarter', 'Year'];
function choice(
  value: VariableValue | null,
  label = value === null
    ? 'Null'
    : value === ''
      ? 'Empty'
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value)
): ComboboxOption {
  return { id: JSON.stringify(value), label };
}
function withCurrent(options: ComboboxOption[], current: ComboboxOption) {
  return options.some(option => option.id === current.id)
    ? options
    : [...options, current];
}

/** Frontend text selector: search existing values or enter a custom typed value. */
export function VariableTextSelector({
  label,
  type,
  value,
  onChange,
  nullable = false,
  options,
}: ValueProps<string | number> & { type: 'STRING' | 'INTEGER' | 'FLOAT' }) {
  function customValue(text: string): ComboboxOption | null {
    if (options || !text.trim()) return null;
    if (type === 'STRING') return choice(text);
    const number = Number(text);
    if (
      !Number.isFinite(number) ||
      (type === 'INTEGER' && !Number.isSafeInteger(number))
    )
      return null;
    return { ...choice(number), description: text };
  }
  return (
    <Combobox
      label={label}
      value={JSON.stringify(value)}
      options={withCurrent(
        (
          options ?? [
            ...(type === 'STRING' ? [''] : []),
            ...(nullable ? [null] : []),
          ]
        ).map(option => choice(option)),
        choice(value)
      )}
      customValue={customValue}
      placeholder={options ? 'Search values' : 'Search or enter a value'}
      emptyMessage={
        type === 'STRING'
          ? 'Enter a value'
          : `Enter a valid ${type === 'INTEGER' ? 'integer' : 'number'}`
      }
      onChange={next => onChange(JSON.parse(next) as string | number | null)}
    />
  );
}
export function VariableBooleanSelector({
  label,
  value,
  onChange,
  nullable = false,
  options,
}: ValueProps<boolean>) {
  function option(value: boolean | null) {
    return choice(value, value === null ? 'Null' : value ? 'True' : 'False');
  }
  return (
    <Combobox
      label={label}
      value={JSON.stringify(value)}
      searchable={false}
      options={withCurrent(
        (options ?? [true, false, ...(nullable ? [null] : [])]).map(option),
        option(value)
      )}
      onChange={next => onChange(JSON.parse(next) as boolean | null)}
    />
  );
}
export function VariableIntervalSelector({
  label,
  value,
  onChange,
  nullable = false,
  options,
}: ValueProps<VariableValue<'INTERVAL'>>) {
  function option(value: VariableValue<'INTERVAL'> | null) {
    return choice(
      value,
      value === null
        ? 'None'
        : intervalLabels[histogramIntervals.indexOf(value)]!
    );
  }
  return (
    <Combobox
      label={label}
      value={JSON.stringify(value)}
      searchable={false}
      options={withCurrent(
        (options ?? [...histogramIntervals, ...(nullable ? [null] : [])]).map(
          option
        ),
        option(value)
      )}
      onChange={next =>
        onChange(JSON.parse(next) as VariableValue<'INTERVAL'> | null)
      }
    />
  );
}
export function VariableDurationSelector({
  label,
  value,
  onChange,
  nullable = false,
  options,
}: ValueProps<Duration>) {
  function option(value: Duration | null) {
    const unit = value?.unit.toLowerCase();
    return choice(
      value,
      value === null
        ? 'None'
        : value.amount === 1
          ? `Previous ${unit}`
          : `Previous ${value.amount} ${unit}s`
    );
  }
  const presets: Duration[] = [
    { amount: 1, unit: 'WEEK' },
    { amount: 1, unit: 'MONTH' },
    { amount: 1, unit: 'YEAR' },
  ];
  return (
    <Combobox
      label={label}
      value={JSON.stringify(value)}
      searchable={false}
      options={withCurrent(
        (options ?? [...(nullable ? [null] : []), ...presets]).map(option),
        option(value)
      )}
      onChange={next => onChange(JSON.parse(next) as Duration | null)}
    />
  );
}
export const VariableDateTimeSelector = DateTimeValueSelector;
export const VariableDateTimeRangeSelector = DateTimeRangeValueSelector;

export function VariableValueSelector<Type extends VariableValueType>(
  props: VariableValueSelectorProps<Type>
) {
  const { label, definition, value } = props;
  function parse(next: unknown) {
    return parseQueryVariable(definition as QueryVariableDefinition, next);
  }
  function isAllowed(next: unknown) {
    try {
      parse(next);
      return true;
    } catch {
      return false;
    }
  }
  function onChange(next: VariableValue | null) {
    props.onChange(parse(next) as VariableValue<Type> | null);
  }
  const common = {
    label,
    onChange,
    nullable: definition.nullable && isAllowed(null),
  };
  const options = definition.options?.map(option => parse(option));
  switch (definition.type) {
    case 'STRING':
    case 'INTEGER':
    case 'FLOAT':
      return (
        <VariableTextSelector
          {...common}
          type={definition.type}
          value={value as string | number | null}
          options={options as (string | number | null)[] | undefined}
        />
      );
    case 'BOOLEAN':
      return (
        <VariableBooleanSelector
          {...common}
          value={value as boolean | null}
          options={options as (boolean | null)[] | undefined}
        />
      );
    case 'INTERVAL':
      return (
        <VariableIntervalSelector
          {...common}
          value={value as VariableValue<'INTERVAL'> | null}
          options={options as (VariableValue<'INTERVAL'> | null)[] | undefined}
        />
      );
    case 'DURATION':
      return (
        <VariableDurationSelector
          {...common}
          value={value as Duration | null}
          options={options as (Duration | null)[] | undefined}
        />
      );
    case 'DATETIME':
      return (
        <VariableDateTimeSelector
          {...common}
          value={value as AbsoluteOrRelativeDateTime | null}
          options={options as (AbsoluteOrRelativeDateTime | null)[] | undefined}
          isAllowed={isAllowed}
        />
      );
    case 'DATETIMERANGE':
      return (
        <VariableDateTimeRangeSelector
          {...common}
          value={value as DateTimeRange | null}
          options={options as (DateTimeRange | null)[] | undefined}
          isAllowed={isAllowed}
        />
      );
  }
}
