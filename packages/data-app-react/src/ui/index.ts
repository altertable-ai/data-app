/** Direct UI composition and static screens. Requests use declared views from /react. */
export { DataAppProvider } from '../mount.tsx';
export { isPlainKeyEvent } from './keyboard.ts';
export { GettingStarted } from './GettingStarted.tsx';
export { DataWidget } from './DataWidget.tsx';
export type { WidgetStatus } from './RequestHint.tsx';
export type { DataWidgetProps } from './DataWidget.tsx';
export { TextWidget } from './TextWidget.tsx';
export type { TextWidgetProps } from './TextWidget.tsx';
export { VisualizationWidget } from './VisualizationWidget.tsx';
export type { VisualizationWidgetProps } from './VisualizationWidget.tsx';
export { TableWidget } from './TableWidget.tsx';
export type { TableWidgetProps } from './TableWidget.tsx';
export {
  DataTable,
  DataTableEmptyRow,
  DataTableTimestamp,
  DataTableShare,
} from './DataTable.tsx';
export type {
  DataTableProps,
  DataTableSearch,
  DataTableEmptyRowProps,
  DataTableTimestampProps,
} from './DataTable.tsx';
export { MetricWidget } from './MetricWidget.tsx';
export type { MetricWidgetProps } from './MetricWidget.tsx';
export { DimensionPicker } from './DimensionPicker.tsx';
export { LiveControl } from './LiveControl.tsx';
export type { LiveControlProps, LiveIntervalSeconds } from './LiveControl.tsx';
export { DateRangePicker } from './DateRangePicker.tsx';
export type {
  DatePresetId,
  DateRange,
  DateRangePickerProps,
} from './DateRangePicker.tsx';
export { useAppVariables } from './variables.ts';
export { SearchField } from './SearchField.tsx';
export type { SearchFieldProps } from './SearchField.tsx';
export { searchItems, matchSearchText } from './searchItems.ts';
export type {
  SearchAttribute,
  SearchHit,
  SearchItemsOptions,
  SearchMatchValue,
  SearchRange,
} from './searchItems.ts';
export { SearchMatch } from './SearchMatch.tsx';
export type { SearchMatchProps } from './SearchMatch.tsx';
export { ChoicePicker } from './ChoicePicker.tsx';
export type { ChoiceOption, ChoicePickerProps } from './ChoicePicker.tsx';
export {
  MenuTrigger,
  MenuButton,
  MenuPopover,
  Menu,
  MenuItem,
  MenuSection,
  MenuSeparator,
} from './Menu.tsx';
export type {
  MenuTriggerProps,
  MenuPopoverProps,
  MenuProps,
  MenuItemProps,
} from './Menu.tsx';
export { GradientScroll } from './GradientScroll.tsx';
export type { GradientScrollProps } from './GradientScroll.tsx';
export {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  useViewTab,
} from './Tabs.tsx';
export { GlossaryExplanation } from './GlossaryExplanation.tsx';
export type { GlossaryExplanationProps } from './GlossaryExplanation.tsx';
export { GlossaryDefinition } from './GlossaryDefinition.tsx';
export type { GlossaryDefinitionProps } from './GlossaryDefinition.tsx';
export { AboutData } from './AboutData.tsx';
export type {
  AboutDataProps,
  AboutEmpty,
  AboutSubject,
  AboutTab,
} from './AboutData.tsx';
export { PresentStory } from './PresentStory.tsx';
export type { PresentStoryProps } from './PresentStory.tsx';
export type { StoryFinding, BoundStory } from './story.ts';
export { Checkbox } from './Checkbox.tsx';
export type { CheckboxProps } from './Checkbox.tsx';
export { AppIcon } from './icons.ts';
export type { AppIconName, AppIconProps } from './icons.ts';
export { Sheet } from './Sheet.tsx';
export type { SheetProps } from './Sheet.tsx';
export { HelpPopover } from './HelpPopover.tsx';
export type { HelpPopoverProps } from './HelpPopover.tsx';
export { DataApp } from './StaticDataApp.tsx';
export type { DataAppProps } from './StaticDataApp.tsx';
export { injectDataAppStyles } from '../styles.ts';
export { Tooltip, TooltipProvider } from './Tooltip.tsx';
export type { TooltipProps, TooltipProviderProps } from './Tooltip.tsx';

