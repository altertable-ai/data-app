/** Declared views, bound widgets, and layouts for data-app authoring. */
export type {
  DatasetColumn,
  DatasetSuggestionOptions,
  DatasetDeclaration as DatasetDefinition,
} from '../bindings.ts';
export type { MetricRecords } from '../bindings.ts';
export { injectDataAppStyles } from '../styles.ts';
export type { DataAppStylesOptions } from '../styles.ts';
export type {
  DataAppStyle,
  DataAppStyleToken,
  DataAppStyleHooks,
} from '../style-contract.ts';
export { mountDataApp } from '../mount.tsx';
export { createDataHooks } from '../hooks.ts';
export { DetailView, DetailContent, useDetailNavigation } from '../details.tsx';
export type { DetailViewDefinition } from '../details.tsx';
export type { CsvCell } from '../ui/csv-export.ts';
export { DataApp } from '../ui/DataApp.tsx';
export type { DataAppProps } from '../ui/DataApp.tsx';
export { Stack } from '../ui/Stack.tsx';
export type { StackProps } from '../ui/Stack.tsx';
export { Grid } from '../ui/Grid.tsx';
export type { GridProps } from '../ui/Grid.tsx';
export { GridItem } from '../ui/GridItem.tsx';
export type { GridItemProps } from '../ui/GridItem.tsx';
export type { WidgetEvidence } from '../ui/WidgetEvidence.ts';
export { TextContent } from '../ui/TextContent.tsx';
export type { TextContentProps } from '../ui/TextContent.tsx';
export { DataValue } from '../widgets.tsx';
export type { DataValueProps } from '../widgets.tsx';
export { TextWidget } from '../widgets.tsx';
export type { TextWidgetProps } from '../widgets.tsx';
export { VisualizationWidget } from '../widgets.tsx';
export type { VisualizationWidgetProps } from '../widgets.tsx';
export type { VisualizationWidgetView } from '../widgets.tsx';
export { TableWidget } from '../widgets.tsx';
export type { TableWidgetProps } from '../widgets.tsx';
export type { TableWidgetSearch } from '../ui/TableWidget.tsx';
export { chartColor } from '../ui/chartColor.ts';
export { Breakdown } from '../ui/Breakdown.tsx';
export type { BreakdownItem, BreakdownProps } from '../ui/Breakdown.tsx';
export { Ranking } from '../ui/Ranking.tsx';
export type { RankingItem, RankingProps } from '../ui/Ranking.tsx';
export { Comparison } from '../ui/Comparison.tsx';
export type { ComparisonProps } from '../ui/Comparison.tsx';
export { MetricWidget } from '../widgets.tsx';
export type { MetricWidgetProps } from '../widgets.tsx';
export { EmptyState } from '../ui/EmptyState.tsx';
export type { EmptyStateProps } from '../ui/EmptyState.tsx';
export { Skeleton } from '../ui/Skeleton.tsx';
export type { SkeletonProps } from '../ui/Skeleton.tsx';
export { DataSection } from '../ui/DataSection.tsx';
export type { DataSectionProps } from '../ui/DataSection.tsx';
export { UpdatedAt } from '../ui/UpdatedAt.tsx';
export type { UpdatedAtProps } from '../ui/UpdatedAt.tsx';
export { DateTimeTooltip } from '../ui/DateTimeTooltip.tsx';
export type { DateTimeTooltipProps } from '../ui/DateTimeTooltip.tsx';
export {
  searchVariable,
  choiceVariable,
  multiChoiceVariable,
  dateRangeVariable,
} from '../ui/variables.ts';
export type {
  AppVariable,
  VariablePresentation,
  AppVariableValues,
  ChoiceOption,
  ChoiceVariable,
  MultiChoiceVariable,
  SearchVariable,
  DateRangeSelection,
  DateRangeVariable,
  DateRangeVariableOptions,
} from '../ui/variables.ts';
export { PeriodSummary } from '../ui/PeriodSummary.tsx';
export type {
  ReportingPeriod,
  PeriodComparison,
  PeriodSummaryProps,
} from '../ui/PeriodSummary.tsx';
export { createDataContext } from '../ui/data-context.ts';
export type { DataContext, GlossaryEntry } from '../ui/data-context.ts';
export { defineDataIdentifiers } from '../ui/data-identifiers.tsx';
export type {
  DataIdentifierDefinition,
  TableIdentifier,
  ColumnIdentifier,
} from '../ui/data-identifiers.tsx';
export { IconButton } from '../ui/IconButton.tsx';
export type { IconButtonProps } from '../ui/IconButton.tsx';
export { Tooltip, TooltipProvider } from '../ui/Tooltip.tsx';
export type { TooltipProps, TooltipProviderProps } from '../ui/Tooltip.tsx';
export { Button } from '../ui/Button.tsx';
export type { ButtonProps } from '../ui/Button.tsx';
export type { MetricDefinition } from '../ui/metric.ts';
export type { MetricValues } from '@altertable/data-app/internal';

export { AnnotationTarget } from '../annotations/AnnotationTarget.tsx';
export type { AnnotationTargetProps } from '../annotations/AnnotationTarget.tsx';

export { SectionHeading } from '../ui/SectionHeading.tsx';
export type { SectionHeadingProps } from '../ui/SectionHeading.tsx';
export { DateDisplay } from '../ui/DateDisplay.tsx';
export type { DateDisplayProps } from '../ui/DateDisplay.tsx';
export { useDateFormatting } from '../date-formatting.ts';
