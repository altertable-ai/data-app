import {
  createContext,
  useId,
  Children,
  cloneElement,
  isValidElement,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useFloating,
  useMergeRefs,
} from '@floating-ui/react';
import { classNames } from '@/src/react/ui/classNames';

const chartPointerPositions = new WeakMap<Document, { x: number; y: number }>();

function chartPointerMoved(document: Document, x: number, y: number) {
  const previous = chartPointerPositions.get(document);
  chartPointerPositions.set(document, { x, y });
  return !previous || previous.x !== x || previous.y !== y;
}

type TooltipTiming = { hoverDelay: () => number; rememberClose: () => void };
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
  delay = 500,
  skipDelayDuration = 300,
}: TooltipProviderProps) {
  const skipUntil = useRef(0);

  const timing = useMemo(
    () => ({
      hoverDelay() {
        return Date.now() < skipUntil.current ? 0 : delay;
      },
      rememberClose() {
        skipUntil.current = Date.now() + skipDelayDuration;
      },
    }),
    [delay, skipDelayDuration]
  );

  return (
    <TooltipContext.Provider value={timing}>{children}</TooltipContext.Provider>
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
  tooltipProps?: Omit<ComponentPropsWithRef<'span'>, 'children' | 'role'>;
} & Omit<ComponentPropsWithRef<'span'>, 'children' | 'content'>;

/** Short visual hint for an already labeled control. variant="chart" follows the cursor
 * on hover and toggles on tap so a bar or point can show the period and value. Chart
 * tooltips dismiss on scroll and do not open on keyboard focus. Hint
 * tooltips hide once the control is pressed. Escape closes either. */
export function Tooltip({
  content,
  children,
  onOpenChange,
  variant = 'hint',
  align = 'center',
  placement,
  portalRoot,
  tooltipProps,
  className,
  ref,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onPointerDown,
  onFocusCapture,
  onBlurCapture,
  ...props
}: TooltipProps) {
  const tooltipId = useId();
  const describedBy = tooltipProps?.id ?? tooltipId;
  const timing = useContext(TooltipContext);
  const [open, setOpen] = useState(false);
  const visible = open && content != null;
  const notifyOpenChange = useEffectEvent((value: boolean) =>
    onOpenChange?.(value)
  );
  useEffect(() => {
    notifyOpenChange(visible);
  }, [visible]);
  const [dialogRoot, setDialogRoot] = useState<HTMLDialogElement | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressed = useRef(false);
  const side = placement ?? (variant === 'chart' ? 'top' : 'bottom');

  function cancelHover() {
    if (hoverTimer.current !== null) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  }

  function close() {
    cancelHover();
    if (open) timing?.rememberClose();
    setOpen(false);
  }

  const closeFromEffect = useEffectEvent(close);

  useEffect(() => cancelHover, []);

  useEffect(() => {
    if (!visible) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (variant === 'chart') event.preventDefault();
      suppressed.current = true;
      closeFromEffect();
    }

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [visible, variant]);

  useEffect(() => {
    if (!visible || variant !== 'chart') return;
    function onScroll() {
      suppressed.current = false;
      closeFromEffect();
    }
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [visible, variant]);

  const { refs, floatingStyles, update } = useFloating({
    open: visible,
    onOpenChange: setOpen,
    placement: align === 'center' ? side : `${side}-${align}`,
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(variant === 'chart' ? 16 : 8),
      flip(),
      shift({ padding: 12 }),
    ],
  });

  const closeOnOutsidePointer = useEffectEvent((event: PointerEvent) => {
    const node = event.target as Node;
    if (
      refs.domReference.current?.contains(node) ||
      refs.floating.current?.contains(node)
    )
      return;
    close();
  });

  function followCursor(event: { clientX: number; clientY: number }) {
    const { clientX: x, clientY: y } = event;
    refs.setPositionReference({
      getBoundingClientRect() {
        return {
          x,
          y,
          top: y,
          left: x,
          right: x,
          bottom: y,
          width: 0,
          height: 0,
          toJSON() {
            return {};
          },
        };
      },
    });
    update();
  }

  useEffect(() => {
    if (!visible || variant !== 'chart') return;

    function onDocPointerDown(event: PointerEvent) {
      closeOnOutsidePointer(event);
    }

    document.addEventListener('pointerdown', onDocPointerDown, true);

    return () =>
      document.removeEventListener('pointerdown', onDocPointerDown, true);
  }, [visible, variant]);

  const triggerRef = useMergeRefs([
    refs.setReference,
    ref,
    (element: HTMLSpanElement | null) =>
      setDialogRoot(element?.closest('dialog') ?? null),
  ]);
  const floatingRef = useMergeRefs([refs.setFloating, tooltipProps?.ref]);

  return (
    <>
      <span
        {...props}
        ref={triggerRef}
        data-variant={variant}
        data-open={visible || undefined}
        className={classNames('altertable-tooltip-trigger', className)}
        onPointerEnter={event => {
          onPointerEnter?.(event);
          if (
            event.defaultPrevented ||
            event.pointerType !== 'mouse' ||
            suppressed.current
          )
            return;
          if (variant === 'chart') {
            if (
              chartPointerMoved(
                event.currentTarget.ownerDocument,
                event.clientX,
                event.clientY
              )
            ) {
              followCursor(event);
              setOpen(true);
            }
            return;
          }
          if (open) return;
          cancelHover();
          const delay = timing?.hoverDelay() ?? 500;
          if (delay === 0) setOpen(true);
          else
            hoverTimer.current = setTimeout(() => {
              hoverTimer.current = null;
              setOpen(true);
            }, delay);
        }}
        onPointerMove={event => {
          onPointerMove?.(event);
          if (
            event.defaultPrevented ||
            variant !== 'chart' ||
            event.pointerType !== 'mouse'
          )
            return;
          if (
            !chartPointerMoved(
              event.currentTarget.ownerDocument,
              event.clientX,
              event.clientY
            )
          )
            return;
          followCursor(event);
          if (!suppressed.current) setOpen(true);
        }}
        onPointerLeave={event => {
          onPointerLeave?.(event);
          suppressed.current = false;
          if (variant === 'chart' && event.pointerType !== 'mouse') return;
          if (
            !event.defaultPrevented &&
            !(
              event.currentTarget.contains(document.activeElement) &&
              variant !== 'chart'
            )
          )
            close();
          else cancelHover();
        }}
        onPointerDown={event => {
          onPointerDown?.(event);
          if (event.defaultPrevented) return;
          if (variant === 'chart') {
            if (event.pointerType !== 'mouse') {
              followCursor(event);
              setOpen(wasOpen => !wasOpen);
            }

            return;
          }
          suppressed.current = true;
          close();
        }}
        onFocusCapture={event => {
          onFocusCapture?.(event);
          if (
            event.defaultPrevented ||
            suppressed.current ||
            variant === 'chart' ||
            !event.target.matches(':focus-visible')
          )
            return;
          cancelHover();
          refs.setPositionReference(refs.domReference.current);
          setOpen(true);
        }}
        onBlurCapture={event => {
          onBlurCapture?.(event);
          if (
            event.defaultPrevented ||
            event.currentTarget.contains(event.relatedTarget)
          )
            return;
          suppressed.current = false;
          if (!event.currentTarget.matches(':hover')) close();
        }}
      >
        {Children.map(children, child =>
          isValidElement<{ 'aria-describedby'?: string }>(child)
            ? cloneElement(child, {
                'aria-describedby':
                  [
                    child.props['aria-describedby'],
                    visible ? describedBy : undefined,
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined,
              })
            : child
        )}
      </span>
      {visible && (
        <FloatingPortal root={portalRoot ?? dialogRoot ?? undefined}>
          <span
            {...tooltipProps}
            ref={floatingRef}
            data-variant={variant}
            className={classNames(
              'altertable-tooltip-content',
              tooltipProps?.className
            )}
            style={{ ...tooltipProps?.style, ...floatingStyles }}
            role="tooltip"
            id={describedBy}
          >
            {content}
          </span>
        </FloatingPortal>
      )}
    </>
  );
}
