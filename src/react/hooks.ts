import { searchParams } from '@/src/react/ui/search';
import { writeVariableValues } from '@/src/react/ui/variables';
import { invariant } from '@/src/core/invariant';
import type {
  ScopeVariableValues,
  AppVariableValues,
} from '@/src/core/variables';
import type {
  HierarchyVariable,
  HierarchyStateOf,
  HierarchyValuesOf,
} from '@/src/core/hierarchy';
import { createDetailContent } from '@/src/react/details';
import { randomUuid } from '@/src/core/uuid';
import { DeclaredView } from '@/src/react/view-runtime';
import {
  bindDataset,
  bindMetric,
  displayedScope,
  type DatasetDefinition,
} from '@/src/react/bindings';
import type { AuthoringDataContext } from '@/src/react/ui/data-context';
import type { MetricValues } from '@/src/core/reading';
import type { DisplayedSnapshot } from '@/src/core/data-view';
import { useState, type ReactNode } from 'react';
import { hashKey, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DataOperations, DateRangeRequest } from '@/src/core/contract';
import type { DataClient } from '@/src/client/data-client';
import type { InputOf, OutputOf } from '@/src/core/operation-types';
import { displayedSnapshot, resolveDataView } from '@/src/core/data-view';
import {
  defineAppVariables,
  type VariableCollection,
} from '@/src/core/variables';
import {
  dateRangeVariable,
  type DateRangeVariable,
  type DateRangeVariableOptions,
} from '@/src/react/ui/variables';
import {
  dimensionFilter,
  type DimensionFilterOptions,
  type DimensionOption,
  type DimensionValue,
} from '@/src/core/dimension';
import type { EmptyContent } from '@/src/react/ui/presentation';
import { ViewContent, type DataContentState } from '@/src/react/content';
import {
  describeViewInput,
  readViewBinding,
  resolveViewInput,
  type DataViewDefinition,
  type ResolvedDataViewDefinition,
  type ResolvedVariables,
  type ViewBindingOptions,
} from '@/src/react/view';
import { useViewVariables } from '@/src/react/view-controls';

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
        return client.query(name, input, { signal });
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
      cancel(this: void, onlyObserver = false) {
        if (
          onlyObserver &&
          (queryClient
            .getQueryCache()
            .find({ queryKey, exact: true })
            ?.getObserversCount() ?? 0) > 1
        )
          return Promise.resolve();
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
    > & { dataContext: Context }
  ) {
    const navigationId = randomUuid();
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
      new DeclaredView(
        (input?: Input) => useView(normalized, input, navigationId),
        normalized
      ),
      {
        filter(next: Partial<ScopeVariableValues<Variables>>) {
          for (const key of Object.keys(next)) {
            const variable = normalized.variables[key];
            invariant(
              variable &&
                variable.presentation?.group !== 'display' &&
                variable.kind !== 'hierarchy',
              `Filter actions must target scope variables: ${key}.`
            );
          }
          writeVariableValues(
            normalized.variables,
            next as Partial<AppVariableValues<Variables>>,
            'push'
          );
        },
        hierarchy<
          Key extends {
            [K in keyof Variables]: Variables[K] extends HierarchyVariable<any>
              ? K
              : never;
          }[keyof Variables] &
            string,
        >(key: Key) {
          const variable = normalized.variables[key] as HierarchyVariable<any>;
          invariant(
            variable?.kind === 'hierarchy',
            `Expected a declared hierarchy variable: ${key}.`
          );
          return {
            kind: 'hierarchy' as const,
            variable: variable as Extract<
              Variables[Key],
              HierarchyVariable<any>
            >,
            clientScope,
            loadFacet: (
              operation: string,
              input: unknown,
              signal: AbortSignal
            ) =>
              client
                .query(operation as keyof Operations & string, input as never, {
                  signal,
                })
                .then(response => response.data),
            filter(values: Partial<HierarchyValuesOf<Variables[Key]>>) {
              const current = variable.read(searchParams());
              const next = variable.filter(current, values);
              writeVariableValues(
                { hierarchy: variable },
                { hierarchy: next },
                'push'
              );
            },
            navigationId: `${navigationId}:${key}`,
            read: (input: Input) =>
              variable.parse(
                readViewBinding(normalized, key, input)
              ) as HierarchyStateOf<Variables[Key]>,
          };
        },
        dataset<Row>(
          dataset: DatasetDefinition<
            Data,
            Input,
            Row,
            Parameters<Context['evidence']>[0]
          >
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
          select: (data: Data, input: Input) => MetricValues
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
    return view;
  }

  /** A detail destination receives validated input from a drill action or shared URL.
   * Reuse the operation's input parser; the destination does not own dashboard variables. */
  function defineDetailView<
    Name extends keyof Operations & string,
    const Context extends AuthoringDataContext = AuthoringDataContext,
  >(definition: {
    id: string;
    title: string;
    operation: Name;
    dataContext: Context;
    parseInput: (value: unknown) => InputOf<Operations[Name]>;
    describeInput: (input: InputOf<Operations[Name]>) => string;
    isEmpty: (data: OutputOf<Operations[Name]>) => boolean;
    emptyFallback: EmptyContent;
  }) {
    type Data = OutputOf<Operations[Name]>;
    type Input = InputOf<Operations[Name]>;
    const base = defineDataView<Name, {}, Context>({
      ...definition,
      input: () => {
        throw new Error('Detail views require a drill input.');
      },
    });
    // Keep the declared view identity: dataset ownership and request execution use it.
    const view = Object.assign(base, {
      id: definition.id,
      title: definition.title,
      parseInput: definition.parseInput,
    });
    const detail = view as Omit<typeof view, 'content'>;
    return Object.assign(detail, {
      content(render: (source: DataContentState<Data, Input>) => ReactNode) {
        return createDetailContent(view, render, definition.describeInput);
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
      operation: Name;
      dataContext: Context;
      time: Omit<DateRangeVariableOptions, 'key'>;
      variables?: Additional & { period?: never };
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

    return defineDataView<
      Name,
      { period: typeof period } & Additional,
      Context
    >({
      operation: definition.operation,
      dataContext: definition.dataContext,
      variables: { period, ...definition.variables } as {
        period: typeof period;
      } & Additional,
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

  /** Bind a facet source to a declared operation and its typed input.
   * Options are cached for 60 seconds; known values survive refreshes and errors.
   * Selected values absent from a new result remain available with a zero count. */

  function defineFacetFilter<
    Name extends keyof Operations & string,
    const T extends DimensionValue,
  >(
    config: Omit<DimensionFilterOptions<T>, 'options' | 'facet'> & {
      facet: {
        operation: Name;
        input: (values: Record<string, unknown>) => InputOf<Operations[Name]>;
      };
    } & (OutputOf<Operations[Name]> extends readonly DimensionOption<T>[]
        ? object
        : never)
  ) {
    return dimensionFilter<T>(config);
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
    >,
    explicitInput?: InputOf<Operations[Name]>,
    navigationId?: string
  ) {
    const variables = useViewVariables(
      definition.variables,
      clientScope,
      (operation, input, signal) =>
        client
          .query(operation as keyof Operations & string, input as never, {
            signal,
          })
          .then(response => response.data),
      navigationId
    );
    const describeInput =
      describeViewInput<InputOf<Operations[Name]>>(definition);
    const request = useDataView(
      definition.operation,
      explicitInput !== undefined
        ? explicitInput
        : resolveViewInput(definition, variables.resolved),
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
    defineTimeView,
    defineDetailView,
    defineFacetFilter,
  };
}
