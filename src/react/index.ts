/** Declared views, bound widgets, and layouts for data-app authoring. */
export type {
  DatasetColumn,
  DatasetDeclaration as DatasetDefinition,
} from '@/src/react/bindings';
export { injectDataAppStyles } from '@/src/react/styles';
export type { DataAppStylesOptions } from '@/src/react/styles';
export type {
  DataAppStyle,
  DataAppStyleToken,
  DataAppStyleHooks,
} from '@/src/react/style-contract';
export { mountDataApp } from '@/src/react/mount';
export { createDataHooks } from '@/src/react/hooks';
export type { CsvCell } from '@/src/react/ui/csv-export';
export { DataApp } from '@/src/react/ui/DataApp';
export type { DataAppProps } from '@/src/react/ui/DataApp';
export { Stack } from '@/src/react/ui/Stack';
export type { StackProps } from '@/src/react/ui/Stack';
export { Grid } from '@/src/react/ui/Grid';
export type { GridProps } from '@/src/react/ui/Grid';
export { GridItem } from '@/src/react/ui/GridItem';
export type { GridItemProps } from '@/src/react/ui/GridItem';
export type { WidgetEvidence } from '@/src/react/ui/WidgetEvidence';
export { TextContent } from '@/src/react/ui/TextContent';
export type { TextContentProps } from '@/src/react/ui/TextContent';
export { DataValue } from '@/src/react/widgets';
export type { DataValueProps } from '@/src/react/widgets';
export { TextWidget } from '@/src/react/widgets';
export type { TextWidgetProps } from '@/src/react/widgets';
export { VisualizationWidget } from '@/src/react/widgets';
export type { VisualizationWidgetProps } from '@/src/react/widgets';
export type { VisualizationWidgetView } from '@/src/react/widgets';
export { TableWidget } from '@/src/react/widgets';
export type { TableWidgetProps } from '@/src/react/widgets';
export type { TableWidgetSearch } from '@/src/react/ui/TableWidget';
export { chartColor } from '@/src/react/ui/chartColor';
export { Breakdown } from '@/src/react/ui/Breakdown';
export type { BreakdownItem, BreakdownProps } from '@/src/react/ui/Breakdown';
export { Ranking } from '@/src/react/ui/Ranking';
export type { RankingItem, RankingProps } from '@/src/react/ui/Ranking';
export { Comparison } from '@/src/react/ui/Comparison';
export type { ComparisonProps } from '@/src/react/ui/Comparison';
export { MetricWidget } from '@/src/react/widgets';
export type { MetricWidgetProps } from '@/src/react/widgets';
export { EmptyState } from '@/src/react/ui/EmptyState';
export type { EmptyStateProps } from '@/src/react/ui/EmptyState';
export { Skeleton } from '@/src/react/ui/Skeleton';
export type { SkeletonProps } from '@/src/react/ui/Skeleton';
export { DataSection } from '@/src/react/ui/DataSection';
export type { DataSectionProps } from '@/src/react/ui/DataSection';
export { UpdatedAt } from '@/src/react/ui/UpdatedAt';
export type { UpdatedAtProps } from '@/src/react/ui/UpdatedAt';
export { DateTimeTooltip } from '@/src/react/ui/DateTimeTooltip';
export type { DateTimeTooltipProps } from '@/src/react/ui/DateTimeTooltip';
export {
  textVariable,
  selectVariable,
  dateRangeVariable,
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
export { createDataContext } from '@/src/react/ui/data-context';
export type { DataContext, GlossaryEntry } from '@/src/react/ui/data-context';
export { defineDataIdentifiers } from '@/src/react/ui/data-identifiers';
export type {
  DataIdentifierDefinition,
  TableIdentifier,
  ColumnIdentifier,
} from '@/src/react/ui/data-identifiers';
export { IconButton } from '@/src/react/ui/IconButton';
export type { IconButtonProps } from '@/src/react/ui/IconButton';
export { Tooltip, TooltipProvider } from '@/src/react/ui/Tooltip';
export type {
  TooltipProps,
  TooltipProviderProps,
} from '@/src/react/ui/Tooltip';
export { Button } from '@/src/react/ui/Button';
export type { ButtonProps } from '@/src/react/ui/Button';
export type { MetricDefinition } from '@/src/react/ui/metric';
export type { MetricValues } from '@/src/core/reading';

export { AnnotationTarget } from '@/src/react/annotations/AnnotationTarget';
export type { AnnotationTargetProps } from '@/src/react/annotations/AnnotationTarget';

export { useDataAppAnnotations } from '@/src/react/annotations/useDataAppAnnotations';

export { AnnotationBar } from '@/src/react/annotations/AnnotationBar';
export type {
  AnnotationBarHandle,
  AnnotationBarProps,
} from '@/src/react/annotations/AnnotationBar';

export { injectDataAppAnnotationStyles } from '@/src/react/annotations/styles';
