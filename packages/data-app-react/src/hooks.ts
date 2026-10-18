import type { CheckedVariableDeclarations } from '@altertable/data-app/internal';
import type { IsUnion } from '@altertable/data-app/internal';
import { facetSource, type FacetVariable } from '@altertable/data-app/internal';
import {
  createFilterTarget,
  createBreakdownTarget,
  type FilterTarget,
  type BreakdownTarget,
  type FilterPatch,
} from './exploration.ts';
import type { ChoiceVariable } from '@altertable/data-app/internal';
import { randomUuid } from '@altertable/data-app/internal';
import { DeclaredView } from './view-runtime.tsx';
import {
  bindDataset,
  bindMetric,
  displayedScope,
  type DatasetDefinition,
  type Dataset,
  type Metric,
} from './bindings.ts';
import type { AuthoringDataContext } from './ui/data-context.ts';
import type { MetricValues } from '@altertable/data-app/internal';
import type { DisplayedSnapshot } from '@altertable/data-app/internal';
import { useState, type ReactNode } from 'react';
import { hashKey, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  DataOperations,
  DateRangeRequest,
} from '@altertable/data-app/contract';
import type { DataClient } from '@altertable/data-app/client';
import type { InputOf, OutputOf } from '@altertable/data-app/client';
import {
  displayedSnapshot,
  resolveDataView,
} from '@altertable/data-app/internal';
import {
  defineAppVariables,
  type VariableCollection,
  type CheckedFacetContexts,
} from '@altertable/data-app/internal';
import {
  dateRangeVariable,
  type DateRangeVariable,
  type DateRangeVariableOptions,
} from './ui/variables.ts';
import {
  createDimensionFilter,
  type DimensionFilterSettings,
  type DimensionValue,
} from '@altertable/data-app/internal';
import { type DimensionOption } from '@altertable/data-app/contract';
import type { EmptyContent } from './ui/presentation.ts';
import { ViewContent, type DataContentState } from './content.ts';
import {
  describeViewInput,
  resolveViewInput,
  type DataViewDefinition,
  type ResolvedDataViewDefinition,
  type ResolvedVariables,
  type ViewBindingOptions,
  type ViewDate,
} from './view.ts';
import { useViewVariables } from './view-controls.tsx';
import { DetailView, type DetailViewDefinition } from './details.tsx';

const clientScopes = new WeakMap<object, string>();

function getClientScope(client: object): string {
  let scope = clientScopes.get(client);
  if (!scope) {
    scope = randomUuid();
    clientScopes.set(client, scope);
  }

  return scope;
}

type TimeVariables<Additional extends VariableCollection> = {
  period: ReturnType<typeof dateRangeVariable>;
} & Additional;
type TimeInput<Additional extends VariableCollection> =
  keyof Additional extends never
    ? DateRangeRequest
    : ResolvedVariables<TimeVariables<Additional>>;
type TimeInputMapping<Additional extends VariableCollection, Input> =
  TimeInput<Additional> extends Input
    ? {
        input?: (values: ResolvedVariables<TimeVariables<Additional>>) => Input;
      }
    : {
        input: (values: ResolvedVariables<TimeVariables<Additional>>) => Input;
      };

/** Match the period reader's precedence for each possible operation input. */
type RequiredPeriodBinding<Input> = Input extends unknown
  ? 'period' extends keyof Input
    ? Input extends { period: DateRangeRequest }
      ? never
      : 'period'
    : Input extends DateRangeRequest
      ? never
      : 'period'
  : never;

type NonEmptyColumns<Columns extends object> = keyof Columns extends never
  ? never
  : Columns;

type BoundDataView<
  Name extends string,
  Variables extends VariableCollection,
  Input,
  Data,
  Context extends AuthoringDataContext,
  HasDate extends boolean,
> = DeclaredView<
  Data,
  Input,
  ResolvedDataViewDefinition<Name, Variables, Input, Data> & {
    describeInput: (input: Input) => string;
  }
