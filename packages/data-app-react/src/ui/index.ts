/** Direct UI composition and static screens. Requests use declared views from @altertable/data-app-react. */
export { DataAppProvider } from '../mount.tsx';
export { isPlainKeyEvent } from './keyboard.ts';
export { GettingStarted } from './GettingStarted.tsx';
export { DataWidget, type DataWidgetProps } from './DataWidget.tsx';
export { type WidgetStatus } from './RequestHint.tsx';
export { TextWidget, type TextWidgetProps } from './TextWidget.tsx';
export {
  VisualizationWidget,
  type VisualizationWidgetProps,
} from './VisualizationWidget.tsx';
export {
  TableWidget,
  type TableWidgetProps,
  type TableWidgetColumn,
} from './TableWidget.tsx';
export {
  DataTable,
  DataTableEmptyRow,
  DataTableTimestamp,
  DataTableShare,
  type DataTableProps,
  type DataTableSearch,
  type DataTableEmptyRowProps,
  type DataTableTimestampProps,
} from './DataTable.tsx';
export { MetricWidget, type MetricWidgetProps } from './MetricWidget.tsx';
export { DimensionPicker } from './DimensionPicker.tsx';
export {
  LiveControl,
  type LiveControlProps,
  type LiveIntervalSeconds,
} from './LiveControl.tsx';
export {
  DateRangePicker,
  type DatePresetId,
  type DateRange,
  type DateRangePickerProps,
} from './DateRangePicker.tsx';
export { useAppVariables } from './variables.ts';
export { SearchField, type SearchFieldProps } from './SearchField.tsx';
export {
  searchItems,
  matchSearchText,
  type SearchAttribute,
  type SearchHit,
  type SearchItemsOptions,
  type SearchMatchValue,
  type SearchRange,
} from './searchItems.ts';
export { SearchMatch, type SearchMatchProps } from './SearchMatch.tsx';
export {
  ChoicePicker,
  type ChoiceOption,
  type ChoicePickerProps,
} from './ChoicePicker.tsx';
export {
  MenuTrigger,
  MenuButton,
  MenuPopover,
  Menu,
  MenuItem,
  MenuSection,
  MenuSeparator,
  type MenuTriggerProps,
  type MenuPopoverProps,
  type MenuProps,
  type MenuItemProps,
} from './Menu.tsx';
export { GradientScroll, type GradientScrollProps } from './GradientScroll.tsx';
export {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  useViewTab,
} from './Tabs.tsx';
export {
  GlossaryExplanation,
  type GlossaryExplanationProps,
} from './GlossaryExplanation.tsx';
export {
  GlossaryDefinition,
  type GlossaryDefinitionProps,
} from './GlossaryDefinition.tsx';
export {
  AboutData,
  type AboutDataProps,
  type AboutEmpty,
  type AboutSubject,
  type AboutTab,
} from './AboutData.tsx';
export { PresentStory, type PresentStoryProps } from './PresentStory.tsx';
export { type StoryFinding, type BoundStory } from './story.ts';
export { Checkbox, type CheckboxProps } from './Checkbox.tsx';
export { AppIcon, type AppIconName, type AppIconProps } from './icons.ts';
export { Sheet, type SheetProps } from './Sheet.tsx';
export { HelpPopover, type HelpPopoverProps } from './HelpPopover.tsx';
export { DataApp, type DataAppProps } from './StaticDataApp.tsx';
export { injectDataAppStyles } from '../styles.ts';
export {
  Tooltip,
  TooltipProvider,
  type TooltipProps,
  type TooltipProviderProps,
} from './Tooltip.tsx';
export {
  LineChart,
  type LineChartProps,
  type LineChartItem,
} from './LineChart.tsx';
export {
  AreaChart,
  type AreaChartProps,
  type AreaChartItem,
} from './AreaChart.tsx';
export {
  PieChart,
  type PieChartProps,
  type PieChartItem,
} from './PieChart.tsx';
export {
  ScatterChart,
  type ScatterChartProps,
  type ScatterChartItem,
} from './ScatterChart.tsx';
export {
  BarChart,
  type BarChartProps,
  type BarChartItem,
} from './BarChart.tsx';
export { DataValue, type DataValueProps } from './DataValue.tsx';
export { type CsvExport, type CsvTable } from './csv-export.ts';
export {
  type DataReading,
  type MetricReading,
} from '@altertable/data-app/internal';
export {
  type DataAppStyle,
  type DataAppStyleToken,
  type DataAppStyleHooks,
} from '../style-contract.ts';
export { Select, type SelectProps } from './Select.tsx';
export {
  RadioGroup,
  Radio,
  SegmentedControl,
  type RadioGroupProps,
  type RadioProps,
  type SegmentedControlProps,
} from './RadioGroup.tsx';
export { CheckboxGroup, type CheckboxGroupProps } from './CheckboxGroup.tsx';
export {
  NumberField,
  NumberRangeField,
  type NumberFieldProps,
  type NumberRangeFieldProps,
  type NumberRange,
} from './NumberField.tsx';
export { FilterBar, type FilterBarProps } from './FilterBar.tsx';
export { VariableBar, type VariableBarProps } from './VariableBar.tsx';
export { FilterActions, type FilterActionsProps } from './FilterActions.tsx';
export {
  NumberFilterPicker,
  type NumberFilterPickerProps,
} from './NumberFilterPicker.tsx';
export { ComposedChart, type ComposedChartProps } from './ComposedChart.tsx';
export {
  ChartLegend,
  type ChartLegendProps,
  type ChartLegendItemProps,
  type ChartLegendMarkerProps,
  type ChartLegendLabelProps,
  type ChartLegendMarkerKind,
} from './ChartLegend.tsx';
export { type ComposedChartLegendProps } from './ComposedChartLegend.tsx';
export {
  FunnelChart,
  type FunnelChartProps,
  type FunnelChartStep,
  type FunnelChartSeries,
} from './FunnelChart.tsx';
export {
  RetentionChart,
  type RetentionChartProps,
  type RetentionChartPoint,
  type RetentionChartSeries,
} from './RetentionChart.tsx';
export {
  JourneyChart,
  type JourneyChartProps,
  type JourneyChartPath,
} from './JourneyChart.tsx';
export { useSvgId } from './useSvgId.ts';
export {
  SearchTypeahead,
  type SearchTypeaheadProps,
  type SearchSuggestion,
} from './SearchTypeahead.tsx';
export { SectionHeading, type SectionHeadingProps } from './SectionHeading.tsx';
export { DateDisplay, type DateDisplayProps } from './DateDisplay.tsx';
export { useDateFormatting } from '../date-formatting.ts';
