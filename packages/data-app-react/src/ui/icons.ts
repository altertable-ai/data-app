import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  Check,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Copy,
  FileCode2,
  ListFilter,
  FilterX,
  SlidersHorizontal,
  Download,
  Info,
  LoaderCircle,
  Minus,
  Ellipsis,
  Workflow,
  Moon,
  Presentation,
  Radio,
  RotateCw,
  Search,
  Square,
  SquareDashedMousePointer,
  Sun,
  TextWrap,
  X,
  type LucideProps,
} from 'lucide-react';
import { createElement, type CSSProperties } from 'react';

/** Use semantic names to keep icon meaning and optical size consistent across controls. */
const brandedIcons = {
  annotate: SquareDashedMousePointer,
  cancel: X,
  calendar: CalendarDays,
  clock: Clock3,
  check: Check,
  disclosure: ChevronDown,
  breakdown: Workflow,
  moreActions: Ellipsis,
  previousMonth: ChevronLeft,
  nextMonth: ChevronRight,
  explore: BookOpenText,
  /** @deprecated Use openDetails for inspection triggers. */
  inspect: ChevronRight,
  info: Info,
  openDetails: ChevronRight,
  present: Presentation,
  export: Download,
  error: CircleAlert,
  close: X,
  filters: ListFilter,
  clearFilters: FilterX,
  displayOptions: SlidersHorizontal,
  previous: ArrowLeft,
  next: ArrowRight,
  lightTheme: Sun,
  darkTheme: Moon,
  live: Radio,
  loading: LoaderCircle,
  refresh: RotateCw,
  stop: Square,
  reset: X,
  search: Search,
  copy: Copy,
  sql: FileCode2,
  wrap: TextWrap,
  trendDown: ArrowDownRight,
  trendFlat: Minus,
  trendUp: ArrowUpRight,
} as const;

export type AppIconName = keyof typeof brandedIcons;
export type AppIconProps = Omit<LucideProps, 'size'> & {
  name: AppIconName;
  size?: number | string;
};

/** Defaults to the shared control icon size so icons follow density tokens. */
export function AppIcon({
  name,
  size = 'var(--atbl-control-icon-size)',
  strokeWidth = 1.8,
  style,
  ...props
}: AppIconProps) {
  const Icon = brandedIcons[name];
  const fixedSize: CSSProperties = {
    ...style,
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    maxWidth: size,
    maxHeight: size,
    flexShrink: 0,
  };

  return createElement(Icon, {
    'aria-hidden': true,
    focusable: 'false',
    ...props,
    // SVG size attributes only take lengths; a token size lives in the style.
    size: typeof size === 'number' ? size : undefined,
    strokeWidth,
    style: fixedSize,
  });
}
