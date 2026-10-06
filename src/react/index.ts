/**
 * React bindings and UI; inject styles explicitly in the browser entry.
 * @module @altertable/data-app/react
 * @see https://github.com/altertable-ai/data-app/blob/main/docs/react.md
 */
export { injectDataAppStyles } from '@/src/react/styles';
export { injectDataAppShellStyles } from '@/src/react/shellStyles';
export type { DataAppStylesOptions } from '@/src/react/styles';

export { mountDataApp, DataAppProvider } from '@/src/react/mount';
export { createDataHooks } from '@/src/react/hooks';
export { defineDataContent } from '@/src/react/content';
export type { DataContentState } from '@/src/react/content';
export type {
  DataViewDefinition,
  ResolvedVariables,
  ViewBindings,
} from '@/src/react/view';

export type { CsvCell, CsvTable, CsvExport } from '@/src/react/ui/csv-export';

// App shell and getting started
export { DataApp } from '@/src/react/ui/DataApp';
export type { DataAppProps, DataAppRequest } from '@/src/react/ui/DataApp';
export { GettingStarted } from '@/src/react/ui/GettingStarted';
export { AppLayout } from '@/src/react/ui/AppLayout';
export type { AppLayoutProps } from '@/src/react/ui/AppLayout';
export { AppHeader } from '@/src/react/ui/AppHeader';
export type { AppHeaderProps } from '@/src/react/ui/AppHeader';
export { AppScope } from '@/src/react/ui/AppScope';
export type { AppScopeProps } from '@/src/react/ui/AppScope';
export { AppToolbar } from '@/src/react/ui/AppToolbar';
export type { AppToolbarProps } from '@/src/react/ui/AppToolbar';
export { VariableBar } from '@/src/react/ui/VariableBar';
export type { VariableBarProps } from '@/src/react/ui/VariableBar';
export { AppFooter } from '@/src/react/ui/AppFooter';
export type { AppFooterProps } from '@/src/react/ui/AppFooter';
export { ThemeSelector, ThemeToggle } from '@/src/react/ui/ThemeSelector';
export type { ThemeSelectorProps } from '@/src/react/ui/ThemeSelector';

// Layout
export { Stack } from '@/src/react/ui/Stack';
export type { StackProps } from '@/src/react/ui/Stack';
export { Grid } from '@/src/react/ui/Grid';
export type { GridProps } from '@/src/react/ui/Grid';
export { GridItem } from '@/src/react/ui/GridItem';
export type { GridItemProps } from '@/src/react/ui/GridItem';

// Widgets and visualizations
export type { WidgetEvidence } from '@/src/react/ui/WidgetEvidence';
export { DataWidget } from '@/src/react/ui/DataWidget';
export type { WidgetStatus } from '@/src/react/ui/RequestHint';
export type { DataWidgetProps } from '@/src/react/ui/DataWidget';
export { TextContent } from '@/src/react/ui/TextContent';
export type { TextContentProps } from '@/src/react/ui/TextContent';
export { DataValue } from '@/src/react/ui/DataValue';
export type { DataValueProps } from '@/src/react/ui/DataValue';
export { TextWidget } from '@/src/react/ui/TextWidget';
export type { TextWidgetProps } from '@/src/react/ui/TextWidget';
export { VisualizationWidget } from '@/src/react/ui/VisualizationWidget';
export type {
  VisualizationWidgetProps,
  VisualizationWidgetView,
} from '@/src/react/ui/VisualizationWidget';
export { TableWidget } from '@/src/react/ui/TableWidget';
export type {
  TableWidgetColumn,
  TableWidgetProps,
  TableWidgetSearch,
} from '@/src/react/ui/TableWidget';
export { chartColor } from '@/src/react/ui/chartColor';
export { Breakdown } from '@/src/react/ui/Breakdown';
export type { BreakdownItem, BreakdownProps } from '@/src/react/ui/Breakdown';
export { Ranking } from '@/src/react/ui/Ranking';
export type { RankingItem, RankingProps } from '@/src/react/ui/Ranking';
export { WidgetDisclosure } from '@/src/react/ui/WidgetDisclosure';
export type { WidgetDisclosureProps } from '@/src/react/ui/WidgetDisclosure';
export { WidgetViewTabs } from '@/src/react/ui/WidgetViewTabs';
export type {
  WidgetView,
  WidgetViewTabsProps,
} from '@/src/react/ui/WidgetViewTabs';
export { Comparison } from '@/src/react/ui/Comparison';
export type { ComparisonProps } from '@/src/react/ui/Comparison';
export { calendarMetricComparison } from '@/src/react/ui/metric-comparison';
export type { MetricComparison } from '@/src/react/ui/metric-comparison';
export {
  DataTable,
  DataTableEmptyRow,
  DataTableTimestamp,
  DataTableShare,
} from '@/src/react/ui/DataTable';
export type {
  DataTableProps,
  DataTableSearch,
  DataTableEmptyRowProps,
  DataTableTimestampProps,
} from '@/src/react/ui/DataTable';
export { MetricWidget } from '@/src/react/ui/MetricWidget';
export type { MetricWidgetProps } from '@/src/react/ui/MetricWidget';
export { BarChart } from '@/src/react/ui/BarChart';
export type { BarChartProps, BarChartItem } from '@/src/react/ui/BarChart';
export { DimensionPicker } from '@/src/react/ui/DimensionPicker';

