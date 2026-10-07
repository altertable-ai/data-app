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
  resolveViewInput,
  type DataViewDefinition,
  type ResolvedDataViewDefinition,
  type ResolvedVariables,
  type ViewBindings,
} from '@/src/react/view';
import { useViewVariables } from '@/src/react/view-controls';

const clientScopes = new WeakMap<object, string>();

function getClientScope(client: object): string {
  let scope = clientScopes.get(client);
  if (!scope) {
    scope = crypto.randomUUID();
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
    > & { dataContext: Context }
  ) {
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
        dataset<Row>(
          dataset: DatasetDefinition<
            Data,
            Input,
            Row,
            Parameters<Context['evidence']>[0]
          >
        ) {
          return bindDataset({
            ...dataset,
            evidence: definition.dataContext.evidence(dataset.evidence),
          });
        },
        metric(
          metric: Parameters<Context['metric']>[0],
          select: (data: Data, input: Input) => MetricValues
        ) {
          return bindMetric(
            definition.dataContext.metric(metric),
            select,
            definition.date?.input
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
      bindings?: ViewBindings<
        { period: ReturnType<typeof dateRangeVariable> } & NoInfer<Additional>,
        InputOf<Operations[Name]>
      >;
      isEmpty: (data: OutputOf<Operations[Name]>) => boolean;
      emptyFallback: EmptyContent;
    } & TimeInputMapping<NoInfer<Additional>, InputOf<Operations[Name]>>
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
    >
  ) {
    const variables = useViewVariables(
      definition.variables,
      clientScope,
      (operation, input, signal) =>
        client
          .query(operation as keyof Operations & string, input as never, {
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
      controls: variables.controls,
      variables,
    };
  }

  return {
    defineDataView,
    defineTimeView,
    defineFacetFilter,
  };
}
