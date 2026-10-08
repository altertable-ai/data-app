/** Direct UI composition and static screens. Requests use declared views from /react. */
export { injectDataAppShellStyles } from '@/src/react/shellStyles';
export { DataAppProvider } from '@/src/react/mount';
export { isPlainKeyEvent } from '@/src/react/ui/keyboard';
export { GettingStarted } from '@/src/react/ui/GettingStarted';
export { DataWidget } from '@/src/react/ui/DataWidget';
export type { WidgetStatus } from '@/src/react/ui/RequestHint';
export type { DataWidgetProps } from '@/src/react/ui/DataWidget';
export { TextWidget } from '@/src/react/ui/TextWidget';
export type { TextWidgetProps } from '@/src/react/ui/TextWidget';
export { VisualizationWidget } from '@/src/react/ui/VisualizationWidget';
export type { VisualizationWidgetProps } from '@/src/react/ui/VisualizationWidget';
export { TableWidget } from '@/src/react/ui/TableWidget';
export type { TableWidgetProps } from '@/src/react/ui/TableWidget';
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
export { DimensionPicker } from '@/src/react/ui/DimensionPicker';
export { DataAppSkeleton } from '@/src/react/ui/DataAppSkeleton';
export type { DataAppSkeletonProps } from '@/src/react/ui/DataAppSkeleton';
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
export { useAppVariables } from '@/src/react/ui/variables';
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
export { ChoicePicker } from '@/src/react/ui/ChoicePicker';
export type {
  ChoiceOption,
  ChoicePickerProps,
} from '@/src/react/ui/ChoicePicker';
export {
  MenuTrigger,
  MenuButton,
  MenuPopover,
  Menu,
  MenuItem,
  MenuSection,
  MenuSeparator,
} from '@/src/react/ui/Menu';
export type {
  MenuTriggerProps,
  MenuPopoverProps,
  MenuProps,
  MenuItemProps,
} from '@/src/react/ui/Menu';
export { GradientScroll } from '@/src/react/ui/GradientScroll';
export type { GradientScrollProps } from '@/src/react/ui/GradientScroll';
export {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  useViewTab,
} from '@/src/react/ui/Tabs';
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
export { PresentStory } from '@/src/react/ui/PresentStory';
export type { PresentStoryProps } from '@/src/react/ui/PresentStory';
export type { StoryFinding, BoundStory } from '@/src/react/ui/story';
export { Checkbox } from '@/src/react/ui/Checkbox';
export type { CheckboxProps } from '@/src/react/ui/Checkbox';
export { AppIcon } from '@/src/react/ui/icons';
export type { AppIconName, AppIconProps } from '@/src/react/ui/icons';
export { Sheet } from '@/src/react/ui/Sheet';
export type { SheetProps } from '@/src/react/ui/Sheet';
export { HelpPopover } from '@/src/react/ui/HelpPopover';
export type { HelpPopoverProps } from '@/src/react/ui/HelpPopover';
export { DataApp } from '@/src/react/ui/StaticDataApp';
export type { DataAppProps } from '@/src/react/ui/StaticDataApp';
export { injectDataAppStyles } from '@/src/react/styles';
export { Tooltip, TooltipProvider } from '@/src/react/ui/Tooltip';
export type {
  TooltipProps,
  TooltipProviderProps,
} from '@/src/react/ui/Tooltip';

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
export { BarChart } from '@/src/react/ui/BarChart';
export type { BarChartProps, BarChartItem } from '@/src/react/ui/BarChart';

export { DataValue } from '@/src/react/ui/DataValue';
export type { DataValueProps } from '@/src/react/ui/DataValue';
export type { CsvExport, CsvTable } from '@/src/react/ui/csv-export';
export type { TableWidgetColumn } from '@/src/react/ui/TableWidget';

export type { DataReading, MetricReading } from '@/src/core/reading';

export type {
  DataAppStyle,
  DataAppStyleToken,
  DataAppStyleHooks,
} from '@/src/react/style-contract';

export { Select } from '@/src/react/ui/Select';
export type { SelectProps } from '@/src/react/ui/Select';
export { RadioGroup, Radio, SegmentedControl } from '@/src/react/ui/RadioGroup';
export type {
  RadioGroupProps,
  RadioProps,
  SegmentedControlProps,
} from '@/src/react/ui/RadioGroup';
export { CheckboxGroup } from '@/src/react/ui/CheckboxGroup';
export type { CheckboxGroupProps } from '@/src/react/ui/CheckboxGroup';
export { NumberField, NumberRangeField } from '@/src/react/ui/NumberField';
export type {
  NumberFieldProps,
  NumberRangeFieldProps,
  NumberRange,
} from '@/src/react/ui/NumberField';
export { FilterBar } from '@/src/react/ui/FilterBar';
export type { FilterBarProps } from '@/src/react/ui/FilterBar';
export { VariableBar } from '@/src/react/ui/VariableBar';
export type { VariableBarProps } from '@/src/react/ui/VariableBar';
export {
  ActiveFilters,
  FilterChip,
  FilterActions,
} from '@/src/react/ui/ActiveFilters';
export type {
  ActiveFilter,
  FilterChipProps,
  FilterActionsProps,
} from '@/src/react/ui/ActiveFilters';
