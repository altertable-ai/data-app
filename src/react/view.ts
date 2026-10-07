import type { EmptyContent } from '@/src/react/ui/presentation';
import type {
  AppVariableValues,
  DateRangeVariable,
  VariableCollection,
} from '@/src/core/variables';
import type { DateRangeRequest } from '@/src/core/contract';
import type { DimensionVariable } from '@/src/core/dimension';
import { invariant } from '@/src/core/invariant';

export type ResolvedVariables<Variables extends VariableCollection> = {
  [Key in keyof Variables]: Variables[Key] extends DateRangeVariable
    ? DateRangeRequest
    : AppVariableValues<Variables>[Key];
};

type DateVariableKey<Variables extends VariableCollection> = {
  [Key in keyof Variables]: Variables[Key] extends DateRangeVariable
    ? Key
    : never;
}[keyof Variables] &
  string;

export type ViewDate<Variables extends VariableCollection, Input> = {
  variable: DateVariableKey<Variables>;
  /** Extract the selected range and comparison unchanged, including from nested inputs. */
  input: (input: Input) => DateRangeRequest;
};

/** Read variable values from a custom operation input; omitted keys use top-level fields. */
export type ViewBindings<
  Variables extends VariableCollection,
  Input,
> = Partial<{
  [Key in keyof Variables]: (input: Input) => ResolvedVariables<Variables>[Key];
}>;

type SameViewInput<Variables extends VariableCollection, Input> = [
  ResolvedVariables<Variables>,
] extends [Input]
  ? [Input] extends [ResolvedVariables<Variables>]
    ? [Input] extends [Record<string, never>]
      ? true
      : [keyof Input] extends [keyof Variables]
        ? true
        : false
    : false
  : false;
type ViewInputMapping<Variables extends VariableCollection, Input> =
  SameViewInput<Variables, Input> extends true
    ? { input?: (values: ResolvedVariables<Variables>) => Input }
    : { input: (values: ResolvedVariables<Variables>) => Input };

export type DataViewDefinition<
  Name extends string,
  Variables extends VariableCollection,
  Input,
  Data,
> = {
  operation: Name;
  bindings?: ViewBindings<Variables, Input>;
  /** App-owned semantics: measured zero need not mean an empty result. */
  isEmpty: (data: Data) => boolean;
  /** Inherited by DataSection unless it supplies its own copy. */
  emptyFallback: EmptyContent;
} & (keyof Variables extends never
  ? { variables?: Variables }
  : { variables: Variables }) &
  ViewInputMapping<NoInfer<Variables>, Input> &
  (
    | {
        date: ViewDate<Variables, Input>;
        describeInput?: (input: Input) => string;
      }
    | { date?: never; describeInput: (input: Input) => string }
  );

export type ResolvedDataViewDefinition<
  Name extends string,
  Variables extends VariableCollection,
  Input,
  Data,
> = Omit<
  DataViewDefinition<Name, Variables, Input, Data>,
  'variables' | 'input'
> & {
  variables: Variables;
  input: (values: ResolvedVariables<Variables>) => Input;
};

export function describeViewInput<Input>(definition: {
  variables: VariableCollection;
  bindings?: Partial<Record<string, (input: Input) => unknown>>;
  date?: { variable: string; input: (input: Input) => DateRangeRequest };
  describeInput?: (input: Input) => string;
}): (input: Input) => string {
  const date = definition.date;
  const variable = date && definition.variables[date.variable];
  invariant(
    !date || variable?.kind === 'dateRange',
    'The view date must reference a date range variable.'
  );
  if (definition.describeInput) return definition.describeInput;
  invariant(date && variable, 'A view needs a date binding or describeInput.');
  const dateBinding = date;

  function describeInput(input: Input) {
    const period = (variable as DateRangeVariable).describeInput(
      dateBinding.input(input)
    );
    const filters = Object.entries(definition.variables)
      .filter(([, variable]) => variable.kind === 'dimension')
      .map(([key, filter]) => {
        const dimension = filter as DimensionVariable<any>;
        const selected = readViewBinding(definition, key, input);

        return dimension.valid(selected as never)
          ? `${dimension.label}: ${dimension.describe(selected as never)}`
          : null;
      })
      .filter(Boolean);

    return [period, ...filters].join(' · ');
  }

  return describeInput;
}

export function resolveViewInput<Variables extends VariableCollection, Input>(
  definition: {
    input: (values: ResolvedVariables<Variables>) => Input;
    date?: ViewDate<Variables, Input>;
    variables: Variables;
    bindings?: ViewBindings<Variables, Input>;
  },
  values: ResolvedVariables<Variables>
): Input {
  const input = definition.input(values);
  if (definition.date) {
    const selected = values[definition.date.variable] as DateRangeRequest;
    const mapped = definition.date.input(input);
    invariant(
      mapped && mapped.range && 'comparison' in mapped,
      'The operation input must preserve the selected date range and comparison.'
    );

    function sameRange(
      a: DateRangeRequest['comparison'],
      b: DateRangeRequest['comparison']
    ) {
      return a === b || (!!a && !!b && a.start === b.start && a.end === b.end);
    }
    invariant(
      sameRange(selected.range, mapped.range) &&
        sameRange(selected.comparison, mapped.comparison),
      'The operation input must preserve the selected date range and comparison.'
    );
  }
  for (const [key, variable] of Object.entries(definition.variables)) {
    if (variable.kind !== 'dimension') continue;
    const filter = variable as DimensionVariable<any>;
    const selected = values[key] as never;
    const mapped = readViewBinding(definition, key, input);
    invariant(
      filter.valid(mapped as never) && filter.same(selected, mapped as never),
      `The operation input must preserve the ${key} dimension selection.`
    );
  }

  return input;
}

function readViewBinding<Input>(
  definition: { bindings?: Partial<Record<string, (input: Input) => unknown>> },
  key: string,
  input: Input
): unknown {
  const read = definition.bindings?.[key];
  if (read) return read(input);

  return input && typeof input === 'object'
    ? (input as Record<string, unknown>)[key]
    : undefined;
}