// Request states and freshness
export { EmptyState } from '@/src/react/ui/EmptyState';
export type { EmptyStateProps } from '@/src/react/ui/EmptyState';
export { Skeleton } from '@/src/react/ui/Skeleton';
export type { SkeletonProps } from '@/src/react/ui/Skeleton';
export { DataAppSkeleton } from '@/src/react/ui/DataAppSkeleton';
export type { DataAppSkeletonProps } from '@/src/react/ui/DataAppSkeleton';
export { DataBoundary } from '@/src/react/ui/DataBoundary';
export { resolveDataView } from '@/src/core/data-view';
export { displayedSnapshot } from '@/src/core/data-view';
export type {
  DataView,
  DataSnapshot,
  DisplayedSnapshot,
} from '@/src/core/data-view';
export type { DataBoundaryProps } from '@/src/react/ui/DataBoundary';
export { RefreshRegion } from '@/src/react/ui/RefreshRegion';
export type { RefreshRegionProps } from '@/src/react/ui/RefreshRegion';
export { DataSection } from '@/src/react/ui/DataSection';
export type {
  DataSectionProps,
  SectionResult,
} from '@/src/react/ui/DataSection';
export { StatusPanel } from '@/src/react/ui/StatusPanel';
export type { StatusPanelProps } from '@/src/react/ui/StatusPanel';
export { ContentSkeleton } from '@/src/react/ui/ContentSkeleton';
export type { ContentSkeletonProps } from '@/src/react/ui/ContentSkeleton';
export { DataViewToast } from '@/src/react/ui/DataViewToast';
export type { DataViewToastProps } from '@/src/react/ui/DataViewToast';
export { UpdatedAt } from '@/src/react/ui/UpdatedAt';
export type { UpdatedAtProps } from '@/src/react/ui/UpdatedAt';
export { DateTimeTooltip } from '@/src/react/ui/DateTimeTooltip';
export type { DateTimeTooltipProps } from '@/src/react/ui/DateTimeTooltip';

// Filters, URL state, and controls
export { LiveControl } from '@/src/react/ui/LiveControl';
export type {
  LiveControlProps,
  LiveIntervalSeconds,
} from '@/src/react/ui/LiveControl';
export { DateRangePicker } from '@/src/react/ui/DateRangePicker';
export type {
  DatePresetId,
  DateRange,
  DateRangePickerProps,
} from '@/src/react/ui/DateRangePicker';
export {
  defineAppVariables,
  textVariable,
  selectVariable,
  dateRangeVariable,
  dateRangeControl,
  useAppVariables,
} from '@/src/react/ui/variables';
export type {
  AppVariable,
  AppVariableValues,
  DateRangeSelection,
  DateRangeVariable,
  DateRangeVariableOptions,
} from '@/src/react/ui/variables';
export { PeriodSummary } from '@/src/react/ui/PeriodSummary';
export type {
  ReportingPeriod,
  PeriodComparison,
  PeriodSummaryProps,
} from '@/src/react/ui/PeriodSummary';
export { SearchField } from '@/src/react/ui/SearchField';
export type { SearchFieldProps } from '@/src/react/ui/SearchField';
export { searchItems } from '@/src/react/ui/searchItems';
export type {
  SearchAttribute,
  SearchHit,
  SearchItemsOptions,
  SearchMatchValue,
  SearchRange,
} from '@/src/react/ui/searchItems';
export { SearchMatch } from '@/src/react/ui/SearchMatch';
export type { SearchMatchProps } from '@/src/react/ui/SearchMatch';
export { Combobox } from '@/src/react/ui/Combobox';
export type { ComboboxOption, ComboboxProps } from '@/src/react/ui/Combobox';
export { GradientScroll } from '@/src/react/ui/GradientScroll';
export type { GradientScrollProps } from '@/src/react/ui/GradientScroll';
export {
  searchParams,
  subscribeSearch,
  writeSearch,
} from '@/src/react/ui/search';
export {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  useViewTab,
} from '@/src/react/ui/Tabs';

