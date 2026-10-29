import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useFloating,
  useMergeRefs,
} from '@floating-ui/react';
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
} from 'react';

import { classNames } from './classNames.ts';
import { type TooltipProps } from './Tooltip.tsx';
import { TooltipSurface } from './TooltipSurface.tsx';

const chartPointerPositions = new WeakMap<Document, { x: number; y: number }>();

function chartPointerMoved(document: Document, x: number, y: number) {
  const previous = chartPointerPositions.get(document);
  chartPointerPositions.set(document, { x, y });
  return !previous || previous.x !== x || previous.y !== y;
}

export function ChartTooltip({
  content,
  children,
  onOpenChange,
  variant = 'chart',
  align = 'center',
  placement,
  portalRoot,
  className,
  ref,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onPointerDown,
  ...props
}: TooltipProps) {
  const tooltipId = useId();
  const describedBy = tooltipId;
  const [open, setOpen] = useState(false);
  const visible = open && content != null;
  const notifyOpenChange = useEffectEvent((value: boolean) =>
    onOpenChange?.(value)
  );
  useEffect(() => {
    notifyOpenChange(visible);
  }, [visible]);
  const [dialogRoot, setDialogRoot] = useState<HTMLDialogElement | null>(null);
  const suppressed = useRef(false);
  const side = placement ?? 'top';

  function close() {
    setOpen(false);
  }

  const closeFromEffect = useEffectEvent(close);

  useEffect(() => {
    if (!visible) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      suppressed.current = true;
      closeFromEffect();
    }

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    function onScroll() {
      suppressed.current = false;
      closeFromEffect();
    }
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [visible]);

  const { refs, floatingStyles, update } = useFloating({
    open: visible,
    onOpenChange: setOpen,
    placement: align === 'center' ? side : `${side}-${align}`,
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [offset(16), flip(), shift({ padding: 12 })],
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
    if (!visible) return;

    function onDocPointerDown(event: PointerEvent) {
      closeOnOutsidePointer(event);
    }

    document.addEventListener('pointerdown', onDocPointerDown, true);

    return () =>
      document.removeEventListener('pointerdown', onDocPointerDown, true);
  }, [visible]);

  const triggerRef = useMergeRefs([
    refs.setReference,
    ref,
    (element: HTMLSpanElement | null) =>
      setDialogRoot(element?.closest('dialog') ?? null),
  ]);
  const floatingRef = useMergeRefs([refs.setFloating]);

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
        }}
        onPointerMove={event => {
          onPointerMove?.(event);
          if (event.defaultPrevented || event.pointerType !== 'mouse') return;
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
          if (event.pointerType === 'mouse' && !event.defaultPrevented) close();
        }}
        onPointerDown={event => {
          onPointerDown?.(event);
          if (event.defaultPrevented) return;
          if (event.pointerType !== 'mouse') {
            followCursor(event);
            setOpen(wasOpen => !wasOpen);
          }
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
          <TooltipSurface
            ref={floatingRef}
            data-variant={variant}
            style={floatingStyles}
            role="tooltip"
            id={describedBy}
          >
            {content}
          </TooltipSurface>
        </FloatingPortal>
      )}
    </>
  );
}
