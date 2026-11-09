import type { DataClient } from '@altertable/data-app/client';
import type { InputOf, OutputOf } from '@altertable/data-app/client';
import type {
  DataOperations,
  DateRangeRequest,
} from '@altertable/data-app/contract';
import {
  parseDateTimeRange,
  formatDateTimeRange,
  type DimensionOption,
} from '@altertable/data-app/contract';
import type { CheckedFilterDeclarations } from '@altertable/data-app/internal';
import type { IsUnion } from '@altertable/data-app/internal';
import { facetSource, type FacetFilter } from '@altertable/data-app/internal';
import type { ChoiceFilter } from '@altertable/data-app/internal';
import { randomUuid } from '@altertable/data-app/internal';
import type { MetricValues } from '@altertable/data-app/internal';
import type { DisplayedSnapshot } from '@altertable/data-app/internal';
import {
  displayedSnapshot,
  resolveDataView,
} from '@altertable/data-app/internal';
import {
  invariant,
  type DateRangeFilter,
  type FilterCollection,
  type CheckedFacetContexts,
} from '@altertable/data-app/internal';
import {
  createDimensionFilter,
  type DimensionFilterSettings,
  type DimensionValue,
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
import { Filters } from './filter-set.ts';
import {
  type DateTimeRangeFilter,
  type DateTimeRangeComparisonFilter,
  type DateTimeRangeComparisonRequest,
} from './ui/app-filters.ts';
import type { AuthoringDataContext } from './ui/data-context.ts';
import { useFilterControls, useFilterValues } from './view-controls.tsx';
import { DeclaredView, type ViewRequest } from './view-runtime.tsx';
import {
  describeViewInput,
  resolveViewEmptiness,
  resolveViewInput,
  type DataViewDefinition,
  type ResolvedDataViewDefinition,
  type ResolvedFilters,
  type ViewBindingOptions,
  type ViewDate,
  type ViewEmptiness,
} from './view.ts';

type CalendarTimeViewDefinition<
  Operations extends DataOperations,
  Name extends keyof Operations & string,
  Collection extends { period: DateRangeFilter } & FilterCollection,
  Context extends AuthoringDataContext,
> = {
  operation: Name & (true extends IsUnion<NoInfer<Name>> ? never : unknown);
  dataContext: Context;
  /** The filters this view reads, including its reporting `period`. */
  filters: Filters<Collection>;
} & ViewEmptiness<OutputOf<Operations[Name]>> &
  TimeInputMapping<NoInfer<Collection>, InputOf<Operations[Name]>> &
  ViewBindingOptions<
    NoInfer<Collection>,
    InputOf<Operations[Name]>,
    RequiredPeriodBinding<InputOf<Operations[Name]>>
  >;

type DateTimeViewDefinition<
  Operations extends DataOperations,
  Name extends keyof Operations & string,
  Collection extends {
    period: DateTimeRangeFilter | DateTimeRangeComparisonFilter;
  } & FilterCollection,
  Context extends AuthoringDataContext,
> = Omit<
  DataViewDefinition<
    Name,
    NoInfer<Collection>,
    InputOf<Operations[Name]>,
    OutputOf<Operations[Name]>
  >,
  'filters' | 'describeInput' | 'date'
> & {
  operation: Name & (true extends IsUnion<NoInfer<Name>> ? never : unknown);
  dataContext: Context;
  /** The filters this view reads, including its reporting `period`. */
  filters: Filters<Collection>;
} & ViewBindingOptions<
    NoInfer<Collection>,
    InputOf<Operations[Name]>,
    Collection['period'] extends DateTimeRangeComparisonFilter
      ? InputOf<Operations[Name]> extends {
          period: DateTimeRangeComparisonRequest;
        }
        ? never
        : 'period'
      : never
  >;

function reportingTimeZone(definition: {
  filters: FilterCollection;
  date?: { filter: string };
}) {
  const period = definition.filters[definition.date?.filter ?? 'period'];
  if (period?.kind === 'dateRange') return period.bounds().timeZone;
  if (
    period?.kind === 'dateTimeRangeComparison' ||
    period?.kind === 'dateTimeRange'
  )
    return period.contract?.bounds().timeZone;
  return undefined;
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

/** Without other filters, a calendar view's default input is the period request itself. */
type TimeInput<Collection extends FilterCollection> =
  Exclude<keyof Collection, 'period'> extends never
    ? DateRangeRequest
    : ResolvedFilters<Collection>;
type TimeInputMapping<Collection extends FilterCollection, Input> =
  TimeInput<Collection> extends Input
    ? { input?: (values: ResolvedFilters<Collection>) => Input }
    : { input: (values: ResolvedFilters<Collection>) => Input };

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
  Collection extends FilterCollection,
  Input,
  Data,
  Context extends AuthoringDataContext,
  HasDate extends boolean,
> = DeclaredView<
  Data,
  Input,
  ResolvedDataViewDefinition<Name, Collection, Input, Data> & {
    describeInput: (input: Input) => string;
  }
> & {
  filter(): FilterTarget<FilterPatch<Collection>>;
  breakdown<Key extends keyof Collection & string>(
    key: Key &
      (Collection[Key] extends ChoiceFilter<any>
        ? Extract<
            Collection[Key]['presentation'],
            { group: 'display' }
          > extends never
          ? never
          : unknown
        : never)
  ): Collection[Key] extends ChoiceFilter<infer Value>
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
  Context extends FilterCollection,
  Name extends keyof Operations & string,
> = DimensionFilterSettings<Value> & {
  facet: {
    context: Context &
      CheckedFilterDeclarations<NoInfer<Context>> &
      (string extends keyof Context ? never : unknown);
    operation: Name & (true extends IsUnion<NoInfer<Name>> ? never : unknown);
    input: (
      values: ResolvedFilters<NoInfer<Context>>
    ) => InputOf<Operations[NoInfer<Name>]>;
  };
};

type CheckedFacetSources<
  Operations extends DataOperations,
  Collection extends FilterCollection,
> = CheckedFilterDeclarations<Collection> & {
  [Key in keyof Collection]: Collection[Key] extends FacetFilter<
    infer Value,
    infer _Context,
    infer Name,
    infer Input
  >
    ? Name extends keyof Operations
      ? Input extends InputOf<Operations[Name]>
        ? OutputOf<Operations[Name]> extends readonly DimensionOption<Value>[]
          ? Collection[Key]
          : never
        : never
      : never
    : Collection[Key];
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

/** Bind declared operations to URL filters, displayed readings, and request feedback. */
export function createDataHooks<Operations extends DataOperations>(
  client: DataClient<Operations>
) {
  const clientScope = getClientScope(client);

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

  /** Omitted filters resolve to {}; matching operation inputs derive from those values.
   * Supply a mapper for nested or different input shapes. */
  function defineDataView<
    Name extends keyof Operations & string,
    const Collection extends FilterCollection = {},
    const Context extends AuthoringDataContext = AuthoringDataContext,
  >(
    definition: DataViewDefinition<
      Name,
      Collection,
      InputOf<Operations[Name]>,
      OutputOf<Operations[Name]>
    > & {
      operation: Name & (true extends IsUnion<NoInfer<Name>> ? never : unknown);
    } & {
      dataContext: Context;
      date: ViewDate<Collection, InputOf<Operations[Name]>>;
    }
  ): BoundDataView<
    Name,
    Collection,
    InputOf<Operations[Name]>,
    OutputOf<Operations[Name]>,
    Context,
    true
  >;
  function defineDataView<
    Name extends keyof Operations & string,
    const Collection extends FilterCollection = {},
    const Context extends AuthoringDataContext = AuthoringDataContext,
  >(
    definition: DataViewDefinition<
      Name,
      Collection,
      InputOf<Operations[Name]>,
      OutputOf<Operations[Name]>
    > & {
      operation: Name & (true extends IsUnion<NoInfer<Name>> ? never : unknown);
    } & { dataContext: Context }
  ): BoundDataView<
    Name,
    Collection,
    InputOf<Operations[Name]>,
    OutputOf<Operations[Name]>,
    Context,
    false
  >;
  function defineDataView<
    Name extends keyof Operations & string,
    const Collection extends FilterCollection = {},
    const Context extends AuthoringDataContext = AuthoringDataContext,
  >(
    definition: DataViewDefinition<
      Name,
      Collection,
      InputOf<Operations[Name]>,
      OutputOf<Operations[Name]>
    > & { dataContext: Context }
  ) {
    return bindDataView(definition);
  }

  function bindDataView<
    Name extends keyof Operations & string,
    const Collection extends FilterCollection,
    const Context extends AuthoringDataContext,
    HasDate extends boolean = boolean,
  >(
    definition: DataViewDefinition<
      Name,
      Collection,
      InputOf<Operations[Name]>,
      OutputOf<Operations[Name]>
    > & { dataContext: Context }
  ): BoundDataView<
    Name,
    Collection,
    InputOf<Operations[Name]>,
    OutputOf<Operations[Name]>,
    Context,
    HasDate
  > {
    const filters = (
      definition.filters ? Filters.collection(definition.filters) : {}
    ) as Collection;
    const input =
      definition.input ??
      ((values: ResolvedFilters<Collection>) =>
        values as unknown as InputOf<Operations[Name]>);

    const describeInput = describeViewInput<InputOf<Operations[Name]>>({
      ...definition,
      filters,
    });
    type Data = OutputOf<Operations[Name]>;
    type Input = InputOf<Operations[Name]>;
    const metadata: Omit<
      DataViewDefinition<Name, Collection, Input, Data>,
      'filters' | 'input'
    > = definition;
    const normalized = {
      ...metadata,
      ...resolveViewEmptiness(definition),
      filters,
      filterSet: definition.filters,
      input,
      describeInput,
    };
    const view = Object.assign(
      new DeclaredView(request => useView(normalized, request), normalized),
      {
        filter() {
          return createFilterTarget<Collection>({
            owner: view,
            filters,
            input,
            bindings: definition.bindings,
            date: definition.date,
          });
        },
        breakdown(key: string) {
          return createBreakdownTarget({
            owner: view,
            filters,
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
            reportingTimeZone(normalized)
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
      Collection,
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
    const resolved = { ...definition, ...resolveViewEmptiness(definition) };
    const target = new DetailView<Data, Input>(resolved, input => {
      const request = useDataView({
        name: definition.operation,
        input,
        isEmpty: resolved.isEmpty,
        describeInput: definition.describeInput,
        enabled: true,
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
        emptyFallback: resolved.emptyFallback,
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

  /** A time view reads its reporting `period` from its filters. Without other filters,
   * a calendar view's default input is the DateRangeRequest; with them it is
   * { period, ...filters }. Other operation shapes require an input mapper.
   * Mappers must preserve the period and dimension selections; bindings extract nested inputs.
   * Use defineDataView with describeInput for deliberately fixed-period views. */
  function defineCalendarTimeView<
    Name extends keyof Operations & string,
    const Collection extends { period: DateRangeFilter } & FilterCollection,
    const Context extends AuthoringDataContext = AuthoringDataContext,
  >(
    definition: CalendarTimeViewDefinition<
      Operations,
      Name,
      Collection,
      Context
    >
  ) {
    const hasOtherFilters =
      Object.keys(Filters.collection(definition.filters)).length > 1;
    return bindDataView<Name, Collection, Context, true>({
      operation: definition.operation,
      dataContext: definition.dataContext,
      filters: definition.filters,
      bindings: definition.bindings,
      input(values: ResolvedFilters<Collection>) {
        if (definition.input) return definition.input(values);
        if (!hasOtherFilters) return values.period as InputOf<Operations[Name]>;

        return { ...values } as InputOf<Operations[Name]>;
      },
      date: {
        filter: 'period' as never,
        input(input: InputOf<Operations[Name]>) {
          return definition.bindings?.period
            ? (definition.bindings.period(input) as DateRangeRequest)
            : ((input && typeof input === 'object' && 'period' in input
                ? input.period
                : input) as DateRangeRequest);
        },
      },
      isEmpty: definition.isEmpty,
      emptyFallback: definition.emptyFallback,
    } as unknown as Parameters<
      typeof bindDataView<Name, Collection, Context, true>
    >[0]);
  }

  function defineDateTimeView<
    Name extends keyof Operations & string,
    const Collection extends {
      period: DateTimeRangeFilter | DateTimeRangeComparisonFilter;
    } & FilterCollection,
    const Context extends AuthoringDataContext = AuthoringDataContext,
  >(definition: DateTimeViewDefinition<Operations, Name, Collection, Context>) {
    const period = Filters.collection(definition.filters).period;
    type HasDate = Collection['period'] extends DateTimeRangeComparisonFilter
      ? true
      : false;
    return bindDataView<Name, Collection, Context, HasDate>({
      ...definition,
      ...(period.kind === 'dateTimeRangeComparison'
        ? {
            date: {
              filter: 'period',
              input(input: InputOf<Operations[Name]>) {
                return (
                  definition.bindings?.period
                    ? definition.bindings.period(input)
                    : (input as { period: unknown }).period
                ) as DateTimeRangeComparisonRequest;
              },
            },
          }
        : {}),
      describeInput(input: InputOf<Operations[Name]>) {
        const selected = definition.bindings?.period
          ? definition.bindings.period(input)
          : (input as { period: unknown }).period;
        return period.kind === 'dateTimeRangeComparison'
          ? formatDateTimeRange(
              parseDateTimeRange(
                (selected as DateTimeRangeComparisonRequest).range
              )
            )
          : period.describe!(parseDateTimeRange(selected));
      },
    } as unknown as Parameters<
      typeof bindDataView<Name, Collection, Context, HasDate>
    >[0]);
  }

  /** Define a view driven by the `period` filter: a calendar `dateRangeFilter()` or a
   * datetime `dateTimeRangeFilter()`, declared with the app's other filters. */
  function defineTimeView<
    Name extends keyof Operations & string,
    const Collection extends {
      period: DateTimeRangeComparisonFilter;
    } & FilterCollection,
    const Context extends AuthoringDataContext = AuthoringDataContext,
  >(
    definition: DateTimeViewDefinition<Operations, Name, Collection, Context>
  ): BoundDataView<
    Name,
    Collection,
    InputOf<Operations[Name]>,
    OutputOf<Operations[Name]>,
    Context,
    true
  >;
  function defineTimeView<
    Name extends keyof Operations & string,
    const Collection extends { period: DateTimeRangeFilter } & FilterCollection,
    const Context extends AuthoringDataContext = AuthoringDataContext,
  >(
    definition: DateTimeViewDefinition<Operations, Name, Collection, Context>
  ): BoundDataView<
    Name,
    Collection,
    InputOf<Operations[Name]>,
    OutputOf<Operations[Name]>,
    Context,
    false
  >;
  function defineTimeView<
    Name extends keyof Operations & string,
    const Collection extends { period: DateRangeFilter } & FilterCollection,
    const Context extends AuthoringDataContext = AuthoringDataContext,
  >(
    definition: CalendarTimeViewDefinition<
      Operations,
      Name,
      Collection,
      Context
    >
  ): BoundDataView<
    Name,
    Collection,
    InputOf<Operations[Name]>,
    OutputOf<Operations[Name]>,
    Context,
    true
  >;
  function defineTimeView(definition: any): any {
    const period = Filters.collection(definition.filters).period;
    invariant(
      period?.kind === 'dateRange' ||
        period?.kind === 'dateTimeRange' ||
        period?.kind === 'dateTimeRangeComparison',
      'A time view needs a date range filter named period.'
    );
    return period.kind === 'dateRange'
      ? defineCalendarTimeView(definition)
      : defineDateTimeView(definition);
  }

  /** Bind typed options to a registered operation and explicitly declared filter dependencies.
   * The input mapper receives only resolved context values; consuming views must include that context.
   * Options are cached for 60 seconds; known values survive refreshes and errors.
   * Selected values absent from a new result remain available without an invented count. */

  function defineFacetFilter<
    const Context extends FilterCollection,
    const Name extends FacetOperationName<Operations, string>,
  >(
    config: FacetConfig<Operations, string, Context, Name>
  ): FacetFilter<string, Readonly<Context>, Name, InputOf<Operations[Name]>>;
  function defineFacetFilter<
    const Context extends FilterCollection,
    const Name extends FacetOperationName<Operations, number>,
  >(
    config: FacetConfig<Operations, number, Context, Name>
  ): FacetFilter<number, Readonly<Context>, Name, InputOf<Operations[Name]>>;
  function defineFacetFilter<
    const Context extends FilterCollection,
    Value extends DimensionValue,
    Name extends keyof Operations & string,
  >(
    config: DimensionFilterSettings<Value> & {
      facet: {
        context: Context;
        operation: Name;
        input: (values: ResolvedFilters<Context>) => InputOf<Operations[Name]>;
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
            ) as ResolvedFilters<Context>;
            return mapInput(resolved);
          },
        }),
      }
    );
  }

  function useView<
    Name extends keyof Operations & string,
    const Collection extends FilterCollection,
  >(
    definition: ResolvedDataViewDefinition<
      Name,
      Collection,
      InputOf<Operations[Name]>,
      OutputOf<Operations[Name]>
    >,
    request: ViewRequest
  ) {
    const filters = useFilterValues(definition.filters);
    const describeInput =
      describeViewInput<InputOf<Operations[Name]>>(definition);
    const dataView = useDataView({
      name: definition.operation,
      input: resolveViewInput(definition, filters.resolved),
      isEmpty: definition.isEmpty,
      describeInput,
      enabled: request.enabled,
    });

    return {
      view: dataView.view,
      dataContext: definition.dataContext,
      snapshot: dataView.snapshot,
      scope: displayedScope(dataView.view, describeInput),
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

  function useControls(collection: FilterCollection) {
    return useFilterControls(collection, clientScope, loadFacet);
  }

  /** Declare the app's filters and display options once. Views read them, or a `pick()`;
   * `<DataApp filters>` renders their controls. URL keys must be unique. */
  function defineFilters<const Collection extends FilterCollection>(
    collection: Collection &
      CheckedFacetContexts<NoInfer<Collection>> &
      CheckedFacetSources<Operations, NoInfer<Collection>>
  ): Filters<Collection> {
    return Filters.create(collection as Collection, useControls);
  }

  return {
    defineFilters,
    defineDataView,
    defineDetailView,
    defineTimeView,
    defineFacetFilter,
  };
}
