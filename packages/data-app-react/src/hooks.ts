import type { DataClient } from '@altertable/data-app/client';
import type { InputOf, OutputOf } from '@altertable/data-app/client';
import type { DataOperations } from '@altertable/data-app/contract';
import {
  combineOperationFilters,
  displayedSnapshot,
  randomUuid,
  resolveDataView,
  type ChoiceFilter,
  type DisplayedSnapshot,
  type FilterCollection,
  type FilterInput,
  type IsUnion,
  type MetricValues,
} from '@altertable/data-app/internal';
import { hashKey, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import {
  bindDataset,
  bindMetric,
  displayedScope,
  type DatasetDefinition,
  type Dataset,
  type Metric,
} from './bindings.ts';
import { ViewContent, type DataContentState } from './content.ts';
import { DetailView, type DetailViewDefinition } from './details.tsx';
import {
  createFilterTarget,
  createBreakdownTarget,
  type FilterTarget,
  type BreakdownTarget,
  type FilterPatch,
} from './exploration.ts';
import type { DateTimeRangeFilter } from './ui/app-filters.ts';
import type { AuthoringDataContext } from './ui/data-context.ts';
import { useFilterControls, useFilterValues } from './view-controls.tsx';
import {
  DeclaredView,
  type ClientFilters,
  type ViewRequest,
} from './view-runtime.tsx';
import {
  describeFilterInput,
  readViewPeriod,
  resolveViewDefinition,
  resolveViewEmptiness,
  type ResolvedViewDefinition,
  type ViewDefinition,
} from './view.ts';

/** The reporting time zone of the operation's date filter. */
function reportingTimeZone(definition: {
  filters: FilterCollection;
  dateFilter?: string;
}) {
  const period = definition.dateFilter
    ? definition.filters[definition.dateFilter]
    : undefined;
  return period?.kind === 'dateTimeRange' ? period.policy.timeZone : undefined;
}

const clientScopes = new WeakMap<object, string>();

function getClientScope(client: object): string {
  let scope = clientScopes.get(client);
  if (!scope) {
    scope = randomUuid();
    clientScopes.set(client, scope);
  }

  return scope;
}

type NonEmptyColumns<Columns extends object> = keyof Columns extends never
  ? never
  : Columns;

/** The filters an operation declares; `{}` when it reads none. */
type FiltersOf<Operation> = Operation extends {
  filters: infer Filters extends FilterCollection;
}
  ? Filters
  : {};

/** The fields a destination's interactions supply; its filters carry over. */
type DetailOwnInput<Operation> = Omit<
  InputOf<Operation>,
  keyof FiltersOf<Operation>
>;

/** Operations a view can run: those whose input is their declared filters, or empty.
 * Operations that parse their own input are destinations for `defineDetailView`. */
type ViewOperationName<Operations extends DataOperations> = {
  [Name in keyof Operations & string]: Operations[Name] extends {
    filters: infer Filters extends FilterCollection;
  }
    ? [FilterInput<Filters>] extends [InputOf<Operations[Name]>]
      ? Name
      : never
    : [InputOf<Operations[Name]>] extends [Record<string, never>]
      ? Name
      : never;
}[keyof Operations & string];

/** Metric comparisons need a reporting period with a comparison. */
type HasPeriod<Filters extends FilterCollection> = {
  [Name in keyof Filters]: Filters[Name] extends DateTimeRangeFilter<true>
    ? true
    : never;
}[keyof Filters] extends never
  ? false
  : true;

type DisplayChoiceName<Filters extends FilterCollection> = {
  [Name in keyof Filters]: Filters[Name] extends ChoiceFilter<any>
    ? Extract<Filters[Name]['presentation'], { group: 'display' }> extends never
      ? never
      : Name
    : never;
}[keyof Filters] &
  string;

type BoundView<
  Name extends string,
  Filters extends FilterCollection,
  Data,
  Context extends AuthoringDataContext,
> = DeclaredView<
  Data,
  FilterInput<Filters>,
  ResolvedViewDefinition<Name, Filters, Data> & {
    clientFilters: ClientFilters;
  }
> & {
  filter(): FilterTarget<FilterPatch<Filters>>;
  breakdown<Key extends DisplayChoiceName<Filters>>(
    key: Key
  ): Filters[Key] extends ChoiceFilter<infer Value>
    ? BreakdownTarget<Value>
    : never;
  dataset<
    Row,
    const Columns extends Record<string, object> = Record<string, object>,
  >(
    definition: DatasetDefinition<
      Data,
      FilterInput<Filters>,
      Row,
      Parameters<Context['evidence']>[0]
    > & {
      columns: Columns & NonEmptyColumns<Columns>;
    }
  ): Dataset<Data, FilterInput<Filters>, Row>;
  metric(
    definition: Parameters<Context['metric']>[0],
    select: (
      data: Data,
      input: FilterInput<Filters>
    ) => HasPeriod<Filters> extends true
      ? MetricValues
      : { current: number; previous?: never }
  ): Metric<Data, FilterInput<Filters>>;
  scope(snapshot: DisplayedSnapshot<Data, FilterInput<Filters>>): string;
  content(
    render: (state: DataContentState<Data, FilterInput<Filters>>) => ReactNode
  ): ViewContent<Data, FilterInput<Filters>>;
};

type BoundDetailView<
  Data,
  Input,
  Context extends AuthoringDataContext,
  Own = Input,
> = DetailView<Data, Input, Own> & {
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

/** Bind declared operations to URL filters, displayed readings, and request feedback.
 * The client's operations declare their filters; `<DataApp>` renders their controls. */
export function createDataHooks<Operations extends DataOperations>(
  client: DataClient<Operations>
) {
  const clientScope = getClientScope(client);
  const operationFilters = client.filters;
  const appFilters = combineOperationFilters(operationFilters);
  const clientFilters: ClientFilters = {
    filters: appFilters,
    useControls() {
      return useFilterControls(
        appFilters,
        operationFilters,
        clientScope,
        loadFacet
      );
    },
  };

  function useDataQuery<Name extends keyof Operations & string>({
    name,
    input,
    enabled,
  }: {
    name: Name;
    input: InputOf<Operations[Name]>;
  } & ViewRequest) {
    const queryClient = useQueryClient();
    const queryKey = ['data-operation', clientScope, name, input] as const;
    const query = useQuery({
      queryKey,
      enabled,
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

  function useDataView<Name extends keyof Operations & string>({
    name,
    input,
    isEmpty,
    describeInput,
    enabled,
  }: {
    name: Name;
    input: InputOf<Operations[Name]>;
    isEmpty: (data: OutputOf<Operations[Name]>) => boolean;
    describeInput?: (input: InputOf<Operations[Name]>) => string;
  } & ViewRequest) {
    const query = useDataQuery({ name, input, enabled });
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
      describe: describeInput ?? (() => 'this view'),
      isEmpty,
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

  /** One view per operation: its filters, scope, and reporting period come from the
   * operation. Supply `describeInput` only to replace the derived scope. */
  function defineView<
    Name extends ViewOperationName<Operations>,
    const Context extends AuthoringDataContext = AuthoringDataContext,
  >(
    definition: ViewDefinition<
      Name,
      FilterInput<FiltersOf<Operations[Name]>>,
      OutputOf<Operations[Name]>
    > & {
      operation: Name & (true extends IsUnion<NoInfer<Name>> ? never : unknown);
      dataContext: Context;
    }
  ): BoundView<
    Name,
    FiltersOf<Operations[Name]>,
    OutputOf<Operations[Name]>,
    Context
  > {
    type Filters = FiltersOf<Operations[Name]>;
    type Data = OutputOf<Operations[Name]>;
    type Input = FilterInput<Filters>;
    const filters = (operationFilters[definition.operation] ?? {}) as Filters;
    const resolved = {
      ...resolveViewDefinition<Name, Filters, Data>(definition, filters),
      clientFilters,
    };
    const view = Object.assign(
      new DeclaredView<Data, Input, typeof resolved>(
        // The operation's input is exactly its filters, so the result is typed by them.
        request => useView(resolved, request) as never,
        resolved
      ),
      {
        filter() {
          return createFilterTarget<Filters>({ owner: view, filters });
        },
        breakdown(key: string) {
          return createBreakdownTarget({ owner: view, filters, key });
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
            reportingTimeZone(resolved)
          );
        },
        metric(
          metric: Parameters<Context['metric']>[0],
          select: (data: Data, input: Input) => MetricValues
        ) {
          return bindMetric(
            definition.dataContext.metric(metric),
            select,
            resolved.dateFilter
              ? (input: Input) => readViewPeriod(resolved, input)!
              : undefined,
            view
          );
        },
        scope(snapshot: DisplayedSnapshot<Data, Input>) {
          return resolved.describeInput(snapshot.input);
        },
        content(
          render: (state: DataContentState<Data, Input>) => ReactNode
        ): ViewContent<Data, Input> {
          return new ViewContent(view, render, resolved.describeInput);
        },
      }
    );
    return view as unknown as BoundView<Name, Filters, Data, Context>;
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
    Context,
    DetailOwnInput<Operations[Name]>
  > {
    type Data = OutputOf<Operations[Name]>;
    type Input = InputOf<Operations[Name]>;
    const resolved = {
      ...definition,
      ...resolveViewEmptiness(definition),
      describeInput:
        definition.describeInput ??
        (describeFilterInput(operationFilters[definition.operation] ?? {}) as (
          input: Input
        ) => string),
    };
    const target = new DetailView<
      Data,
      Input,
      DetailOwnInput<Operations[Name]>
    >(
      resolved,
      input => {
        const request = useDataView({
          name: definition.operation,
          input,
          isEmpty: resolved.isEmpty,
          describeInput: resolved.describeInput,
          enabled: true,
        });
        return {
          view: request.view,
          dataContext: definition.dataContext,
          snapshot: request.snapshot,
          scope: displayedScope(request.view, resolved.describeInput),
          refetch() {
            void request.refetch();
          },
          cancel: request.cancel,
          refreshing: request.refreshing,
          queries: request.queries,
          emptyFallback: resolved.emptyFallback,
        };
      },
      operationFilters[definition.operation]
    );
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

  function useView<
    Name extends keyof Operations & string,
    Filters extends FilterCollection,
    Data,
  >(
    definition: ResolvedViewDefinition<Name, Filters, Data>,
    request: ViewRequest
  ) {
    const filters = useFilterValues(definition.filters);
    const dataView = useDataView({
      name: definition.operation,
      input: filters.resolved as InputOf<Operations[Name]>,
      isEmpty: definition.isEmpty as (
        data: OutputOf<Operations[Name]>
      ) => boolean,
      describeInput: definition.describeInput as (
        input: InputOf<Operations[Name]>
      ) => string,
      enabled: request.enabled,
    });

    return {
      view: dataView.view,
      dataContext: definition.dataContext,
      snapshot: dataView.snapshot,
      scope: displayedScope(dataView.view, definition.describeInput as never),
      refetch() {
        if (!filters.refreshTime()) void dataView.refetch();
      },
      cancel: dataView.cancel,
      refreshing: dataView.refreshing,
      queries: dataView.queries,
      emptyFallback: definition.emptyFallback,
      timeZone: reportingTimeZone(definition),
    };
  }

  function loadFacet(operation: string, input: unknown, signal: AbortSignal) {
    return client
      .query(operation as never, input as never, { signal })
      .then(response => response.data);
  }

  return { defineView, defineDetailView };
}