> & {
  filter(): FilterTarget<FilterPatch<Variables>>;
  breakdown<Key extends keyof Variables & string>(
    key: Key &
      (Variables[Key] extends ChoiceVariable<any>
        ? Extract<
            Variables[Key]['presentation'],
            { group: 'display' }
          > extends never
          ? never
          : unknown
        : never)
  ): Variables[Key] extends ChoiceVariable<infer Value>
    ? BreakdownTarget<Value>
    : never;
  dataset<
    Row,
    const Columns extends Record<string, object> = Record<string, object>,
  >(
    definition: DatasetDefinition<
      Data,
      Input,
      Row,
      Parameters<Context['evidence']>[0]
    > & {
      columns: Columns & NonEmptyColumns<Columns>;
    }
  ): Dataset<Data, Input, Row>;
  metric(
    definition: Parameters<Context['metric']>[0],
    select: (
      data: Data,
      input: Input
    ) => HasDate extends true
      ? MetricValues
      : { current: number; previous?: never }
  ): Metric<Data, Input>;
  scope(snapshot: DisplayedSnapshot<Data, Input>): string;
  content(
    render: (state: DataContentState<Data, Input>) => ReactNode
  ): ViewContent<Data, Input>;
};

type FacetOperationName<
  Operations extends DataOperations,
  Value extends DimensionValue,
> = {
  [Name in keyof Operations & string]: OutputOf<
    Operations[Name]
  > extends readonly DimensionOption<Value>[]
    ? Name
    : never;
}[keyof Operations & string];
type FacetConfig<
  Operations extends DataOperations,
  Value extends DimensionValue,
  Context extends VariableCollection,
  Name extends keyof Operations & string,
> = DimensionFilterSettings<Value> & {
  facet: {
    context: Context &
      CheckedVariableDeclarations<NoInfer<Context>> &
      (string extends keyof Context ? never : unknown);
    operation: Name & (true extends IsUnion<NoInfer<Name>> ? never : unknown);
    input: (
      values: ResolvedVariables<NoInfer<Context>>
    ) => InputOf<Operations[NoInfer<Name>]>;
  };
};

type CheckedFacetSources<
  Operations extends DataOperations,
  Variables extends VariableCollection,
> = CheckedVariableDeclarations<Variables> & {
  [Key in keyof Variables]: Variables[Key] extends FacetVariable<
    infer Value,
    infer _Context,
    infer Name,
    infer Input
  >
    ? Name extends keyof Operations
      ? Input extends InputOf<Operations[Name]>
        ? OutputOf<Operations[Name]> extends readonly DimensionOption<Value>[]
          ? Variables[Key]
          : never
        : never
      : never
    : Variables[Key];
};

type BoundDetailView<
  Data,
  Input,
  Context extends AuthoringDataContext,
> = DetailView<Data, Input> & {
  dataset<
    Row,
    const Columns extends Record<string, object> = Record<string, object>,
  >(
    definition: DatasetDefinition<
      Data,
      Input,
      Row,
      Parameters<Context['evidence']>[0]
    > & { columns: Columns & NonEmptyColumns<Columns> }
  ): Dataset<Data, Input, Row>;
  metric(
    definition: Parameters<Context['metric']>[0],
    select: (data: Data, input: Input) => { current: number; previous?: never }
  ): Metric<Data, Input>;
};

