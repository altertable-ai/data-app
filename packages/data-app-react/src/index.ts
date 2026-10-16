/** Declared views, bound widgets, and layouts for data-app authoring. */
export {
  type DatasetColumn,
  type DatasetSuggestionOptions,
  type DatasetDeclaration as DatasetDefinition,
} from './bindings.ts';
export { injectDataAppStyles, type DataAppStylesOptions } from './styles.ts';
export {
  type DataAppStyle,
  type DataAppStyleToken,
  type DataAppStyleHooks,
} from './style-contract.ts';
export { mountDataApp } from './mount.tsx';
export { createDataHooks } from './hooks.ts';
export { type CsvCell } from './ui/csv-export.ts';
export { DataApp, type DataAppProps } from './ui/DataApp.tsx';
export { Stack, type StackProps } from './ui/Stack.tsx';
export { Grid, type GridProps } from './ui/Grid.tsx';
export { GridItem, type GridItemProps } from './ui/GridItem.tsx';
export { type WidgetEvidence } from './ui/WidgetEvidence.ts';
export { TextContent, type TextContentProps } from './ui/TextContent.tsx';
export {
  DataValue,
  type DataValueProps,
  TextWidget,
  type TextWidgetProps,
  VisualizationWidget,
  type VisualizationWidgetProps,
  type VisualizationWidgetView,
  TableWidget,
  type TableWidgetProps,
  MetricWidget,
  type MetricWidgetProps,
} from './widgets.tsx';
export { type TableWidgetSearch } from './ui/TableWidget.tsx';
export { chartColor } from './ui/chartColor.ts';
export {
  Breakdown,
  type BreakdownItem,
  type BreakdownProps,
} from './ui/Breakdown.tsx';
export { Ranking, type RankingItem, type RankingProps } from './ui/Ranking.tsx';
export { Comparison, type ComparisonProps } from './ui/Comparison.tsx';
export { EmptyState, type EmptyStateProps } from './ui/EmptyState.tsx';
export { Skeleton, type SkeletonProps } from './ui/Skeleton.tsx';
export { DataSection, type DataSectionProps } from './ui/DataSection.tsx';
export { UpdatedAt, type UpdatedAtProps } from './ui/UpdatedAt.tsx';
export {
  DateTimeTooltip,
  type DateTimeTooltipProps,
} from './ui/DateTimeTooltip.tsx';
export {
  searchVariable,
  choiceVariable,
  multiChoiceVariable,
  dateRangeVariable,
  type AppVariable,
  type VariablePresentation,
  type AppVariableValues,
  type ChoiceOption,
  type ChoiceVariable,
  type MultiChoiceVariable,
  type SearchVariable,
  type DateRangeSelection,
  type DateRangeVariable,
  type DateRangeVariableOptions,
} from './ui/variables.ts';
export {
  PeriodSummary,
  type ReportingPeriod,
  type PeriodComparison,
  type PeriodSummaryProps,
} from './ui/PeriodSummary.tsx';
export {
  createDataContext,
  type DataContext,
  type GlossaryEntry,
} from './ui/data-context.ts';
export {
  defineDataIdentifiers,
  type DataIdentifierDefinition,
  type TableIdentifier,
  type ColumnIdentifier,
} from './ui/data-identifiers.tsx';
export { IconButton, type IconButtonProps } from './ui/IconButton.tsx';
export {
  Tooltip,
  TooltipProvider,
  type TooltipProps,
  type TooltipProviderProps,
} from './ui/Tooltip.tsx';
export { Button, type ButtonProps } from './ui/Button.tsx';
export { type MetricDefinition } from './ui/metric.ts';
export { type MetricValues } from '@altertable/data-app/internal';
export {
  AnnotationTarget,
  type AnnotationTargetProps,
} from './annotations/AnnotationTarget.tsx';
export { useDataAppAnnotations } from './annotations/useDataAppAnnotations.ts';
export {
  AnnotationBar,
  type AnnotationBarHandle,
  type AnnotationBarProps,
} from './annotations/AnnotationBar.tsx';
export { injectDataAppAnnotationStyles } from './annotations/styles.ts';
export {
  SectionHeading,
  type SectionHeadingProps,
} from './ui/SectionHeading.tsx';
export { DateDisplay, type DateDisplayProps } from './ui/DateDisplay.tsx';
export { useDateFormatting } from './date-formatting.ts';
