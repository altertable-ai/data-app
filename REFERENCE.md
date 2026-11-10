# Data app API reference

Search an export to find its import paths, signature, and props:

```sh
rg '^LineChart\b' REFERENCE.md
```

Each export and field has its own line. `?` marks optional fields;
`[variant 2 of 3]` identifies union-specific fields.
`= props listed as Name.*` points to a component's prop definitions.

```text
AboutData (component, @altertable/data-app-react/ui): (props: AboutDataProps)
AboutData.empty?: AboutEmpty
AboutData.id?: string
AboutData.title?: ReactNode
AboutData.description?: ReactNode
AboutData.visual?: ReactNode
AboutData.visualKind?: 'chart' | 'metric' | 'widget'
AboutData.dataContext?: DataContext
AboutData.references?: { kind: 'ids'; glossaryIds?: readonly string[] | undefined; queryNames?: readonly string[] | undefined; } | { kind: 'entries'; entries: readonly GlossaryEntry[]; }
AboutData.queries?: DisclosedQuery[]
AboutData.records?: InspectionRecords
AboutData.variant?: 'elevated' | 'ghost' | 'inline' | 'outline' | 'primary'
AboutData.iconOnly?: boolean
AboutData.shortcut?: boolean — Register the global inspect shortcut. Defaults on for existing toolbar triggers; local triggers set false.
AboutData.tooltip?: ReactNode
AboutData.children?: ReactNode
AboutData.footer?: ReactNode
AboutData.portalRoot?: RefObject<HTMLElement | null>
AboutData.sheetProps?: SheetDialogProps
AboutData.headerActions?: ReactNode
AboutData.open?: boolean
AboutData.onOpenChange?: ((open: boolean) => void)
AboutData.tab?: AboutTab — Initial inspect tab. While open, the URL's `tab` parameter tracks selection.
AboutData.trigger?: boolean
AboutData.…: plus props inherited from React
AboutDataProps (type, @altertable/data-app-react/ui): = props listed as AboutData.*
AboutEmpty (type, @altertable/data-app-react/ui)
AboutEmpty.glossary: { title: string; description?: string | undefined; }
AboutEmpty.queries: { title: string; description?: string | undefined; }
AboutSubject (type, @altertable/data-app-react/ui)
AboutSubject.empty?: AboutEmpty
AboutSubject.id?: string
AboutSubject.title?: ReactNode
AboutSubject.description?: ReactNode
AboutSubject.visual?: ReactNode
AboutSubject.visualKind?: 'chart' | 'metric' | 'widget'
AboutSubject.dataContext?: DataContext
AboutSubject.references?: { kind: 'ids'; glossaryIds?: readonly string[] | undefined; queryNames?: readonly string[] | undefined; } | { kind: 'entries'; entries: readonly GlossaryEntry[]; }
AboutSubject.queries?: DisclosedQuery[]
AboutSubject.records?: InspectionRecords
AboutTab (type, @altertable/data-app-react/ui): = 'glossary' | 'queries' | 'records'
AbsoluteOrRelativeDateTime (type, @altertable/data-app, @altertable/data-app/config, @altertable/data-app/contract, @altertable/data-app/format): Frontend-compatible range values. Absolute dates encode wall-clock fields as UTC, not instants converted from a reporting timezone. The backend interprets that zone.
AbsoluteOrRelativeDateTime.anchor: RelativeAnchor [variant 2 of 2]
AbsoluteOrRelativeDateTime.offset: RelativeOffset[] [variant 2 of 2]
AbsoluteOrRelativeDateTime.…: plus props inherited from built-in
ActionBuilder (class, @altertable/data-app-react): <Row, Input>
ActionBuilder.detail: <DestinationInput, Own>(config: DetailAction<Row, Input, DestinationInput, Own>) => ActionDeclaration<Row, Input>
ActionBuilder.filter: <Patch extends object, const Values extends NoInfer<Patch>, Value extends string = never>(config: ActionCondition<Row> & { label: string; target: FilterTarget<Patch>; values: (row: Row) => Values & NoInfer<Patch>; breakdown?: { ...; } | undefined; }) => ActionDeclaration<...>
AnnotationTarget (component, @altertable/data-app-react): (props: AnnotationTargetProps) — A stable feedback target for app-owned content outside the built-in widgets.
AnnotationTarget.annotationId: string
AnnotationTarget.label: string
AnnotationTarget.evidence?: WidgetEvidence
AnnotationTarget.…: plus props inherited from React
AnnotationTargetProps (type, @altertable/data-app-react): = props listed as AnnotationTarget.*
AppearanceOptions (type, @altertable/data-app/appearance): App-authored overrides; omitted fields use the package defaults.
AppearanceOptions.theme?: ThemePreference
AppearanceOptions.baseColor?: 'neutral' | 'slate' | 'warm' — Palette for surfaces, text, and borders; independent of the accent.
AppearanceOptions.accentColor?: string — Emphasis color for checked controls and selected dates; options use the base palette.
AppearanceOptions.darkAccentColor?: string
AppearanceOptions.chartColors?: string[]
AppearanceOptions.density?: 'comfortable' | 'compact' | 'spacious'
AppearanceOptions.cornerRadius?: 'large' | 'medium' | 'none' | 'small'
AppearanceOptions.elevation?: 'flat' | 'raised' | 'subtle'
AppearanceOptions.typography?: Partial<{ body: string; heading: string; }>
AppearanceSettings (type, @altertable/data-app/appearance)
AppearanceSettings.theme: ThemePreference
AppearanceSettings.baseColor: 'neutral' | 'slate' | 'warm' — Palette for surfaces, text, and borders; independent of the accent.
AppearanceSettings.accentColor: string — Emphasis color for checked controls and selected dates; options use the base palette.
AppearanceSettings.darkAccentColor?: string
AppearanceSettings.chartColors: string[]
AppearanceSettings.density: 'comfortable' | 'compact' | 'spacious'
AppearanceSettings.cornerRadius: 'large' | 'medium' | 'none' | 'small'
AppearanceSettings.elevation: 'flat' | 'raised' | 'subtle'
AppearanceSettings.typography: { body: string; heading: string; }
AppFilter (type, @altertable/data-app/contract): <Value, Kind> — An app-owned value with one URL representation. Controls never parse or write routes.
AppFilter.kind: Kind
AppFilter.label?: string
AppFilter.presentation?: (FilterPresentation & { group?: 'display' | 'scope' | undefined; }) — Display options (`displayChoice()`) change how results are shown, not which data is included.
AppFilter.urlKeys: readonly string[]
AppFilter.defaultValue: Value
AppFilter.clearValue?: Value — Unrestricted value, when this filter can be cleared.
AppFilter.describe?: ((value: Value) => string)
AppFilter.history: HistoryMode
AppFilter.read: (params: URLSearchParams) => Value
AppFilter.write: (value: Value) => Record<string, string | null>
AppFilter.valid: (value: Value) => boolean
AppFilter.same: (left: Value, right: Value) => boolean
AppIcon (function, @altertable/data-app-react/ui): (options: AppIconProps): FunctionComponentElement<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>
AppIcon.options.name: 'annotate' | 'breakdown' | 'calendar' | 'cancel' | 'check' | 'clearFilters' | 'clock' | 'close' | 'copy' | 'darkTheme' | 'disclosure' | 'displayOptions' | 'error' | 'explore' | ... 22 more ... | 'wrap'
AppIcon.options.size?: string | number
AppIcon.options.…: plus props inherited from lucide-react, React
AppIconName (type, @altertable/data-app-react/ui): = 'annotate' | 'breakdown' | 'calendar' | 'cancel' | 'check' | 'clearFilters' | 'clock' | 'close' | 'copy' | 'darkTheme' | 'disclosure' | 'displayOptions' | 'error' | 'explore' | ... 22 more ... | 'wrap'
AppIconProps (type, @altertable/data-app-react/ui): = props listed as AppIcon.options.*
AreaChart (component, @altertable/data-app-react/ui): <Row extends AreaChartItem>(props: AreaChartProps<Row>) — Ordered finite samples filled to a zero baseline, including negative values. Samples are equally spaced; supply missing periods explicitly.
AreaChart.items: readonly Row[] — Ordered samples; the chart validates IDs and values when rendering.
AreaChart.itemActions?: ItemActions<Row> — Actions available for each displayed item. Domain fields remain available to this callback.
AreaChart.unit: string
AreaChart.ariaLabel: string
AreaChart.formatValue?: ((value: number) => string)
AreaChart.horizontalGrid?: boolean — Draw horizontal grid lines behind the plotted values.
AreaChart.cursorGroup?: ChartCursorGroup — Share mouse-hover timestamps with charts receiving the same handle. Matches each item's time exactly.
AreaChartItem (type, @altertable/data-app-react/ui)
AreaChartItem.id: string
AreaChartItem.label: string
AreaChartItem.value: number
AreaChartItem.time?: number — Optional timestamp in epoch milliseconds for cursor linking. Omit for category samples.
AreaChartProps (type, @altertable/data-app-react/ui): <Row> = props listed as AreaChart.*
BarChart (component, @altertable/data-app-react/ui): <Row extends BarChartItem>(props: BarChartProps<Row>) — Nonnegative category values. Compose inside VisualizationWidget for a titled panel. Owns hover/touch tooltips; no selection state or keyboard navigation.
BarChart.items: readonly Row[] — Ordered samples; the chart validates IDs and values when rendering.
BarChart.itemActions?: ItemActions<Row> — Actions available for each displayed item. Domain fields remain available to this callback.
BarChart.unit: string
BarChart.ariaLabel: string
BarChart.formatValue?: ((value: number) => string)
BarChart.horizontalGrid?: boolean — Draw horizontal grid lines behind the plotted values.
BarChart.cursorGroup?: ChartCursorGroup — Share mouse-hover timestamps with charts receiving the same handle. Matches each item's time exactly.
BarChartItem (type, @altertable/data-app-react/ui)
BarChartItem.id: string
BarChartItem.label: string
BarChartItem.value: number
BarChartItem.time?: number — Milliseconds since the Unix epoch. Enables adaptive time ticks when no item actions are supplied.
BarChartProps (type, @altertable/data-app-react/ui): <Row> = props listed as BarChart.*
booleanFilter (function, @altertable/data-app/contract): (options: FilterOptions<BooleanSelection>): BooleanFilter — Boolean predicate with a distinct unrestricted state.
booleanFilter.options.key: string
booleanFilter.options.label: string
booleanFilter.options.defaultValue?: BooleanSelection
booleanFilter.options.history?: HistoryMode
booleanFilter.options.presentation?: FilterPresentation
BooleanFilter (type, @altertable/data-app/contract): = props listed as parseBooleanSelection.filter.*
BooleanSelection (type, @altertable/data-app/contract)
BooleanSelection.kind: 'all' [variant 1 of 2]
BooleanSelection.kind: 'is' [variant 2 of 2]
BooleanSelection.value: boolean [variant 2 of 2]
BoundStory (type, @altertable/data-app-react/ui): <Data, Input> = (snapshot: DisplayedSnapshot<Data, Input>) => readonly StoryFinding[] — One to four findings with unique, nonempty IDs and registered evidence. Receives the displayed result and its original input during refresh or failure.
Breakdown (component, @altertable/data-app-react): (props: BreakdownProps) — Mutually exclusive parts of one observed whole. Every share uses the supplied total.
Breakdown.total: number
Breakdown.items: readonly BreakdownItem[]
Breakdown.formatValue?: ((value: number) => ReactNode)
Breakdown.…: plus props inherited from React
BreakdownItem (type, @altertable/data-app-react)
BreakdownItem.id: string
BreakdownItem.label: ReactNode
BreakdownItem.value: number
BreakdownProps (type, @altertable/data-app-react): = props listed as Breakdown.*
Button (component, @altertable/data-app-react): (props: ButtonProps)
Button.variant?: 'elevated' | 'ghost' | 'inline' | 'outline' | 'primary' — Inline actions retain button semantics without a padded control surface.
Button.size?: 'compact' | 'default' | 'icon' | 'icon-compact'
Button.…: plus props inherited from React
ButtonProps (type, @altertable/data-app-react): = props listed as Button.*
chartColor (function, @altertable/data-app-react): (id: string): string
ChartCursorGroup (type, @altertable/data-app-react/ui): Opaque shared-cursor handle. Create with useChartCursorGroup and pass through chart cursorGroup props.
ChartLegend (component, @altertable/data-app-react/ui): (props: ChartLegendProps)
ChartLegend.children: ReactNode
ChartLegend.layout?: 'horizontal' | 'single-row' | 'vertical' — Single-row fits up to four cells before expansion, adapting to available width.
ChartLegend.align?: 'center' | 'end' | 'start'
ChartLegend.maxVisibleItems?: number — Optional cell cap, including expansion. Horizontal legends default to two rows.
ChartLegend.…: plus props inherited from React
ChartLegend.Item: (props: ChartLegendItemProps)
ChartLegend.Marker: (props: ChartLegendMarkerProps)
ChartLegend.Label: (props: ChartLegendLabelProps)
ChartLegendItemProps (type, @altertable/data-app-react/ui)
ChartLegendItemProps.inactive?: boolean
ChartLegendItemProps.…: plus props inherited from React
ChartLegendLabelProps (type, @altertable/data-app-react/ui): <HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>
ChartLegendLabelProps.…: plus props inherited from React
ChartLegendMarkerKind (type, @altertable/data-app-react/ui): = 'area' | 'bar' | 'line' | 'point' | 'slice' | 'square'
ChartLegendMarkerProps (type, @altertable/data-app-react/ui)
ChartLegendMarkerProps.kind: ChartLegendMarkerKind
ChartLegendMarkerProps.…: plus props inherited from React
ChartLegendProps (type, @altertable/data-app-react/ui): = props listed as ChartLegend.*
Checkbox (component, @altertable/data-app-react/ui): (props: CheckboxProps)
Checkbox.label: string
Checkbox.description?: ReactNode
Checkbox.disabled?: boolean
Checkbox.className?: string
Checkbox.value: string [variant 1 of 2]
Checkbox.checked: boolean [variant 2 of 2]
Checkbox.onChange: (checked: boolean) => void [variant 2 of 2]
CheckboxGroup (component, @altertable/data-app-react/ui): (props: CheckboxGroupProps)
CheckboxGroup.label: string
CheckboxGroup.values: readonly string[]
CheckboxGroup.onChange: (values: string[]) => void
CheckboxGroup.…: plus props inherited from React
CheckboxGroupProps (type, @altertable/data-app-react/ui): = props listed as CheckboxGroup.*
CheckboxProps (type, @altertable/data-app-react/ui): = props listed as Checkbox.*
choiceFilter (function, @altertable/data-app/contract): <const Options extends readonly ChoiceOption[]>(options: ChoiceOptions<Options>): ChoiceFilter<Options[number]['id']> — One choice that narrows the included data.
choiceFilter.options.label?: string
choiceFilter.options.key: string
choiceFilter.options.history?: HistoryMode
choiceFilter.options.presentation?: FilterPresentation
choiceFilter.options.defaultValue: NoInfer<Options[number]['id']>
choiceFilter.options.options: Options & (Options extends readonly [] ? never : unknown)
ChoiceFilter (type, @altertable/data-app/contract): <Value>
ChoiceFilter.kind: 'choice'
ChoiceFilter.label?: string
ChoiceFilter.presentation?: (FilterPresentation & { group?: 'display' | 'scope' | undefined; }) — Display options (`displayChoice()`) change how results are shown, not which data is included.
ChoiceFilter.urlKeys: readonly string[]
ChoiceFilter.defaultValue: Value
ChoiceFilter.clearValue?: Value — Unrestricted value, when this filter can be cleared.
ChoiceFilter.describe?: ((value: Value) => string)
ChoiceFilter.history: HistoryMode
ChoiceFilter.read: (params: URLSearchParams) => Value
ChoiceFilter.write: (value: Value) => Record<string, string | null>
ChoiceFilter.valid: (value: Value) => boolean
ChoiceFilter.same: (left: Value, right: Value) => boolean
ChoiceFilter.options: readonly ChoiceOption[]
ChoiceOption (type, @altertable/data-app/contract, @altertable/data-app-react/ui)
ChoiceOption.id: string
ChoiceOption.label: string
ChoiceOption.description?: string
ChoicePicker (component, @altertable/data-app-react/ui): (props: ChoicePickerProps) — Searchable selection picker with one focus and popup model for single and multiple values.
ChoicePicker.label: string
ChoicePicker.labelPlacement?: ControlLabelPlacement
ChoicePicker.options: readonly ChoiceOption[]
ChoicePicker.missingOption?: ChoiceOption — Separate source state, rendered last with a divider and the shared option component.
ChoicePicker.disabled?: boolean
ChoicePicker.placeholder?: string
ChoicePicker.emptyMessage?: string
ChoicePicker.loading?: boolean — Known options remain selectable while refreshing; unavailable selected IDs are retained.
ChoicePicker.error?: boolean — Shows failure feedback without removing known options or unavailable selections.
ChoicePicker.onRetry?: (() => void)
ChoicePicker.selectionMode: 'multiple' [variant 1 of 2]
ChoicePicker.values: readonly string[] [variant 1 of 2]
ChoicePicker.onChange: (values: string[]) => void [variant 1 of 2]
ChoicePicker.maxSelected: number [variant 1 of 2] — Positive integer; at capacity, only unselected options are disabled.
ChoicePicker.emptySelectionLabel: string [variant 1 of 2] — Meaning of an empty selection belongs to the caller, e.g. All or Select a value.
ChoicePicker.selectionMode: 'single' [variant 2 of 2]
ChoicePicker.value: string [variant 2 of 2]
ChoicePicker.onChange: (value: string) => void [variant 2 of 2]
ChoicePickerProps (type, @altertable/data-app-react/ui): = props listed as ChoicePicker.*
ColumnIdentifier (type, @altertable/data-app-react): <TableId>
ColumnIdentifier.table: TableId
ColumnIdentifier.name: string
Comparison (component, @altertable/data-app-react): (props: ComparisonProps)
Comparison.metric: MetricDefinition [variant 1 of 2]
Comparison.reading: MetricReading [variant 1 of 2]
Comparison.emphasis?: 'standard' | 'story'
Comparison.current: { value: number; formattedValue: string; periodLabel?: string | undefined; } [variant 2 of 2]
Comparison.previous?: { value: number | null; formattedValue: string; periodLabel?: string | undefined; } [variant 2 of 2]
Comparison.favorableDirection?: 'down' | 'up' [variant 2 of 2]
Comparison.label: string [variant 2 of 2]
ComparisonProps (type, @altertable/data-app-react): = props listed as Comparison.*
ComposedChart (component, @altertable/data-app-react/ui): <Row>(props: ComposedChartProps<Row>) — Shared themed series and controls; other children retain native Recharts defaults.
ComposedChart.horizontalGrid?: boolean — Draw horizontal grid lines behind the plotted values.
ComposedChart.data: readonly Row[] — Displayed rows; series and axes select fields with Recharts dataKey props.
ComposedChart.ariaLabel: string — Describes the measures and scope for assistive technology.
ComposedChart.valueFormat?: MetricFormat — Shared measure semantics: compact numeric axes and precise tooltips. For mixed units, use explicit axis tickFormatter and series/tooltip formatters.
ComposedChart.cursorGroup?: ChartCursorGroup — Share mouse-hover timestamps with charts receiving the same handle, using the temporal X axis.
ComposedChart.…: plus props inherited from recharts
ComposedChart.Dot: (props: DotProps & { active?: boolean; })
ComposedChart.Area: <Row = unknown, Value = number | null>(props: AreaProps<Row, Value>)
ComposedChart.Bar: <Row = unknown, Value = number | null>(props: BarProps<Row, Value>)
ComposedChart.Line: <Row = unknown, Value = number | null>(props: LineProps<Row, Value>)
ComposedChart.Scatter: <Row = unknown, Value = number>(props: ComponentProps<typeof import('recharts').Scatter<Row, Value>>)
ComposedChart.XAxis: <Row = unknown, Value = string | number | Date>(props: ComponentProps<typeof import('recharts').XAxis<Row, Value>>)
ComposedChart.YAxis: <Row = unknown, Value = number>(props: ComponentProps<typeof import('recharts').YAxis<Row, Value>>)
ComposedChart.ZAxis: <DataPointType = any, DataValueType = any>(outsideProps: Props<DataPointType, DataValueType>)
ComposedChart.CartesianGrid: (props: ComponentProps<typeof import('recharts').CartesianGrid>)
ComposedChart.Tooltip: (props: ComponentProps<typeof import('recharts').Tooltip>)
ComposedChart.Legend: (props: ComposedChartLegendProps)
ComposedChart.ReferenceLine: <XValueType extends ReferenceCoordinateValue = any, YValueType extends ReferenceCoordinateValue = any>(outsideProps: Props<XValueType, YValueType>)
ComposedChart.ReferenceArea: <XValueType extends ReferenceCoordinateValue = any, YValueType extends ReferenceCoordinateValue = any>(outsideProps: Props<XValueType, YValueType>)
ComposedChart.ReferenceDot: <XValueType extends ReferenceCoordinateValue = any, YValueType extends ReferenceCoordinateValue = any>(outsideProps: Props<XValueType, YValueType>)
ComposedChart.Brush: (outsideProps: Props)
ComposedChart.Cell: (props: P): Promise<ReactNode> | ReactNode
ComposedChart.Label: (outerProps: Props)
ComposedChart.LabelList: (props: Props)
ComposedChart.ErrorBar: (outsideProps: Props)
ComposedChartLegendProps (type, @altertable/data-app-react/ui)
ComposedChartLegendProps.maxVisibleItems?: number
ComposedChartLegendProps.interactive?: boolean — Enable hover emphasis and click to focus series. Disable for a descriptive legend or custom controls.
ComposedChartLegendProps.…: plus props inherited from React, recharts
ComposedChartProps (type, @altertable/data-app-react/ui): <Row> = props listed as ComposedChart.*
connectionCheck (function, @altertable/data-app/contract): <const Queries extends QueryDefinitions & { connection: QueryDefinitions[string]; }>(queries: CheckedQueries<Queries>): ConnectionOperation — A connectivity probe uses the app's registered connection query.
connectionCheck.queries.connection: QueryDefinition & KnownRecord<Queries['connection']> & { statement: Queries['connection']['statement'] extends '' ? never : Queries['connection']['statement']; params: CheckedParameters<...>; projections: CheckedProjections<...>; }
ConnectionOperation (type, @altertable/data-app/contract): The built-in connection operation shares one contract with setup clients.
ConnectionOperation.input: (value: unknown) => Record<string, never>
ConnectionOperation.run: (context: OperationContext, input: Record<string, never>) => Promise<true>
ConnectionOperation.checks: readonly [Record<string, never>, ...Record<string, never>[]]
ConnectionOperation.policy: { maxQueryRows: number; maxDurationMs: number; maxResponseBytes?: number | undefined; }
ConnectionOperation.filters: {}
ConnectionOperation.queryNames: { readonly connection: 'connection'; }
ControlBar (component, @altertable/data-app-react/ui): (props: ControlBarProps) — User-controlled inputs below the page header.
ControlBar.children: ReactNode
ControlBar.…: plus props inherited from React
ControlBarProps (type, @altertable/data-app-react/ui): = props listed as ControlBar.*
createDataClient (function, @altertable/data-app/client): <Operations extends DataOperations>(...args: DataClientOptions<Operations> extends never ? [ options: never ] : keyof OperationFilters<Operations> extends never ? [ ] : [ options: never ]): DataClient<Operations>; (options: TransportOptions): DataClient<DataOperations>; <Operations extends DataOperations>(options: DataClientOptions<Operations>): DataClient<Operations> — Named clients derive data from the declared operations' run return types. Without an operation contract, external operation data remains unknown.
createDataClient.options.transport?: DataTransport
createDataClient.options.endpoint?: string
createDataClient.options.fetch?: (input: RequestInfo | URL, init: RequestInit): Promise<Response>
createDataClient.options.fetch?: (input: string | URL | Request, init: BunFetchRequestInit): Promise<Response>
createDataClient.options.fetch?: (input: string | URL | Request, init: RequestInit): Promise<Response>
createDataClient.options.operations: Operations [variant 1 of 2]
createDataClient.options.lakehouse?: Lakehouse [variant 1 of 2]
createDataClient.options.transport?: DataTransport [variant 2 of 2]
createDataClient.options.endpoint?: string [variant 2 of 2]
createDataClient.options.fetch?: (input: RequestInfo | URL, init: RequestInit): Promise<Response> [variant 2 of 2]
createDataClient.options.fetch?: (input: string | URL | Request, init: BunFetchRequestInit): Promise<Response> [variant 2 of 2]
createDataClient.options.fetch?: (input: string | URL | Request, init: RequestInit): Promise<Response> [variant 2 of 2]
createDataClient.options.filters?: OperationFilters<Operations> [variant 2 of 2] — Pass the same filter declarations the server operations read.
createDataContext (function, @altertable/data-app-react): <const Names extends Record<string, string>>(queryNames: Names): <const Context extends Omit<DataContext, 'glossary'> & { glossary: Record<string, Omit<GlossaryEntry, 'queryNames'> & { queryNames?: Names[keyof Names][]; }>; }>(context: Context) => Context & { ...; } — Bind glossary query references and card evidence to the same registry.
createDataHooks (function, @altertable/data-app-react): <Operations extends DataOperations>(client: DataClient<Operations>): { defineView: <Name extends ViewOperationName<Operations>, const Context extends AuthoringDataContext = AuthoringDataContext>(definition: { operation: Name; dataContext: DataContext; describeInput?: ((input: FilterInput<...>) => s… — Bind declared operations to URL filters, displayed readings, and request feedback. The client's operations declare their filters; `<DataApp>` renders their controls.
createDataHooks.client.filters: Readonly<Record<string, FilterCollection>> — Each operation's filters; views derive their inputs and controls from them.
createDataHooks.client.query: <Name extends keyof Operations & string>(this: void, name: Name & (true extends IsUnion<NoInfer<Name>, NoInfer<Name>> ? never : unknown), input: InputOf<Operations[NoInfer<Name>]>, options?: { ...; } | undefined) => Promise<...>
createDataHooks().defineView: <Name extends ViewOperationName<Operations>, const Context extends AuthoringDataContext = AuthoringDataContext>(definition: ViewDefinition<Name, FilterInput<FiltersOf<Operations[Name]>>, OutputOf<Operations[Name]>> & { operation: Name & (true extends IsUnion<NoInfer<Name>> ? never : unknown); dataC…
createDataHooks().defineView.definition.operation: Name & (true extends IsUnion<NoInfer<Name>> ? never : unknown)
createDataHooks().defineView.definition.dataContext: DataContext & Context
createDataHooks().defineView.definition.describeInput?: ((input: FilterInput<FiltersOf<Operations[Name]>>) => string) — Describe the displayed scope in prose. Defaults to the reporting period and each narrowed filter, such as `Mar 1–7, 2026 UTC · group Alpha`, or `all data`.
createDataHooks().defineView.definition.isEmpty?: ((data: OutputOf<Operations[Name]>) => boolean) — App-owned semantics: measured zero need not mean an empty result. Defaults to never empty.
createDataHooks().defineView.definition.emptyFallback?: EmptyContent — Inherited by DataSection unless it supplies its own copy.
createDataHooks().defineView().filter: (): FilterTarget<Partial<{ [Key in keyof FiltersOf<Operations[Name]>]: Extract<FiltersOf<Operations[Name]>[Key]['presentation'], { group: 'display'; }> extends never ? FilterValues<...>[Key] : never; }>>
createDataHooks().defineView().breakdown: <Key extends DisplayChoiceName<Filters>>(key: Key): FiltersOf<Operations[Name]>[Key] extends ChoiceFilter<infer Value extends string> ? BreakdownTarget<Value> : never
createDataHooks().defineView().dataset: <Row, const Columns extends Record<string, object> = Record<string, object>>(definition: DatasetDefinition<Data, FilterInput<Filters>, Row, Parameters<Context['evidence']>[0]> & { columns: Columns & NonEmptyColumns<Columns>; }): Dataset<OutputOf<Operations[Name]>, FilterInput<FiltersOf<Operations[N…
createDataHooks().defineView().metric: (definition: Parameters<Context['metric']>[0], select: (data: Data, input: FilterInput<Filters>) => HasPeriod<Filters> extends true ? MetricValues : { current: number; previous?: never; }): Metric<OutputOf<Operations[Name]>, FilterInput<FiltersOf<Operations[Name]>>>
createDataHooks().defineView().scope: (snapshot: DisplayedSnapshot<Data, FilterInput<Filters>>): string
createDataHooks().defineView().content: (render: (state: DataContentState<Data, FilterInput<Filters>>) => ReactNode): ViewContent<OutputOf<Operations[Name]>, FilterInput<FiltersOf<Operations[Name]>>>
createDataHooks().defineDetailView: <Name extends keyof Operations & string, const Context extends AuthoringDataContext = AuthoringDataContext>(definition: DetailViewDefinition<OutputOf<Operations[Name]>, InputOf<Operations[Name]>> & { operation: Name; dataContext: Context; }): BoundDetailView<OutputOf<Operations[Name]>, InputOf<Oper…
createDataHooks().defineDetailView.definition.id: string
createDataHooks().defineDetailView.definition.title: ReactNode
createDataHooks().defineDetailView.definition.parseInput: (input: unknown) => InputOf<Operations[Name]> — Validates untrusted navigation input before a detail operation can run.
createDataHooks().defineDetailView.definition.describeInput?: ((input: InputOf<Operations[Name]>) => string) — Describe the destination's scope. Defaults to the filters its operation reads; supply it to name the record, such as `orders for Customer 042`.
createDataHooks().defineDetailView.definition.isEmpty?: ((data: OutputOf<Operations[Name]>) => boolean) — App-owned semantics: measured zero need not mean an empty result. Defaults to never empty.
createDataHooks().defineDetailView.definition.emptyFallback?: EmptyContent — Inherited by DataSection unless it supplies its own copy.
createDataHooks().defineDetailView.definition.operation: Name
createDataHooks().defineDetailView.definition.dataContext: Context
createDataHooks().defineDetailView().useResult: (input: Input): ViewResult<OutputOf<Operations[Name]>, InputOf<Operations[Name]>>
createDataHooks().defineDetailView().content: (render: (state: DataContentState<Data, Input>) => ReactNode): DetailContent<OutputOf<Operations[Name]>, InputOf<Operations[Name]>> — Render like view content: displayed data, its input, and the derived scope.
createDataHooks().defineDetailView().dataset: <Row, const Columns extends Record<string, object> = Record<string, object>>(definition: DatasetDefinition<Data, Input, Row, Parameters<Context['evidence']>[0]> & { columns: Columns & NonEmptyColumns<Columns>; }): Dataset<OutputOf<Operations[Name]>, InputOf<Operations[Name]>, Row>
createDataHooks().defineDetailView().metric: (definition: Parameters<Context['metric']>[0], select: (data: Data, input: Input) => { current: number; previous?: never; }): Metric<OutputOf<Operations[Name]>, InputOf<Operations[Name]>>
CsvCell (type, @altertable/data-app-react): = string | number | boolean | null | undefined
CsvExport (type, @altertable/data-app-react/ui): All distinct datasets in the displayed result; filename names the download.
CsvExport.filename: string
CsvExport.tables: readonly [CsvTable, ...CsvTable[]]
CsvTable (type, @altertable/data-app-react/ui): One named dataset with ordered columns and raw displayed values.
CsvTable.name: string
CsvTable.columns: readonly string[]
CsvTable.rows: readonly (readonly CsvCell[])[]
DataApp (component, @altertable/data-app-react): <Data, Input, const SummaryViews extends readonly AnyView[] = [ ]>(props: DataAppProps<Data, Input, SummaryViews>) — Executes the primary view and its summary views, and owns controls, inspection, exports, and stories.
DataApp.children: ReactNode
DataApp.description?: ReactNode — Override the declared subtitle; null hides it.
DataApp.showToolbar?: boolean — Show page actions. Defaults to true; does not hide filters or data states.
DataApp.toolbarActions?: ReactNode
DataApp.footerActions?: ReactNode
DataApp.footer?: ReactNode — Optional source, coverage, or methodology note below the app content. Compose prose and inline components; typography and spacing are provided.
DataApp.showSearch?: boolean — Show declared search controls. Defaults to true; hiding preserves their values.
DataApp.showFilters?: boolean — Show declared filter controls, including display options. Defaults to true; hiding preserves their values.
DataApp.view: DataAppView<Data, Input> — The headline view. `<DataApp>` renders the controls for every filter its client's operations read and owns their URL state.
DataApp.summaryViews?: SummaryViews — Other views that the story and CSV export read, sharing `view`’s data context. They load with `view` instead of waiting for their sections to near the viewport.
DataApp.showSearchSuggestions?: boolean — Show supplied datasets’ record suggestions on the first declared search. Defaults to true.
DataApp.story?: ((snapshot: DisplayedSnapshot<Data, Input>, ...summaries: { [Index in keyof SummaryViews]: SnapshotOf<SummaryViews[Index]>; }) => StoryFindings) — Omit to leave presentation out of the toolbar. Receives `view`’s displayed snapshot, then one per summary view in `summaryViews` order.
DataApp.datasets?: readonly [ExportDataset<Data, Input> | ExportOf<SummaryViews[number]>, ...(ExportDataset<Data, Input> | ExportOf<...>)[]] — Omit to leave CSV export out of the toolbar. Datasets may belong to `view` or a summary view.
DataApp.details?: readonly DetailContent<any, any>[] — Detail destinations available to dataset actions and metric record inspection.
DataApp (component, @altertable/data-app-react/ui): (props: DataAppProps) — Setup and static screens; fetched data uses the declared-view DataApp.
DataApp.children: ReactNode
DataApp.dataContext: DataContext
DataApp.description?: ReactNode — Override the declared subtitle; null hides it.
DataApp.showToolbar?: boolean — Show page actions. Defaults to true; does not hide filters or data states.
DataApp.toolbarActions?: ReactNode
DataApp.footerActions?: ReactNode
DataApp.footer?: ReactNode — Optional source, coverage, or methodology note below the app content. Compose prose and inline components; typography and spacing are provided.
DataApp.csvExport?: CsvExport
DataApp.queries?: DisclosedQuery[]
DataAppConfig (type, @altertable/data-app, @altertable/data-app/config): <Queries>
DataAppConfig.title: string
DataAppConfig.scope: { organization: string; environment: string; } — Display labels; scope does not grant data access.
DataAppConfig.description: string — Explain what the app helps readers explore.
DataAppConfig.appearance?: AppearanceOptions — Omit to use the standard appearance.
DataAppConfig.dateFormatting?: { locale?: string | undefined; timeZone?: string | undefined; } — Shared date display defaults. Reporting views and individual fields may override the time zone.
DataAppConfig.queries: Queries — Named SQL statements with typed parameters and result projections.
DataAppDefinition (type, @altertable/data-app, @altertable/data-app/config): <Queries> — An app declaration with operations bound to its query registry.
DataAppDefinition.title: string
DataAppDefinition.scope: { organization: string; environment: string; } — Display labels; scope does not grant data access.
DataAppDefinition.description: string — Explain what the app helps readers explore.
DataAppDefinition.appearance?: AppearanceOptions — Omit to use the standard appearance.
DataAppDefinition.dateFormatting?: { locale?: string | undefined; timeZone?: string | undefined; } — Shared date display defaults. Reporting views and individual fields may override the time zone.
DataAppDefinition.queries: QuerySnapshot<Queries>
DataAppDefinition.defineDimension: <const Type extends 'string' | 'number'>(config: DimensionSourceConfig<Type> & { source: { query: DimensionSourceQueryName<Queries, NoInfer<Type>>; }; }) => SourceDimensionFilter<...>
DataAppDefinition.defineOperation: <Input, Output, const Filters extends FilterCollection = {}>(operation: InputOperationDefinition<Input, Output, Queries, Filters>): DefinedOperation<WithFilterInput<Filters, Input>, Output, Queries, keyof Filters extends never ? undefined : Filters> — Parse a destination's own input, such as a record id, and list valid `checks`. Declare `filters` too when it reads the displayed scope.
DataAppDefinition.defineOperation: <const Filters extends FilterCollection = {}, Output = unknown>(operation: FilterOperationDefinition<Filters, Output, Queries>): DefinedOperation<FilterInput<Filters>, Output, Queries, Filters>
DataAppError (class, @altertable/data-app/client)
DataAppError.code: string
DataAppError.requestId?: string
DataAppError.…: plus props inherited from built-in
DataAppProps (type, @altertable/data-app-react): <Data, Input, SummaryViews> = props listed as DataApp.*
DataAppProps (type, @altertable/data-app-react/ui)
DataAppProps.children: ReactNode
DataAppProps.dataContext: DataContext
DataAppProps.description?: ReactNode — Override the declared subtitle; null hides it.
DataAppProps.showToolbar?: boolean — Show page actions. Defaults to true; does not hide filters or data states.
DataAppProps.toolbarActions?: ReactNode
DataAppProps.footerActions?: ReactNode
DataAppProps.footer?: ReactNode — Optional source, coverage, or methodology note below the app content. Compose prose and inline components; typography and spacing are provided.
DataAppProps.csvExport?: CsvExport
DataAppProps.queries?: DisclosedQuery[]
DataAppProvider (component, @altertable/data-app-react/ui): <const Queries extends QueryDefinitions>(props: {…}) — Provide one app identity and shared requests to a custom React root.
DataAppProvider.app: DataAppDefinition<Queries>
DataAppProvider.children: ReactNode
DataAppStyle (type, @altertable/data-app-react, @altertable/data-app-react/ui): React style properties with checked public Altertable custom properties.
DataAppStyle.{--atbl-accent, --atbl-annotation-accent, --atbl-annotation-accent-hover, --atbl-annotation-highlight, --atbl-annotation-on-accent, --atbl-backdrop, --atbl-background, --atbl-border, --atbl-chart-1, --atbl-chart-2, --atbl-chart-3, --atbl-chart-4, --atbl-chart-5, --atbl-chart-6, --atbl-chart-7, --atbl-chart-8, --atbl-chart-fill, --atbl-code-keyword, --atbl-code-surface, --atbl-code-text, --atbl-content-width, --atbl-control-compact-height, --atbl-control-disabled-opacity, --atbl-control-gap, --atbl-control-height, --atbl-control-hover-border, --atbl-control-hover-surface, --atbl-control-icon-size, --atbl-control-open-border, --atbl-control-open-surface, --atbl-control-padding-block, --atbl-control-padding-inline, --atbl-control-pressed-surface, --atbl-control-selected-surface, --atbl-control-selected-text, --atbl-control-text-size, --atbl-cursor-action, --atbl-cursor-busy, --atbl-cursor-disabled, --atbl-cursor-help, --atbl-danger, --atbl-danger-subtle, --atbl-dropdown-item-gap, --atbl-dropdown-item-padding-block, --atbl-dropdown-item-padding-inline, --atbl-dropdown-padding, --atbl-duration-fast, --atbl-duration-normal, --atbl-duration-slow, --atbl-ease-enter, --atbl-ease-standard, --atbl-focus-color, --atbl-focus-outline, --atbl-focus-ring-inset, --atbl-focus-ring-offset, --atbl-font, --atbl-font-heading, --atbl-layout-gap, --atbl-mono-font, --atbl-muted, --atbl-negative, --atbl-on-accent, --atbl-positive, --atbl-radius-control, --atbl-radius-overlay, --atbl-radius-surface, --atbl-shadow-control, --atbl-shadow-overlay, --atbl-shadow-surface, --atbl-space-lg, --atbl-space-md, --atbl-space-sm, --atbl-space-xl, --atbl-space-xs, --atbl-subtle, --atbl-surface, --atbl-surface-padding, --atbl-text, --atbl-text-measure, --atbl-type-body-leading, --atbl-type-body-size, --atbl-type-emphasis-weight, --atbl-type-heading-leading, --atbl-type-heading-weight, --atbl-type-label-leading, --atbl-type-label-size, --atbl-type-label-weight, --atbl-type-meta-size, --atbl-type-meta-weight, --atbl-type-metric-leading, --atbl-type-metric-size, --atbl-type-page-size, --atbl-type-section-size, --atbl-type-widget-size}?: string | number
DataAppStyle.…: plus props inherited from csstype
DataAppStyleHooks (type, @altertable/data-app-react, @altertable/data-app-react/ui)
DataAppStyleHooks.data-atbl-focus?: 'group' | 'inset' | 'ring'
DataAppStyleHooks.data-atbl-control?: 'action' | 'default' | 'help' | 'text'
DataAppStylesOptions (type, @altertable/data-app-react)
DataAppStylesOptions.document?: Document — Defaults to the current browser document.
DataAppStylesOptions.nonce?: string — Nonce permitted by the document's style-src CSP.
DataAppStyleToken (type, @altertable/data-app-react, @altertable/data-app-react/ui): = '--atbl-accent' | '--atbl-annotation-accent' | '--atbl-annotation-accent-hover' | '--atbl-annotation-highlight' | '--atbl-annotation-on-accent' | '--atbl-backdrop' | '--atbl-background' | ... 86 more ... | '--atbl-type-widget-size'
DataAppView (type, @altertable/data-app-react): <Data, Input> — A declared data or time view that `<DataApp>` can run and describe.
DataAppView.scope: (snapshot: DisplayedSnapshot<Data, Input>) => string
DataClient (type, @altertable/data-app/client): <Operations> = props listed as createDataHooks.client.*
DataClientOptions (type, @altertable/data-app/client): <Operations> = props listed as createDataClient.options.* — Browser operations and named-operation delivery are mutually exclusive.
DataContext (type, @altertable/data-app-react)
DataContext.description: ReactNode
DataContext.glossary: Record<string, GlossaryEntry>
DataContext.identifiers?: Readonly<Record<string, DataIdentifierDefinition>>
DataContext.queryNames?: Readonly<Record<string, string>>
DataIdentifierDefinition (type, @altertable/data-app-react)
DataIdentifierDefinition.kind: 'column' [variant 1 of 2]
DataIdentifierDefinition.tableId: `tables.${string}` [variant 1 of 2]
DataIdentifierDefinition.table: TableIdentifier [variant 1 of 2]
DataIdentifierDefinition.name: string
DataIdentifierDefinition.kind: 'table' [variant 2 of 2]
DataIdentifierDefinition.catalog: string [variant 2 of 2]
DataIdentifierDefinition.schema: string [variant 2 of 2]
DataOperation (type, @altertable/data-app/contract): <Input, Output> — The input parser runs in the operation executor's runtime: server for HTTP apps, browser for bundle apps. Browser validation does not replace backend authorization or query limits.
DataOperation.filters?: Readonly<FilterCollection> — The app filters the operation reads; its input has one field per filter.
DataOperation.input: (value: unknown) => Input
DataOperation.run: (context: OperationContext, input: Input) => Promise<Output>
DataOperation.checks: readonly [Input, ...Input[]]
DataOperation.queryNames?: Readonly<Record<string, string>>
DataOperation.policy: { maxQueryRows: number; maxDurationMs: number; maxResponseBytes?: number | undefined; }
DataReading (type, @altertable/data-app-react/ui): <Value>
DataReading.loading: true [variant 1 of 2]
DataReading.loading: false [variant 2 of 2]
DataReading.value: Value [variant 2 of 2]
DataResponse (type, @altertable/data-app/client): <Output, Input> — Parsed operation data and query evidence.
DataResponse.data: Output
DataResponse.requestId: string
DataResponse.queriedAt: string
DataResponse.queryIds: string[]
DataResponse.queries?: DisclosedQuery[]
DataResponse.input: Input — The exact browser input that produced this response.
DataSection (component, @altertable/data-app-react): <Data, Input>(props: DataSectionProps<Data, Input>) — Sections of views that `<DataApp>` runs share its results; every other section requests its own view once it nears the viewport.
DataSection.content: ViewContent<Data, Input>
DataSection.emptyFallback?: EmptyContent
DataSection.error?: { title: ReactNode; description?: ReactNode; onRetry?: (() => void) | undefined; }
DataSection.label?: string
DataSection.…: plus props inherited from React
DataSectionProps (type, @altertable/data-app-react): <Data, Input> = props listed as DataSection.*
Dataset (class, @altertable/data-app-react): <Data, Input, Row>
Dataset.evidence: WidgetEvidence
Dataset.actions: <const Actions extends Record<string, ActionDeclaration<Row, Input>>>(build: (action: ActionBuilder<Row, Input>) => Actions, options?: { primary?: (keyof Actions & string) | undefined; } | undefined) => ExplorationActions<...>
Dataset.readSearchSuggestions: (source: ViewSource<Data, Input>) => DataReading<readonly SearchSuggestion[]> | undefined
Dataset.read: <Source extends ViewSource<Data, Input>>(source: Source) => SourceReading<Source, readonly Row[]>
Dataset.assertSource: (source: object) => void
Dataset.name: string
DatasetColumn (type, @altertable/data-app-react): <Row> — Keys supply IDs; accessors supply raw CSV values. Formats affect display only.
DatasetColumn.label?: string
DatasetColumn.value: (row: Row) => CsvCell [variant 1 of 4]
DatasetColumn.format?: ((row: Row) => ReactNode) [variant 1 of 4]
DatasetColumn.value: (row: Row) => number | null | undefined [variant 2 of 4]
DatasetColumn.format: MetricFormat [variant 2 of 4]
DatasetColumn.value: (row: Row) => string | number | null | undefined [variant 3 of 4]
DatasetColumn.format: { kind: 'dateTime'; } & DateFormatOptions & { timeZone?: string | undefined; precision?: 'minute' | 'second' | undefined; } [variant 3 of 4]
DatasetColumn.value: (row: Row) => string | null | undefined [variant 4 of 4]
DatasetColumn.format: { kind: 'date'; } & DateFormatOptions [variant 4 of 4]
DatasetDefinition (type, @altertable/data-app-react): <Data, Input, Row> — Authoring references are registered by the owning view.
DatasetDefinition.name: string
DatasetDefinition.select: (data: Data, input: Input) => readonly Row[]
DatasetDefinition.columns: Record<string, DatasetColumn<NoInfer<Row>>>
DatasetDefinition.rowKey: (row: NoInfer<Row>) => string | number
DatasetDefinition.evidence: EvidenceDeclaration
DatasetDefinition.emptyFallback?: EmptyContent
DatasetDefinition.suggestions?: DatasetSuggestionOptions<Row> — Declare for records whose titles are useful query completions; omit for aggregate rows.
DatasetSuggestionOptions (type, @altertable/data-app-react): <Row>
DatasetSuggestionOptions.title: (row: Row) => string
DatasetSuggestionOptions.description?: ((row: Row) => string)
DatasetSuggestionOptions.onSelect?: ((row: Row) => void) — Override query completion with an app action.
DataTable (component, @altertable/data-app-react/ui): (props: DataTableProps) — Scrollable native table. Mark quantitative th/td cells with data-type="number"; the runtime aligns them to the end and uses tabular digits.
DataTable.searchable?: DataTableSearch
DataTable.…: plus props inherited from React
DataTableEmptyRow (component, @altertable/data-app-react/ui): (props: DataTableEmptyRowProps)
DataTableEmptyRow.title: ReactNode
DataTableEmptyRow.description?: ReactNode
DataTableEmptyRow.action?: ReactNode — A relevant recovery action; omit when there is nothing the user can change.
DataTableEmptyRow.colSpan: number
DataTableEmptyRowProps (type, @altertable/data-app-react/ui): = props listed as DataTableEmptyRow.*
DataTableProps (type, @altertable/data-app-react/ui): = props listed as DataTable.*
DataTableSearch (type, @altertable/data-app-react/ui)
DataTableSearch.label: string
DataTableSearch.value: string
DataTableSearch.onChange: (value: string) => void
DataTableSearch.placeholder?: string
DataTableSearch.resetValue?: string
DataTableSearch.inputProps?: Omit<DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, 'children' | 'type' | 'value'>
DataTableSearch.itemCount: number — Number of available records before filtering or a display limit.
DataTableShare (component, @altertable/data-app-react/ui): (props: {…}) — Accepts a fraction of the stated whole, using `formatPercent` semantics.
DataTableShare.value: number
DataTableTimestamp (component, @altertable/data-app-react/ui): (props: DataTableTimestampProps)
DataTableTimestamp.value: string | number | Date
DataTableTimestamp.children?: ReactNode
DataTableTimestamp.timeZone?: string
DataTableTimestamp.locale?: string
DataTableTimestamp.precision?: 'minute' | 'second'
DataTableTimestampProps (type, @altertable/data-app-react/ui): = props listed as DataTableTimestamp.*
DataValue (component, @altertable/data-app-react): <Data, Input, Row>(props: DataValueProps<Data, Input, Row>)
DataValue.loadingFallback?: ReactNode
DataValue.scope: DataReading<string> [variant 1 of 3]
DataValue.children?: ((scope: string) => ReactNode) [variant 1 of 3]
DataValue.metric: Metric<Data, Input> [variant 2 of 3]
DataValue.source: ViewSource<NoInfer<Data>, NoInfer<Input>> [variants 2, 3 of 3]
DataValue.children?: ((values: MetricValues) => ReactNode) [variant 2 of 3]
DataValue.dataset: Dataset<Data, Input, Row> [variant 3 of 3]
DataValue.children: (rows: readonly Row[]) => ReactNode [variant 3 of 3]
DataValue.…: plus props inherited from React
DataValue (component, @altertable/data-app-react/ui): <Value>(props: DataValueProps<Value>) — Bind inline content to displayed data. Keep static wording outside this span.
DataValue.reading: DataReading<Value>
DataValue.loadingFallback: ReactNode
DataValue.children: (value: Value) => ReactNode
DataValue.…: plus props inherited from React
DataValueProps (type, @altertable/data-app-react): <Data, Input, Row> = props listed as DataValue.*
DataValueProps (type, @altertable/data-app-react/ui): <Value> = props listed as DataValue.*
DataWidget (component, @altertable/data-app-react/ui): <Data>(props: DataWidgetProps<Data>)
DataWidget.title: ReactNode
DataWidget.headingLevel?: 2 | 3 | 4 | 5 | 6 — Document outline level. The widget title keeps the shared widget-heading appearance.
DataWidget.annotationId?: string — Unique stable target for persisted feedback; overrides automatic evidence identity.
DataWidget.count?: number — Result count beside the heading. Derive from the displayed result; zero is visible.
DataWidget.description?: ReactNode
DataWidget.evidence?: WidgetEvidence [variant 1 of 2]
DataWidget.records?: InspectionRecords — Lazy detail records rendered as the first inspection tab.
DataWidget.action?: ReactNode
DataWidget.status?: WidgetStatus — Reserved feedback slot; retain displayed content while refreshing or after failure.
DataWidget.footer?: ReactNode
DataWidget.bodyPadding?: 'flush' | 'inset'
DataWidget.emptyFallback?: EmptyContent
DataWidget.children: ReactNode [variant 1 of 2]
DataWidget.evidence: (WidgetEvidence | undefined) & WidgetEvidence [variant 2 of 2]
DataWidget.reading: DataReading<Data> [variant 2 of 2]
DataWidget.isEmpty: (data: Data) => boolean [variant 2 of 2]
DataWidget.skeleton?: SkeletonContent [variant 2 of 2]
DataWidget.children: (data: Data) => ReactNode [variant 2 of 2]
DataWidget.…: plus props inherited from React
DataWidgetProps (type, @altertable/data-app-react/ui): <Data> = props listed as DataWidget.* — Owns loading, empty content, actions, and inspection. Page and sheet mount the same body and footer; hold interactive child state above the widget to share it across mounts.
DateDisplay (component, @altertable/data-app-react, @altertable/data-app-react/ui): (props: DateDisplayProps) — Readable dates with exact-time disclosure for instants; invalid or ambiguous values render as missing.
DateDisplay.value: string | number | Date | null | undefined
DateDisplay.format?: DateFormat — Calendar dates stay dates; instants require a Date, epoch milliseconds, or an offset-bearing ISO string.
DateDisplay.…: plus props inherited from React
DateDisplayProps (type, @altertable/data-app-react, @altertable/data-app-react/ui): = props listed as DateDisplay.*
DateFormat (type, @altertable/data-app/format)
DateFormat.kind: 'date' [variant 1 of 2]
DateFormat.locale?: string
DateFormat.missing?: string
DateFormat.kind: 'dateTime' [variant 2 of 2]
DateFormat.timeZone?: string [variant 2 of 2]
DateFormat.precision?: 'minute' | 'second' [variant 2 of 2]
DateFormatOptions (type, @altertable/data-app/format): Formatting for calendar dates and instants without implicit time-zone parsing.
DateFormatOptions.locale?: string
DateFormatOptions.missing?: string
DateTimeFormatOptions (type, @altertable/data-app/format)
DateTimeFormatOptions.locale?: string
DateTimeFormatOptions.missing?: string
DateTimeFormatOptions.timeZone?: string
DateTimeFormatOptions.precision?: 'minute' | 'second'
DateTimeRange (type, @altertable/data-app, @altertable/data-app/config, @altertable/data-app/contract, @altertable/data-app/format): = props listed as dateTimeRangeSql.range.*
DateTimeRangeComparison (type, @altertable/data-app/contract, @altertable/data-app-react/ui): = 'off' | 'on' — Offer the previous-period comparison, with its toggle starting off or on.
dateTimeRangeFilter (function, @altertable/data-app/contract, @altertable/data-app-react/ui): <Comparison extends DateTimeRangeComparison | undefined = undefined>(options: DateTimeRangeFilterOptions<Comparison>): DateTimeRangeFilter<undefined extends Comparison ? false : true> — One declaration drives the picker, URL state, and the input of operations that list it. Operations receive `{ range, comparison }`: `from` inclusive, `to` exclusive.
dateTimeRangeFilter.options.key: string
dateTimeRangeFilter.options.label?: string
dateTimeRangeFilter.options.defaultValue: string | DateTimeRange — Range text such as "7d" stays relative; `{ from, to }` is absolute.
dateTimeRangeFilter.options.timeZone?: string — Reporting zone for relative ranges, calendar days, and labels. Defaults to UTC.
dateTimeRangeFilter.options.maxRangeDays?: number — Longest selectable range.
dateTimeRangeFilter.options.minDate?: string — First date with data, as YYYY-MM-DD.
dateTimeRangeFilter.options.maxDate?: string | (() => string) — Last date with data, as YYYY-MM-DD.
dateTimeRangeFilter.options.completeDays?: boolean — End coverage yesterday, for sources that load whole days.
dateTimeRangeFilter.options.comparison?: Comparison — Offer the previous-period comparison. Omit for none.
dateTimeRangeFilter.options.presets?: readonly DateTimeRangePreset[] — Suggestions in display order. Omit for defaults; [] retains calendar and text entry. Invalid or over-limit suggestions are omitted; typed input is not restricted to the menu.
dateTimeRangeFilter.options.history?: HistoryMode
dateTimeRangeFilter.options.presentation?: FilterPresentation
DateTimeRangeFilter (type, @altertable/data-app/contract, @altertable/data-app-react/ui): <Comparable>
DateTimeRangeFilter.kind: 'dateTimeRange'
DateTimeRangeFilter.label?: string
DateTimeRangeFilter.presentation?: (FilterPresentation & { group?: 'display' | 'scope' | undefined; }) — Display options (`displayChoice()`) change how results are shown, not which data is included.
DateTimeRangeFilter.urlKeys: readonly string[]
DateTimeRangeFilter.defaultValue: DateTimeRangeSelection
DateTimeRangeFilter.clearValue?: DateTimeRangeSelection — Unrestricted value, when this filter can be cleared.
DateTimeRangeFilter.describe?: ((value: DateTimeRangeSelection) => string)
DateTimeRangeFilter.history: HistoryMode
DateTimeRangeFilter.read: (params: URLSearchParams) => DateTimeRangeSelection
DateTimeRangeFilter.write: (value: DateTimeRangeSelection) => Record<string, string | null>
DateTimeRangeFilter.valid: (value: DateTimeRangeSelection) => boolean
DateTimeRangeFilter.same: (left: DateTimeRangeSelection, right: DateTimeRangeSelection) => boolean
DateTimeRangeFilter.comparable: Comparable — Whether readers can turn on the previous-period comparison.
DateTimeRangeFilter.policy: { timeZone: string; bounds: (now?: Date | undefined) => { minDate: string | undefined; maxDate: string; maxRangeDays: number | undefined; timeZone: string; }; parse: (value: unknown, now?: Date | undefined) => DateTimeRange; resolve: (value: unknown, now?: Date | undefined) => ResolvedDateTimeRange…
DateTimeRangeFilter.maxRangeDays?: number
DateTimeRangeFilter.presets?: readonly DateTimeRangePreset[]
DateTimeRangeFilter.request: (selection: DateTimeRangeSelection, now?: Date | undefined) => DateTimeRangeRequest — Resolve a selection against one reference time.
DateTimeRangeFilter.parseInput: (value: unknown) => DateTimeRangeInput — Validate untrusted input against coverage and return what the operation receives.
DateTimeRangeFilter.previous: (selection: DateTimeRangeSelection) => ResolvedDateTimeRange | null
DateTimeRangeFilterOptions (type, @altertable/data-app/contract, @altertable/data-app-react/ui): <Comparison> = props listed as dateTimeRangeFilter.options.*
DateTimeRangeInput (type, @altertable/data-app/contract): What an operation receives for a date filter: resolved bounds, `from` inclusive and `to` exclusive, and the same window one selected length earlier while the comparison is on.
DateTimeRangeInput.range: ResolvedDateTimeRange
DateTimeRangeInput.comparison: ResolvedDateTimeRange | null
DateTimeRangeParseFailureReason (type, @altertable/data-app/format): = 'ambiguous' | 'empty' | 'invalid-range' | 'unrecognized'
DateTimeRangeParserOptions (type, @altertable/data-app/format)
DateTimeRangeParserOptions.now?: Date — UTC-encoded reference fields for omitted dates/years. Defaults to the current UTC date/time.
DateTimeRangePicker (component, @altertable/data-app-react, @altertable/data-app-react/ui): (props: DateTimeRangePickerProps) — A datetime picker with presets, natural-language input, and a calendar. Presets apply immediately; Enter or calendar Apply commits edits; dismissal discards them.
DateTimeRangePicker.value: DateTimeRange | null
DateTimeRangePicker.onChange: (value: DateTimeRange, live?: boolean | undefined) => void — Commits a selection; the optional second argument indicates host-owned Live mode.
DateTimeRangePicker.liveOption?: { dateTimeRange: DateTimeRange; isLive: boolean; } — Adds a Live preset using dateTimeRange; isLive reflects the applied mode. The host owns refresh scheduling.
DateTimeRangePicker.className?: string
DateTimeRangePicker.placeholder?: string
DateTimeRangePicker.label?: string
DateTimeRangePicker.labelPlacement?: ControlLabelPlacement
DateTimeRangePicker.maxRangeDays?: number — Client limit for determinate durations; validate timezone-dependent ranges on the backend.
DateTimeRangePicker.policy?: { timeZone: string; bounds: (now?: Date | undefined) => { minDate: string | undefined; maxDate: string; maxRangeDays: number | undefined; timeZone: string; }; parse: (value: unknown, now?: Date | undefined) => DateTimeRange; resolve: (value: unknown, now?: Date | undefined) => ResolvedDateTimeRange… — Shared reporting policy; generated controls inherit it from their filter.
DateTimeRangePicker.presets?: readonly DateTimeRangePreset[] — Suggestions in display order. Omit for defaults; [] retains calendar and text entry. Invalid or over-limit suggestions are omitted; typed input is not restricted to the menu.
DateTimeRangePicker.disabled?: boolean
DateTimeRangePicker.isDefault?: boolean
DateTimeRangePicker.onReset?: (() => void)
DateTimeRangePicker.calendarFooter?: ReactNode
DateTimeRangePicker.comparison?: { enabled: boolean; range: DateTimeRange | null; onChange: (enabled: boolean) => void; } — Optional controlled comparison with the immediately preceding equal-length interval.
DateTimeRangePickerProps (type, @altertable/data-app-react, @altertable/data-app-react/ui): = props listed as DateTimeRangePicker.*
DateTimeRangePolicy (type, @altertable/data-app/contract): A date filter's coverage, duration limit, and reporting time zone. Parsing preserves relative values.
DateTimeRangePolicy.timeZone: string
DateTimeRangePolicy.bounds: (now?: Date | undefined) => { minDate: string | undefined; maxDate: string; maxRangeDays: number | undefined; timeZone: string; }
DateTimeRangePolicy.parse: (value: unknown, now?: Date | undefined) => DateTimeRange — Validate coverage and duration while preserving symbolic relative bounds.
DateTimeRangePolicy.resolve: (value: unknown, now?: Date | undefined) => ResolvedDateTimeRange — Resolve to UTC-rebased bounds using reporting-zone wall-clock fields, then validate policy.
DateTimeRangePolicy.comparison: (value: unknown, now?: Date | undefined) => ResolvedDateTimeRange | null — Return the comparison window, or null when source coverage excludes it.
DateTimeRangePolicy.endAtNow: (range: ResolvedDateTimeRange, now?: Date | undefined) => ResolvedDateTimeRange — End a resolved range at the reference time when it runs past it.
DateTimeRangePolicy.request: (value: unknown, compare?: boolean | undefined, now?: Date | undefined) => DateTimeRangeInput — Resolve both periods against one reference instant, ending the range at now.
DateTimeRangePreset (type, @altertable/data-app/contract, @altertable/data-app-react/ui): A picker suggestion. Text ranges use the same natural-language parser as typed input.
DateTimeRangePreset.label: string — Menu label, also shown when this preset matches the selected range.
DateTimeRangePreset.range: string | DateTimeRange
DateTimeRangePreset.shortcut?: string — Optional compact badge, for example "15m".
dateTimeRangePresets (const, @altertable/data-app/contract, @altertable/data-app-react/ui): Monitoring offers minute/hour windows; analytics offers longer periods and to-date windows. Spread either menu to add custom presets.
dateTimeRangePresets.monitoring: readonly DateTimeRangePreset[]
dateTimeRangePresets.analytics: readonly DateTimeRangePreset[]
DateTimeRangeSelection (type, @altertable/data-app/contract, @altertable/data-app-react/ui): The picker's URL state: the selected range, relative or absolute, and the comparison toggle.
DateTimeRangeSelection.range: DateTimeRange
DateTimeRangeSelection.comparison?: 'previous'
dateTimeRangeSql (function, @altertable/data-app/contract): (range: DateTimeRange, parameter: string): { from: string; to: string; params: Record<string, string>; } — DuckDB timestamp expressions using the query session's timezone for relative anchors. Absolute fields remain UTC-rebased TIMESTAMP values. Start is inclusive, end exclusive.
dateTimeRangeSql.range.from?: AbsoluteOrRelativeDateTime | null — Inclusive start; null or omitted means unbounded.
dateTimeRangeSql.range.to?: AbsoluteOrRelativeDateTime | null — Exclusive end; null or omitted means now.
DateTimeTooltip (component, @altertable/data-app-react): (props: DateTimeTooltipProps) — Exact-time disclosure uses the same reporting zone and locale as other date displays.
DateTimeTooltip.date: Date
DateTimeTooltip.timeZone?: string
DateTimeTooltip.locale?: string
DateTimeTooltip.children?: ReactNode
DateTimeTooltip.placement?: Placement
DateTimeTooltip.portalRoot?: RefObject<HTMLElement | null>
DateTimeTooltip.triggerProps?: HelpPopoverTriggerProps
DateTimeTooltip.panelProps?: HelpPopoverPanelProps
DateTimeTooltip.open?: boolean
DateTimeTooltip.onOpenChange?: ((open: boolean) => void)
DateTimeTooltipProps (type, @altertable/data-app-react): = props listed as DateTimeTooltip.*
defineDataApp (function, @altertable/data-app, @altertable/data-app/config): <const Queries extends QueryDefinitions>(config: DataAppConfig<Queries> & { queries: CheckedQueries<Queries>; }): DataAppDefinition<Queries> — Define the app's query source of truth while preserving exact query and parameter names. Use `dataApp.defineOperation()` to bind operations to these queries.
defineDataApp.config.title: string
defineDataApp.config.scope: { organization: string; environment: string; } — Display labels; scope does not grant data access.
defineDataApp.config.description: string — Explain what the app helps readers explore.
defineDataApp.config.appearance?: AppearanceOptions — Omit to use the standard appearance.
defineDataApp.config.dateFormatting?: { locale?: string | undefined; timeZone?: string | undefined; } — Shared date display defaults. Reporting views and individual fields may override the time zone.
defineDataApp.config.queries: Queries & KnownRecord<Queries> & ('' extends keyof Queries ? never : unknown) & { [Name in keyof Queries]: KnownRecord<Queries[Name]> & { ...; }; } — Named SQL statements with typed parameters and result projections.
defineDataIdentifiers (function, @altertable/data-app-react): <const Tables extends Record<string, TableIdentifier>, const Columns extends Record<string, ColumnIdentifier<Extract<keyof Tables, string>>>>(options: {…}): { definitions: Readonly<Record<IdentifierId<Tables, Columns>, DataIdentifierDefinition>>; DataIdentifier: ({ id, display }: { ...; }) => Eleme… — Register exact source names once; returned JSX IDs are checked against this registry.
defineDataIdentifiers.options.tables: Tables
defineDataIdentifiers.options.columns: Columns
DefinedOperation (type, @altertable/data-app/contract): <Input, Output, Queries, Filters>
DefinedOperation.input: (value: unknown) => Input
DefinedOperation.run: (context: OperationContext, input: Input) => Promise<Output>
DefinedOperation.checks: readonly [Input, ...Input[]]
DefinedOperation.policy: { maxQueryRows: number; maxDurationMs: number; maxResponseBytes?: number | undefined; }
DefinedOperation.queryNames: { readonly [Name in keyof Queries & string]: Name; }
DefinedOperation.filters?: FilterCollection
defineOperation (function, @altertable/data-app/contract): <Input, Output, const Queries extends QueryDefinitions, const Filters extends FilterCollection = {}>(operation: InputOperationDefinition<Input, Output, Queries, Filters> & { queries: CheckedQueries<Queries>; }): DefinedOperation<WithFilterInput<Filters, Input>, Output, Queries, keyof Filters extend…; <const Queries extends QueryDefinitions, const Filters extends FilterCollection = {}, Output = unknown>(operation: FilterOperationDefinition<Filters, Output, Queries> & { queries: CheckedQueries<Queries>; }): DefinedOperation<FilterInput<Filters>, Output, Queries, Filters>
defineOperation.operation.filters?: CheckedOperationFilters<Filters> — Filters the operation reads beside its own input; they are parsed for it.
defineOperation.operation.input: (value: unknown) => Input — Parses the operation's own fields, without the filters.
defineOperation.operation.checks: readonly [Input, ...Input[]] — Representative valid own inputs; each must pass `input`.
defineOperation.operation.policy: { maxQueryRows: number; maxDurationMs: number; maxResponseBytes?: number | undefined; }
defineOperation.operation.run: OperationRun<WithFilterInput<Filters, Input>, Output, Queries>
defineOperation.operation.queries: CheckedQueries<Queries>
defineOperation.operation.filters?: CheckedOperationFilters<Filters> — The filters `run` reads. Omit for an operation without inputs.
defineOperation.operation.run: OperationRun<FilterInput<Filters>, Output, Queries>
defineQueryNames (function, @altertable/data-app/contract): <const Names extends Record<string, string>>(names: Names): Names
DetailAction (type, @altertable/data-app-react): <Row, Input, DestinationInput, Own> — A detail interaction: the destination and the fields a row supplies.
DetailAction.label: string
DetailAction.when?: ((row: Row) => boolean)
DetailAction.target: DetailView<any, DestinationInput, Own>
DetailAction.input: (row: Row, displayedInput: Input) => Own & Partial<DestinationInput> — The destination's own fields, such as the clicked record, and any filter it narrows; its other filters carry over from the displayed scope.
DetailContent (class, @altertable/data-app-react): <Data, Input> — A destination’s rendered body. Pass these to DataApp.details.
DetailContent.target: DetailView<Data, Input, any>
DetailContent.render: (state: DataContentState<Data, Input>) => ReactNode
DetailView (class, @altertable/data-app-react): <Data, Input, Own> — A typed, query-backed destination. Interactions supply its own fields (`Own`); the filters its operation reads carry over from the displayed scope.
DetailView.definition: { id: string; title: ReactNode; parseInput: (input: unknown) => Input; describeInput?: ((input: Input) => string) | undefined; } & ViewEmptiness<Data> & Required<...> & { ...; }
DetailView.useResult: (input: Input) => ViewResult<Data, Input>
DetailView.ownInput?: Own
DetailView.content: (render: (state: DataContentState<Data, Input>) => ReactNode) => DetailContent<Data, Input> — Render like view content: displayed data, its input, and the derived scope.
DetailViewDefinition (type, @altertable/data-app-react): <Data, Input>
DetailViewDefinition.id: string
DetailViewDefinition.title: ReactNode
DetailViewDefinition.parseInput: (input: unknown) => Input — Validates untrusted navigation input before a detail operation can run.
DetailViewDefinition.describeInput?: ((input: Input) => string) — Describe the destination's scope. Defaults to the filters its operation reads; supply it to name the record, such as `orders for Customer 042`.
DetailViewDefinition.isEmpty?: ((data: Data) => boolean) — App-owned semantics: measured zero need not mean an empty result. Defaults to never empty.
DetailViewDefinition.emptyFallback?: EmptyContent — Inherited by DataSection unless it supplies its own copy.
dimensionFilter (function, @altertable/data-app/contract): <const T extends string>(config: DimensionFilterOptions<T>): DimensionFilter<T>; <const T extends number>(config: DimensionFilterOptions<T>): DimensionFilter<T> — A bounded categorical filter with app-owned fixed options.
dimensionFilter.config.key: string
dimensionFilter.config.label: string
dimensionFilter.config.allowMissing?: boolean
dimensionFilter.config.allowExclusion?: boolean
dimensionFilter.config.history?: HistoryMode
dimensionFilter.config.presentation?: FilterPresentation
dimensionFilter.config.selectionMode: 'single' [variant 1 of 2]
dimensionFilter.config.maxSelected?: 1 [variant 1 of 2]
dimensionFilter.config.valueType: T extends number ? 'number' : 'string'
dimensionFilter.config.defaultValue?: DimensionSelection<NoInfer<T>> — The selection before readers change it, such as paid orders only. Clearing filters still returns to every member. Defaults to `{ kind: 'all' }`.
dimensionFilter.config.options: readonly DimensionOption<T>[]
dimensionFilter.config.selectionMode: 'multiple' [variant 2 of 2]
dimensionFilter.config.maxSelected?: number [variant 2 of 2]
DimensionFilter (type, @altertable/data-app/contract): <T> — A fixed-option dimension retains its distinction from query-backed facets.
DimensionFilter.kind: 'dimension'
DimensionFilter.label: string
DimensionFilter.presentation?: (FilterPresentation & { group?: 'display' | 'scope' | undefined; }) — Display options (`displayChoice()`) change how results are shown, not which data is included.
DimensionFilter.urlKeys: readonly string[]
DimensionFilter.defaultValue: DimensionSelection<T>
DimensionFilter.clearValue?: DimensionSelection<T> — Unrestricted value, when this filter can be cleared.
DimensionFilter.describe: (value: Value): string
DimensionFilter.describe: (selection: DimensionSelection<T>, options: readonly DimensionOption<T>[]): string
DimensionFilter.history: HistoryMode
DimensionFilter.read: (params: URLSearchParams) => DimensionSelection<T>
DimensionFilter.write: (value: DimensionSelection<T>) => Record<string, string | null>
DimensionFilter.valid: (value: DimensionSelection<T>) => boolean
DimensionFilter.same: (left: DimensionSelection<T>, right: DimensionSelection<T>) => boolean
DimensionFilter.optionsSource: 'fixed'
DimensionFilter.selectionMode: 'multiple' | 'single'
DimensionFilter.valueType: T extends number ? 'number' : 'string'
DimensionFilter.allowMissing: boolean
DimensionFilter.allowExclusion: boolean
DimensionFilter.maxSelected: number
DimensionFilter.options: readonly DimensionOption<T>[]
DimensionFilterOptions (type, @altertable/data-app/contract): <T> = props listed as dimensionFilter.config.*
DimensionMember (type, @altertable/data-app/contract): <T>
DimensionMember.kind: 'value' [variant 1 of 2]
DimensionMember.value: T [variant 1 of 2]
DimensionMember.kind: 'missing' [variant 2 of 2]
DimensionOption (type, @altertable/data-app/contract): <T>
DimensionOption.value: T
DimensionOption.label: string
DimensionOption.count?: number
DimensionPicker (component, @altertable/data-app-react/ui): <T extends DimensionValue>(props: {…}) — Adapts the typed dimension contract to the shared ChoicePicker control.
DimensionPicker.filter: DimensionSelectionFilter<T>
DimensionPicker.labelPlacement?: ControlLabelPlacement
DimensionPicker.value: DimensionSelection<T>
DimensionPicker.onChange: (value: DimensionSelection<T>) => void
DimensionPicker.options?: readonly DimensionOption<T>[]
DimensionPicker.loading?: boolean
DimensionPicker.error?: boolean
DimensionPicker.onRetry?: (() => void)
dimensionPredicate (function, @altertable/data-app/contract): <T extends DimensionValue, const Columns extends readonly string[]>(column: Columns[number], selection: DimensionSelection<T>, allowedColumns: Columns): string — Central SQL literal encoding for transports without bound parameters. Column is an allowlisted identifier.
dimensionPredicate.selection.kind: 'all' [variant 1 of 2]
dimensionPredicate.selection.kind: 'exclude' | 'include' [variant 2 of 2]
dimensionPredicate.selection.members: readonly DimensionMember<T>[] [variant 2 of 2]
DimensionSelection (type, @altertable/data-app/contract): <T> = props listed as dimensionPredicate.selection.*
DisclosedQuery (type, @altertable/data-app/contract): One registered statement an operation ran, with its parameter values.
DisclosedQuery.name: string
DisclosedQuery.statement: string
DisclosedQuery.params?: Readonly<Record<string, QueryParameterValue>>
DisclosedQuery.queryId?: string
displayChoice (function, @altertable/data-app/contract): <const Options extends readonly ChoiceOption[]>(options: ChoiceOptions<Options>): AppFilter<Options[number]['id'], 'choice'> & { options: readonly ChoiceOption[]; } & { presentation: { group: 'display'; }; } — One choice that changes how results are shown, such as a chart breakdown or sort order. Clearing filters keeps it; pass `view.breakdown(name)` to render it beside its chart.
displayChoice.options.label?: string
displayChoice.options.key: string
displayChoice.options.history?: HistoryMode
displayChoice.options.presentation?: FilterPresentation
displayChoice.options.defaultValue: NoInfer<Options[number]['id']>
displayChoice.options.options: Options & (Options extends readonly [] ? never : unknown)
EmptyState (component, @altertable/data-app-react): (props: EmptyStateProps)
EmptyState.title: ReactNode
EmptyState.description?: ReactNode
EmptyState.action?: ReactNode — A relevant recovery action; omit when there is nothing the user can change.
EmptyState.variant?: 'table' | 'visual'
EmptyState.className?: string
EmptyStateProps (type, @altertable/data-app-react): = props listed as EmptyState.*
ExplorationAction (type, @altertable/data-app-react/ui): A resolved action available for one displayed exploration item.
ExplorationAction.id: string
ExplorationAction.label: string
ExplorationAction.onSelect: (trigger?: HTMLElement | SVGElement | undefined) => void
ExplorationAction.primary?: boolean — Keep this action directly available when other actions require a menu.
ExplorationAction.group?: 'clipboard' — Keep utility actions separate from exploration destinations.
ExplorationActionControl (component, @altertable/data-app-react/ui): (props: ExplorationActionControlProps) — Presents exploration actions consistently: a sole action is direct, an explicit primary action stays direct, and all available choices remain in the menu.
ExplorationActionControl.actions: readonly ExplorationAction[]
ExplorationActionControl.ariaLabel: string — Identifies the item whose actions the control exposes.
ExplorationActionControl.hidePrimary?: boolean — Use when another item-level hit target already exposes the primary action.
ExplorationActionControl.contextOnly?: boolean — Own a context menu without adding a second visible or keyboard trigger.
ExplorationActionControl.indicator?: 'chevron' | 'ellipsis' — Chart labels use a chevron; other action menus use an ellipsis.
ExplorationActionControl.ref?: Ref<HTMLButtonElement> — Shares this menu trigger with an item's context and keyboard actions.
ExplorationActionControl.className?: string
ExplorationActionControlProps (type, @altertable/data-app-react/ui): = props listed as ExplorationActionControl.*
ExternalLink (component, @altertable/data-app-react): (props: ExternalLinkProps) — Open HTTPS links through the host when embedded, or a native new tab when standalone.
ExternalLink.href: string
ExternalLink.children: ReactNode
ExternalLink.className?: string
ExternalLink.title?: string
ExternalLinkProps (type, @altertable/data-app-react): = props listed as ExternalLink.*
facetFilter (function, @altertable/data-app/contract): <const Operation extends string>(config: FacetFilterOptions<string, Operation> & { valueType: 'string'; }): FacetFilter<string, Operation>; <const Operation extends string>(config: FacetFilterOptions<number, Operation> & { valueType: 'number'; }): FacetFilter<number, Operation> — Options load from `options`, an operation returning `DimensionOption[]`; the client checks that it is registered. Validate selections like any dimension.
facetFilter.config.key: string
facetFilter.config.label: string
facetFilter.config.allowMissing?: boolean
facetFilter.config.allowExclusion?: boolean
facetFilter.config.history?: HistoryMode
facetFilter.config.presentation?: FilterPresentation
facetFilter.config.selectionMode: 'single' [variant 1 of 2]
facetFilter.config.maxSelected?: 1 [variant 1 of 2]
facetFilter.config.valueType: 'string'
facetFilter.config.defaultValue?: DimensionSelection<string> — The selection before readers change it, such as paid orders only. Clearing filters still returns to every member. Defaults to `{ kind: 'all' }`.
facetFilter.config.options: Operation — The registered operation that returns this dimension's options.
facetFilter.config.selectionMode: 'multiple' [variant 2 of 2]
facetFilter.config.maxSelected?: number [variant 2 of 2]
facetFilter.config.valueType: 'number'
facetFilter.config.defaultValue?: DimensionSelection<number> — The selection before readers change it, such as paid orders only. Clearing filters still returns to every member. Defaults to `{ kind: 'all' }`.
FacetFilter (type, @altertable/data-app/contract): <Value, Operation> — A dimension whose options come from an operation. The options follow that operation's own filters, so selecting a period narrows the choices.
FacetFilter.kind: 'dimension'
FacetFilter.label: string
FacetFilter.presentation?: (FilterPresentation & { group?: 'display' | 'scope' | undefined; }) — Display options (`displayChoice()`) change how results are shown, not which data is included.
FacetFilter.urlKeys: readonly string[]
FacetFilter.defaultValue: DimensionSelection<Value>
FacetFilter.clearValue?: DimensionSelection<Value> — Unrestricted value, when this filter can be cleared.
FacetFilter.describe: (value: Value): string
FacetFilter.describe: (selection: DimensionSelection<T>, options: readonly DimensionOption<T>[]): string
FacetFilter.history: HistoryMode
FacetFilter.read: (params: URLSearchParams) => DimensionSelection<Value>
FacetFilter.write: (value: DimensionSelection<Value>) => Record<string, string | null>
FacetFilter.valid: (value: DimensionSelection<Value>) => boolean
FacetFilter.same: (left: DimensionSelection<Value>, right: DimensionSelection<Value>) => boolean
FacetFilter.optionsSource: 'query'
FacetFilter.selectionMode: 'multiple' | 'single'
FacetFilter.valueType: Value extends number ? 'number' : 'string'
FacetFilter.allowMissing: boolean
FacetFilter.allowExclusion: boolean
FacetFilter.maxSelected: number
FacetFilter.options: readonly DimensionOption<Value>[]
FilterActions (component, @altertable/data-app-react/ui): (props: FilterActionsProps)
FilterActions.onClear?: (() => void)
FilterActions.onApply: () => void [variant 1 of 2]
FilterActions.onCancel: () => void [variant 1 of 2]
FilterActionsProps (type, @altertable/data-app-react/ui): = props listed as FilterActions.*
FilterBar (component, @altertable/data-app-react/ui): (props: FilterBarProps)
FilterBar.…: plus props inherited from React
FilterBarProps (type, @altertable/data-app-react/ui): <HTMLAttributes<HTMLDivElement>, HTMLDivElement>
FilterBarProps.…: plus props inherited from React
FilterCollection (type, @altertable/data-app/contract): = { [x: string]: SearchFilter | BooleanFilter | ChoiceFilter<any> | DateTimeRangeFilter<boolean> | DimensionFilter<any> | FacetFilter<...> | MultiChoiceFilter | NumberFilter | SourceDimensionFilter<...>; }
FilterInput (type, @altertable/data-app/contract): <Filters> = keyof Filters extends never ? Record<string, never> : { [Name in keyof Filters]: FilterInputValue<Filters[Name]>; } — An operation's input: one flat field per declared filter.
FilterOperationDefinition (type, @altertable/data-app/contract): <Filters, Output, Queries> — An operation that reads app filters. Its input has one field per filter, validated by the filters themselves; views derive their filters, scope, and period from it.
FilterOperationDefinition.filters?: CheckedOperationFilters<Filters> — The filters `run` reads. Omit for an operation without inputs.
FilterOperationDefinition.policy: { maxQueryRows: number; maxDurationMs: number; maxResponseBytes?: number | undefined; }
FilterOperationDefinition.run: OperationRun<FilterInput<Filters>, Output, Queries>
FilterPresentation (type, @altertable/data-app/contract): Where a filter's or display option's control renders.
FilterPresentation.control?: 'toolbar' | 'widget' — Widget controls render beside their visualization instead of in the toolbar. Scope filters remain available in the Filters sheet and active summaries.
FilterPresentation.prominence?: 'primary' | 'secondary' — Secondary scope controls live in the Filters sheet with compact pickers when active; secondary display options follow primary options. Defaults to primary.
FilterValues (type, @altertable/data-app/contract): <Collection> = { [Key in keyof Collection]: Collection[Key] extends DimensionSelectionFilter<infer Value extends DimensionValue> ? DimensionSelection<...> : ...; }
formatCount (function, @altertable/data-app/format): (value: number | null | undefined, options: CommonOptions & { compact?: boolean; }): string — Negative and fractional counts render as missing. Compact notation is opt-in.
formatCount.options.locale?: string
formatCount.options.missing?: string
formatCount.options.compact?: boolean
formatDate (function, @altertable/data-app/format): (value: string | null | undefined, options: DateFormatOptions): string — Format an ISO calendar date as a date, never as a browser-local instant.
formatDate.options.locale?: string
formatDate.options.missing?: string
formatDateRange (function, @altertable/data-app/format): (options: {…}, options: DateFormatOptions): string — Compact, unambiguous calendar dates for labels and request status.
formatDateRange.options.start: string
formatDateRange.options.end: string
formatDateRange.options.locale?: string
formatDateRange.options.missing?: string
formatDateTime (function, @altertable/data-app/format): (value: DateTimeValue, options: DateTimeFormatOptions): string — Format an instant in an explicit reporting zone. Defaults use UTC and 24-hour minutes.
formatDateTime.options.locale?: string
formatDateTime.options.missing?: string
formatDateTime.options.timeZone?: string
formatDateTime.options.precision?: 'minute' | 'second'
formatDateTimeBound (function, @altertable/data-app/contract): (value: AbsoluteOrRelativeDateTime | null | undefined, fallback: string): string
formatDateTimeBound.value.anchor: RelativeAnchor [variant 2 of 2]
formatDateTimeBound.value.offset: RelativeOffset[] [variant 2 of 2]
formatDateTimeBound.value.…: plus props inherited from built-in
formatDateTimeRange (function, @altertable/data-app/contract, @altertable/data-app/format): (value: DateTimeRange): string
formatDateTimeRange.value.from?: AbsoluteOrRelativeDateTime | null — Inclusive start; null or omitted means unbounded.
formatDateTimeRange.value.to?: AbsoluteOrRelativeDateTime | null — Exclusive end; null or omitted means now.
formatMetric (function, @altertable/data-app/format): (value: number, format: MetricFormat): string
formatMetric.format.kind: 'count' [variant 1 of 3]
formatMetric.format.compact?: boolean [variant 1 of 3]
formatMetric.format.locale?: string
formatMetric.format.kind: 'ratio' [variant 2 of 3]
formatMetric.format.maximumFractionDigits?: number [variant 2 of 3]
formatMetric.format.kind: 'currency' [variant 3 of 3]
formatMetric.format.currency: string [variant 3 of 3]
formatNumber (function, @altertable/data-app/format): (value: number | null | undefined, options: CommonOptions & Intl.NumberFormatOptions): string — Missing and non-finite values use the `missing` label; negative zero renders as zero.
formatNumber.options.locale?: string
formatNumber.options.missing?: string
formatNumber.options.…: plus props inherited from built-in
formatPercent (function, @altertable/data-app/format): (ratio: number | null | undefined, options: CommonOptions & { maximumFractionDigits?: number; }): string — Accepts a ratio (0.116), not a percentage (11.6).
formatPercent.options.locale?: string
formatPercent.options.missing?: string
formatPercent.options.maximumFractionDigits?: number
formatTime (function, @altertable/data-app/format): (value: DateTimeValue, options: DateTimeFormatOptions): string — Format an instant's time for intraday chart axes using the same zone and precision policy.
formatTime.options.locale?: string
formatTime.options.missing?: string
formatTime.options.timeZone?: string
formatTime.options.precision?: 'minute' | 'second'
FunnelChart (component, @altertable/data-app-react/ui): (props: FunnelChartProps) — Conversion columns with previous-step drop-off, normalized to each series' first step. Owns series highlighting and portion-specific inspection; compose inside VisualizationWidget.
FunnelChart.ariaLabel: string — Accessible measure and scope description.
FunnelChart.unit: string — Population unit, such as users or sessions.
FunnelChart.formatValue?: ((value: number) => string) — Formats counts; rates use percentage formatting.
FunnelChart.className?: string
FunnelChart.horizontalGrid?: boolean — Draw horizontal grid lines behind the plotted values.
FunnelChart.steps: readonly FunnelChartStep[]
FunnelChart.series: readonly FunnelChartSeries[]
FunnelChart.interactiveLegend?: boolean — Disable legend hover and focus controls.
FunnelChartProps (type, @altertable/data-app-react/ui): = props listed as FunnelChart.*
FunnelChartSeries (type, @altertable/data-app-react/ui)
FunnelChartSeries.id: string — Unique, nonblank population ID.
FunnelChartSeries.label: string
FunnelChartSeries.values: readonly number[] — Finite, nonnegative counts aligned with steps and nonincreasing.
FunnelChartStep (type, @altertable/data-app-react/ui): Ordered step with a unique, nonblank ID.
FunnelChartStep.id: string
FunnelChartStep.label: string
GettingStarted (component, @altertable/data-app-react/ui): (props: {…}) — Query-backed connection state and next steps for a newly created app. Mount within `DataAppProvider` and register `connection: connectionCheck(app.queries)` on the server.
GettingStarted.dataContext: DataContext
GlossaryDefinition (component, @altertable/data-app-react/ui): (props: GlossaryDefinitionProps)
GlossaryDefinition.entry: GlossaryEntry
GlossaryDefinition.children?: ReactNode
GlossaryDefinitionProps (type, @altertable/data-app-react/ui): = props listed as GlossaryDefinition.*
GlossaryEntry (type, @altertable/data-app-react)
GlossaryEntry.term: string
GlossaryEntry.definition: ReactNode
GlossaryEntry.queryNames?: string[]
GlossaryExplanation (component, @altertable/data-app-react/ui): (props: GlossaryExplanationProps) — Opens the inspect sheet for one glossary term. Prefer a card's evidence slot when the surface already has a title, description, and visual.
GlossaryExplanation.entry: GlossaryEntry
GlossaryExplanation.empty?: AboutEmpty
GlossaryExplanation.title?: ReactNode
GlossaryExplanation.description?: ReactNode
GlossaryExplanation.visual?: ReactNode
GlossaryExplanation.queries?: DisclosedQuery[]
GlossaryExplanation.dataContext?: DataContext
GlossaryExplanation.…: plus props inherited from React
GlossaryExplanationProps (type, @altertable/data-app-react/ui): = props listed as GlossaryExplanation.*
GradientScroll (component, @altertable/data-app-react/ui): (props: GradientScrollProps) — Fades only scrollable edges; content, size, and scroll changes update the mask.
GradientScroll.axis?: 'horizontal' | 'vertical'
GradientScroll.fadeStart?: boolean — Disable the start fade when sticky controls share the scrollport.
GradientScroll.…: plus props inherited from React
GradientScrollProps (type, @altertable/data-app-react/ui): = props listed as GradientScroll.*
Grid (component, @altertable/data-app-react): (props: GridProps) — Responsive layout for peer cards and panels. Cards keep their content height by default.
Grid.children: ReactNode
Grid.columns?: 1 | 2 | 3 | 4 — Maximum columns; cards wrap sooner when the container cannot fit their minimum width.
Grid.minItemWidth?: 'compact' | 'regular' | 'wide'
Grid.gap?: 'lg' | 'md' | 'sm'
Grid.align?: 'start' | 'stretch' — `stretch` gives widgets in each row the same height.
Grid.…: plus props inherited from React
GridItem (component, @altertable/data-app-react): (props: GridItemProps)
GridItem.children: ReactNode
GridItem.span?: 1 | 2 — Maximum tracks occupied; collapses to one when the grid container is narrow.
GridItem.…: plus props inherited from React
GridItemProps (type, @altertable/data-app-react): = props listed as GridItem.*
GridProps (type, @altertable/data-app-react): = props listed as Grid.*
HelpPopover (component, @altertable/data-app-react/ui): (props: HelpPopoverProps) — A supplemental explanation that opens on click, Enter, or a deliberate mouse hover. Tabbing past the trigger does not open it, and a click keeps a hover-opened panel in place.
HelpPopover.trigger: ReactNode
HelpPopover.triggerLabel: string
HelpPopover.label: string
HelpPopover.children: ReactNode
HelpPopover.placement?: Placement
HelpPopover.portalRoot?: RefObject<HTMLElement | null>
HelpPopover.triggerProps?: HelpPopoverTriggerProps
HelpPopover.panelProps?: HelpPopoverPanelProps
HelpPopover.open?: boolean
HelpPopover.onOpenChange?: ((open: boolean) => void)
HelpPopoverProps (type, @altertable/data-app-react/ui): = props listed as HelpPopover.*
IconButton (component, @altertable/data-app-react): (props: IconButtonProps)
IconButton.icon: 'annotate' | 'breakdown' | 'calendar' | 'cancel' | 'check' | 'clearFilters' | 'clock' | 'close' | 'copy' | 'darkTheme' | 'disclosure' | 'displayOptions' | 'error' | 'explore' | ... 22 more ... | 'wrap'
IconButton.label: string
IconButton.variant?: 'elevated' | 'ghost' | 'inline' | 'outline' | 'primary'
IconButton.shortcut?: Shortcut | { label: string; aria: string; }
IconButton.tooltip?: ReactNode
IconButton.portalRoot?: RefObject<HTMLElement | null>
IconButton.tooltipPlacement?: 'bottom' | 'top'
IconButton.tooltipAlign?: 'center' | 'end' | 'start'
IconButton.children?: ReactNode
IconButton.…: plus props inherited from React
IconButtonProps (type, @altertable/data-app-react): = props listed as IconButton.*
injectDataAppStyles (function, @altertable/data-app-react, @altertable/data-app-react/ui): (options: DataAppStylesOptions): HTMLStyleElement — Install the complete UI stylesheet once per document, before mounting.
injectDataAppStyles.options.document?: Document — Defaults to the current browser document.
injectDataAppStyles.options.nonce?: string — Nonce permitted by the document's style-src CSP.
InputOf (type, @altertable/data-app/client): <T> = T extends { input: (value: unknown) => infer Input; } ? Input : never
InputOperationDefinition (type, @altertable/data-app/contract): <Input, Output, Queries, Filters> — An operation with its own input, such as a detail destination's record id. It may also read filters, such as the displayed scope it lists records for.
InputOperationDefinition.filters?: CheckedOperationFilters<Filters> — Filters the operation reads beside its own input; they are parsed for it.
InputOperationDefinition.input: (value: unknown) => Input — Parses the operation's own fields, without the filters.
InputOperationDefinition.checks: readonly [Input, ...Input[]] — Representative valid own inputs; each must pass `input`.
InputOperationDefinition.policy: { maxQueryRows: number; maxDurationMs: number; maxResponseBytes?: number | undefined; }
InputOperationDefinition.run: OperationRun<WithFilterInput<Filters, Input>, Output, Queries>
isPlainKeyEvent (function, @altertable/data-app-react/ui): (event: KeyEvent, options: {…}): boolean — Keep local key actions separate from shortcuts and IME composition. Pass React's nativeEvent.
isPlainKeyEvent.event.…: plus props inherited from built-in
isPlainKeyEvent.options.allowShift?: boolean
isPlainKeyEvent().valueOf: (): boolean — Returns the primitive value of the specified object.
ItemActions (type, @altertable/data-app-react/ui): <Row> = (row: Row) => readonly ExplorationAction[] — Resolves the actions available for a displayed domain row.
JourneyChart (component, @altertable/data-app-react/ui): (props: JourneyChartProps) — Path exploration with two initial steps, expandable prefixes, and three events per depth. Counts and flows use the Step 1 population. Compose inside VisualizationWidget.
JourneyChart.ariaLabel: string — Accessible measure and scope description.
JourneyChart.unit: string — Population unit, such as users or sessions.
JourneyChart.formatValue?: ((value: number) => string) — Formats counts; rates use percentage formatting.
JourneyChart.className?: string
JourneyChart.paths: readonly JourneyChartPath[] — Full paths and their population counts. Branches and outcomes are derived internally.
JourneyChartPath (type, @altertable/data-app-react/ui): Aggregated route; repeated events remain distinct by depth and prefix.
JourneyChartPath.id: string — Unique, nonblank path ID.
JourneyChartPath.steps: readonly { event: string; property: string | null; }[] — At least one nonblank event; null property means no property grouping.
JourneyChartPath.count: number — Finite, nonnegative population following this route.
JourneyChartPath.converted: boolean | null — True: converted; false: dropped off; null: no conversion classification.
JourneyChartPath.truncated: boolean — Stops at the last loaded event, without adding an outcome or expand control.
JourneyChartProps (type, @altertable/data-app-react/ui): = props listed as JourneyChart.*
LineChart (component, @altertable/data-app-react/ui): <Row extends LineChartItem>(props: LineChartProps<Row>) — Equally spaced finite samples in supplied order; fill missing periods explicitly. Supports negative values, single points, and horizontal scrolling for long series.
LineChart.items: readonly Row[] — Ordered samples; the chart validates IDs and values when rendering.
LineChart.itemActions?: ItemActions<Row> — Actions available for each displayed item. Domain fields remain available to this callback.
LineChart.unit: string
LineChart.ariaLabel: string
LineChart.formatValue?: ((value: number) => string)
LineChart.horizontalGrid?: boolean — Draw horizontal grid lines behind the plotted values.
LineChart.cursorGroup?: ChartCursorGroup — Share mouse-hover timestamps with charts receiving the same handle. Matches each item's time exactly.
LineChartItem (type, @altertable/data-app-react/ui)
LineChartItem.id: string
LineChartItem.label: string
LineChartItem.value: number
LineChartItem.time?: number — Optional timestamp in epoch milliseconds for cursor linking. Omit for category samples.
LineChartProps (type, @altertable/data-app-react/ui): <Row> = props listed as LineChart.*
LiveControl (component, @altertable/data-app-react/ui): (props: LiveControlProps) — Toggle an app-owned recurring refresh. The app supplies the timer and its cadence.
LiveControl.enabled: boolean
LiveControl.onChange: (enabled: boolean) => void
LiveControl.intervalSeconds: LiveIntervalSeconds
LiveControl.onIntervalChange: (seconds: LiveIntervalSeconds) => void
LiveControl.…: plus props inherited from React
LiveControlProps (type, @altertable/data-app-react/ui): = props listed as LiveControl.*
LiveIntervalSeconds (type, @altertable/data-app-react/ui): = 30 | 60 | 300
matchSearchText (function, @altertable/data-app-react/ui): (text: string, query: string): SearchMatchValue — Highlight literal query terms in supplied text without filtering or reordering results.
Menu (component, @altertable/data-app-react/ui): <T extends object>(props: MenuProps<T>) — Actions by default; single selection creates radio items, multiple creates checkbox items.
Menu.…: plus props inherited from @react-types/shared, react-aria, react-aria-components
MenuButton (component, @altertable/data-app-react/ui): (props: Omit<ComponentPropsWithRef<typeof import('react-aria-components').Button>, 'className'> & Pick<ButtonProps, 'variant' | 'size'> & { className?: string; }) — React Aria trigger behavior with the same presentation as the native Button.
MenuButton.variant?: 'elevated' | 'ghost' | 'inline' | 'outline' | 'primary' — Inline actions retain button semantics without a padded control surface.
MenuButton.size?: 'compact' | 'default' | 'icon' | 'icon-compact'
MenuButton.className?: string
MenuButton.…: plus props inherited from @react-types/shared, React, react-aria, react-aria-components
MenuItem (component, @altertable/data-app-react/ui): <T extends object>(props: MenuItemProps<T>)
MenuItem.…: plus props inherited from @react-types/shared, react-aria-components
MenuItemProps (type, @altertable/data-app-react/ui): <T> = props listed as MenuItem.*
MenuPopover (component, @altertable/data-app-react/ui): (props: MenuPopoverProps) — Anchored popup for a Menu; the surrounding MenuTrigger owns focus and dismissal.
MenuPopover.…: plus props inherited from @react-types/shared, React, react-aria, react-aria-components, react-stately
MenuPopoverProps (type, @altertable/data-app-react/ui)
MenuPopoverProps.…: plus props inherited from @react-types/shared, React, react-aria, react-aria-components, react-stately
MenuProps (type, @altertable/data-app-react/ui): <T> = props listed as Menu.*
MenuSection (function, @altertable/data-app-react/ui): <T>(props: MenuSectionProps<T> & React.RefAttributes<HTMLElement>): ReactElement<unknown, string | JSXElementConstructor<any>> | null — A MenuSection represents a section within a Menu.
MenuSection.props.…: plus props inherited from @react-types/shared, React, react-aria-components
MenuSeparator (component, @altertable/data-app-react/ui): (props: ComponentPropsWithRef<typeof import('react-aria-components').Separator>)
MenuSeparator.…: plus props inherited from @react-types/shared, React, react-aria, react-aria-components
MenuTrigger (component, @altertable/data-app-react/ui): (props: MenuTriggerProps)
MenuTrigger.…: plus props inherited from react-aria-components, react-stately
MenuTriggerProps (type, @altertable/data-app-react/ui): = props listed as MenuTrigger.*
MetricDefinition (type, @altertable/data-app-react)
MetricDefinition.id: string
MetricDefinition.label: string
MetricDefinition.format: MetricFormat
MetricDefinition.favorableDirection?: 'down' | 'up'
MetricDefinition.evidence: WidgetEvidence
MetricFormat (type, @altertable/data-app/format): = props listed as formatMetric.format.*
MetricReading (type, @altertable/data-app-react/ui)
MetricReading.loading: true [variant 1 of 2]
MetricReading.loading: false [variant 2 of 2]
MetricReading.value: MetricValues & { period?: DateTimeRangeInput | undefined; } [variant 2 of 2]
MetricRecords (class, @altertable/data-app-react): <Data, Input, DetailData, DetailInput> — A metric-owned record destination. It can only render from that metric's displayed source.
MetricRecords.render: (source: ViewSource<Data, Input>, navigation?: DetailNavigation | undefined) => { scope: string; content: FunctionComponentElement<{ content: DetailContent<any, any>; input: any; navigation?: DetailNavigation | undefined; }>; } | undefined
MetricValues (type, @altertable/data-app-react): Zero is measured data. null or omitted means no previous measurement. Comparison activation belongs to the reading's period, not these values.
MetricValues.current: number
MetricValues.previous?: number | null
MetricWidget (component, @altertable/data-app-react): <Data, Input>(props: MetricWidgetProps<Data, Input>)
MetricWidget.headingLevel?: 2 | 3 | 4 | 5 | 6 — Document outline level. The label keeps the shared widget-heading appearance.
MetricWidget.annotationId?: string
MetricWidget.description?: ReactNode
MetricWidget.action?: ReactNode
MetricWidget.status?: WidgetStatus
MetricWidget.visual?: ReactNode
MetricWidget.metric: Metric<Data, Input>
MetricWidget.source: ViewSource<NoInfer<Data>, NoInfer<Input>>
MetricWidget.records?: MetricRecords<Data, Input, any, any>
MetricWidget.actions?: ExplorationActions<void, NoInfer<Input>>
MetricWidget.…: plus props inherited from React
MetricWidget (component, @altertable/data-app-react/ui): (props: MetricWidgetProps)
MetricWidget.headingLevel?: 2 | 3 | 4 | 5 | 6 — Document outline level. The label keeps the shared widget-heading appearance.
MetricWidget.annotationId?: string
MetricWidget.description?: ReactNode
MetricWidget.records?: InspectionRecords
MetricWidget.action?: ReactNode
MetricWidget.status?: WidgetStatus
MetricWidget.visual?: ReactNode
MetricWidget.metric: MetricDefinition [variant 1 of 4]
MetricWidget.reading: MetricReading [variant 1 of 4]
MetricWidget.label: string [variants 2, 3, 4 of 4]
MetricWidget.comparison?: MetricComparison [variants 2, 3, 4 of 4]
MetricWidget.evidence?: WidgetEvidence [variants 2, 3, 4 of 4]
MetricWidget.loading: true [variant 2 of 4]
MetricWidget.loading?: false [variants 3, 4 of 4]
MetricWidget.value: number [variant 3 of 4]
MetricWidget.format: MetricFormat [variant 3 of 4]
MetricWidget.content: string | (string & Iterable<ReactNode>) | (string & Promise<AwaitedReactNode>) | (string & ReactElement<unknown, string | JSXElementConstructor<any>>) | (string & ReactPortal) | undefined [variant 4 of 4]
MetricWidget.…: plus props inherited from React
MetricWidgetProps (type, @altertable/data-app-react): <Data, Input> = props listed as MetricWidget.*
MetricWidgetProps (type, @altertable/data-app-react/ui): = props listed as MetricWidget.* — VisualizationWidget with a formatted metric, optional comparison, and evidence.
mountDataApp (function, @altertable/data-app-react): <const Queries extends QueryDefinitions>(options: {…}): void — Mount once per document; installs document identity and the shared request provider.
mountDataApp.options.app: DataAppDefinition<Queries>
mountDataApp.options.component: ComponentType
mountDataApp.options.root?: HTMLElement | null
multiChoiceFilter (function, @altertable/data-app/contract): <const Options extends readonly ChoiceOption[]>(options: Omit<ScalarFilterOptions, 'defaultValue'> & { defaultValue?: readonly NoInfer<Options[number]['id']>[]; options: Options & (Options extends readonly [ ] ? never : unknown); maxSelected?: number; }): MultiChoiceFilter
multiChoiceFilter.options.label?: string
multiChoiceFilter.options.key: string
multiChoiceFilter.options.history?: HistoryMode
multiChoiceFilter.options.presentation?: FilterPresentation
multiChoiceFilter.options.defaultValue?: readonly NoInfer<Options[number]['id']>[]
multiChoiceFilter.options.options: Options & (Options extends readonly [] ? never : unknown)
multiChoiceFilter.options.maxSelected?: number
MultiChoiceFilter (type, @altertable/data-app/contract)
MultiChoiceFilter.kind: 'multiChoice'
MultiChoiceFilter.label?: string
MultiChoiceFilter.presentation?: (FilterPresentation & { group?: 'display' | 'scope' | undefined; }) — Display options (`displayChoice()`) change how results are shown, not which data is included.
MultiChoiceFilter.urlKeys: readonly string[]
MultiChoiceFilter.defaultValue: readonly string[]
MultiChoiceFilter.clearValue?: readonly string[] — Unrestricted value, when this filter can be cleared.
MultiChoiceFilter.describe?: ((value: readonly string[]) => string)
MultiChoiceFilter.history: HistoryMode
MultiChoiceFilter.read: (params: URLSearchParams) => readonly string[]
MultiChoiceFilter.write: (value: readonly string[]) => Record<string, string | null>
MultiChoiceFilter.valid: (value: readonly string[]) => boolean
MultiChoiceFilter.same: (left: readonly string[], right: readonly string[]) => boolean
MultiChoiceFilter.options: readonly ChoiceOption[]
MultiChoiceFilter.maxSelected: number
NumberField (component, @altertable/data-app-react/ui): (props: NumberFieldProps) — Localized numeric entry. Empty input is null rather than zero.
NumberField.label: string
NumberField.value: number | null
NumberField.onChange: (value: number | null) => void
NumberField.className?: string
NumberField.…: plus props inherited from @react-types/shared, React, react-aria, react-aria-components, react-stately
NumberFieldProps (type, @altertable/data-app-react/ui): = props listed as NumberField.*
numberFilter (function, @altertable/data-app/contract): (options: FilterOptions<NumberSelection> & { min?: number; max?: number; }): NumberFilter — Exact numeric predicates; range bounds are inclusive and may be open-ended.
numberFilter.options.key: string
numberFilter.options.label: string
numberFilter.options.defaultValue?: NumberSelection
numberFilter.options.history?: HistoryMode
numberFilter.options.presentation?: FilterPresentation
numberFilter.options.min?: number
numberFilter.options.max?: number
NumberFilter (type, @altertable/data-app/contract): = props listed as parseNumberSelection.filter.*
NumberFilterPicker (component, @altertable/data-app-react/ui): (props: NumberFilterPickerProps) — Edit a numeric predicate in a panel. Apply commits one complete value; dismissing discards the draft.
NumberFilterPicker.filter: NumberFilter
NumberFilterPicker.labelPlacement?: ControlLabelPlacement
NumberFilterPicker.value: NumberSelection
NumberFilterPicker.onChange: (value: NumberSelection) => void
NumberFilterPicker.disabled?: boolean
NumberFilterPickerProps (type, @altertable/data-app-react/ui): = props listed as NumberFilterPicker.*
NumberOperator (type, @altertable/data-app/contract): = 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'ne'
NumberRange (type, @altertable/data-app-react/ui)
NumberRange.min?: number
NumberRange.max?: number
NumberRangeField (component, @altertable/data-app-react/ui): (props: NumberRangeFieldProps) — Commit valid intervals; retain invalid draft bounds so users can correct them.
NumberRangeField.label: string
NumberRangeField.value: NumberRange
NumberRangeField.onChange: (value: NumberRange) => void
NumberRangeField.onValidityChange?: ((valid: boolean) => void) — Reports whether the current draft interval can be committed.
NumberRangeField.min?: number
NumberRangeField.max?: number
NumberRangeField.disabled?: boolean
NumberRangeField.className?: string
NumberRangeFieldProps (type, @altertable/data-app-react/ui): = props listed as NumberRangeField.*
NumberSelection (type, @altertable/data-app/contract)
NumberSelection.kind: 'all' [variant 1 of 3]
NumberSelection.kind: 'comparison' [variant 2 of 3]
NumberSelection.operator: NumberOperator [variant 2 of 3]
NumberSelection.value: number [variant 2 of 3]
NumberSelection.kind: 'range' [variant 3 of 3]
NumberSelection.min?: number [variant 3 of 3]
NumberSelection.max?: number [variant 3 of 3]
OperationFilters (type, @altertable/data-app/client): <Operations> = { readonly [Name in keyof Operations as Operations[Name] extends { filters: infer Filters extends FilterCollection; } ? keyof Filters extends never ? never : Name : never]: ...; } — The filters each operation reads, for operations that read any.
OutputOf (type, @altertable/data-app/client): <T> = T extends { run: (...args: never[]) => Promise<infer Output>; } ? Output : unknown — An operation's data is what its `run` resolves to.
parseBooleanSelection (function, @altertable/data-app/contract): (value: unknown, filter: BooleanFilter): BooleanSelection
parseBooleanSelection.filter.kind: 'booleanFilter'
parseBooleanSelection.filter.label: string
parseBooleanSelection.filter.presentation?: (FilterPresentation & { group?: 'display' | 'scope' | undefined; }) — Display options (`displayChoice()`) change how results are shown, not which data is included.
parseBooleanSelection.filter.urlKeys: readonly string[]
parseBooleanSelection.filter.defaultValue: BooleanSelection
parseBooleanSelection.filter.clearValue?: BooleanSelection — Unrestricted value, when this filter can be cleared.
parseBooleanSelection.filter.describe?: ((value: BooleanSelection) => string)
parseBooleanSelection.filter.history: HistoryMode
parseBooleanSelection.filter.read: (params: URLSearchParams) => BooleanSelection
parseBooleanSelection.filter.write: (value: BooleanSelection) => Record<string, string | null>
parseBooleanSelection.filter.valid: (value: BooleanSelection) => boolean
parseBooleanSelection.filter.same: (left: BooleanSelection, right: BooleanSelection) => boolean
parseCount (function, @altertable/data-app/contract): (value: unknown): number — Accepts numeric strings from DuckDB; rejects negative, fractional, and unsafe integers.
parseCount().toString: (radix: number): string — Returns a string representation of an object.
parseCount().toFixed: (fractionDigits: number): string — Returns a string representing a number in fixed-point notation.
parseCount().toExponential: (fractionDigits: number): string — Returns a string containing a number represented in exponential notation.
parseCount().toPrecision: (precision: number): string — Returns a string containing a number represented either in exponential or fixed-point notation with a specified number of digits.
parseCount().valueOf: (): number — Returns the primitive value of the specified object.
parseCount().toLocaleString: (locales: string | string[], options: Intl.NumberFormatOptions): string; (locales: Intl.LocalesArgument, options: Intl.NumberFormatOptions): string — Converts a number to a string by using the current or specified locale.
parseCount().toLocaleString.options.…: plus props inherited from built-in
parseDateTime (function, @altertable/data-app/format): (value: DateTimeValue): Date | null — Parse only unambiguous instants. String values must include `Z` or an explicit offset.
parseDateTimeBound (function, @altertable/data-app/contract): (text: string): AbsoluteOrRelativeDateTime | null — Parse one bound without resolving relative anchors or offsets.
parseDateTimeRange (function, @altertable/data-app/contract): (value: unknown, options: {…}): DateTimeRange — Validate and restore UTC-rebased dates from JSON, without resolving relative bounds.
parseDateTimeRange.options.maxRangeDays?: number
parseDateTimeRangeInput (function, @altertable/data-app/format): (input: string, options: DateTimeRangeParserOptions): ParseDateTimeRangeResult
parseDateTimeRangeInput.options.now?: Date — UTC-encoded reference fields for omitted dates/years. Defaults to the current UTC date/time.
ParseDateTimeRangeResult (type, @altertable/data-app/format)
ParseDateTimeRangeResult.ok: true [variant 1 of 2]
ParseDateTimeRangeResult.range: DateTimeRange [variant 1 of 2]
ParseDateTimeRangeResult.normalizedInput: string
ParseDateTimeRangeResult.parser: 'calendar-preset' | 'calendar-range' | 'chrono' | 'relative' | 'unix' [variant 1 of 2]
ParseDateTimeRangeResult.ok: false [variant 2 of 2]
ParseDateTimeRangeResult.reason: DateTimeRangeParseFailureReason [variant 2 of 2]
parseDimensionSelection (function, @altertable/data-app/contract): <T extends DimensionValue>(value: unknown, filter: DimensionSelectionFilter<T>): DimensionSelection<T> — Server-side parser; call from the operation input parser before building SQL.
parseDimensionSelection.filter.kind: 'dimension'
parseDimensionSelection.filter.label: string
parseDimensionSelection.filter.presentation?: (FilterPresentation & { group?: 'display' | 'scope' | undefined; }) — Display options (`displayChoice()`) change how results are shown, not which data is included.
parseDimensionSelection.filter.urlKeys: readonly string[]
parseDimensionSelection.filter.defaultValue: DimensionSelection<T>
parseDimensionSelection.filter.clearValue?: DimensionSelection<T> — Unrestricted value, when this filter can be cleared.
parseDimensionSelection.filter.describe: (value: Value): string
parseDimensionSelection.filter.describe: (selection: DimensionSelection<T>, options: readonly DimensionOption<T>[]): string
parseDimensionSelection.filter.history: HistoryMode
parseDimensionSelection.filter.read: (params: URLSearchParams) => DimensionSelection<T>
parseDimensionSelection.filter.write: (value: DimensionSelection<T>) => Record<string, string | null>
parseDimensionSelection.filter.valid: (value: DimensionSelection<T>) => boolean
parseDimensionSelection.filter.same: (left: DimensionSelection<T>, right: DimensionSelection<T>) => boolean
parseDimensionSelection.filter.optionsSource: 'fixed' | 'query'
parseDimensionSelection.filter.selectionMode: 'multiple' | 'single'
parseDimensionSelection.filter.valueType: T extends number ? 'number' : 'string'
parseDimensionSelection.filter.allowMissing: boolean
parseDimensionSelection.filter.allowExclusion: boolean
parseDimensionSelection.filter.maxSelected: number
parseDimensionSelection.filter.options: readonly DimensionOption<T>[]
parseFacetOptions (function, @altertable/data-app/contract): <T extends DimensionValue>(value: unknown, filter: DimensionSelectionFilter<T>): DimensionOption<T>[] — Validate bounded facet results before showing them in a picker.
parseFacetOptions.filter.kind: 'dimension'
parseFacetOptions.filter.label: string
parseFacetOptions.filter.presentation?: (FilterPresentation & { group?: 'display' | 'scope' | undefined; }) — Display options (`displayChoice()`) change how results are shown, not which data is included.
parseFacetOptions.filter.urlKeys: readonly string[]
parseFacetOptions.filter.defaultValue: DimensionSelection<T>
parseFacetOptions.filter.clearValue?: DimensionSelection<T> — Unrestricted value, when this filter can be cleared.
parseFacetOptions.filter.describe: (value: Value): string
parseFacetOptions.filter.describe: (selection: DimensionSelection<T>, options: readonly DimensionOption<T>[]): string
parseFacetOptions.filter.history: HistoryMode
parseFacetOptions.filter.read: (params: URLSearchParams) => DimensionSelection<T>
parseFacetOptions.filter.write: (value: DimensionSelection<T>) => Record<string, string | null>
parseFacetOptions.filter.valid: (value: DimensionSelection<T>) => boolean
parseFacetOptions.filter.same: (left: DimensionSelection<T>, right: DimensionSelection<T>) => boolean
parseFacetOptions.filter.optionsSource: 'fixed' | 'query'
parseFacetOptions.filter.selectionMode: 'multiple' | 'single'
parseFacetOptions.filter.valueType: T extends number ? 'number' : 'string'
parseFacetOptions.filter.allowMissing: boolean
parseFacetOptions.filter.allowExclusion: boolean
parseFacetOptions.filter.maxSelected: number
parseFacetOptions.filter.options: readonly DimensionOption<T>[]
parseLabel (function, @altertable/data-app/contract): (value: unknown, maxLength: number): string
parseNumberSelection (function, @altertable/data-app/contract): (value: unknown, filter: NumberFilter): NumberSelection
parseNumberSelection.filter.kind: 'numberFilter'
parseNumberSelection.filter.label: string
parseNumberSelection.filter.presentation?: (FilterPresentation & { group?: 'display' | 'scope' | undefined; }) — Display options (`displayChoice()`) change how results are shown, not which data is included.
parseNumberSelection.filter.urlKeys: readonly string[]
parseNumberSelection.filter.defaultValue: NumberSelection
parseNumberSelection.filter.clearValue?: NumberSelection — Unrestricted value, when this filter can be cleared.
parseNumberSelection.filter.describe?: ((value: NumberSelection) => string)
parseNumberSelection.filter.history: HistoryMode
parseNumberSelection.filter.read: (params: URLSearchParams) => NumberSelection
parseNumberSelection.filter.write: (value: NumberSelection) => Record<string, string | null>
parseNumberSelection.filter.valid: (value: NumberSelection) => boolean
parseNumberSelection.filter.same: (left: NumberSelection, right: NumberSelection) => boolean
parseNumberSelection.filter.min?: number
parseNumberSelection.filter.max?: number
parseTrue (function, @altertable/data-app/contract): (value: unknown): true
parseTrue().valueOf: (): boolean — Returns the primitive value of the specified object.
PeriodComparison (type, @altertable/data-app-react)
PeriodComparison.kind: 'previous' [variant 1 of 2]
PeriodComparison.kind: 'period' [variant 2 of 2]
PeriodComparison.period: ReportingPeriod [variant 2 of 2]
PeriodSummary (component, @altertable/data-app-react): (props: PeriodSummaryProps) — Read-only period context for the control bar, including exact bounds for assistive technology.
PeriodSummary.period: ReportingPeriod
PeriodSummary.comparison?: PeriodComparison
PeriodSummary.className?: string
PeriodSummaryProps (type, @altertable/data-app-react): = props listed as PeriodSummary.*
PieChart (component, @altertable/data-app-react/ui): <Row extends PieChartItem>(props: PieChartProps<Row>) — Nonnegative, mutually exclusive parts; shares use the sum of supplied items. Include Other to represent the whole. Zero values remain in the legend; all-zero data shows an empty circle.
PieChart.items: readonly Row[] — Ordered samples; the chart validates IDs and values when rendering.
PieChart.itemActions?: ItemActions<Row> — Actions available for each displayed item. Domain fields remain available to this callback.
PieChart.unit: string
PieChart.ariaLabel: string
PieChart.formatValue?: ((value: number) => string)
PieChart.showLegend?: boolean — Omit the built-in key when composing a separate ChartLegend.
PieChartItem (type, @altertable/data-app-react/ui)
PieChartItem.id: string
PieChartItem.label: string
PieChartItem.value: number
PieChartProps (type, @altertable/data-app-react/ui): <Row> = props listed as PieChart.*
pluralize (function, @altertable/data-app/format): (count: number, singular: string, plural: string): string
PresentStory (component, @altertable/data-app-react/ui): (props: PresentStoryProps) — Uses an already loaded snapshot. Navigation is stored in `?present=1&step=`, and step inspection uses `?about=`. The presentation owns its modal structure.
PresentStory.title: string
PresentStory.findings: readonly StoryFinding[]
PresentStory.empty?: AboutEmpty
PresentStory.scope?: ReactNode
PresentStory.dataContext: DataContext
PresentStory.theme?: ThemeController
PresentStory.headerActions?: ReactNode
PresentStory.footer?: ReactNode
PresentStory.…: plus props inherited from React
PresentStoryProps (type, @altertable/data-app-react/ui): = props listed as PresentStory.*
QueryDefinitions (type, @altertable/data-app, @altertable/data-app/config, @altertable/data-app/contract): <Record<string, QueryDefinition>> = { readonly [x: string]: QueryDefinition; }
QueryField (type, @altertable/data-app, @altertable/data-app/config, @altertable/data-app/contract)
QueryField.type: keyof QueryValues
QueryField.nullable?: boolean
QueryParameter (type, @altertable/data-app, @altertable/data-app/config, @altertable/data-app/contract): Typed scalar, datetime-range, or dimension parameters with optional fallback values.
QueryParameter.type: 'dimension' [variant 1 of 10] — A dimension filter's `DimensionSelection`; `$name.matches(column)` is true for the rows it keeps, including missing-value and exclusion semantics.
QueryParameter.valueType: 'number' | 'string' [variant 1 of 10]
QueryParameter.nullable?: false [variants 1, 2, 3, 4, 5, 6 of 10]
QueryParameter.type: 'dateTimeRange' [variant 2 of 10]
QueryParameter.defaultValue?: { from?: string | AbsoluteOrRelativeDateTime | null | undefined; to?: string | AbsoluteOrRelativeDateTime | null | undefined; } [variant 2 of 10] — Absolute defaults may use canonical UTC ISO strings (including milliseconds) for static manifests. Snapshots hydrate them into Dates.
QueryParameter.type: 'boolean' [variants 3, 7 of 10]
QueryParameter.defaultValue?: boolean [variant 3 of 10]
QueryParameter.type: 'null' [variants 4, 8 of 10]
QueryParameter.defaultValue?: null [variants 4, 8 of 10]
QueryParameter.type: 'number' [variants 5, 9 of 10]
QueryParameter.defaultValue?: number [variant 5 of 10]
QueryParameter.type: 'string' [variants 6, 10 of 10]
QueryParameter.defaultValue?: string [variant 6 of 10]
QueryParameter.nullable: true [variants 7, 8, 9, 10 of 10]
QueryParameter.defaultValue?: boolean | null [variant 7 of 10]
QueryParameter.defaultValue?: number | null [variant 9 of 10]
QueryParameter.defaultValue?: string | null [variant 10 of 10]
QueryParameters (type, @altertable/data-app/contract): <Record<string, QueryParameterValue>> = { readonly [x: string]: QueryParameterValue; } — Parameters are scalar SQL values, never identifiers or SQL fragments.
QueryParameterValue (type, @altertable/data-app, @altertable/data-app/config, @altertable/data-app/contract): = string | number | boolean | null
QueryProjections (type, @altertable/data-app, @altertable/data-app/config, @altertable/data-app/contract): <Record<string, QueryField>> = { readonly [x: string]: QueryField; }
QueryResult (type, @altertable/data-app/contract): <Row> — Lakehouse results contain positional unknown cells; registered queries supply decoded records.
QueryResult.columns: { name: string; type?: string | undefined; }[]
QueryResult.rows: Row[]
QueryResult.queryId?: string
QueryRow (type, @altertable/data-app, @altertable/data-app/config, @altertable/data-app/contract): <Projections> = { -readonly [Name in keyof Projections]: QueryValue<Projections[Name]>; }
QueryValueType (type, @altertable/data-app, @altertable/data-app/config, @altertable/data-app/contract): = keyof QueryValues — Primitive values after decoding, independent of SQL storage types.
Radio (component, @altertable/data-app-react/ui): (props: RadioProps)
Radio.className?: string
Radio.…: plus props inherited from @react-types/shared, React, react-aria, react-aria-components
RadioGroup (component, @altertable/data-app-react/ui): (props: RadioGroupProps)
RadioGroup.children: ReactNode
RadioGroup.label: string
RadioGroup.className?: string
RadioGroup.…: plus props inherited from @react-types/shared, React, react-aria-components, react-stately
RadioGroupProps (type, @altertable/data-app-react/ui): = props listed as RadioGroup.*
RadioProps (type, @altertable/data-app-react/ui): = props listed as Radio.*
Ranking (component, @altertable/data-app-react): (props: RankingProps) — Ordered values scaled to the largest visible item, not shares of a whole.
Ranking.items: readonly RankingItem[]
Ranking.formatValue?: ((value: number) => ReactNode)
Ranking.…: plus props inherited from React
RankingItem (type, @altertable/data-app-react)
RankingItem.id: string
RankingItem.label: ReactNode
RankingItem.value: number
RankingItem.detail?: ReactNode
RankingProps (type, @altertable/data-app-react): = props listed as Ranking.*
RegisteredQuery (type, @altertable/data-app/contract): <Queries> = <Name extends keyof Queries & string, const Params extends object = {}, const Limit extends number = number>(name: Name & (true extends IsUnion<NoInfer<Name>, NoInfer<Name>> ? [ParameterNames<Queries, Name>] extends [...] ? unknown : never : unknown), params?: ExactQueryParameters<...> | undefined,…
RelativeAnchor (type, @altertable/data-app, @altertable/data-app/config, @altertable/data-app/format): = 'RELATIVE_ANCHOR_NOW' | 'RELATIVE_ANCHOR_START_OF_MONTH' | 'RELATIVE_ANCHOR_START_OF_TODAY' | 'RELATIVE_ANCHOR_START_OF_TOMORROW' | 'RELATIVE_ANCHOR_START_OF_WEEK' | 'RELATIVE_ANCHOR_START_OF_YEAR' | 'RELATIVE_ANCHOR_START_OF_YESTERDAY'
RelativeDateTime (type, @altertable/data-app, @altertable/data-app/config, @altertable/data-app/contract, @altertable/data-app/format)
RelativeDateTime.anchor: RelativeAnchor
RelativeDateTime.offset: RelativeOffset[]
RelativeOffset (type, @altertable/data-app, @altertable/data-app/config, @altertable/data-app/format)
RelativeOffset.amount: number
RelativeOffset.unit: RelativeUnit
RelativeUnit (type, @altertable/data-app, @altertable/data-app/config, @altertable/data-app/format): = 'DAY' | 'HOUR' | 'MINUTE' | 'MONTH' | 'SECOND' | 'WEEK' | 'YEAR'
ReportingPeriod (type, @altertable/data-app/contract, @altertable/data-app-react)
ReportingPeriod.kind: 'rolling' [variant 1 of 2]
ReportingPeriod.amount: number [variant 1 of 2]
ReportingPeriod.unit: 'day' | 'hour' [variant 1 of 2]
ReportingPeriod.end: string
ReportingPeriod.kind: 'calendar' [variant 2 of 2]
ReportingPeriod.start: string [variant 2 of 2]
ReportingPeriod.timeZone: string [variant 2 of 2]
resolveDateTimeRange (function, @altertable/data-app/contract): (value: DateTimeRange, now: Date): { from: Date | null; to: Date; } — UTC preview only. Backend execution owns reporting-timezone interpretation. Null start is unbounded; null end is now.
resolveDateTimeRange.value.from?: AbsoluteOrRelativeDateTime | null — Inclusive start; null or omitted means unbounded.
resolveDateTimeRange.value.to?: AbsoluteOrRelativeDateTime | null — Exclusive end; null or omitted means now.
resolveDateTimeRange.now.…: plus props inherited from built-in
ResolvedDateTimeRange (type, @altertable/data-app/contract): Bounded, resolved wall-clock dates encoded in UTC, with an exclusive end.
ResolvedDateTimeRange.from: Date
ResolvedDateTimeRange.to: Date
RetentionChart (component, @altertable/data-app-react/ui): (props: RetentionChartProps) — Query-defined retention curves with count inspection and dotted incomplete periods. Rates are not recomputed from counts. Compose inside VisualizationWidget.
RetentionChart.ariaLabel: string — Accessible measure and scope description.
RetentionChart.unit: string — Population unit, such as users or sessions.
RetentionChart.formatValue?: ((value: number) => string) — Formats counts; rates use percentage formatting.
RetentionChart.className?: string
RetentionChart.horizontalGrid?: boolean — Draw horizontal grid lines behind the plotted values.
RetentionChart.series: readonly RetentionChartSeries[]
RetentionChart.interactiveLegend?: boolean — Disable legend hover and focus controls.
RetentionChartPoint (type, @altertable/data-app-react/ui)
RetentionChartPoint.offset: number — Nonnegative integer, unique per series; uneven offsets retain their distance.
RetentionChartPoint.label: string — Must agree across series for the same offset.
RetentionChartPoint.rate: number | null — Observed retention fraction in [0, 1], or null for an unobserved period.
RetentionChartPoint.retainedCount: number | null — Finite count in [0, cohortSize]; null exactly when rate is null.
RetentionChartPoint.incomplete?: boolean — Observed but still accumulating; drawn as a dotted tail.
RetentionChartProps (type, @altertable/data-app-react/ui): = props listed as RetentionChart.*
RetentionChartSeries (type, @altertable/data-app-react/ui)
RetentionChartSeries.id: string — Unique, nonblank cohort or segment ID.
RetentionChartSeries.label: string
RetentionChartSeries.cohortSize: number — Finite, nonnegative starting population.
RetentionChartSeries.points: readonly RetentionChartPoint[]
ScatterChart (component, @altertable/data-app-react/ui): (props: ScatterChartProps) — Independent finite X/Y observations on linear axes that include zero. Negative and constant coordinates are supported.
ScatterChart.horizontalGrid?: boolean — Draw horizontal grid lines behind the plotted values.
ScatterChart.items: readonly ScatterChartItem[]
ScatterChart.xLabel: string
ScatterChart.yLabel: string
ScatterChart.xUnit: string
ScatterChart.yUnit: string
ScatterChart.ariaLabel: string
ScatterChart.formatX?: ((value: number) => string)
ScatterChart.formatY?: ((value: number) => string)
ScatterChartItem (type, @altertable/data-app-react/ui): Independent observation on two finite numeric axes.
ScatterChartItem.id: string
ScatterChartItem.label: string
ScatterChartItem.x: number
ScatterChartItem.y: number
ScatterChartProps (type, @altertable/data-app-react/ui): = props listed as ScatterChart.*
SearchAttribute (type, @altertable/data-app-react/ui): <Item>
SearchAttribute.name: string
SearchAttribute.getter: (item: Item) => string
SearchAttribute.weight?: number
SearchField (component, @altertable/data-app-react/ui): (props: SearchFieldProps) — The caller owns filtering, URL state, and whether search runs while typing or on submit. Escape and Clear reset the query.
SearchField.label: string
SearchField.value: string
SearchField.onChange: (value: string) => void
SearchField.onSubmit?: ((value: string) => void)
SearchField.placeholder?: string
SearchField.showLabel?: boolean
SearchField.focusShortcut?: boolean — Enable page search shortcuts on one primary search field per app.
SearchField.size?: 'compact' | 'default'
SearchField.description?: ReactNode
SearchField.status?: ReactNode
SearchField.busy?: boolean
SearchField.resetValue?: string
SearchField.inputProps?: Omit<DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, 'children' | 'type' | 'value'>
SearchField.children?: ReactNode
SearchField.…: plus props inherited from React
SearchFieldProps (type, @altertable/data-app-react/ui): = props listed as SearchField.*
searchFilter (function, @altertable/data-app/contract): (options: Omit<ScalarFilterOptions, 'presentation'> & { maxLength?: number; }): SearchFilter — Search query state; typing replaces history by default. Operations reject text longer than `maxLength` (200 by default).
searchFilter.options.label?: string
searchFilter.options.key: string
searchFilter.options.defaultValue?: string
searchFilter.options.history?: HistoryMode
searchFilter.options.maxLength?: number
SearchFilter (type, @altertable/data-app/contract)
SearchFilter.kind: 'search'
SearchFilter.label?: string
SearchFilter.presentation?: (FilterPresentation & { group?: 'display' | 'scope' | undefined; }) — Display options (`displayChoice()`) change how results are shown, not which data is included.
SearchFilter.urlKeys: readonly string[]
SearchFilter.defaultValue: string
SearchFilter.clearValue?: string — Unrestricted value, when this filter can be cleared.
SearchFilter.describe?: ((value: string) => string)
SearchFilter.history: HistoryMode
SearchFilter.read: (params: URLSearchParams) => string
SearchFilter.write: (value: string) => Record<string, string | null>
SearchFilter.valid: (value: string) => boolean
SearchFilter.same: (left: string, right: string) => boolean
SearchHit (type, @altertable/data-app-react/ui): <Item>
SearchHit.item: Item
SearchHit.score: number
SearchHit.matches: Record<string, SearchMatchValue> — Render displayed fields with <SearchMatch match={hit.matches.fieldName} />.
searchItems (function, @altertable/data-app-react/ui): <Item>(items: readonly Item[], query: string, options: SearchItemsOptions<Item>): SearchHit<Item>[] — Search only a complete local collection. Empty queries retain every item.
searchItems.options.attributes: readonly [SearchAttribute<Item>, ...SearchAttribute<Item>[]]
searchItems.options.mode?: 'fuzzy' | 'literal' — Literal filtering preserves source order; fuzzy search ranks discovery results.
searchItems.options.limit?: number
searchItems.options.fuzzyThreshold?: number
SearchItemsOptions (type, @altertable/data-app-react/ui): <Item> = props listed as searchItems.options.*
SearchMatch (component, @altertable/data-app-react/ui): (props: SearchMatchProps)
SearchMatch.match: SearchMatchValue
SearchMatch.…: plus props inherited from React
SearchMatchProps (type, @altertable/data-app-react/ui): = props listed as SearchMatch.*
SearchMatchValue (type, @altertable/data-app-react/ui): The exact displayed text and its offsets stay together for safe rendering.
SearchMatchValue.text: string
SearchMatchValue.ranges: readonly SearchRange[]
SearchRange (type, @altertable/data-app-react/ui)
SearchRange.start: number
SearchRange.end: number
SearchSuggestion (type, @altertable/data-app-react/ui)
SearchSuggestion.id: string
SearchSuggestion.title: string
SearchSuggestion.description?: string
SearchSuggestion.onSelect?: (() => void) — Override completing the query with this title, for example to open record details.
SearchTypeahead (component, @altertable/data-app-react/ui): (props: SearchTypeaheadProps) — An editable combobox with manual selection: typing searches, selecting completes the query unless overridden.
SearchTypeahead.label: string
SearchTypeahead.value: string
SearchTypeahead.onChange: (value: string) => void
SearchTypeahead.onSubmit?: ((value: string) => void)
SearchTypeahead.placeholder?: string
SearchTypeahead.showLabel?: boolean
SearchTypeahead.focusShortcut?: boolean — Enable page search shortcuts on one primary search field per app.
SearchTypeahead.size?: 'compact' | 'default'
SearchTypeahead.description?: ReactNode
SearchTypeahead.status?: ReactNode
SearchTypeahead.busy?: boolean
SearchTypeahead.resetValue?: string
SearchTypeahead.inputProps?: Omit<DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, 'children' | 'type' | 'value'>
SearchTypeahead.children?: ReactNode
SearchTypeahead.items: readonly SearchSuggestion[] — Suggestions from the displayed result, in its order. No additional filtering or request.
SearchTypeahead.…: plus props inherited from React
SearchTypeaheadProps (type, @altertable/data-app-react/ui): = props listed as SearchTypeahead.*
SectionHeading (component, @altertable/data-app-react, @altertable/data-app-react/ui): (props: SectionHeadingProps) — A section title with the shared section-heading appearance.
SectionHeading.children: ReactNode
SectionHeading.level?: 2 | 3 | 4 | 5 | 6 — Document outline level. Defaults to the section level below the page title.
SectionHeading.…: plus props inherited from React
SectionHeadingProps (type, @altertable/data-app-react, @altertable/data-app-react/ui): = props listed as SectionHeading.*
SegmentedControl (component, @altertable/data-app-react/ui): (props: SegmentedControlProps) — A compact radio group; arrow keys follow standard radio selection behavior.
SegmentedControl.label: string
SegmentedControl.className?: string
SegmentedControl.options: readonly ChoiceOption[]
SegmentedControl.…: plus props inherited from @react-types/shared, React, react-aria-components, react-stately
SegmentedControlProps (type, @altertable/data-app-react/ui): = props listed as SegmentedControl.*
Select (component, @altertable/data-app-react/ui): (props: SelectProps) — Labeled single selection with keyboard navigation and a styled listbox.
Select.label: string
Select.labelPlacement?: ControlLabelPlacement
Select.icon?: 'annotate' | 'breakdown' | 'calendar' | 'cancel' | 'check' | 'clearFilters' | 'clock' | 'close' | 'copy' | 'darkTheme' | 'disclosure' | 'displayOptions' | 'error' | 'explore' | ... 23 more ... — Replace the inline text label with a decorative icon; the accessible label remains.
Select.size?: 'compact' | 'default'
Select.options: readonly ChoiceOption[]
Select.value: string
Select.onChange: (value: string) => void
Select.disabled?: boolean
Select.required?: boolean
Select.name?: string
Select.id?: string
Select.className?: string
Select.align?: 'end' | 'start' — Align the popup with the selection button. Defaults to start.
SelectProps (type, @altertable/data-app-react/ui): = props listed as Select.*
serializeDateTimeRange (function, @altertable/data-app/contract): (value: DateTimeRange): string — Canonical URL/JSON representation. Dates retain their encoded UTC fields.
serializeDateTimeRange.value.from?: AbsoluteOrRelativeDateTime | null — Inclusive start; null or omitted means unbounded.
serializeDateTimeRange.value.to?: AbsoluteOrRelativeDateTime | null — Exclusive end; null or omitted means now.
Sheet (component, @altertable/data-app-react/ui): (props: SheetProps) — Uses the native dialog top layer and focus trap. Closing keeps the modal mounted until its exit transition completes.
Sheet.open: boolean
Sheet.onOpenChange: (open: boolean) => void
Sheet.title: ReactNode
Sheet.description?: ReactNode
Sheet.children: ReactNode
Sheet.headerActions?: ReactNode
Sheet.footer?: ReactNode
Sheet.wide?: boolean
Sheet.placement?: 'center' | 'side'
Sheet.side?: 'left' | 'right' — Edge for side placement. Defaults to right; small screens use a bottom sheet.
Sheet.returnFocus?: RefObject<HTMLElement | SVGElement | null>
Sheet.…: plus props inherited from React
SheetProps (type, @altertable/data-app-react/ui): = props listed as Sheet.*
ShimmerText (component, @altertable/data-app-react/ui): (props: ShimmerTextProps) — Animated text for custom activity labels. Wrap in `<output>` to announce updates. Respects reduced motion.
ShimmerText.children: string
ShimmerText.…: plus props inherited from React
ShimmerTextProps (type, @altertable/data-app-react/ui): = props listed as ShimmerText.*
Skeleton (component, @altertable/data-app-react): (props: SkeletonProps) — Decorative loading placeholder that fades in only when loading takes a moment. Put the accessible status on its container.
Skeleton.inline?: boolean — Align a text-sized placeholder with surrounding prose.
Skeleton.…: plus props inherited from React
SkeletonProps (type, @altertable/data-app-react): = props listed as Skeleton.*
Stack (component, @altertable/data-app-react): (props: StackProps) — Vertical layout for peer sections or request boundaries, with the page's section gap.
Stack.children: ReactNode
Stack.gap?: 'lg' | 'md' | 'sm'
Stack.…: plus props inherited from React
StackProps (type, @altertable/data-app-react): = props listed as Stack.*
StoryFinding (type, @altertable/data-app-react/ui): One consequential, inspectable finding from the displayed result.
StoryFinding.id: string
StoryFinding.headline: string
StoryFinding.context?: string
StoryFinding.visual: ReactNode
StoryFinding.visualKind?: 'chart' | 'metric'
StoryFinding.evidence: MetricDefinition | WidgetEvidence
Tab (component, @altertable/data-app-react/ui): (props: ComponentPropsWithRef<typeof import('react-aria-components/Tabs').Tab>)
Tab.…: plus props inherited from @react-types/shared, React, react-aria-components
TableIdentifier (type, @altertable/data-app-react)
TableIdentifier.catalog: string
TableIdentifier.schema: string
TableIdentifier.name: string
TableWidget (component, @altertable/data-app-react): <Row, Data, Input>(props: TableWidgetProps<Row, Data, Input>)
TableWidget.headingLevel?: 2 | 3 | 4 | 5 | 6
TableWidget.annotationId?: string
TableWidget.showCount?: boolean — Show the matching supplied-row count before pagination or limits. Defaults to true.
TableWidget.count?: number — Override the derived count, for example with a server total. Hidden when showCount is false or loading.
TableWidget.onClearFilters?: (() => void) — Clear only filters affecting this dataset. Supply only while those filters are active; enables empty-result recovery.
TableWidget.description?: ReactNode
TableWidget.status?: WidgetStatus
TableWidget.action?: ReactNode
TableWidget.search?: TableWidgetSearch<Row>
TableWidget.noMatchesFallback?: EmptyContent — No local search matches or explicitly filtered results. Defaults to “No matching results” with recovery guidance.
TableWidget.skeletonRows?: number
TableWidget.limit: number [variant 1 of 2] — Positive integer preview cap after search; disables pagination.
TableWidget.dataset: Dataset<Data, Input, Row>
TableWidget.source: ViewSource<NoInfer<Data>, NoInfer<Input>>
TableWidget.title?: ReactNode
TableWidget.actions?: ExplorationActions<NoInfer<Row>, NoInfer<Input>>
TableWidget.pagination?: false | { pageSize: number; } [variant 2 of 2] — Local pagination after search: 10 rows by default, false shows all supplied rows. pageSize must be a positive integer. Counts refer only to supplied rows.
TableWidget.…: plus props inherited from React
TableWidget (component, @altertable/data-app-react/ui): <Row>(props: TableWidgetProps<Row>)
TableWidget.title: ReactNode
TableWidget.headingLevel?: 2 | 3 | 4 | 5 | 6
TableWidget.annotationId?: string
TableWidget.showCount?: boolean — Show the matching supplied-row count before pagination or limits. Defaults to true.
TableWidget.count?: number — Override the derived count, for example with a server total. Hidden when showCount is false or loading.
TableWidget.onClearFilters?: (() => void) — Clear only filters affecting this dataset. Supply only while those filters are active; enables empty-result recovery.
TableWidget.description?: ReactNode
TableWidget.columns: readonly [TableWidgetColumn<Row>, ...TableWidgetColumn<Row>[]]
TableWidget.rowKey: (row: Row) => string | number — Unique, nonempty row identity. Numeric keys must be finite; 1 and "1" collide.
TableWidget.status?: WidgetStatus
TableWidget.action?: ReactNode
TableWidget.evidence?: WidgetEvidence [variants 1, 3 of 4]
TableWidget.search?: TableWidgetSearch<Row>
TableWidget.emptyFallback: EmptyContent — Valid result with no rows; the header remains visible.
TableWidget.noMatchesFallback?: EmptyContent — No local search matches or explicitly filtered results. Defaults to “No matching results” with recovery guidance.
TableWidget.limit: number [variants 1, 2 of 4] — Positive integer preview cap after search; disables pagination.
TableWidget.rows: readonly Row[] [variants 1, 3 of 4]
TableWidget.evidence: (WidgetEvidence | undefined) & WidgetEvidence [variants 2, 4 of 4]
TableWidget.reading: DataReading<readonly Row[]> [variants 2, 4 of 4]
TableWidget.skeletonRows?: number [variants 2, 4 of 4]
TableWidget.pagination?: false | { pageSize: number; } [variants 3, 4 of 4] — Local pagination after search: 10 rows by default, false shows all supplied rows. pageSize must be a positive integer. Counts refer only to supplied rows.
TableWidget.…: plus props inherited from React
TableWidgetColumn (type, @altertable/data-app-react/ui): <Row>
TableWidgetColumn.id: string — Stable, nonempty identity; unique within this table.
TableWidgetColumn.header: ReactNode
TableWidgetColumn.type?: 'datetime' | 'number'
TableWidgetColumn.cell: (row: Row, hit?: SearchHit<Row> | undefined) => ReactNode — Render this column's value for one row. The table owns its cell element and semantics.
TableWidgetProps (type, @altertable/data-app-react): <Row, Data, Input> = props listed as TableWidget.*
TableWidgetProps (type, @altertable/data-app-react/ui): <Row> = props listed as TableWidget.* — Composes VisualizationWidget with DataTable, search, and local pagination. Columns own header and body semantics; the first column is the row header.
TableWidgetSearch (type, @altertable/data-app-react): <Row>
TableWidgetSearch.label: string
TableWidgetSearch.value: string
TableWidgetSearch.onChange: (value: string) => void
TableWidgetSearch.placeholder?: string
TableWidgetSearch.resetValue?: string
TableWidgetSearch.inputProps?: Omit<DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, 'children' | 'type' | 'value'>
TableWidgetSearch.attributes: readonly [SearchAttribute<Row>, ...SearchAttribute<Row>[]]
TableWidgetSearch.mode?: 'fuzzy' | 'literal' — Literal filtering preserves source order; fuzzy search ranks discovery results.
TableWidgetSearch.fuzzyThreshold?: number
TabList (component, @altertable/data-app-react/ui): <T>(props: TabListProps<T> & RefAttributes<HTMLDivElement>)
TabList.…: plus props inherited from @react-types/shared, React, react-aria-components
TabPanel (component, @altertable/data-app-react/ui): (props: ComponentPropsWithRef<typeof import('react-aria-components/Tabs').TabPanel>)
TabPanel.…: plus props inherited from @react-types/shared, React, react-aria, react-aria-components
TabPanels (function, @altertable/data-app-react/ui): <T>(props: TabPanelsProps<T> & React.RefAttributes<HTMLDivElement>): ReactElement<unknown, string | JSXElementConstructor<any>> | null — Groups multiple `<TabPanel>` elements, and provides CSS variables for animated transitions.
TabPanels.props.…: plus props inherited from @react-types/shared, React, react-aria-components
Tabs (component, @altertable/data-app-react/ui): (props: ComponentPropsWithRef<typeof import('react-aria-components/Tabs').Tabs>)
Tabs.…: plus props inherited from @react-types/shared, React, react-aria, react-aria-components, react-stately
TextContent (component, @altertable/data-app-react): (props: TextContentProps) — Prose typography for page introductions, widget bodies, and inspection content.
TextContent.…: plus props inherited from React
TextContentProps (type, @altertable/data-app-react): <HTMLAttributes<HTMLDivElement>, HTMLDivElement>
TextContentProps.…: plus props inherited from React
TextWidget (component, @altertable/data-app-react): <Data, Input, Row>(props: TextWidgetProps<Data, Input, Row>)
TextWidget.headingLevel?: 2 | 3 | 4 | 5 | 6 — Document outline level. The widget title keeps the shared widget-heading appearance.
TextWidget.annotationId?: string — Unique stable target for persisted feedback; overrides automatic evidence identity.
TextWidget.count?: number — Result count beside the heading. Derive from the displayed result; zero is visible.
TextWidget.description?: ReactNode
TextWidget.records?: InspectionRecords — Lazy detail records rendered as the first inspection tab.
TextWidget.action?: ReactNode
TextWidget.status?: WidgetStatus — Reserved feedback slot; retain displayed content while refreshing or after failure.
TextWidget.footer?: ReactNode
TextWidget.metric: Metric<Data, Input> [variant 1 of 2]
TextWidget.source: ViewSource<NoInfer<Data>, NoInfer<Input>>
TextWidget.children?: ((values: MetricValues) => ReactNode) [variant 1 of 2]
TextWidget.title?: ReactNode
TextWidget.dataset: Dataset<Data, Input, Row> [variant 2 of 2]
TextWidget.children: (rows: readonly Row[]) => ReactNode [variant 2 of 2]
TextWidget.…: plus props inherited from React
TextWidget (component, @altertable/data-app-react/ui): <Data>(props: TextWidgetProps<Data>)
TextWidget.title: ReactNode
TextWidget.headingLevel?: 2 | 3 | 4 | 5 | 6 — Document outline level. The widget title keeps the shared widget-heading appearance.
TextWidget.annotationId?: string — Unique stable target for persisted feedback; overrides automatic evidence identity.
TextWidget.count?: number — Result count beside the heading. Derive from the displayed result; zero is visible.
TextWidget.description?: ReactNode
TextWidget.evidence: (WidgetEvidence | undefined) & WidgetEvidence [variant 1 of 2]
TextWidget.records?: InspectionRecords — Lazy detail records rendered as the first inspection tab.
TextWidget.action?: ReactNode
TextWidget.status?: WidgetStatus — Reserved feedback slot; retain displayed content while refreshing or after failure.
TextWidget.footer?: ReactNode
TextWidget.emptyFallback?: EmptyContent
TextWidget.reading: DataReading<Data> [variant 1 of 2]
TextWidget.children: (data: Data) => ReactNode [variant 1 of 2]
TextWidget.evidence?: WidgetEvidence [variant 2 of 2]
TextWidget.children: ReactNode [variant 2 of 2]
TextWidget.…: plus props inherited from React
TextWidgetProps (type, @altertable/data-app-react): <Data, Input, Row> = props listed as TextWidget.*
TextWidgetProps (type, @altertable/data-app-react/ui): <Data> = props listed as TextWidget.* — Narrative sibling of VisualizationWidget, composing DataWidget with TextContent. Use TextContent directly for borderless prose. Bind claims and scope to the same displayed reading.
Theme (type, @altertable/data-app/appearance): = 'dark' | 'light' — Appearance configured by app authors.
ThemePreference (type, @altertable/data-app/appearance): = 'system' | Theme
Tooltip (component, @altertable/data-app-react, @altertable/data-app-react/ui): (props: TooltipProps) — Supplemental, non-interactive description for one already labeled control. Supply a single child that forwards aria-describedby to its focusable DOM element.
Tooltip.content: ReactNode
Tooltip.children: ReactNode
Tooltip.variant?: 'chart' | 'hint'
Tooltip.onOpenChange?: ((open: boolean) => void)
Tooltip.align?: 'center' | 'end' | 'start'
Tooltip.placement?: 'bottom' | 'top'
Tooltip.followCursor?: boolean — Set false to keep a chart tooltip at its entry position while hovering one sample.
Tooltip.portalRoot?: RefObject<HTMLElement | null>
Tooltip.…: plus props inherited from React
TooltipProps (type, @altertable/data-app-react, @altertable/data-app-react/ui): = props listed as Tooltip.*
TooltipProvider (component, @altertable/data-app-react, @altertable/data-app-react/ui): (props: TooltipProviderProps) — Delay the first hover, then open nearby tooltips without waiting during the skip window. Keyboard focus always opens immediately. AppLayout provides this by default.
TooltipProvider.children: ReactNode
TooltipProvider.delay?: number
TooltipProvider.skipDelayDuration?: number
TooltipProviderProps (type, @altertable/data-app-react, @altertable/data-app-react/ui): = props listed as TooltipProvider.*
UpdatedAt (component, @altertable/data-app-react): (props: UpdatedAtProps)
UpdatedAt.timestamp: number
UpdatedAt.locale?: string
UpdatedAt.label?: string
UpdatedAt.children?: ReactNode
UpdatedAt.placement?: Placement
UpdatedAt.portalRoot?: RefObject<HTMLElement | null>
UpdatedAt.triggerProps?: HelpPopoverTriggerProps
UpdatedAt.panelProps?: HelpPopoverPanelProps
UpdatedAt.open?: boolean
UpdatedAt.onOpenChange?: ((open: boolean) => void)
UpdatedAt.timeZone?: string
UpdatedAtProps (type, @altertable/data-app-react): = props listed as UpdatedAt.*
useAppFilters (hook, @altertable/data-app-react/ui): <const Collection extends FilterCollection>(definitions: Collection): { values: FilterValues<Collection>; calendarRevision: number; set: <Key extends keyof Collection & string>(name: Key, value: FilterValues<Collection>[Key]) => void; ... 4 more ...; bind: <Key extends keyof Collection & string>(na… — URL is the source of truth for app filters; one update can change dependent values atomically.
useChartCursorGroup (hook, @altertable/data-app-react/ui): (): ChartCursorGroup — Creates a stable shared mouse-hover cursor handle. Pass it explicitly to each participating chart's cursorGroup prop. Peers indicate exact timestamp matches while tooltips remain local.
useDateFormatting (hook, @altertable/data-app-react, @altertable/data-app-react/ui): (options: {…}): { locale: string; timeZone: string; } — Resolve date display defaults for custom charts and narrative. Explicit options override the view and app.
useDateFormatting.options.locale?: string
useDateFormatting.options.timeZone?: string
useDetailNavigation (hook, @altertable/data-app-react): (): DetailNavigation — Resolve a detail target from an interaction. The destination validates input before fetching.
useSvgId (hook, @altertable/data-app-react/ui): (): string — Stable React ID for SVG definitions and their URL references; safe with identifier prefixes.
useViewTab (hook, @altertable/data-app-react/ui): <View extends string>(views: readonly View[], fallback: View): [View, (key: string | number) => void] — Keep a page-level tab in `?view=`; reserve `?tab=` for the inspect sheet.
ViewSource (type, @altertable/data-app-react): <Data, Input> — A view's displayed data and input, or its loading state; widgets and bindings read it.
ViewSource.loading: true [variant 1 of 2]
ViewSource.loading?: false [variant 2 of 2]
ViewSource.data: Data [variant 2 of 2]
ViewSource.input: Input [variant 2 of 2]
VisualizationWidget (component, @altertable/data-app-react): <Row, Data, Input>(props: VisualizationWidgetProps<Row, Data, Input>)
VisualizationWidget.skeleton?: SkeletonContent
VisualizationWidget.headingLevel?: 2 | 3 | 4 | 5 | 6 — Document outline level. The widget title keeps the shared widget-heading appearance.
VisualizationWidget.annotationId?: string — Unique stable target for persisted feedback; overrides automatic evidence identity.
VisualizationWidget.count?: number — Result count beside the heading. Derive from the displayed result; zero is visible.
VisualizationWidget.description?: ReactNode
VisualizationWidget.records?: InspectionRecords — Lazy detail records rendered as the first inspection tab.
VisualizationWidget.action?: ReactNode
VisualizationWidget.status?: WidgetStatus — Reserved feedback slot; retain displayed content while refreshing or after failure.
VisualizationWidget.footer?: ReactNode — Footer controls, such as table pagination.
VisualizationWidget.children: (rows: readonly Row[], actions: ItemActions<Row>) => ReactNode [variant 1 of 2]
VisualizationWidget.dataset: Dataset<Data, Input, Row>
VisualizationWidget.source: ViewSource<NoInfer<Data>, NoInfer<Input>>
VisualizationWidget.title?: ReactNode
VisualizationWidget.actions?: ExplorationActions<NoInfer<Row>, NoInfer<Input>>
VisualizationWidget.breakdown?: BreakdownTarget<any>
VisualizationWidget.views: readonly VisualizationWidgetView<Row>[] [variant 2 of 2]
VisualizationWidget.viewLabel: string [variant 2 of 2]
VisualizationWidget.initialView?: string [variant 2 of 2]
VisualizationWidget.…: plus props inherited from React
VisualizationWidget (component, @altertable/data-app-react/ui): <Data>(props: VisualizationWidgetProps<Data>) — Compose an unframed visual with the shared heading and inspection.
VisualizationWidget.title: ReactNode
VisualizationWidget.headingLevel?: 2 | 3 | 4 | 5 | 6 — Document outline level. The widget title keeps the shared widget-heading appearance.
VisualizationWidget.annotationId?: string — Unique stable target for persisted feedback; overrides automatic evidence identity.
VisualizationWidget.count?: number — Result count beside the heading. Derive from the displayed result; zero is visible.
VisualizationWidget.description?: ReactNode
VisualizationWidget.evidence?: (Omit<AboutSubject, 'description' | 'id' | 'references' | 'title' | 'visual' | 'visualKind'> & { id: string; } & { glossaryIds: [string, ...string[]]; queryNames?: string[] | undefined; }) | (Omit<...> & ... 1 more ... & { ...; }) | (Omit<...> & ... 2 more ... & { ...; }) | (Omit<...> & ... 2 more… [variants 1, 2 of 4]
VisualizationWidget.records?: InspectionRecords — Lazy detail records rendered as the first inspection tab.
VisualizationWidget.action?: ReactNode
VisualizationWidget.status?: WidgetStatus — Reserved feedback slot; retain displayed content while refreshing or after failure.
VisualizationWidget.emptyFallback?: EmptyContent
VisualizationWidget.footer?: ReactNode — Footer controls, such as table pagination.
VisualizationWidget.loading: true [variant 1 of 4]
VisualizationWidget.loadingContent?: ReactNode [variant 1 of 4]
VisualizationWidget.loading?: false [variant 2 of 4]
VisualizationWidget.visual: ReactNode [variant 2 of 4]
VisualizationWidget.evidence: ((Omit<AboutSubject, 'description' | 'id' | 'references' | 'title' | 'visual' | 'visualKind'> & { id: string; } & { glossaryIds: [string, ...string[]]; queryNames?: string[] | undefined; }) | (Omit<...> & ... 1 more ... & { ...; }) | (Omit<...> & ... 2 more ... & { ...; }) | (Omit<...> & ... 2 more… [variants 3, 4 of 4]
VisualizationWidget.reading: DataReading<Data> [variants 3, 4 of 4]
VisualizationWidget.isEmpty: (data: Data) => boolean [variants 3, 4 of 4]
VisualizationWidget.skeleton?: SkeletonContent [variants 3, 4 of 4]
VisualizationWidget.children: (data: Data) => ReactNode [variant 3 of 4]
VisualizationWidget.views: readonly VisualizationWidgetView<Data>[] [variant 4 of 4]
VisualizationWidget.viewLabel: string [variant 4 of 4]
VisualizationWidget.initialView?: string [variant 4 of 4] — An existing view ID; defaults to the first view. Validated while loading too.
VisualizationWidget.…: plus props inherited from React
VisualizationWidgetProps (type, @altertable/data-app-react): <Row, Data, Input> = props listed as VisualizationWidget.*
VisualizationWidgetProps (type, @altertable/data-app-react/ui): <Data> = props listed as VisualizationWidget.* — DataWidget frame for charts, DataTable, metrics, or a custom data display. Owns alternate-view selection and shares it with inspection.
VisualizationWidgetView (type, @altertable/data-app-react): <Row>
VisualizationWidgetView.id: string — Stable, nonempty identity; unique within this widget.
VisualizationWidgetView.label: ReactNode
VisualizationWidgetView.render: (rows: readonly Row[], actions: ItemActions<Row>) => ReactNode
WidgetEvidence (type, @altertable/data-app-react)
WidgetEvidence.empty?: AboutEmpty
WidgetEvidence.dataContext?: DataContext
WidgetEvidence.queries?: DisclosedQuery[]
WidgetEvidence.records?: InspectionRecords
WidgetEvidence.id: string
WidgetEvidence.glossaryIds: [string, ...string[]] [variant 1 of 2]
WidgetEvidence.queryNames?: string[] [variant 1 of 2]
WidgetEvidence.queryNames: [string, ...string[]] [variant 2 of 2]
WidgetEvidence.glossaryIds?: string[] [variant 2 of 2]
WidgetStatus (type, @altertable/data-app-react/ui): Idle keeps the same reserved space as refresh and failure. Initial loading belongs to skeletons.
WidgetStatus.kind: 'idle' [variant 1 of 3]
WidgetStatus.kind: 'updating' [variant 2 of 3]
WidgetStatus.message?: string [variants 2, 3 of 3]
WidgetStatus.kind: 'error' [variant 3 of 3]
WidgetStatus.onRetry?: (() => void) [variant 3 of 3]
WithFilterInput (type, @altertable/data-app/contract): <Filters, Input> = keyof Filters extends never ? Input : FilterInput<Filters> & Input — The full input of an operation with its own fields and optional filters.
```