export { LineChart } from './LineChart.tsx';
export type { LineChartProps, LineChartItem } from './LineChart.tsx';
export { AreaChart } from './AreaChart.tsx';
export type { AreaChartProps, AreaChartItem } from './AreaChart.tsx';
export { PieChart } from './PieChart.tsx';
export type { PieChartProps, PieChartItem } from './PieChart.tsx';
export { ScatterChart } from './ScatterChart.tsx';
export type { ScatterChartProps, ScatterChartItem } from './ScatterChart.tsx';
export { BarChart } from './BarChart.tsx';
export type { BarChartProps, BarChartItem } from './BarChart.tsx';

export { DataValue } from './DataValue.tsx';
export type { DataValueProps } from './DataValue.tsx';
export type { CsvExport, CsvTable } from './csv-export.ts';
export type { TableWidgetColumn } from './TableWidget.tsx';

export type { DataReading, MetricReading } from '@altertable/data-app/internal';

export type {
  DataAppStyle,
  DataAppStyleToken,
  DataAppStyleHooks,
} from '../style-contract.ts';

export { Select } from './Select.tsx';
export type { SelectProps } from './Select.tsx';
export { RadioGroup, Radio, SegmentedControl } from './RadioGroup.tsx';
export type {
  RadioGroupProps,
  RadioProps,
  SegmentedControlProps,
} from './RadioGroup.tsx';
export { CheckboxGroup } from './CheckboxGroup.tsx';
export type { CheckboxGroupProps } from './CheckboxGroup.tsx';
export { NumberField, NumberRangeField } from './NumberField.tsx';
export type {
  NumberFieldProps,
  NumberRangeFieldProps,
  NumberRange,
} from './NumberField.tsx';
export { FilterBar } from './FilterBar.tsx';
export type { FilterBarProps } from './FilterBar.tsx';
export { VariableBar } from './VariableBar.tsx';
export type { VariableBarProps } from './VariableBar.tsx';
export { FilterActions } from './FilterActions.tsx';
export type { FilterActionsProps } from './FilterActions.tsx';

export { NumberFilterPicker } from './NumberFilterPicker.tsx';
export type { NumberFilterPickerProps } from './NumberFilterPicker.tsx';

export { ComposedChart } from './ComposedChart.tsx';
export type { ComposedChartProps } from './ComposedChart.tsx';

export { ChartLegend } from './ChartLegend.tsx';
export type {
  ChartLegendProps,
  ChartLegendItemProps,
  ChartLegendMarkerProps,
  ChartLegendLabelProps,
  ChartLegendMarkerKind,
} from './ChartLegend.tsx';
export type { ComposedChartLegendProps } from './ComposedChartLegend.tsx';

export { FunnelChart } from './FunnelChart.tsx';
export type {
  FunnelChartProps,
  FunnelChartStep,
  FunnelChartSeries,
} from './FunnelChart.tsx';
export { RetentionChart } from './RetentionChart.tsx';
export type {
  RetentionChartProps,
  RetentionChartPoint,
  RetentionChartSeries,
} from './RetentionChart.tsx';
export { JourneyChart } from './JourneyChart.tsx';
export type { JourneyChartProps, JourneyChartPath } from './JourneyChart.tsx';

export { useSvgId } from './useSvgId.ts';

export { SearchTypeahead } from './SearchTypeahead.tsx';
export type {
  SearchTypeaheadProps,
  SearchSuggestion,
} from './SearchTypeahead.tsx';

export { SectionHeading } from './SectionHeading.tsx';
export type { SectionHeadingProps } from './SectionHeading.tsx';
export { DateDisplay } from './DateDisplay.tsx';
export type { DateDisplayProps } from './DateDisplay.tsx';
export { useDateFormatting } from '../date-formatting.ts';

export { ExplorationActionControl } from './ExplorationActionControl.tsx';
export type {
  ExplorationActionControlProps,
  ExplorationAction,
  ItemActions,
} from './ExplorationActionControl.tsx';
