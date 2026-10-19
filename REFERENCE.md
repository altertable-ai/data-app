# @altertable/data-app API reference

Generated from the published type declarations by `bun run build`; do not
edit. Each of the 417 public exports has one heading line, then
one line per prop, option, or field, so one search returns everything about a
name:

- `rg '^LineChart\b' REFERENCE.md` prints `LineChart` and its props.
- `rg '^LineChart' REFERENCE.md` adds `LineChartItem` and `LineChartProps`.
- `rg '@altertable/data-app-react/ui[,)]' REFERENCE.md` lists one entry point.

Line shapes:

- `Name (kind, import specifiers): signature or type — JSDoc summary`. A name
  exported by two entry points as different values, such as `DataApp`, has
  one heading per entry point.
- `Name.prop: Type` is required; `Name.prop?: Type` is optional. Component
  props follow the component name. Other functions add the parameter name.
- `[variant 2 of 3]` marks a prop that only some branches of a union accept.
- `= props listed as Name.*` points from a props type to its component.

Hosted apps must pass the required `defineDataApp.config.scope`,
`DataApp.story`, and `DataApp.datasets` from `@altertable/data-app-react`.

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
AnnotationBar (component, @altertable/data-app-react): (props: AnnotationBarProps) — Host-owned batch controls. Collection changes and agent submission stay with the outer app.
AnnotationBar.ref?: Ref<AnnotationBarHandle>
AnnotationBar.annotations: readonly DataAppAnnotationDraft[]
AnnotationBar.active?: boolean
AnnotationBar.theme?: Theme
AnnotationBar.disabled?: boolean
AnnotationBar.deletedAnnotationId?: string
AnnotationBar.onUndoDelete?: ((id: string) => void)
AnnotationBar.onDismissUndo?: (() => void)
AnnotationBar.hasUnsavedChanges?: boolean
AnnotationBar.pinsVisible: boolean
AnnotationBar.onPinsVisibleChange: (visible: boolean) => void
AnnotationBar.onSelect: (id: string) => void
AnnotationBar.onDelete: (id: string) => void
AnnotationBar.onClear: () => void
AnnotationBar.requestDiscard?: ((discard: () => void) => void) — Let host apps use their existing confirmation dialog.
AnnotationBar.onSend: (annotations: readonly DataAppAnnotationDraft[]) => Promise<void> — Resolve only after the outer application's agent API accepts this snapshot.
AnnotationBar.onClose: () => void
AnnotationBarHandle (type, @altertable/data-app-react)
AnnotationBarHandle.send: () => Promise<void> — Submit through the same guards, pending state, and retry feedback as the Send button.
AnnotationBarProps (type, @altertable/data-app-react): = props listed as AnnotationBar.*
annotationDraftRoute (const, @altertable/data-app/contract): MessageRoute<DataAppAnnotationDraft, null>
annotationDraftRoute.input: (value: unknown) => DataAppAnnotationDraft
annotationDraftRoute.output: (value: unknown, input: DataAppAnnotationDraft) => null
annotationEditorStateRoute (const, @altertable/data-app/contract): MessageRoute<{ hasUnsavedChanges: boolean; }, null>
annotationEditorStateRoute.input: (value: unknown) => { hasUnsavedChanges: boolean; }
annotationEditorStateRoute.output: (value: unknown, input: { hasUnsavedChanges: boolean; }) => null
annotationModeRoute (const, @altertable/data-app/contract): MessageRoute<{ active: boolean; }, null> — A controlled shell acknowledges local exits (for example Escape).
annotationModeRoute.input: (value: unknown) => { active: boolean; }
annotationModeRoute.output: (value: unknown, input: { active: boolean; }) => null
annotationSendRoute (const, @altertable/data-app/contract): MessageRoute<null, null> — Request host-owned batch submission without transferring ownership of drafts.
annotationSendRoute.input: (value: unknown) => null
annotationSendRoute.output: (value: unknown, input: null) => null
AnnotationTarget (component, @altertable/data-app-react): (props: AnnotationTargetProps) — A stable feedback target for app-owned content outside the built-in widgets.
AnnotationTarget.annotationId: string
AnnotationTarget.label: string
AnnotationTarget.evidence?: WidgetEvidence
AnnotationTarget.…: plus props inherited from React
AnnotationTargetProps (type, @altertable/data-app-react): = props listed as AnnotationTarget.*
annotationUpdateRoute (const, @altertable/data-app/contract): MessageRoute<{ id: string; comment: string; }, null>
annotationUpdateRoute.input: (value: unknown) => { id: string; comment: string; }
annotationUpdateRoute.output: (value: unknown, input: { id: string; comment: string; }) => null
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
AppFilePreview (type, @altertable/data-app-bun/preview)
AppFilePreview.url: URL
AppFilePreview.stop: () => Promise<void> — Stop serving, close reload connections, and release all file watchers.
AppFilePreviewOptions (type, @altertable/data-app-bun/preview): = props listed as serveAppFile.options.*
AppIcon (function, @altertable/data-app-react/ui): (options: AppIconProps): FunctionComponentElement<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>
AppIcon.options.name: 'annotate' | 'breakdown' | 'calendar' | 'cancel' | 'check' | 'clearFilters' | 'clock' | 'close' | 'copy' | 'darkTheme' | 'disclosure' | 'displayOptions' | 'error' | 'explore' | ... 22 more ... | 'wrap'
AppIcon.options.size?: string | number
AppIcon.options.…: plus props inherited from lucide-react, React
AppIconName (type, @altertable/data-app-react/ui): = 'annotate' | 'breakdown' | 'calendar' | 'cancel' | 'check' | 'clearFilters' | 'clock' | 'close' | 'copy' | 'darkTheme' | 'disclosure' | 'displayOptions' | 'error' | 'explore' | ... 22 more ... | 'wrap'
AppIconProps (type, @altertable/data-app-react/ui): = props listed as AppIcon.options.*
AppLocation (type, @altertable/data-app/client): App-owned URL state shared by controls, frame adapters, and host navigation.
AppLocation.search: string
AppLocation.hash: string
applyAppearance (function, @altertable/data-app/appearance): (value: AppearanceOptions): () => void — Select document-owned appearance presets and brand inputs. Public CSS tokens remain overridable in stylesheets. Cleanup restores the previous document appearance.
applyAppearance.value.theme?: ThemePreference
applyAppearance.value.baseColor?: 'neutral' | 'slate' | 'warm' — Palette for surfaces, text, and borders; independent of the accent.
applyAppearance.value.accentColor?: string — Emphasis color for checked controls and selected dates; options use the base palette.
applyAppearance.value.darkAccentColor?: string
applyAppearance.value.chartColors?: string[]
applyAppearance.value.density?: 'comfortable' | 'compact' | 'spacious'
applyAppearance.value.cornerRadius?: 'large' | 'medium' | 'none' | 'small'
applyAppearance.value.elevation?: 'flat' | 'raised' | 'subtle'
applyAppearance.value.typography?: Partial<{ body: string; heading: string; }>
AppVariable (type, @altertable/data-app-react): <Value, Kind> — An app-owned value with one URL representation. Controls never parse or write routes.
AppVariable.kind: Kind
AppVariable.label?: string
AppVariable.presentation?: VariablePresentation
AppVariable.urlKeys: readonly string[]
AppVariable.defaultValue: Value
AppVariable.clearValue?: Value — Unrestricted value, when this variable represents a filter.
AppVariable.describe?: ((value: Value) => string)
AppVariable.history: HistoryMode
AppVariable.read: (params: URLSearchParams) => Value
AppVariable.write: (value: Value) => Record<string, string | null>
AppVariable.valid: (value: Value) => boolean
AppVariable.same: (left: Value, right: Value) => boolean
AppVariableValues (type, @altertable/data-app-react): <Variables> = { [Key in keyof Variables]: Variables[Key] extends DimensionSelectionVariable<infer Value extends DimensionValue> ? DimensionSelection<...> : ...; }
AreaChart (component, @altertable/data-app-react/ui): <Row extends AreaChartItem>(props: AreaChartProps<Row>) — Ordered finite samples filled to a zero baseline, including negative values. Samples are equally spaced; supply missing periods explicitly.
AreaChart.items: readonly Row[] — Ordered samples; the chart validates IDs and values when rendering.
AreaChart.itemActions?: ItemActions<Row> — Actions available for each displayed item. Domain fields remain available to this callback.
AreaChart.unit: string
AreaChart.ariaLabel: string
AreaChart.formatValue?: ((value: number) => string)
AreaChartItem (type, @altertable/data-app-react/ui)
AreaChartItem.id: string
AreaChartItem.label: string
AreaChartItem.value: number
AreaChartProps (type, @altertable/data-app-react/ui): <Row> = props listed as AreaChart.*
attachDataAppBridge (function, @altertable/data-app-embed): (options: DataAppBridgeOptions): DataAppHost — Source mode configures and loads the iframe; connection mode attaches to a host-owned document.
attachDataAppBridge.options.iframe: HTMLIFrameElement
attachDataAppBridge.options.presentation?: DataAppPresentation
attachDataAppBridge.options.logger?: DataAppLogger
attachDataAppBridge.options.onStatusChange?: ((status: DataAppStatus) => void)
attachDataAppBridge.options.onDiagnostic?: ((event: DataAppDiagnostic) => void)
attachDataAppBridge.options.onMessage: MessageDispatcher
attachDataAppBridge.options.connection: DataAppConnection [variant 1 of 2]
attachDataAppBridge.options.javascript?: string [variant 1 of 2]
attachDataAppBridge.options.window?: Window [variant 1 of 2]
attachDataAppBridge.options.source: DataAppSource [variant 2 of 2]
attachDataAppBridge.options.startupTimeoutMs?: number [variant 2 of 2]
BarChart (component, @altertable/data-app-react/ui): <Row extends BarChartItem>(props: BarChartProps<Row>) — Nonnegative category values. Compose inside VisualizationWidget for a titled panel. Owns hover/touch tooltips; no selection state or keyboard navigation.
BarChart.items: readonly Row[] — Ordered samples; the chart validates IDs and values when rendering.
BarChart.itemActions?: ItemActions<Row> — Actions available for each displayed item. Domain fields remain available to this callback.
BarChart.unit: string
BarChart.ariaLabel: string
BarChart.formatValue?: ((value: number) => string)
BarChartItem (type, @altertable/data-app-react/ui)
BarChartItem.id: string
BarChartItem.label: string
BarChartItem.value: number
BarChartProps (type, @altertable/data-app-react/ui): <Row> = props listed as BarChart.*
booleanFilter (function, @altertable/data-app/contract): (options: FilterOptions<BooleanSelection>): BooleanFilter — Boolean predicate with a distinct unrestricted state.
booleanFilter.options.key: string
booleanFilter.options.label: string
booleanFilter.options.defaultValue?: BooleanSelection
booleanFilter.options.history?: HistoryMode
booleanFilter.options.presentation?: VariablePresentation
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
ChoiceOption (type, @altertable/data-app-react, @altertable/data-app-react/ui)
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
choiceVariable (function, @altertable/data-app-react): <const Options extends readonly ChoiceOption[], const Presentation extends VariablePresentation | undefined = undefined>(options: Omit<ScalarVariableOptions, 'presentation'> & { presentation?: Presentation; defaultValue: NoInfer<Options[number]['id']>; options: Options & (Options extends readonly […
choiceVariable.options.label?: string
choiceVariable.options.key: string
choiceVariable.options.defaultValue: (string | undefined) & NoInfer<Options[number]['id']>
choiceVariable.options.history?: HistoryMode
choiceVariable.options.presentation?: Presentation
choiceVariable.options.options: Options & (Options extends readonly [] ? never : unknown)
ChoiceVariable (type, @altertable/data-app-react): <Value>
ChoiceVariable.kind: 'choice'
ChoiceVariable.label?: string
ChoiceVariable.presentation?: VariablePresentation
ChoiceVariable.urlKeys: readonly string[]
ChoiceVariable.defaultValue: Value
ChoiceVariable.clearValue?: Value — Unrestricted value, when this variable represents a filter.
ChoiceVariable.describe?: ((value: Value) => string)
ChoiceVariable.history: HistoryMode
ChoiceVariable.read: (params: URLSearchParams) => Value
ChoiceVariable.write: (value: Value) => Record<string, string | null>
ChoiceVariable.valid: (value: Value) => boolean
ChoiceVariable.same: (left: Value, right: Value) => boolean
ChoiceVariable.options: readonly ChoiceOption[]
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
ComposedChart.data: readonly Row[] — Displayed rows; series and axes select fields with Recharts dataKey props.
ComposedChart.ariaLabel: string — Describes the measures and scope for assistive technology.
ComposedChart.…: plus props inherited from recharts
ComposedChart.Dot: (props: DotProps & { active?: boolean; })
ComposedChart.Area: <Row = unknown, Value = number | null>(props: AreaProps<Row, Value>)
ComposedChart.Bar: <Row = unknown, Value = number | null>(props: BarProps<Row, Value>)
ComposedChart.Line: <Row = unknown, Value = number | null>(props: LineProps<Row, Value>)
ComposedChart.Scatter: <Row = unknown, Value = number>(props: ComponentProps<typeof Scatter<Row, Value>>)
ComposedChart.XAxis: <Row = unknown, Value = string | number | Date>(props: ComponentProps<typeof XAxis<Row, Value>>)
ComposedChart.YAxis: <Row = unknown, Value = number>(props: ComponentProps<typeof YAxis<Row, Value>>)
ComposedChart.ZAxis: <DataPointType = any, DataValueType = any>(outsideProps: Props<DataPointType, DataValueType>)
ComposedChart.CartesianGrid: (props: ComponentProps<typeof CartesianGrid>)
ComposedChart.Tooltip: (props: ComponentProps<typeof Tooltip>)
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
ComposedChartLegendProps.…: plus props inherited from React, recharts
ComposedChartProps (type, @altertable/data-app-react/ui): <Row> = props listed as ComposedChart.*
connectionCheck (function, @altertable/data-app/contract): <const Queries extends QueryDefinitions & { connection: QueryDefinitions[string]; }>(queries: CheckedQueries<Queries>): ConnectionOperation — A connectivity probe uses the app's registered connection query.
connectionCheck.queries.connection: QueryDefinition & KnownRecord<Queries['connection']> & { statement: Queries['connection']['statement'] extends '' ? never : Queries['connection']['statement']; params: CheckedParameters<...>; projections: CheckedProjections<...>; }
ConnectionOperation (type, @altertable/data-app/contract): The built-in connection operation shares one contract with setup clients.
ConnectionOperation.input: (value: unknown) => Record<string, never>
ConnectionOperation.run: (context: OperationContext, input: Record<string, never>) => Promise<true>
ConnectionOperation.checks: readonly [Record<string, never>, ...Record<string, never>[]]
ConnectionOperation.policy: { maxQueryRows: number; maxDurationMs: number; maxResponseBytes?: number | undefined; }
ConnectionOperation.queryNames: { readonly connection: 'connection'; }
createAnnotationClient (function, @altertable/data-app/client): (transport: MessageTransport): { requestSendAnnotations(options?: { signal?: AbortSignal | undefined; } | undefined): Promise<null>; reportAnnotationEditorState(state: { hasUnsavedChanges: boolean; }, options?: { ...; } | undefined): Promise<...>; addAnnotation(draft: DataAppAnnotationDraft, option… — Deliver annotations to the authenticated host. Acknowledgement means retained, not sent to an agent.
createDataAppNavigation (function, @altertable/data-app/client): (options: {…}): DataAppNavigation — Attach app URL behavior to an already authenticated bridge.
createDataAppNavigation.options.bridge: { logger: DataAppLogger; request: (message: RoutedMessage, signal?: AbortSignal | undefined) => Promise<unknown>; transport: (operation: string, input: unknown, signal?: AbortSignal | undefined) => Promise<...>; ... 7 more ...; fail(cause?: unknown): void; }
createDataAppNavigation.options.window?: Window
createDataClient (function, @altertable/data-app/client): <Operations extends DataOperations>(options: DataClientOptions<Operations>): DataClient<Operations>; <Operations extends DataOperations>(...args: DataClientOptions<Operations> extends never ? [ options: never ] : [ ]): DataClient<Operations>; (options: TransportOptions): DataClient<DataOperations> — Named HTTP operations, or browser-owned operations executed through an authorized SQL bridge. Named clients derive data from the declared operations' run return types.
createDataClient.options.transport?: DataTransport [variant 1 of 2]
createDataClient.options.endpoint?: string [variant 1 of 2]
createDataClient.options.fetch?: typeof fetch [variant 1 of 2]
createDataClient.options.operations: Operations [variant 2 of 2]
createDataClient.options.lakehouse?: Lakehouse [variant 2 of 2]
createDataClient.options.transport?: DataTransport
createDataClient.options.endpoint?: string
createDataClient.options.fetch?: typeof fetch
createDataContext (function, @altertable/data-app-react): <const Names extends Record<string, string>>(queryNames: Names): <const Context extends Omit<DataContext, 'glossary'> & { glossary: Record<string, Omit<GlossaryEntry, 'queryNames'> & { queryNames?: Names[keyof Names][]; }>; }>(context: Context) => Context & { ...; } — Bind glossary query references and card evidence to the same registry.
createDataHandler (function, @altertable/data-app/server): (operations: DataOperations, authorize: (request: Request, operation: string) => Promise<RequestAccess>): (request: Request) => Promise<Response> — Execute named operations on the server. The app supplies operations and viewer authorization.
createDataHooks (function, @altertable/data-app-react): <Operations extends DataOperations>(client: DataClient<Operations>): { defineDataView: { <Name extends keyof Operations & string, const Variables extends VariableCollection = {}, const Context extends AuthoringDataContext = AuthoringDataContext>(definition: { operation: Name; dataContext: DataConte… — Bind declared operations to URL variables, displayed readings, and request feedback.
createDataHooks.client.query: <Name extends keyof Operations & string>(this: void, name: Name & (true extends IsUnion<NoInfer<Name>, NoInfer<Name>> ? never : unknown), input: InputOf<Operations[NoInfer<Name>]>, options?: { ...; } | undefined) => Promise<...>
createHttpTransport (function, @altertable/data-app/client): (options: {…}): DataTransport
createHttpTransport.options.endpoint?: string
createHttpTransport.options.fetch?: typeof fetch
createIframeTransport (function, @altertable/data-app/client): (options: {…}): { logger: DataAppLogger; request: (message: RoutedMessage, signal?: AbortSignal | undefined) => Promise<unknown>; transport: (operation: string, input: unknown, signal?: AbortSignal | undefined) => Promise<...>; ... 7 more ...; fail(cause?: unknown): void; } — One bridge per document, shared by all clients and retained across module hot replacement.
createIframeTransport.options.parentOrigin: string
createIframeTransport.options.window?: Window
createIframeTransport.options.timeoutMs?: number
createIframeTransport.options.mode?: 'bundle' | 'url'
createIframeTransport.options.loadScript?: ((javascript: string) => void)
createMessageClient (function, @altertable/data-app/client): <const Routes extends MessageRoutes>(routes: Routes, transport: MessageTransport): { request<Name extends keyof Routes & string, const Input extends MessageInput<NoInfer<Routes[Name]>>>(route: Name, payload: Input, { signal }?: { signal?: AbortSignal | undefined; } | undefined): Promise<...>; } — Both ends validate using the same contracts; the transport owns delivery and cancellation.
createMessageRouter (function, @altertable/data-app/contract): <const Routes extends MessageRoutes>(routes: Routes, handlers: MessageHandlers<NoInfer<Routes>>): { dispatch: (value: unknown, context: MessageContext) => Promise<unknown>; } — Contracts are shared; handlers are supplied by the host and never belong in the app bundle.
createNavigationHandler (function, @altertable/data-app-embed): (options: {…}): (input: NavigationUpdate) => null — Override this handler for framework routers. Reserved host parameters survive app navigation.
createNavigationHandler.options.window?: Window
createNavigationHandler.options.reservedSearchParams?: readonly string[]
createSqlQueryHandler (function, @altertable/data-app-embed): (authorize: (query: SqlQueryInput, context: MessageContext) => Promise<Lakehouse>): (input: SqlQueryInput, context: MessageContext) => Promise<QueryResult<unknown[]>> — Authorize every SQL request and supply a backend that independently enforces access and query limits.
createThemeController (function, @altertable/data-app/appearance): (initialTheme: ThemePreference): ThemeController — Persist a viewer theme preference. Applying appearance belongs to the UI owner.
CsvCell (type, @altertable/data-app-react): = string | number | boolean | null | undefined
CsvExport (type, @altertable/data-app-react/ui): All distinct datasets in the displayed result; filename names the download.
CsvExport.filename: string
CsvExport.tables: readonly [CsvTable, ...CsvTable[]]
CsvTable (type, @altertable/data-app-react/ui): One named dataset with ordered columns and raw displayed values.
CsvTable.name: string
CsvTable.columns: readonly string[]
CsvTable.rows: readonly (readonly CsvCell[])[]
DataApp (component, @altertable/data-app-react): <Data, Input>(props: DataAppProps<Data, Input>) — Executes the primary view and owns its controls, inspection, exports, and stories.
DataApp.children: ReactNode
DataApp.description?: ReactNode — Override the declared subtitle; null hides it.
DataApp.toolbarActions?: ReactNode
DataApp.footerActions?: ReactNode
DataApp.footer?: ReactNode — Optional source, coverage, or methodology note below the app content. Compose prose and inline components; typography and spacing are provided.
DataApp.showSearch?: boolean — Show declared search controls. Defaults to true; hiding preserves their values.
DataApp.showFilters?: boolean — Show declared filter controls, including display options. Defaults to true; hiding preserves their values.
DataApp.view: DeclaredView<Data, Input, unknown> & { scope(snapshot: DisplayedSnapshot<Data, Input>): string; }
DataApp.showSearchSuggestions?: boolean — Show supplied datasets’ record suggestions on the first declared search. Defaults to true.
DataApp.story: (snapshot: DisplayedSnapshot<Data, Input>) => readonly (Omit<StoryFinding, 'evidence'> & { evidence: RegisteredBinding; })[]
DataApp.datasets: readonly [ExportDataset<Data, Input>, ...ExportDataset<Data, Input>[]]
DataApp.details?: readonly DetailContent<any, any>[] — Detail destinations available to dataset actions and metric record inspection.
DataApp (component, @altertable/data-app-react/ui): (props: DataAppProps) — Setup and static screens; fetched data uses the declared-view DataApp.
DataApp.children: ReactNode
DataApp.dataContext: DataContext
DataApp.description?: ReactNode — Override the declared subtitle; null hides it.
DataApp.toolbarActions?: ReactNode
DataApp.footerActions?: ReactNode
DataApp.footer?: ReactNode — Optional source, coverage, or methodology note below the app content. Compose prose and inline components; typography and spacing are provided.
DataApp.csvExport?: CsvExport
DataApp.queries?: DisclosedQuery[]
DataAppAnnotationDraft (type, @altertable/data-app/contract)
DataAppAnnotationDraft.id: string
DataAppAnnotationDraft.target: { id: string; label: string; kind: 'app' | 'element' | 'widget'; text: string; queryNames: string[]; glossaryIds: string[]; }
DataAppAnnotationDraft.context: { search: string; hash: string; displayedInput?: unknown; anchor?: { x: number; y: number; } | undefined; cursor?: { x: number; y: number; } | undefined; region?: { x: number; y: number; width: number; height: number; } | undefined; screenshot?: { ...; } | undefined; view?: string | undefined; view…
DataAppAnnotationDraft.comment: string
DataAppAnnotationPresentation (type, @altertable/data-app/contract)
DataAppAnnotationPresentation.enabled: boolean
DataAppAnnotationPresentation.active?: boolean — When provided, the host owns the mode and renders the annotation trigger.
DataAppAnnotationPresentation.pinsVisible?: boolean
DataAppAnnotationPresentation.showHint?: boolean
DataAppAnnotationPresentation.readOnly?: boolean
DataAppAnnotationPresentation.targets?: { id: string; targetId: string; number: number; comment?: string | undefined; anchor?: { x: number; y: number; } | undefined; region?: { x: number; y: number; width: number; height: number; } | undefined; }[]
DataAppAnnotationPresentation.selectedAnnotationId?: string
DataAppAnnotationPresentation.selectedTargetId?: string
DataAppAnnotationPresentation.selectionId?: string
DataAppAnnotationPresentation.dismissal?: { id: string; occurredAt: number; } — Confirmed host click outside the iframe; occurredAt is epoch milliseconds.
DataAppBridge (component, @altertable/data-app-embed/react): (props: DataAppBridgeProps) — Owns iframe setup and delivery. The consuming shell owns loading, error UI, and retries.
DataAppBridge.presentation?: DataAppPresentation
DataAppBridge.logger?: DataAppLogger
DataAppBridge.onStatusChange?: ((status: DataAppStatus) => void)
DataAppBridge.onDiagnostic?: ((event: DataAppDiagnostic) => void)
DataAppBridge.onMessage: MessageDispatcher
DataAppBridge.source: DataAppSource [variant 1 of 2]
DataAppBridge.title: string [variant 1 of 2]
DataAppBridge.startupTimeoutMs?: number [variant 1 of 2]
DataAppBridge.iframeProps?: Omit<Omit<DetailedHTMLProps<IframeHTMLAttributes<HTMLIFrameElement>, HTMLIFrameElement>, 'ref'>, 'children' | ... 5 more ... | 'title'> [variant 1 of 2]
DataAppBridge.iframe: HTMLIFrameElement | null [variant 2 of 2]
DataAppBridge.connection: DataAppConnection [variant 2 of 2]
DataAppBridgeOptions (type, @altertable/data-app-embed): = props listed as attachDataAppBridge.options.*
DataAppBridgeProps (type, @altertable/data-app-embed/react): = props listed as DataAppBridge.*
DataAppConfig (type, @altertable/data-app, @altertable/data-app/config): <Queries>
DataAppConfig.title: string
DataAppConfig.scope: { organization: string; environment: string; } — Display labels; scope does not grant data access.
DataAppConfig.description: string — Explain what the app helps readers explore.
DataAppConfig.appearance?: AppearanceOptions — Omit to use the standard appearance.
DataAppConfig.dateFormatting?: { locale?: string | undefined; timeZone?: string | undefined; } — Shared date display defaults. Reporting views and individual fields may override the time zone.
DataAppConfig.queries: Queries — Named SQL statements with typed parameters and result projections.
DataAppConnection (type, @altertable/data-app-embed)
DataAppConnection.type: 'origin' [variant 1 of 2]
DataAppConnection.origin: string [variant 1 of 2]
DataAppConnection.type: 'opaque' [variant 2 of 2]
DataAppConnection.token: string [variant 2 of 2]
DataAppDefinition (type, @altertable/data-app, @altertable/data-app/config): <Queries> — An app declaration with operations bound to its query registry.
DataAppDefinition.title: string
DataAppDefinition.scope: { organization: string; environment: string; } — Display labels; scope does not grant data access.
DataAppDefinition.description: string — Explain what the app helps readers explore.
DataAppDefinition.appearance?: AppearanceOptions — Omit to use the standard appearance.
DataAppDefinition.dateFormatting?: { locale?: string | undefined; timeZone?: string | undefined; } — Shared date display defaults. Reporting views and individual fields may override the time zone.
DataAppDefinition.queries: QuerySnapshot<Queries>
DataAppDefinition.defineDimension: <const Type extends 'string' | 'number'>(config: DimensionSourceConfig<Type> & { source: { query: DimensionSourceQueryName<Queries, NoInfer<Type>>; }; }) => SourceDimensionVariable<...>
DataAppDefinition.defineOperation: <Input, Output>(operation: OperationDefinition<Input, Output, Queries>) => Omit<DataOperation<Input, Output>, 'queryNames'> & { ...; }
DataAppDiagnostic (type, @altertable/data-app-embed): Delivery metadata only; never tokens or payloads. `durationMs` measures host handling of a request, reported on its result or error.
DataAppDiagnostic.direction: 'drop' [variant 1 of 2]
DataAppDiagnostic.type?: string [variant 1 of 2]
DataAppDiagnostic.reason: BridgeDropReason [variant 1 of 2]
DataAppDiagnostic.durationMs?: number
DataAppDiagnostic.direction: 'receive' | 'send' [variant 2 of 2]
DataAppDiagnostic.type: 'bridge:cancel' | 'bridge:connect' | 'bridge:disconnect' | 'bridge:error' | 'bridge:initialize' | 'bridge:ready' | 'bridge:request' | 'bridge:result' | 'runtime:error' | ... 5 more ... | 'viewport:update' [variant 2 of 2]
DataAppDiagnostic.id?: string [variant 2 of 2]
DataAppDiagnostic.route?: string [variant 2 of 2]
DataAppDiagnostic.operation?: string [variant 2 of 2]
DataAppDiagnostic.error?: { code: string; message: string; requestId?: string | undefined; } [variant 2 of 2]
DataAppError (class, @altertable/data-app/client)
DataAppError.code: string
DataAppError.requestId?: string
DataAppError.…: plus props inherited from built-in
DataAppHost (type, @altertable/data-app-embed)
DataAppHost.dispose: () => void
DataAppHost.setPresentation: (presentation?: DataAppPresentation | undefined) => void
DataAppHost.setLogger: (logger?: DataAppLogger | undefined) => void
DataAppLocation (type, @altertable/data-app/client)
DataAppLocation.snapshot: () => AppLocation
DataAppLocation.subscribe: (listener: () => void) => () => void
DataAppLocation.update: (location: AppLocation, mode?: HistoryMode | undefined) => void
DataAppLogger (type, @altertable/data-app/client, @altertable/data-app-embed): Host-owned log sink; compatible with console and frontend createLogger().
DataAppLogger.log: (...args: unknown[]) => void
DataAppLogger.info: (...args: unknown[]) => void
DataAppLogger.warn: (...args: unknown[]) => void
DataAppLogger.error: (...args: unknown[]) => void
DataAppNavigation (type, @altertable/data-app/client)
DataAppNavigation.snapshot: () => AppLocation
DataAppNavigation.subscribe: (listener: () => void) => () => void
DataAppNavigation.update: (location: AppLocation, mode?: HistoryMode | undefined) => void
DataAppNavigation.publish: (mode?: HistoryMode | undefined) => void — Publish URL changes made outside the adapter, including the document title.
DataAppNavigation.dispose: () => void
DataAppPresentation (type, @altertable/data-app-embed): Presentation owned by the parent shell, delivered only over a trusted bridge.
DataAppPresentation.surface: 'embedded' | 'standalone'
DataAppPresentation.theme: Theme
DataAppPresentation.annotations?: DataAppAnnotationPresentation
DataAppPresentation.sizing?: 'content' | 'frame' — `frame` (default): the parent sizes the iframe and the app scrolls inside it. `content`: the iframe follows the app's content height and the parent page scrolls.
DataAppProps (type, @altertable/data-app-react): <Data, Input> = props listed as DataApp.*
DataAppProps (type, @altertable/data-app-react/ui)
DataAppProps.children: ReactNode
DataAppProps.dataContext: DataContext
DataAppProps.description?: ReactNode — Override the declared subtitle; null hides it.
DataAppProps.toolbarActions?: ReactNode
DataAppProps.footerActions?: ReactNode
DataAppProps.footer?: ReactNode — Optional source, coverage, or methodology note below the app content. Compose prose and inline components; typography and spacing are provided.
DataAppProps.csvExport?: CsvExport
DataAppProps.queries?: DisclosedQuery[]
DataAppProvider (component, @altertable/data-app-react/ui): <const Queries extends QueryDefinitions>(props: {…}) — Provide one app identity and shared requests to a custom React root.
DataAppProvider.app: DataAppDefinition<Queries>
DataAppProvider.children: ReactNode
dataAppRoutes (const, @altertable/data-app/contract)
dataAppRoutes.data:query: DataQueryRoute<OperationContracts>
dataAppRoutes.navigation:update: MessageRoute<NavigationUpdate, null>
DataAppSource (type, @altertable/data-app-embed)
DataAppSource.type: 'url' [variant 1 of 2]
DataAppSource.url: string [variant 1 of 2]
DataAppSource.type: 'bundle' [variant 2 of 2]
DataAppSource.bootstrapUrl?: string [variant 2 of 2] — Omit to use the packaged, network-isolated data document.
DataAppSource.javascript: string [variant 2 of 2]
DataAppStatus (type, @altertable/data-app-embed): = 'connected' | 'connecting' | 'disconnected' | 'failed' | 'ready'
DataAppStyle (type, @altertable/data-app-react, @altertable/data-app-react/ui): React style properties with checked public Altertable custom properties.
DataAppStyle.{--atbl-accent, --atbl-accent-subtle, --atbl-annotation-accent, --atbl-annotation-accent-hover, --atbl-annotation-highlight, --atbl-annotation-on-accent, --atbl-backdrop, --atbl-background, --atbl-border, --atbl-chart-1, --atbl-chart-2, --atbl-chart-3, --atbl-chart-4, --atbl-chart-5, --atbl-chart-6, --atbl-chart-7, --atbl-chart-8, --atbl-chart-fill, --atbl-code-keyword, --atbl-code-surface, --atbl-code-text, --atbl-content-width, --atbl-control-compact-height, --atbl-control-disabled-opacity, --atbl-control-gap, --atbl-control-height, --atbl-control-hover-border, --atbl-control-hover-surface, --atbl-control-icon-size, --atbl-control-open-border, --atbl-control-open-surface, --atbl-control-padding-block, --atbl-control-padding-inline, --atbl-control-pressed-surface, --atbl-control-selected-surface, --atbl-control-selected-text, --atbl-control-text-size, --atbl-cursor-action, --atbl-cursor-busy, --atbl-cursor-disabled, --atbl-cursor-help, --atbl-danger, --atbl-danger-subtle, --atbl-dropdown-item-gap, --atbl-dropdown-item-padding-block, --atbl-dropdown-item-padding-inline, --atbl-dropdown-padding, --atbl-duration-fast, --atbl-duration-normal, --atbl-duration-slow, --atbl-ease-enter, --atbl-ease-standard, --atbl-focus-color, --atbl-focus-outline, --atbl-focus-ring-inset, --atbl-focus-ring-offset, --atbl-font, --atbl-font-heading, --atbl-layout-gap, --atbl-mono-font, --atbl-muted, --atbl-negative, --atbl-on-accent, --atbl-positive, --atbl-radius-control, --atbl-radius-overlay, --atbl-radius-surface, --atbl-shadow-control, --atbl-shadow-overlay, --atbl-shadow-surface, --atbl-space-lg, --atbl-space-md, --atbl-space-sm, --atbl-space-xl, --atbl-space-xs, --atbl-subtle, --atbl-surface, --atbl-surface-padding, --atbl-text, --atbl-text-measure, --atbl-type-body-leading, --atbl-type-body-size, --atbl-type-emphasis-weight, --atbl-type-heading-leading, --atbl-type-heading-weight, --atbl-type-label-leading, --atbl-type-label-size, --atbl-type-label-weight, --atbl-type-meta-size, --atbl-type-meta-weight, --atbl-type-metric-leading, --atbl-type-metric-size, --atbl-type-page-size, --atbl-type-section-size, --atbl-type-widget-size}?: string | number
DataAppStyle.…: plus props inherited from csstype
DataAppStyleHooks (type, @altertable/data-app-react, @altertable/data-app-react/ui)
DataAppStyleHooks.data-atbl-focus?: 'group' | 'inset' | 'ring'
DataAppStyleHooks.data-atbl-control?: 'action' | 'default' | 'help' | 'text'
DataAppStylesOptions (type, @altertable/data-app-react)
DataAppStylesOptions.document?: Document — Defaults to the current browser document.
DataAppStylesOptions.nonce?: string — Nonce permitted by the document's style-src CSP.
DataAppStyleToken (type, @altertable/data-app-react, @altertable/data-app-react/ui): = '--atbl-accent' | '--atbl-accent-subtle' | '--atbl-annotation-accent' | '--atbl-annotation-accent-hover' | '--atbl-annotation-highlight' | '--atbl-annotation-on-accent' | ... 88 more ... | '--atbl-type-widget-size'
dataAppTitle (function, @altertable/data-app, @altertable/data-app/config): (config: Pick<DataAppConfig, 'title' | 'scope'>): string
dataAppTitle.config.title: string
dataAppTitle.config.scope: { organization: string; environment: string; } — Display labels; scope does not grant data access.
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
DataOperation.input: (value: unknown) => Input
DataOperation.run: (context: OperationContext, input: Input) => Promise<Output>
DataOperation.checks: readonly [Input, ...Input[]]
DataOperation.queryNames?: Readonly<Record<string, string>>
DataOperation.policy: { maxQueryRows: number; maxDurationMs: number; maxResponseBytes?: number | undefined; }
DataOperations (type, @altertable/data-app/contract): = { [x: string]: { input: (value: unknown) => unknown; } & Omit<DataOperation<never, unknown>, 'checks' | 'input'> & { checks: readonly [unknown, ...unknown[]]; }; } — Heterogeneous registry: inputs vary per operation, so checks retain unknown values.
DataQueryBody (type, @altertable/data-app/contract): <Output>
DataQueryBody.data: Output
DataQueryBody.requestId: string
DataQueryBody.queriedAt: string
DataQueryBody.queryIds: string[]
DataQueryBody.queries?: DisclosedQuery[]
DataQueryInput (type, @altertable/data-app/contract): <Operations> = { [Name in keyof Operations & string]: { operation: Name; input: InputOf<Operations[Name]>; }; }[keyof Operations & string]
DataQueryRoute (type, @altertable/data-app/contract): <Operations>
DataQueryRoute.input: (value: unknown) => DataQueryInput<Operations>
DataQueryRoute.output: (value: unknown, input: DataQueryInput<Operations>) => TransportResponse
DataQueryRoute.operations: Operations | undefined
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
DataSection (component, @altertable/data-app-react): <Data, Input>(props: DataSectionProps<Data, Input>)
DataSection.content: ViewContent<Data, Input>
DataSection.emptyFallback?: EmptyContent
DataSection.error?: { title: ReactNode; description?: ReactNode; onRetry?: (() => void) | undefined; }
DataSection.label?: string
DataSection.…: plus props inherited from React
DataSectionProps (type, @altertable/data-app-react): <Data, Input> = props listed as DataSection.*
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
DataSourceError (class, @altertable/data-app/contract)
DataSourceError.reason: 'forbidden' | 'query_rejected' | 'rate_limited' | 'unauthorized' | 'unavailable'
DataSourceError.status?: number
DataSourceError.queryName?: string
DataSourceError.…: plus props inherited from built-in
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
DataTransport (type, @altertable/data-app/client): = (operation: string, input: unknown, signal?: AbortSignal | undefined) => Promise<TransportResponse>
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
DatePresetId (type, @altertable/data-app-react/ui): = 'day' | 'last-14' | 'last-3' | 'last-30' | 'last-7' | 'last-90' | 'previous-month' | 'previous-week' | 'this-month' | 'this-week'
DateRange (type, @altertable/data-app-react/ui): = props listed as previousDateRange.options.* — ISO calendar dates; the app operation defines timezone and inclusive bounds.
DateRangeContract (type, @altertable/data-app/contract)
DateRangeContract.request: (value: unknown, compare?: boolean | undefined) => DateRangeRequest
DateRangeContract.parseRequest: (value: unknown) => DateRangeRequest
DateRangeContract.bounds: () => { minDate: string | undefined; maxDate: string; maxRangeDays: number; timeZone: string; }
DateRangeContract.parse: (value: unknown) => DateRange
DateRangeContract.period: ({ start, end }: DateRange) => ReportingPeriod
DateRangeContract.comparison: (input: DateRange) => DateRange | null
DateRangeContract.describeInput: (input: DateRange) => string
DateRangeContract.view: { period: ({ start, end }: DateRange) => ReportingPeriod; describeInput: (input: DateRange) => string; }
DateRangeContractOptions (type, @altertable/data-app/contract): = props listed as defineDateRangeContract.options.*
DateRangeInput (type, @altertable/data-app/contract): = props listed as previousDateRange.options.* — ISO calendar dates; the app operation defines timezone and inclusive bounds.
DateRangePicker (component, @altertable/data-app-react/ui): (props: DateRangePickerProps) — The app owns URL state; `dateRangeControl` binds a date variable to this picker.
DateRangePicker.label?: string
DateRangePicker.labelPlacement?: 'above' | 'beside'
DateRangePicker.value: DateRange | null
DateRangePicker.onChange: (range: DateRange | null) => void
DateRangePicker.minDate?: string
DateRangePicker.maxDate?: string
DateRangePicker.maxRangeDays?: number
DateRangePicker.timeZone?: string
DateRangePicker.resetValue?: DateRange — Used to display the reset affordance. The app variable owns the URL and reset meaning.
DateRangePicker.isDefault?: boolean
DateRangePicker.onReset?: (() => void)
DateRangePicker.onPresetChange?: ((id: DatePresetId) => void)
DateRangePicker.selectedPresetId?: DatePresetId | null
DateRangePicker.calendarFooter?: ReactNode
DateRangePicker.comparison?: { enabled: boolean; range: DateRange | null; onChange: (enabled: boolean) => void; }
DateRangePicker.…: plus props inherited from @react-types/shared, React, react-aria-components, react-stately
DateRangePickerProps (type, @altertable/data-app-react/ui): = props listed as DateRangePicker.*
DateRangeRequest (type, @altertable/data-app/contract)
DateRangeRequest.range: DateRange
DateRangeRequest.comparison: DateRange | null
DateRangeSelection (type, @altertable/data-app-react)
DateRangeSelection.kind: 'preset' [variant 1 of 2]
DateRangeSelection.id: DatePresetId [variant 1 of 2]
DateRangeSelection.comparison?: 'previous'
DateRangeSelection.kind: 'dates' [variant 2 of 2]
DateRangeSelection.start: string [variant 2 of 2]
DateRangeSelection.end: string [variant 2 of 2]
dateRangeVariable (function, @altertable/data-app-react): (options: DateRangeVariableOptions): DateRangeVariable — A date variable keeps relative presets relative and validates exact dates against source coverage.
dateRangeVariable.options.label?: string
dateRangeVariable.options.key: string — URL key for a relative preset; explicit dates use start/end for period, otherwise key-prefixed fields.
dateRangeVariable.options.defaultValue: DateRangeSelection & { comparison?: undefined; }
dateRangeVariable.options.contract: { request: (value: unknown, compare?: boolean | undefined) => DateRangeRequest; parseRequest: (value: unknown) => DateRangeRequest; bounds: () => { minDate: string | undefined; maxDate: string; maxRangeDays: number; timeZone: string; }; ... 4 more ...; view: { ...; }; }
dateRangeVariable.options.history?: HistoryMode
dateRangeVariable.options.comparison?: boolean — Opt into a URL-backed comparison with the preceding equal-length range.
dateRangeVariable.options.presentation?: VariablePresentation
DateRangeVariable (type, @altertable/data-app-react)
DateRangeVariable.kind: 'dateRange'
DateRangeVariable.label?: string
DateRangeVariable.presentation?: VariablePresentation
DateRangeVariable.urlKeys: readonly string[]
DateRangeVariable.defaultValue: DateRangeSelection
DateRangeVariable.clearValue?: DateRangeSelection — Unrestricted value, when this variable represents a filter.
DateRangeVariable.describe?: ((value: DateRangeSelection) => string)
DateRangeVariable.history: HistoryMode
DateRangeVariable.read: (params: URLSearchParams) => DateRangeSelection
DateRangeVariable.write: (value: DateRangeSelection) => Record<string, string | null>
DateRangeVariable.valid: (value: DateRangeSelection) => boolean
DateRangeVariable.same: (left: DateRangeSelection, right: DateRangeSelection) => boolean
DateRangeVariable.supportsComparison: boolean
DateRangeVariable.input: (selection: DateRangeSelection) => DateRangeRequest
DateRangeVariable.describeInput: (input: DateRangeRequest) => string
DateRangeVariable.bounds: () => { minDate?: string | undefined; maxDate: string; maxRangeDays: number; timeZone: string; }
DateRangeVariable.resolve: (selection: DateRangeSelection) => DateRange
DateRangeVariable.previous: (selection: DateRangeSelection) => DateRange | null
DateRangeVariable.comparisonRange: (selection: DateRangeSelection) => DateRange | null
DateRangeVariableOptions (type, @altertable/data-app-react): = props listed as dateRangeVariable.options.*
DateTimeFormatOptions (type, @altertable/data-app/format)
DateTimeFormatOptions.locale?: string
DateTimeFormatOptions.missing?: string
DateTimeFormatOptions.timeZone?: string
DateTimeFormatOptions.precision?: 'minute' | 'second'
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
default (const, @altertable/data-app-worker)
default.runtimeHtml: (parentOrigin: string) => string
default.fetch: (request: Request, env: WorkerBindings) => Response
defineDataApp (function, @altertable/data-app, @altertable/data-app/config): <const Queries extends QueryDefinitions>(config: DataAppConfig<Queries> & { queries: CheckedQueries<Queries>; }): DataAppDefinition<Queries> — Define the app's query source of truth while preserving exact query and parameter names. Use `app.defineOperation()` to bind operations to these queries.
defineDataApp.config.title: string
defineDataApp.config.scope: { organization: string; environment: string; } — Display labels; scope does not grant data access.
defineDataApp.config.description: string — Explain what the app helps readers explore.
defineDataApp.config.appearance?: AppearanceOptions — Omit to use the standard appearance.
defineDataApp.config.dateFormatting?: { locale?: string | undefined; timeZone?: string | undefined; } — Shared date display defaults. Reporting views and individual fields may override the time zone.
defineDataApp.config.queries: Queries & KnownRecord<Queries> & ('' extends keyof Queries ? never : unknown) & { [Name in keyof Queries]: KnownRecord<Queries[Name]> & { ...; }; } — Named SQL statements with typed parameters and result projections.
defineDataIdentifiers (function, @altertable/data-app-react): <const Tables extends Record<string, TableIdentifier>, const Columns extends Record<string, ColumnIdentifier<Extract<keyof Tables, string>>>>(options: {…}): { definitions: Readonly<Record<IdentifierId<Tables, Columns>, DataIdentifierDefinition>>; DataIdentifier: ({ id, display, }: { ...; }) => Elem… — Register exact source names once; returned JSX IDs are checked against this registry.
defineDataIdentifiers.options.tables: Tables
defineDataIdentifiers.options.columns: Columns
defineDataQueryRoute (function, @altertable/data-app/contract): <Operations extends OperationContracts = OperationContracts>(operations: Operations): DataQueryRoute<Operations> — Omit contracts only in generic hosts such as the CLI shell, where Bun validates operations.
defineDateRangeContract (function, @altertable/data-app/contract): (options: DateRangeContractOptions): { request: (value: unknown, compare?: boolean | undefined) => DateRangeRequest; parseRequest: (value: unknown) => DateRangeRequest; bounds: () => { minDate: string | undefined; maxDate: string; maxRangeDays: number; timeZone: string; }; ... 4 more ...; view: { .… — One source policy for the server parser, URL variable, and displayed reporting period.
defineDateRangeContract.options.minDate?: string
defineDateRangeContract.options.maxDate?: string | (() => string)
defineDateRangeContract.options.maxRangeDays: number
defineDateRangeContract.options.timeZone: string
defineDateRangeContract.options.completeDays?: boolean
defineMessageRoute (function, @altertable/data-app/contract): <Input, Output>(route: MessageRoute<Input, Output>): MessageRoute<Input, Output>
defineMessageRoute.route.input: (value: unknown) => Input
defineMessageRoute.route.output: (value: unknown, input: Input) => Output
defineOperation (function, @altertable/data-app/contract): <Input, Output, const Queries extends QueryDefinitions>(operation: OperationDefinition<Input, Output, Queries> & { queries: CheckedQueries<Queries>; }): Omit<DataOperation<Input, Output>, 'queryNames'> & { queryNames: { readonly [Name in keyof Queries & string]: Name; }; }
defineOperation.operation.input: (value: unknown) => Input
defineOperation.operation.checks: readonly [Input, ...Input[]]
defineOperation.operation.policy: { maxQueryRows: number; maxDurationMs: number; maxResponseBytes?: number | undefined; }
defineOperation.operation.run: (context: Pick<OperationContext, 'signal'> & { query: RegisteredQuery<NoInfer<Queries>>; }, input: Input) => Promise<...>
defineOperation.operation.queries: CheckedQueries<Queries>
defineQueryNames (function, @altertable/data-app/contract): <const Names extends Record<string, string>>(names: Names): Names
DetailContent (class, @altertable/data-app-react): <Data, Input> — A destination’s rendered body. Pass these to DataApp.details.
DetailContent.target: DetailView<Data, Input>
DetailContent.render: (source: ViewSource<Data, Input>) => ReactNode
DetailView (class, @altertable/data-app-react): <Data, Input> — A typed, query-backed destination.
DetailView.definition: DetailViewDefinition<Data, Input>
DetailView.useResult: (input: Input) => ViewResult<Data, Input>
DetailView.content: (render: (source: ViewSource<Data, Input>) => ReactNode) => DetailContent<Data, Input>
DetailViewDefinition (type, @altertable/data-app-react): <Data, Input>
DetailViewDefinition.id: string
DetailViewDefinition.title: ReactNode
DetailViewDefinition.parseInput: (input: unknown) => Input — Validates untrusted navigation input before a detail operation can run.
DetailViewDefinition.describeInput: (input: Input) => string
DetailViewDefinition.isEmpty: (data: Data) => boolean
DetailViewDefinition.emptyFallback: EmptyContent
dimensionFilter (function, @altertable/data-app/contract): <const T extends string>(config: DimensionFilterOptions<T>): DimensionVariable<T>; <const T extends number>(config: DimensionFilterOptions<T>): DimensionVariable<T> — A bounded categorical filter with app-owned fixed options.
dimensionFilter.config.key: string
dimensionFilter.config.label: string
dimensionFilter.config.allowMissing?: boolean
dimensionFilter.config.allowExclusion?: boolean
dimensionFilter.config.history?: HistoryMode
dimensionFilter.config.presentation?: VariablePresentation
dimensionFilter.config.selectionMode: 'single' [variant 1 of 2]
dimensionFilter.config.maxSelected?: 1 [variant 1 of 2]
dimensionFilter.config.valueType: T extends number ? 'number' : 'string'
dimensionFilter.config.options: readonly DimensionOption<T>[]
dimensionFilter.config.selectionMode: 'multiple' [variant 2 of 2]
dimensionFilter.config.maxSelected?: number [variant 2 of 2]
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
DimensionPicker.filter: DimensionSelectionVariable<T>
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
DimensionVariable (type, @altertable/data-app/contract): <T> — A fixed-option dimension retains its distinction from query-backed facets.
DimensionVariable.kind: 'dimension'
DimensionVariable.label: string
DimensionVariable.presentation?: VariablePresentation
DimensionVariable.urlKeys: readonly string[]
DimensionVariable.defaultValue: DimensionSelection<T>
DimensionVariable.clearValue?: DimensionSelection<T> — Unrestricted value, when this variable represents a filter.
DimensionVariable.describe: ((value: DimensionSelection<T>) => string) & ((selection: DimensionSelection<T>, options?: readonly DimensionOption<T>[] | undefined) => string)
DimensionVariable.history: HistoryMode
DimensionVariable.read: (params: URLSearchParams) => DimensionSelection<T>
DimensionVariable.write: (value: DimensionSelection<T>) => Record<string, string | null>
DimensionVariable.valid: (value: DimensionSelection<T>) => boolean
DimensionVariable.same: (left: DimensionSelection<T>, right: DimensionSelection<T>) => boolean
DimensionVariable.optionsSource: 'fixed'
DimensionVariable.selectionMode: 'multiple' | 'single'
DimensionVariable.valueType: T extends number ? 'number' : 'string'
DimensionVariable.allowMissing: boolean
DimensionVariable.allowExclusion: boolean
DimensionVariable.maxSelected: number
DimensionVariable.options: readonly DimensionOption<T>[]
DisclosedQuery (type, @altertable/data-app/contract): One registered statement an operation ran, with its parameter values.
DisclosedQuery.name: string
DisclosedQuery.statement: string
DisclosedQuery.params?: Readonly<Record<string, QueryParameterValue>>
DisclosedQuery.queryId?: string
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
FilterActions (component, @altertable/data-app-react/ui): (props: FilterActionsProps)
FilterActions.onClear?: (() => void)
FilterActions.onApply: () => void [variant 1 of 2]
FilterActions.onCancel: () => void [variant 1 of 2]
FilterActionsProps (type, @altertable/data-app-react/ui): = props listed as FilterActions.*
FilterBar (component, @altertable/data-app-react/ui): (props: FilterBarProps)
FilterBar.…: plus props inherited from React
FilterBarProps (type, @altertable/data-app-react/ui): <HTMLAttributes<HTMLDivElement>, HTMLDivElement>
FilterBarProps.…: plus props inherited from React
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
FunnelChart.steps: readonly FunnelChartStep[]
FunnelChart.series: readonly FunnelChartSeries[]
FunnelChartProps (type, @altertable/data-app-react/ui): = props listed as FunnelChart.*
FunnelChartSeries (type, @altertable/data-app-react/ui)
FunnelChartSeries.id: string — Unique, nonblank population ID.
FunnelChartSeries.label: string
FunnelChartSeries.values: readonly number[] — Finite, nonnegative counts aligned with steps and nonincreasing.
FunnelChartStep (type, @altertable/data-app-react/ui): Ordered step with a unique, nonblank ID.
FunnelChartStep.id: string
FunnelChartStep.label: string
getDataAppNavigation (function, @altertable/data-app/client): (frame: Window): DataAppNavigation | undefined — URL controls attach navigation on demand; bootstrap and data-only clients do not.
getDataAppNavigation.frame.…: plus props inherited from built-in
getDataAppTransport (function, @altertable/data-app/client): (frame: Window): { logger: DataAppLogger; request: (message: RoutedMessage, signal?: AbortSignal | undefined) => Promise<unknown>; transport: (operation: string, input: unknown, signal?: AbortSignal | undefined) => Promise<...>; ... 7 more ...; fail(cause?: unknown): void; } | undefined — The bootstrap installs this before executing app code. URL apps can install an explicit connection.
getDataAppTransport.frame.…: plus props inherited from built-in
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
IframeTransport (type, @altertable/data-app/client)
IframeTransport.logger: DataAppLogger
IframeTransport.request: (message: RoutedMessage, signal?: AbortSignal | undefined) => Promise<unknown>
IframeTransport.transport: (operation: string, input: unknown, signal?: AbortSignal | undefined) => Promise<TransportResponse>
IframeTransport.lakehouse: { queryAll(statement: string, { limit, signal, params }: { limit: number; signal: AbortSignal; name?: string | undefined; params?: Readonly<Record<string, QueryParameterValue>> | undefined; }): Promise<...>; }
IframeTransport.dispose: () => void
IframeTransport.mode: 'bundle' | 'url'
IframeTransport.snapshot: () => unknown
IframeTransport.subscribe: (listener: (state: unknown) => void) => () => void
IframeTransport.ready: () => void
IframeTransport.supportContentSizing: () => () => void — The UI owner calls this once its styles support content sizing; the parent's `sizing: 'content'` presentation then applies until the returned release runs.
IframeTransport.fail: (cause?: unknown) => void — Reports a fatal app failure; the cause reaches the host logger only.
injectDataAppAnnotationStyles (function, @altertable/data-app-react): (options: DataAppStylesOptions): HTMLStyleElement — Install only the outer-frame annotation controls; leave host page typography and layout intact.
injectDataAppAnnotationStyles.options.document?: Document — Defaults to the current browser document.
injectDataAppAnnotationStyles.options.nonce?: string — Nonce permitted by the document's style-src CSP.
injectDataAppStyles (function, @altertable/data-app-react, @altertable/data-app-react/ui): (options: DataAppStylesOptions): HTMLStyleElement — Install the complete UI stylesheet once per document, before mounting.
injectDataAppStyles.options.document?: Document — Defaults to the current browser document.
injectDataAppStyles.options.nonce?: string — Nonce permitted by the document's style-src CSP.
InputOf (type, @altertable/data-app/client): <T> = T extends { input: (value: unknown) => infer Input; } ? Input : never
installDataAppTransport (function, @altertable/data-app/client): (bridge: ReturnType<typeof createIframeTransport>, frame: Window): () => void — Install an explicitly trusted transport for hosted apps and their URL-backed controls.
installDataAppTransport.bridge.logger: DataAppLogger
installDataAppTransport.bridge.request: (message: RoutedMessage, signal?: AbortSignal | undefined) => Promise<unknown>
installDataAppTransport.bridge.transport: (operation: string, input: unknown, signal?: AbortSignal | undefined) => Promise<TransportResponse>
installDataAppTransport.bridge.lakehouse: { queryAll(statement: string, { limit, signal, params }: { limit: number; signal: AbortSignal; name?: string | undefined; params?: Readonly<Record<string, QueryParameterValue>> | undefined; }): Promise<...>; }
installDataAppTransport.bridge.dispose: () => void
installDataAppTransport.bridge.mode: 'bundle' | 'url'
installDataAppTransport.bridge.snapshot: () => unknown
installDataAppTransport.bridge.subscribe: (listener: (state: unknown) => void) => () => void
installDataAppTransport.bridge.ready: () => void
installDataAppTransport.bridge.supportContentSizing: () => () => void — The UI owner calls this once its styles support content sizing; the parent's `sizing: 'content'` presentation then applies until the returned release runs.
installDataAppTransport.bridge.fail: (cause?: unknown) => void — Reports a fatal app failure; the cause reaches the host logger only.
installDataAppTransport.frame.…: plus props inherited from built-in
isPlainKeyEvent (function, @altertable/data-app-react/ui): (event: KeyEvent, options: {…}): boolean — Keep local key actions separate from shortcuts and IME composition. Pass React's nativeEvent.
isPlainKeyEvent.event.…: plus props inherited from built-in
isPlainKeyEvent.options.allowShift?: boolean
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
Lakehouse (type, @altertable/data-app/contract): Query interface supplied by a server adapter or an authorized iframe bridge.
Lakehouse.queryAll: (statement: string, options: { limit: number; signal: AbortSignal; name?: string | undefined; params?: Readonly<Record<string, QueryParameterValue>> | undefined; }) => Promise<...>
LineChart (component, @altertable/data-app-react/ui): <Row extends LineChartItem>(props: LineChartProps<Row>) — Equally spaced finite samples in supplied order; fill missing periods explicitly. Supports negative values, single points, and horizontal scrolling for long series.
LineChart.items: readonly Row[] — Ordered samples; the chart validates IDs and values when rendering.
LineChart.itemActions?: ItemActions<Row> — Actions available for each displayed item. Domain fields remain available to this callback.
LineChart.unit: string
LineChart.ariaLabel: string
LineChart.formatValue?: ((value: number) => string)
LineChartItem (type, @altertable/data-app-react/ui)
LineChartItem.id: string
LineChartItem.label: string
LineChartItem.value: number
LineChartProps (type, @altertable/data-app-react/ui): <Row> = props listed as LineChart.*
LiveControl (component, @altertable/data-app-react/ui): (props: LiveControlProps) — Toggle an app-owned recurring refresh. The app supplies the timer and its cadence.
LiveControl.enabled: boolean
LiveControl.onChange: (enabled: boolean) => void
LiveControl.intervalSeconds: LiveIntervalSeconds
LiveControl.onIntervalChange: (seconds: LiveIntervalSeconds) => void
LiveControl.…: plus props inherited from React
LiveControlProps (type, @altertable/data-app-react/ui): = props listed as LiveControl.*
LiveIntervalSeconds (type, @altertable/data-app-react/ui): = 30 | 60 | 300
localLakehouse (function, @altertable/data-app-bun): (environment: Record<string, string | undefined>, request: typeof fetch): Lakehouse — Server-only SDK adapter. Local development uses the selected CLI profile's proxy.
matchSearchText (function, @altertable/data-app-react/ui): (text: string, query: string): SearchMatchValue — Highlight literal query terms in supplied text without filtering or reordering results.
Menu (component, @altertable/data-app-react/ui): <T extends object>(props: MenuProps<T>) — Actions by default; single selection creates radio items, multiple creates checkbox items.
Menu.…: plus props inherited from @react-types/shared, react-aria, react-aria-components
MenuButton (component, @altertable/data-app-react/ui): (props: Omit<ComponentPropsWithRef<typeof AriaButton>, 'className'> & Pick<ButtonProps, 'variant' | 'size'> & { className?: string; }) — React Aria trigger behavior with the same presentation as the native Button.
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
MenuSeparator (component, @altertable/data-app-react/ui): (props: ComponentPropsWithRef<typeof Separator>)
MenuSeparator.…: plus props inherited from @react-types/shared, React, react-aria, react-aria-components
MenuTrigger (component, @altertable/data-app-react/ui): (props: MenuTriggerProps)
MenuTrigger.…: plus props inherited from react-aria-components, react-stately
MenuTriggerProps (type, @altertable/data-app-react/ui): = props listed as MenuTrigger.*
MessageContext (type, @altertable/data-app/contract)
MessageContext.signal: AbortSignal
MessageDispatcher (type, @altertable/data-app/contract): = (message: unknown, context: MessageContext) => Promise<unknown>
MessageHandlers (type, @altertable/data-app/contract): <Routes> = { [Name in keyof Routes]: (payload: ReturnType<Routes[Name]['input']>, context: MessageContext) => Promise<ReturnType<Routes[Name]['output']>> | ReturnType<...>; }
MessageInput (type, @altertable/data-app/contract): <Route> = Route['input'] extends (...args: any) => infer R ? R : any
MessageOutput (type, @altertable/data-app/contract): <Route, Input> = Route extends DataQueryRoute<infer Operations extends OperationContracts> ? Input extends { operation: infer Name extends keyof Operations; } ? TransportResponse<...> : never : ReturnType<...>
MessageRoute (type, @altertable/data-app/contract): <Input, Output> = props listed as defineMessageRoute.route.*
MessageRoutes (type, @altertable/data-app/contract): = { [x: string]: { input: (value: unknown) => unknown; output: (value: unknown, input: never) => unknown; }; }
MessageRoutingError (class, @altertable/data-app/contract): Only these deliberate, public failures cross the message boundary. Other errors stay private.
MessageRoutingError.code: string
MessageRoutingError.requestId?: string
MessageRoutingError.…: plus props inherited from built-in
MessageTransport (type, @altertable/data-app/contract): = (message: RoutedMessage, signal?: AbortSignal | undefined) => Promise<unknown>
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
MetricReading.value: MetricValues & { period?: DateRangeRequest | undefined; } [variant 2 of 2]
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
multiChoiceVariable (function, @altertable/data-app-react): <const Options extends readonly ChoiceOption[], const Presentation extends VariablePresentation | undefined = undefined>(options: Omit<ScalarVariableOptions, 'defaultValue' | 'presentation'> & { presentation?: Presentation; defaultValue?: readonly NoInfer<Options[number]['id']>[]; options: Options…
multiChoiceVariable.options.label?: string
multiChoiceVariable.options.key: string
multiChoiceVariable.options.history?: HistoryMode
multiChoiceVariable.options.presentation?: Presentation
multiChoiceVariable.options.defaultValue?: readonly NoInfer<Options[number]['id']>[]
multiChoiceVariable.options.options: Options & (Options extends readonly [] ? never : unknown)
multiChoiceVariable.options.maxSelected?: number
MultiChoiceVariable (type, @altertable/data-app-react)
MultiChoiceVariable.kind: 'multiChoice'
MultiChoiceVariable.label?: string
MultiChoiceVariable.presentation?: VariablePresentation
MultiChoiceVariable.urlKeys: readonly string[]
MultiChoiceVariable.defaultValue: readonly string[]
MultiChoiceVariable.clearValue?: readonly string[] — Unrestricted value, when this variable represents a filter.
MultiChoiceVariable.describe?: ((value: readonly string[]) => string)
MultiChoiceVariable.history: HistoryMode
MultiChoiceVariable.read: (params: URLSearchParams) => readonly string[]
MultiChoiceVariable.write: (value: readonly string[]) => Record<string, string | null>
MultiChoiceVariable.valid: (value: readonly string[]) => boolean
MultiChoiceVariable.same: (left: readonly string[], right: readonly string[]) => boolean
MultiChoiceVariable.options: readonly ChoiceOption[]
MultiChoiceVariable.maxSelected: number
NavigationUpdate (type, @altertable/data-app/contract)
NavigationUpdate.search: string
NavigationUpdate.hash: string
NavigationUpdate.mode: HistoryMode
NavigationUpdate.title?: string
navigationUpdateRoute (const, @altertable/data-app/contract): MessageRoute<NavigationUpdate, null>
navigationUpdateRoute.input: (value: unknown) => NavigationUpdate
navigationUpdateRoute.output: (value: unknown, input: NavigationUpdate) => null
normalizeAppearance (function, @altertable/data-app/appearance): (value: AppearanceOptions): AppearanceSettings — Resolve typed app settings without repeating authoring checks at runtime.
normalizeAppearance.value.theme?: ThemePreference
normalizeAppearance.value.baseColor?: 'neutral' | 'slate' | 'warm' — Palette for surfaces, text, and borders; independent of the accent.
normalizeAppearance.value.accentColor?: string — Emphasis color for checked controls and selected dates; options use the base palette.
normalizeAppearance.value.darkAccentColor?: string
normalizeAppearance.value.chartColors?: string[]
normalizeAppearance.value.density?: 'comfortable' | 'compact' | 'spacious'
normalizeAppearance.value.cornerRadius?: 'large' | 'medium' | 'none' | 'small'
normalizeAppearance.value.elevation?: 'flat' | 'raised' | 'subtle'
normalizeAppearance.value.typography?: Partial<{ body: string; heading: string; }>
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
numberFilter.options.presentation?: VariablePresentation
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
OperationContext (type, @altertable/data-app/contract)
OperationContext.lakehouse: Lakehouse
OperationContext.signal: AbortSignal
OperationContext.queryParams?: Readonly<Record<string, QueryParameterValue>>
OperationContracts (type, @altertable/data-app/contract): = { [x: string]: { input: (value: unknown) => unknown; }; }
OperationDefinition (type, @altertable/data-app/contract): <Input, Output, Queries> — Infer operation data from run().
OperationDefinition.input: (value: unknown) => Input
OperationDefinition.checks: readonly [Input, ...Input[]]
OperationDefinition.policy: { maxQueryRows: number; maxDurationMs: number; maxResponseBytes?: number | undefined; }
OperationDefinition.run: (context: Pick<OperationContext, 'signal'> & { query: RegisteredQuery<NoInfer<Queries>>; }, input: Input) => Promise<...>
OutputOf (type, @altertable/data-app/client): <T> = T extends { run: (...args: never[]) => Promise<infer Output>; } ? Output : unknown — An operation's data is what its `run` resolves to.
parseAppearance (function, @altertable/data-app/appearance): (value: unknown): AppearanceSettings — Preserve supported external settings and use defaults for invalid fields.
parseBooleanSelection (function, @altertable/data-app/contract): (value: unknown, filter: BooleanFilter): BooleanSelection
parseBooleanSelection.filter.kind: 'booleanFilter'
parseBooleanSelection.filter.label: string
parseBooleanSelection.filter.presentation?: VariablePresentation
parseBooleanSelection.filter.urlKeys: readonly string[]
parseBooleanSelection.filter.defaultValue: BooleanSelection
parseBooleanSelection.filter.clearValue?: BooleanSelection — Unrestricted value, when this variable represents a filter.
parseBooleanSelection.filter.describe?: ((value: BooleanSelection) => string)
parseBooleanSelection.filter.history: HistoryMode
parseBooleanSelection.filter.read: (params: URLSearchParams) => BooleanSelection
parseBooleanSelection.filter.write: (value: BooleanSelection) => Record<string, string | null>
parseBooleanSelection.filter.valid: (value: BooleanSelection) => boolean
parseBooleanSelection.filter.same: (left: BooleanSelection, right: BooleanSelection) => boolean
parseCount (function, @altertable/data-app/contract): (value: unknown): number — Accepts numeric strings from DuckDB; rejects negative, fractional, and unsafe integers.
parseDataAppAnnotationDraft (function, @altertable/data-app/contract): (value: unknown): DataAppAnnotationDraft — Reconstruct at the boundary; discard extra fields and bound the entire JSON payload.
parseDateRangeInput (function, @altertable/data-app/contract): (value: unknown, options: {…}): DateRange — Validate calendar dates and a bounded inclusive range on the server.
parseDateRangeInput.options.minDate?: string
parseDateRangeInput.options.maxDate?: string
parseDateRangeInput.options.maxRangeDays: number
parseDateTime (function, @altertable/data-app/format): (value: DateTimeValue): Date | null — Parse only unambiguous instants. String values must include `Z` or an explicit offset.
parseDimensionSelection (function, @altertable/data-app/contract): <T extends DimensionValue>(value: unknown, filter: DimensionSelectionVariable<T>): DimensionSelection<T> — Server-side parser; call from the operation input parser before building SQL.
parseDimensionSelection.filter.kind: 'dimension'
parseDimensionSelection.filter.label: string
parseDimensionSelection.filter.presentation?: VariablePresentation
parseDimensionSelection.filter.urlKeys: readonly string[]
parseDimensionSelection.filter.defaultValue: DimensionSelection<T>
parseDimensionSelection.filter.clearValue?: DimensionSelection<T> — Unrestricted value, when this variable represents a filter.
parseDimensionSelection.filter.describe: ((value: DimensionSelection<T>) => string) & ((selection: DimensionSelection<T>, options?: readonly DimensionOption<T>[] | undefined) => string)
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
parseEmptyInput (function, @altertable/data-app/contract): (value: unknown): Record<string, never>
parseFacetOptions (function, @altertable/data-app/contract): <T extends DimensionValue>(value: unknown, filter: DimensionSelectionVariable<T>): DimensionOption<T>[] — Validate bounded facet results before showing them in a picker.
parseFacetOptions.filter.kind: 'dimension'
parseFacetOptions.filter.label: string
parseFacetOptions.filter.presentation?: VariablePresentation
parseFacetOptions.filter.urlKeys: readonly string[]
parseFacetOptions.filter.defaultValue: DimensionSelection<T>
parseFacetOptions.filter.clearValue?: DimensionSelection<T> — Unrestricted value, when this variable represents a filter.
parseFacetOptions.filter.describe: ((value: DimensionSelection<T>) => string) & ((selection: DimensionSelection<T>, options?: readonly DimensionOption<T>[] | undefined) => string)
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
parseNumberSelection.filter.presentation?: VariablePresentation
parseNumberSelection.filter.urlKeys: readonly string[]
parseNumberSelection.filter.defaultValue: NumberSelection
parseNumberSelection.filter.clearValue?: NumberSelection — Unrestricted value, when this variable represents a filter.
parseNumberSelection.filter.describe?: ((value: NumberSelection) => string)
parseNumberSelection.filter.history: HistoryMode
parseNumberSelection.filter.read: (params: URLSearchParams) => NumberSelection
parseNumberSelection.filter.write: (value: NumberSelection) => Record<string, string | null>
parseNumberSelection.filter.valid: (value: NumberSelection) => boolean
parseNumberSelection.filter.same: (left: NumberSelection, right: NumberSelection) => boolean
parseNumberSelection.filter.min?: number
parseNumberSelection.filter.max?: number
parseTrue (function, @altertable/data-app/contract): (value: unknown): true
PeriodComparison (type, @altertable/data-app-react)
PeriodComparison.kind: 'previous' [variant 1 of 2]
PeriodComparison.kind: 'period' [variant 2 of 2]
PeriodComparison.period: ReportingPeriod [variant 2 of 2]
PeriodSummary (component, @altertable/data-app-react): (props: PeriodSummaryProps) — Read-only period context for the variable bar, including exact bounds for assistive technology.
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
previousDateRange (function, @altertable/data-app/contract): (options: DateRangeInput): DateRange — The immediately preceding, equally long set of calendar days.
previousDateRange.options.start: string
previousDateRange.options.end: string
QueryDefinitions (type, @altertable/data-app, @altertable/data-app/contract, @altertable/data-app/config): <Record<string, QueryDefinition>> = { readonly [x: string]: QueryDefinition; }
QueryField (type, @altertable/data-app, @altertable/data-app/contract, @altertable/data-app/config)
QueryField.type: keyof QueryValues
QueryField.nullable?: boolean
QueryParameter (type, @altertable/data-app, @altertable/data-app/contract, @altertable/data-app/config): Typed scalar parameters with optional fallback values.
QueryParameter.type: 'boolean' [variants 1, 5 of 8]
QueryParameter.nullable?: false [variants 1, 2, 3, 4 of 8]
QueryParameter.defaultValue?: boolean [variant 1 of 8]
QueryParameter.type: 'null' [variants 2, 6 of 8]
QueryParameter.defaultValue?: null [variants 2, 6 of 8]
QueryParameter.type: 'number' [variants 3, 7 of 8]
QueryParameter.defaultValue?: number [variant 3 of 8]
QueryParameter.type: 'string' [variants 4, 8 of 8]
QueryParameter.defaultValue?: string [variant 4 of 8]
QueryParameter.nullable: true [variants 5, 6, 7, 8 of 8]
QueryParameter.defaultValue?: boolean | null [variant 5 of 8]
QueryParameter.defaultValue?: number | null [variant 7 of 8]
QueryParameter.defaultValue?: string | null [variant 8 of 8]
QueryParameters (type, @altertable/data-app/contract): <Record<string, QueryParameterValue>> = { readonly [x: string]: QueryParameterValue; } — Parameters are scalar SQL values, never identifiers or SQL fragments.
QueryParameterValue (type, @altertable/data-app, @altertable/data-app/contract, @altertable/data-app/config): = string | number | boolean | null
QueryProjections (type, @altertable/data-app, @altertable/data-app/contract, @altertable/data-app/config): <Record<string, QueryField>> = { readonly [x: string]: QueryField; }
QueryResult (type, @altertable/data-app/contract): <Row> — Lakehouse results contain positional unknown cells; registered queries supply decoded records.
QueryResult.columns: { name: string; type?: string | undefined; }[]
QueryResult.rows: Row[]
QueryResult.queryId?: string
QueryRow (type, @altertable/data-app, @altertable/data-app/contract, @altertable/data-app/config): <Projections> = { -readonly [Name in keyof Projections]: QueryValue<Projections[Name]>; }
QueryValueType (type, @altertable/data-app, @altertable/data-app/contract, @altertable/data-app/config): = keyof QueryValues — Primitive values after decoding, independent of SQL storage types.
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
RegisteredQuery (type, @altertable/data-app/contract): <Queries> = <Name extends keyof Queries & string, const Params extends object = {}, const Limit extends number = number>(name: Name & (true extends IsUnion<NoInfer<Name>> ? [ParameterNames<Queries, Name>] extends [...] ? unknown : never : unknown), params?: ExactQueryParameters<...> | undefined, options?: { ..…
ReportingPeriod (type, @altertable/data-app/contract, @altertable/data-app-react)
ReportingPeriod.kind: 'rolling' [variant 1 of 2]
ReportingPeriod.amount: number [variant 1 of 2]
ReportingPeriod.unit: 'day' | 'hour' [variant 1 of 2]
ReportingPeriod.end: string
ReportingPeriod.kind: 'calendar' [variant 2 of 2]
ReportingPeriod.start: string [variant 2 of 2]
ReportingPeriod.timeZone: string [variant 2 of 2]
RequestAccess (type, @altertable/data-app/server): Authorization result for one viewer request. A hosted adapter must scope its lakehouse client.
RequestAccess.lakehouse: Lakehouse
RequestAccess.queryParams?: Readonly<Record<string, QueryParameterValue>> — Trusted values shared across queries; each query uses only its declared keys.
RetentionChart (component, @altertable/data-app-react/ui): (props: RetentionChartProps) — Query-defined retention curves with count inspection and dotted incomplete periods. Rates are not recomputed from counts. Compose inside VisualizationWidget.
RetentionChart.ariaLabel: string — Accessible measure and scope description.
RetentionChart.unit: string — Population unit, such as users or sessions.
RetentionChart.formatValue?: ((value: number) => string) — Formats counts; rates use percentage formatting.
RetentionChart.className?: string
RetentionChart.series: readonly RetentionChartSeries[]
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
RoutedMessage (type, @altertable/data-app/contract)
RoutedMessage.route: string
RoutedMessage.payload: unknown
ScatterChart (component, @altertable/data-app-react/ui): (props: ScatterChartProps) — Independent finite X/Y observations on linear axes that include zero. Negative and constant coordinates are supported.
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
searchVariable (function, @altertable/data-app-react): (options: Omit<ScalarVariableOptions, 'presentation'>): SearchVariable — Search query state; typing replaces history by default.
searchVariable.options.label?: string
searchVariable.options.key: string
searchVariable.options.defaultValue?: string
searchVariable.options.history?: HistoryMode
SearchVariable (type, @altertable/data-app-react)
SearchVariable.kind: 'search'
SearchVariable.label?: string
SearchVariable.presentation?: VariablePresentation
SearchVariable.urlKeys: readonly string[]
SearchVariable.defaultValue: string
SearchVariable.clearValue?: string — Unrestricted value, when this variable represents a filter.
SearchVariable.describe?: ((value: string) => string)
SearchVariable.history: HistoryMode
SearchVariable.read: (params: URLSearchParams) => string
SearchVariable.write: (value: string) => Record<string, string | null>
SearchVariable.valid: (value: string) => boolean
SearchVariable.same: (left: string, right: string) => boolean
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
serveAppFile (function, @altertable/data-app-bun/preview): (options: AppFilePreviewOptions): Promise<AppFilePreview> — Preview a single-file app in the hosted sandbox. Requires the Bun runtime.
serveAppFile.options.file: string — Absolute path to the app source.
serveAppFile.options.port?: number — Localhost port. Use 0 to select an available port. Defaults to 25837.
serveAppFile.options.lakehouse: Lakehouse — Server-only query backend; the caller owns credentials and profile selection.
serveAppFile.options.resolveDependency?: ((specifier: string) => string) — Override data-app and React import resolution, such as for checkout development.
serveLocalApp (function, @altertable/data-app-bun): (options: {…}): Server<undefined> — Serve one app on localhost through the CLI's lakehouse proxy during development. Hosted servers must authorize every viewer and must use `createDataHandler` directly.
serveLocalApp.options.page: HTMLBundle
serveLocalApp.options.operations: DataOperations
serveLocalApp.options.title: string
serveLocalApp.options.port?: number
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
Skeleton (component, @altertable/data-app-react): (props: SkeletonProps) — Decorative loading placeholder that fades in only when loading takes a moment. Put the accessible status on its container.
Skeleton.inline?: boolean — Align a text-sized placeholder with surrounding prose.
Skeleton.…: plus props inherited from React
SkeletonProps (type, @altertable/data-app-react): = props listed as Skeleton.*
SqlQueryInput (type, @altertable/data-app/contract)
SqlQueryInput.statement: string
SqlQueryInput.limit: number
SqlQueryInput.params?: Readonly<Record<string, QueryParameterValue>>
sqlQueryRoute (const, @altertable/data-app/contract): MessageRoute<SqlQueryInput, QueryResult> — SQL delivery for browser-owned operations. Hosts must enforce backend access and resource limits.
sqlQueryRoute.input: (value: unknown) => SqlQueryInput
sqlQueryRoute.output: (value: unknown, input: SqlQueryInput) => QueryResult
Stack (component, @altertable/data-app-react): (props: StackProps) — Vertical layout for peer sections or request boundaries, with the page's section gap.
Stack.children: ReactNode
Stack.gap?: 'lg' | 'md' | 'sm'
Stack.…: plus props inherited from React
StackProps (type, @altertable/data-app-react): = props listed as Stack.*
startDataAppBootstrap (function, @altertable/data-app-embed): (options: {…}): () => void — Run from a trusted bootstrap page in an allow-scripts-only iframe. CSP can prohibit network access.
startDataAppBootstrap.options.parentOrigin: string
startDataAppBootstrap.options.window?: Window
StoryFinding (type, @altertable/data-app-react/ui): One consequential, inspectable finding from the displayed result.
StoryFinding.id: string
StoryFinding.headline: string
StoryFinding.context?: string
StoryFinding.visual: ReactNode
StoryFinding.visualKind?: 'chart' | 'metric'
StoryFinding.evidence: MetricDefinition | WidgetEvidence
Tab (component, @altertable/data-app-react/ui): (props: ComponentPropsWithRef<typeof AriaTab>)
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
TabPanel (component, @altertable/data-app-react/ui): (props: ComponentPropsWithRef<typeof AriaTabPanel>)
TabPanel.…: plus props inherited from @react-types/shared, React, react-aria, react-aria-components
TabPanels (function, @altertable/data-app-react/ui): <T>(props: TabPanelsProps<T> & React.RefAttributes<HTMLDivElement>): ReactElement<unknown, string | JSXElementConstructor<any>> | null — Groups multiple `<TabPanel>` elements, and provides CSS variables for animated transitions.
TabPanels.props.…: plus props inherited from @react-types/shared, React, react-aria-components
Tabs (component, @altertable/data-app-react/ui): (props: ComponentPropsWithRef<typeof AriaTabs>)
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
Theme (type, @altertable/data-app/appearance): = 'dark' | 'light' — Brand settings; parsing is portable, while theme application requires the browser.
ThemeController (type, @altertable/data-app/appearance)
ThemeController.getTheme: () => ThemePreference
ThemeController.setTheme: (theme: ThemePreference) => void
ThemeController.subscribe: (listener: () => void) => () => void
ThemePreference (type, @altertable/data-app/appearance): = 'system' | Theme
Tooltip (component, @altertable/data-app-react, @altertable/data-app-react/ui): (props: TooltipProps) — Short visual hint for an already labeled control. variant="chart" follows the cursor on hover and toggles on tap so a bar or point can show the period and value.
Tooltip.content: ReactNode
Tooltip.children: ReactNode
Tooltip.variant?: 'chart' | 'hint'
Tooltip.onOpenChange?: ((open: boolean) => void)
Tooltip.align?: 'center' | 'end' | 'start'
Tooltip.placement?: 'bottom' | 'top'
Tooltip.portalRoot?: RefObject<HTMLElement | null>
Tooltip.…: plus props inherited from React
TooltipProps (type, @altertable/data-app-react, @altertable/data-app-react/ui): = props listed as Tooltip.*
TooltipProvider (component, @altertable/data-app-react, @altertable/data-app-react/ui): (props: TooltipProviderProps) — Delay the first hover, then open nearby tooltips without waiting during the skip window. Keyboard focus always opens immediately. AppLayout provides this by default.
TooltipProvider.children: ReactNode
TooltipProvider.delay?: number
TooltipProvider.skipDelayDuration?: number
TooltipProviderProps (type, @altertable/data-app-react, @altertable/data-app-react/ui): = props listed as TooltipProvider.*
TransportResponse (type, @altertable/data-app/contract): <Body> — Delivery envelope shared by HTTP and iframe transports.
TransportResponse.status: number
TransportResponse.body: Body
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
useAppVariables (hook, @altertable/data-app-react/ui): <const Variables extends VariableCollection>(definitions: Variables): { values: AppVariableValues<Variables>; set: <Key extends keyof Variables & string>(name: Key, value: AppVariableValues<Variables>[Key]) => void; ... 4 more ...; bind: <Key extends keyof Variables & string>(name: Key) => { ...; }… — URL is the source of truth for app variables; one update can change dependent values atomically.
useDataAppAnnotations (hook, @altertable/data-app-react): (): { requestSendAnnotations(options?: { signal?: AbortSignal | undefined; } | undefined): Promise<null>; reportAnnotationEditorState(state: { hasUnsavedChanges: boolean; }, options?: { ...; } | undefined): Promise<...>; addAnnotation(draft: DataAppAnnotationDraft, options?: { ...; } | undefined):… — Bind annotation delivery to this app's current iframe bridge. The host owns storage and submission.
useDateFormatting (hook, @altertable/data-app-react, @altertable/data-app-react/ui): (options: {…}): { locale: string; timeZone: string; } — Resolve date display defaults for custom charts and narrative. Explicit options override the view and app.
useDateFormatting.options.locale?: string
useDateFormatting.options.timeZone?: string
useDetailNavigation (hook, @altertable/data-app-react): (): DetailNavigation — Resolve a detail target from an interaction. The destination validates input before fetching.
useSvgId (hook, @altertable/data-app-react/ui): (): string — Stable React ID for SVG definitions and their URL references; safe with identifier prefixes.
useViewTab (hook, @altertable/data-app-react/ui): <View extends string>(views: readonly View[], fallback: View): [View, (key: string | number) => void] — Keep a page-level tab in `?view=`; reserve `?tab=` for the inspect sheet.
validateLakehouseCredentials (function, @altertable/data-app-bun): (environment: Record<string, string | undefined>): void — Throw an actionable startup error when the selected lakehouse credentials are missing.
VariableBar (component, @altertable/data-app-react/ui): (props: VariableBarProps) — User-controlled inputs below the page header.
VariableBar.children: ReactNode
VariableBar.…: plus props inherited from React
VariableBarProps (type, @altertable/data-app-react/ui): = props listed as VariableBar.*
variableInput (function, @altertable/data-app/contract): <Input extends object, const Variables extends VariableCollection>(parse: (value: unknown) => Input, variables: Variables & { [Key in keyof Variables]: Variables[Key] extends { kind: 'dateRange'; } ? never : Variables[Key]; }): (value: unknown) => Input & AppVariableValues<Variables> — Validate named variable values at the operation boundary. Date inputs belong to the base parser.
VariablePresentation (type, @altertable/data-app-react)
VariablePresentation.group?: 'display' | 'scope' — Scope changes the included data; display changes its presentation. Defaults to scope.
VariablePresentation.control?: 'toolbar' | 'widget' — Widget controls render beside their visualization instead of in the toolbar. Scope filters remain available in the Filters sheet and active summaries.
VariablePresentation.prominence?: 'primary' | 'secondary' — Secondary scope controls live in the Filters sheet with compact pickers when active; secondary display options follow primary options. Defaults to primary.
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
```
