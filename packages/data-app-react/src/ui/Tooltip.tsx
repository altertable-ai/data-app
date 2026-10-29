import { FloatingDelayGroup } from '@floating-ui/react';
import {
  createContext,
  useContext,
  useMemo,
  type ComponentPropsWithRef,
  type ReactNode,
  type RefObject,
} from 'react';

import { ChartTooltip } from './ChartTooltip.tsx';
import { HintTooltip } from './HintTooltip.tsx';

export type TooltipTiming = { delay: number; skipDelayDuration: number };
const defaultTiming: TooltipTiming = { delay: 500, skipDelayDuration: 300 };
const TooltipContext = /* @__PURE__ */ createContext<TooltipTiming | null>(
  null
);

export type TooltipProviderProps = {
  children: ReactNode;
  delay?: number;
  skipDelayDuration?: number;
};

/** Delay the first hover, then open nearby tooltips without waiting during the skip window.
 * Keyboard focus always opens immediately. AppLayout provides this by default. */
export function TooltipProvider({
  children,
  delay = defaultTiming.delay,
  skipDelayDuration = defaultTiming.skipDelayDuration,
}: TooltipProviderProps) {
  const timing = useMemo(
    () => ({ delay, skipDelayDuration }),
    [delay, skipDelayDuration]
  );
  return (
    <TooltipContext.Provider value={timing}>
      <FloatingDelayGroup delay={delay} timeoutMs={skipDelayDuration}>
        {children}
      </FloatingDelayGroup>
    </TooltipContext.Provider>
  );
}

export type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  variant?: 'hint' | 'chart';
  onOpenChange?: (open: boolean) => void;
  align?: 'start' | 'center' | 'end';
  placement?: 'top' | 'bottom';
  portalRoot?: RefObject<HTMLElement | null>;
} & Omit<ComponentPropsWithRef<'span'>, 'children' | 'content'>;

/** Supplemental, non-interactive description for one already labeled control. Supply a
 * single child that forwards aria-describedby to its focusable DOM element. For a
 * disabled control or plain text, make the wrapper focusable with tabIndex={0} and
 * give it an accessible name. Hint content stays open while hovered and opens
 * immediately on keyboard focus; pressing the control or Escape dismisses it.
 * Use HelpPopover for essential information, links, or actions, including on touch.
 * variant="chart" follows the cursor and toggles on tap; it dismisses on scroll
 * and does not open on keyboard focus. Native span props and ref target the wrapper. */
export function Tooltip(props: TooltipProps) {
  const timing = useContext(TooltipContext);
  if (props.variant === 'chart') return <ChartTooltip {...props} />;
  return timing ? (
    <HintTooltip {...props} timing={timing} />
  ) : (
    <TooltipProvider>
      <HintTooltip {...props} timing={defaultTiming} />
    </TooltipProvider>
  );
}