// Data context and query inspection
export {
  createDataContext,
  defineDataContext,
  evidenceFor,
} from '@/src/react/ui/data-context';
export type { DataContext, GlossaryEntry } from '@/src/react/ui/data-context';
export { defineDataIdentifiers } from '@/src/react/ui/data-identifiers';
export type {
  DataIdentifierDefinition,
  TableIdentifier,
  ColumnIdentifier,
} from '@/src/react/ui/data-identifiers';
export { GlossaryExplanation } from '@/src/react/ui/GlossaryExplanation';
export type { GlossaryExplanationProps } from '@/src/react/ui/GlossaryExplanation';
export { GlossaryDefinition } from '@/src/react/ui/GlossaryDefinition';
export type { GlossaryDefinitionProps } from '@/src/react/ui/GlossaryDefinition';
export { AboutData } from '@/src/react/ui/AboutData';
export type {
  AboutDataProps,
  AboutEmpty,
  AboutSubject,
  AboutTab,
} from '@/src/react/ui/AboutData';

// Present mode
export { PresentStory } from '@/src/react/ui/PresentStory';
export type { PresentStoryProps } from '@/src/react/ui/PresentStory';
export type { StoryFinding, BoundStory } from '@/src/react/ui/story';

export { Checkbox } from '@/src/react/ui/Checkbox';
export type { CheckboxProps } from '@/src/react/ui/Checkbox';

// Buttons, overlays, and icons
export { AppIcon } from '@/src/react/ui/icons';
export type { AppIconName, AppIconProps } from '@/src/react/ui/icons';
export { IconButton } from '@/src/react/ui/IconButton';
export type { IconButtonProps } from '@/src/react/ui/IconButton';
export { Kbd } from '@/src/react/ui/Kbd';
export type { KbdProps } from '@/src/react/ui/Kbd';
export { Sheet } from '@/src/react/ui/Sheet';
export type { SheetDialogProps, SheetProps } from '@/src/react/ui/Sheet';
export { Tooltip, TooltipProvider } from '@/src/react/ui/Tooltip';
export type {
  TooltipProps,
  TooltipProviderProps,
} from '@/src/react/ui/Tooltip';
export { Button } from '@/src/react/ui/Button';
export type { ButtonProps } from '@/src/react/ui/Button';
export { HelpPopover } from '@/src/react/ui/HelpPopover';
export type {
  HelpPopoverPanelProps,
  HelpPopoverProps,
  HelpPopoverTriggerProps,
} from '@/src/react/ui/HelpPopover';

export type { MetricDefinition } from '@/src/react/ui/metric';
export type {
  DataReading,
  MetricReading,
  MetricValues,
} from '@/src/core/reading';

export { LineChart } from '@/src/react/ui/LineChart';
export type { LineChartProps, LineChartItem } from '@/src/react/ui/LineChart';
export { AreaChart } from '@/src/react/ui/AreaChart';
export type { AreaChartProps, AreaChartItem } from '@/src/react/ui/AreaChart';

export { PieChart } from '@/src/react/ui/PieChart';
export type { PieChartProps, PieChartItem } from '@/src/react/ui/PieChart';

export { ScatterChart } from '@/src/react/ui/ScatterChart';
export type {
  ScatterChartProps,
  ScatterChartItem,
} from '@/src/react/ui/ScatterChart';