/** Bind declared operations to URL variables, displayed readings, and request feedback. */
export function createDataHooks<Operations extends DataOperations>(
  client: DataClient<Operations>
) {
  const clientScope = getClientScope(client);

  function useDataQuery<Name extends keyof Operations & string>(
    name: Name,
    input: InputOf<Operations[Name]>
  ) {
    const queryClient = useQueryClient();
    const queryKey = ['data-operation', clientScope, name, input] as const;
    const query = useQuery({
      queryKey,
      queryFn({ signal }) {
        return client.query(name as never, input, { signal });
      },
      placeholderData(previousData, previousQuery) {
        return previousQuery?.queryKey[1] === clientScope &&
          previousQuery.queryKey[2] === name
          ? previousData
          : undefined;
      },
    });

    return {
      ...query,
      /** Abort the current request and restore its prior query state. */
      cancel(this: void) {
        return queryClient.cancelQueries({ queryKey, exact: true });
      },
    };
  }

  /** Join a typed request with its displayed-data state. Pass the result to
   * `DataApp.request` or `DataSection.result`.
   * `isEmpty` is app-owned so a measured zero remains valid. Previous-input data
   * stays labeled through refreshes and errors. Input equality uses React Query's
   * stable key hash. */

  function useDataView<Name extends keyof Operations & string>(
    name: Name,
    input: InputOf<Operations[Name]>,
    options: {
      isEmpty: (data: OutputOf<Operations[Name]>) => boolean;
      describeInput?: (input: InputOf<Operations[Name]>) => string;
    }
  ) {
    const query = useDataQuery(name, input);
    const [last, setLast] = useState<{
      clientScope: string;
      name: Name;
      response: NonNullable<typeof query.data>;
    }>();
    if (
      query.isSuccess &&
      !query.isPlaceholderData &&
      query.data &&
      (last?.clientScope !== clientScope ||
        last.name !== name ||
        last.response !== query.data)
    ) {
      setLast({ clientScope, name, response: query.data });
    }
    function sameInput(
      left: InputOf<Operations[Name]>,
      right: InputOf<Operations[Name]>
    ) {
      return hashKey([left]) === hashKey([right]);
    }
    const response =
      query.data ??
      (last?.clientScope === clientScope && last.name === name
        ? last.response
        : undefined);
    const snapshot = response && { data: response.data, input: response.input };
    const view = resolveDataView({
      requestedInput: input,
      current:
        snapshot && !query.isPlaceholderData && sameInput(snapshot.input, input)
          ? snapshot
          : undefined,
      previous: snapshot,
      pending: query.isFetching,
      error: query.error instanceof Error ? query.error : undefined,
      sameInput,
      describe: options.describeInput ?? (() => 'this view'),
      isEmpty: options.isEmpty,
    });

    return {
      ...query,
      view,
      snapshot: displayedSnapshot(view),
      response,
      queries: response?.queries,
      refreshing: query.isFetching,
    };
  }

  /** Omitted variables resolve to {}; matching operation inputs derive from those values.
   * Supply a mapper for nested or different input shapes. */
  function defineDataView<
    Name extends keyof Operations & string,
    const Variables extends VariableCollection = {},
    const Context extends AuthoringDataContext = AuthoringDataContext,
  >(
    definition: DataViewDefinition<
      Name,
      Variables,
      InputOf<Operations[Name]>,
      OutputOf<Operations[Name]>
    > & {
      operation: Name & (true extends IsUnion<NoInfer<Name>> ? never : unknown);
      variables?: Variables &
        CheckedFacetSources<Operations, NoInfer<Variables>>;
    } & {
      dataContext: Context;
      date: ViewDate<Variables, InputOf<Operations[Name]>>;
    }
  ): BoundDataView<
    Name,
    Variables,
    InputOf<Operations[Name]>,
    OutputOf<Operations[Name]>,
    Context,
    true
  >;
  function defineDataView<
    Name extends keyof Operations & string,
    const Variables extends VariableCollection = {},
    const Context extends AuthoringDataContext = AuthoringDataContext,
  >(
    definition: DataViewDefinition<
      Name,
      Variables,
      InputOf<Operations[Name]>,
      OutputOf<Operations[Name]>
    > & {
      operation: Name & (true extends IsUnion<NoInfer<Name>> ? never : unknown);
      variables?: Variables &
        CheckedFacetSources<Operations, NoInfer<Variables>>;
    } & { dataContext: Context }
  ): BoundDataView<
    Name,
    Variables,
    InputOf<Operations[Name]>,
    OutputOf<Operations[Name]>,
    Context,
    false
  >;
  function defineDataView<
    Name extends keyof Operations & string,
    const Variables extends VariableCollection = {},
    const Context extends AuthoringDataContext = AuthoringDataContext,
  >(
    definition: DataViewDefinition<
      Name,
      Variables,
      InputOf<Operations[Name]>,
      OutputOf<Operations[Name]>
    > & {
      variables?: Variables &
        CheckedFacetSources<Operations, NoInfer<Variables>>;
    } & { dataContext: Context }
  ) {
    return bindDataView(definition);
  }

  function bindDataView<
    Name extends keyof Operations & string,
    const Variables extends VariableCollection,
    const Context extends AuthoringDataContext,
    HasDate extends boolean = boolean,
  >(
    definition: DataViewDefinition<
      Name,
      Variables,
      InputOf<Operations[Name]>,
      OutputOf<Operations[Name]>
    > & { dataContext: Context }
  ): BoundDataView<
    Name,
    Variables,
    InputOf<Operations[Name]>,
    OutputOf<Operations[Name]>,
    Context,
    HasDate
  > {
    const variables = defineAppVariables(
      definition.variables ?? {}
    ) as Variables;
    const input =
      definition.input ??
      ((values: ResolvedVariables<Variables>) =>
        values as unknown as InputOf<Operations[Name]>);

    const describeInput = describeViewInput<InputOf<Operations[Name]>>({
      ...definition,
      variables,
    });
    type Data = OutputOf<Operations[Name]>;
    type Input = InputOf<Operations[Name]>;
    const metadata: Omit<
      DataViewDefinition<Name, Variables, Input, Data>,
      'variables' | 'input'
    > = definition;
    const normalized = { ...metadata, variables, input, describeInput };
    const view = Object.assign(
      new DeclaredView(() => useView(normalized), normalized),
      {
        filter() {
          return createFilterTarget<Variables>({
            owner: view,
            variables,
            input,
            bindings: definition.bindings,
            date: definition.date,
          });
        },
        breakdown(key: string) {
          return createBreakdownTarget({
            owner: view,
            variables,
            input,
            bindings: definition.bindings,
            date: definition.date,
            key,
          });
        },
        dataset<
          Row,
          const Columns extends Record<string, object> = Record<string, object>,
        >(
          dataset: DatasetDefinition<
            Data,
            Input,
            Row,
            Parameters<Context['evidence']>[0]
          > & {
            columns: Columns & NonEmptyColumns<Columns>;
          }
        ) {
          return bindDataset(
            {
              ...dataset,
              evidence: definition.dataContext.evidence(dataset.evidence),
            },
            view,
            normalized.date &&
              normalized.variables[normalized.date.variable]?.kind ===
                'dateRange'
              ? (
                  normalized.variables[
                    normalized.date.variable
                  ] as DateRangeVariable
                ).bounds().timeZone
              : undefined
          );
        },
        metric(
          metric: Parameters<Context['metric']>[0],
          select: (
            data: Data,
            input: Input
          ) => HasDate extends true
            ? MetricValues
            : { current: number; previous?: never }
        ) {
          return bindMetric(
            definition.dataContext.metric(metric),
            select,
            definition.date?.input,
            view
          );
        },
        scope(snapshot: DisplayedSnapshot<Data, Input>) {
          return describeInput(snapshot.input);
        },
        content(
          render: (
            state: DataContentState<
              OutputOf<Operations[Name]>,
              InputOf<Operations[Name]>
            >
          ) => ReactNode
        ): ViewContent<Data, Input> {
          return new ViewContent(view, render, describeInput);
        },
      }
    );
    return view as BoundDataView<
      Name,
      Variables,
      Input,
      Data,
      Context,
      HasDate
    >;
  }

  /** Define a typed destination whose untrusted navigation input is validated before querying. */
  function defineDetailView<
    Name extends keyof Operations & string,
    const Context extends AuthoringDataContext = AuthoringDataContext,
  >(
    definition: DetailViewDefinition<
      OutputOf<Operations[Name]>,
      InputOf<Operations[Name]>
    > & {
      operation: Name;
      dataContext: Context;
    }
  ): BoundDetailView<
    OutputOf<Operations[Name]>,
    InputOf<Operations[Name]>,
    Context
  > {
    type Data = OutputOf<Operations[Name]>;
    type Input = InputOf<Operations[Name]>;
    const target = new DetailView<Data, Input>(definition, input => {
      const request = useDataView(definition.operation, input, {
        isEmpty: definition.isEmpty,
        describeInput: definition.describeInput,
      });
      return {
        view: request.view,
        dataContext: definition.dataContext,
        snapshot: request.snapshot,
        scope: displayedScope(request.view, definition.describeInput),
        refetch() {
          void request.refetch();
        },
        cancel: request.cancel,
        refreshing: request.refreshing,
        queries: request.queries,
        emptyFallback: definition.emptyFallback,
      };
    });
    return Object.assign(target, {
      dataset<
        Row,
        const Columns extends Record<string, object> = Record<string, object>,
      >(
        dataset: DatasetDefinition<
          Data,
          Input,
          Row,
          Parameters<Context['evidence']>[0]
        > & { columns: Columns & NonEmptyColumns<Columns> }
      ) {
        return bindDataset(
          {
            ...dataset,
            evidence: definition.dataContext.evidence(dataset.evidence),
          },
          target
        );
      },
      metric(
        metric: Parameters<Context['metric']>[0],
        select: (
          data: Data,
          input: Input
        ) => {
          current: number;
          previous?: number;
        }
      ) {
        return bindMetric(
          definition.dataContext.metric(metric),
          select,
          undefined,
          target
        );
      },
    });
  }

  /** One time declaration owns the URL picker, operation input, and displayed-period label.
   * Without extra variables, the default input is the DateRangeRequest; with them it is
   * { period, ...variables }. Other operation shapes require an input mapper.
   * Mappers must preserve the period and dimension selections; bindings extract nested inputs.
   * Use defineDataView with describeInput for deliberately fixed-period views. */

  function defineTimeView<
    Name extends keyof Operations & string,
    const Additional extends VariableCollection = {},
    const Context extends AuthoringDataContext = AuthoringDataContext,
  >(
    definition: {
      operation: Name & (true extends IsUnion<NoInfer<Name>> ? never : unknown);
      dataContext: Context;
      time: Omit<DateRangeVariableOptions, 'key'>;
      variables?: Additional &
        CheckedVariableDeclarations<NoInfer<Additional>> & {
          period?: never;
        } & Omit<
          CheckedFacetContexts<TimeVariables<NoInfer<Additional>>>,
          'period'
        > &
        Omit<
          CheckedFacetSources<Operations, TimeVariables<NoInfer<Additional>>>,
          'period'
        >;
      isEmpty: (data: OutputOf<Operations[Name]>) => boolean;
      emptyFallback: EmptyContent;
    } & TimeInputMapping<NoInfer<Additional>, InputOf<Operations[Name]>> &
      ViewBindingOptions<
        TimeVariables<NoInfer<Additional>>,
        InputOf<Operations[Name]>,
        RequiredPeriodBinding<InputOf<Operations[Name]>>
      >
  ) {
    const period = dateRangeVariable({ ...definition.time, key: 'period' });

    return bindDataView<
      Name,
      { period: typeof period } & Additional,
      Context,
      true
    >({
      operation: definition.operation,
      dataContext: definition.dataContext,
      variables: { period, ...definition.variables } as {
        period: typeof period;
      } & Additional &
        CheckedFacetContexts<NoInfer<TimeVariables<Additional>>>,
      bindings: definition.bindings,
      input(values) {
        if (definition.input) return definition.input(values);
        if (!definition.variables || !Object.keys(definition.variables).length)
          return values.period as InputOf<Operations[Name]>;

        return { ...values } as InputOf<Operations[Name]>;
      },
      date: {
        variable: 'period' as never,
        input(input) {
          return definition.bindings?.period
            ? (definition.bindings.period(input) as DateRangeRequest)
            : ((input && typeof input === 'object' && 'period' in input
                ? input.period
                : input) as DateRangeRequest);
        },
      },
      isEmpty: definition.isEmpty,
      emptyFallback: definition.emptyFallback,
    });
  }

  /** Bind typed options to a registered operation and explicitly declared variable dependencies.
   * The input mapper receives only resolved context values; consuming views must include that context.
   * Options are cached for 60 seconds; known values survive refreshes and errors.
   * Selected values absent from a new result remain available without an invented count. */

  function defineFacetFilter<
    const Context extends VariableCollection,
    const Name extends FacetOperationName<Operations, string>,
  >(
    config: FacetConfig<Operations, string, Context, Name>
  ): FacetVariable<string, Readonly<Context>, Name, InputOf<Operations[Name]>>;
  function defineFacetFilter<
    const Context extends VariableCollection,
    const Name extends FacetOperationName<Operations, number>,
  >(
    config: FacetConfig<Operations, number, Context, Name>
  ): FacetVariable<number, Readonly<Context>, Name, InputOf<Operations[Name]>>;
  function defineFacetFilter<
    const Context extends VariableCollection,
    Value extends DimensionValue,
    Name extends keyof Operations & string,
  >(
    config: DimensionFilterSettings<Value> & {
      facet: {
        context: Context;
        operation: Name;
        input: (
          values: ResolvedVariables<Context>
        ) => InputOf<Operations[Name]>;
      };
    }
  ) {
    const context = Object.freeze({ ...config.facet.context });
    const operation = config.facet.operation;
    const mapInput = config.facet.input;
    return Object.assign(
      createDimensionFilter<Value>({ ...config, options: [] }, true),
      {
        optionsSource: 'query' as const,
        [facetSource]: Object.freeze({
          context,
          operation,
          input(values: Record<string, unknown>) {
            const resolved = Object.fromEntries(
              Object.keys(context).map(name => [name, values[name]])
            ) as ResolvedVariables<Context>;
            return mapInput(resolved);
          },
        }),
      }
    );
  }

  function useView<
    Name extends keyof Operations & string,
    const Variables extends VariableCollection,
  >(
    definition: ResolvedDataViewDefinition<
      Name,
      Variables,
      InputOf<Operations[Name]>,
      OutputOf<Operations[Name]>
    >
  ) {
    const variables = useViewVariables(
      definition.variables,
      clientScope,
      (operation, input, signal) =>
        client
          .query(operation as never, input as never, {
            signal,
          })
          .then(response => response.data)
    );
    const describeInput =
      describeViewInput<InputOf<Operations[Name]>>(definition);
    const request = useDataView(
      definition.operation,
      resolveViewInput(definition, variables.resolved),
      {
        ...definition,
        describeInput,
      }
    );

    return {
      view: request.view,
      dataContext: definition.dataContext,
      snapshot: request.snapshot,
      scope: displayedScope(request.view, describeInput),
      refetch() {
        void request.refetch();
      },
      cancel: request.cancel,
      refreshing: request.refreshing,
      queries: request.queries,
      emptyFallback: definition.emptyFallback,
      timeZone:
        definition.date &&
        definition.variables[definition.date.variable]?.kind === 'dateRange'
          ? (
              definition.variables[
                definition.date.variable
              ] as DateRangeVariable
            ).bounds().timeZone
          : undefined,
      searchControls: variables.searchControls,
      filterControls: variables.filterControls,
      variables,
    };
  }

  return {
    defineDataView,
    defineDetailView,
    defineTimeView,
    defineFacetFilter,
  };
}
