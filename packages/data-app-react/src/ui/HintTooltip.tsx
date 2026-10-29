import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  safePolygon,
  shift,
  useDelayGroup,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
  useMergeRefs,
} from '@floating-ui/react';
import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useState,
  type FocusEvent,
  type MouseEvent,
} from 'react';

import { classNames } from './classNames.ts';
import { type TooltipProps, type TooltipTiming } from './Tooltip.tsx';
import { TooltipSurface } from './TooltipSurface.tsx';

/** Hint interactions are independent from chart cursor/tap inspection. */
export function HintTooltip({
  children,
  content,
  timing,
  onOpenChange,
  variant = 'hint',
  align = 'center',
  placement = 'bottom',
  portalRoot,
  className,
  ref,
  ...props
}: TooltipProps & { timing: TooltipTiming }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [dialogRoot, setDialogRoot] = useState<HTMLDialogElement | null>(null);
  const hasContent = content != null && content !== false && content !== '';
  const visible = open && hasContent;
  const notifyOpenChange = useEffectEvent((value: boolean) =>
    onOpenChange?.(value)
  );
  useEffect(() => {
    notifyOpenChange(visible);
  }, [visible]);
  if (!hasContent && open) setOpen(false);

  const { refs, context, floatingStyles } = useFloating({
    open: visible,
    onOpenChange(value, event, reason) {
      // Native dialogs handle Escape as a default action, independent of propagation.
      if (reason === 'escape-key') event?.preventDefault();
      if (!value && (reason === 'hover' || reason === 'safe-polygon')) {
        const reference = refs.domReference.current;
        const focused = reference?.ownerDocument.activeElement;
        if (focused?.matches(':focus-visible') && reference?.contains(focused))
          return;
      }
      setOpen(value);
    },
    placement: align === 'center' ? placement : `${placement}-${align}`,
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip({ padding: 12 }), shift({ padding: 12 })],
  });
  const group = useDelayGroup(context, { id });
  const {
    delay,
    isInstantPhase,
    initialDelay,
    timeoutMs,
    currentId,
    setState,
  } = group;
  useLayoutEffect(() => {
    if (initialDelay === timing.delay && timeoutMs === timing.skipDelayDuration)
      return;
    setState({
      initialDelay: timing.delay,
      delay: currentId ? { open: 1, close: 0 } : timing.delay,
      timeoutMs: timing.skipDelayDuration,
    });
  }, [initialDelay, timeoutMs, currentId, setState, timing]);
  const releaseGroup = useEffectEvent(() => {
    // Floating UI's delay group otherwise retains an unmounted open trigger.
    if (group.currentId === id) {
      group.setState({ currentId: null, delay: group.initialDelay });
    }
  });
  useEffect(() => () => releaseGroup(), []);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, {
      enabled: hasContent,
      mouseOnly: true,
      move: false,
      delay,
      handleClose: safePolygon(),
    }),
    useDismiss(context, { referencePress: true }),
  ]);
  const setTrigger = useCallback(
    (element: HTMLSpanElement | null) => {
      refs.setReference(element);
      setDialogRoot(element?.closest('dialog') ?? null);
    },
    [refs]
  );
  const triggerRef = useMergeRefs([setTrigger, ref]);
  const setFloating = useCallback(
    (element: HTMLSpanElement | null) => {
      refs.setFloating(element);
    },
    [refs]
  );
  const describedBy =
    [props['aria-describedby'], visible ? id : undefined]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <>
      <span
        {...getReferenceProps({
          ...props,
          'aria-describedby': describedBy,
          // The focused element is a descendant, not Floating UI's span reference.
          onFocus(event: FocusEvent<HTMLSpanElement>) {
            props.onFocus?.(event);
            if (
              !event.defaultPrevented &&
              hasContent &&
              event.target.matches(':focus-visible')
            ) {
              context.onOpenChange(true, event.nativeEvent, 'focus');
            }
          },
          onBlur(event: FocusEvent<HTMLSpanElement>) {
            props.onBlur?.(event);
            if (
              event.defaultPrevented ||
              event.currentTarget.contains(event.relatedTarget)
            )
              return;
            if (
              !event.currentTarget.matches(':hover') &&
              !refs.floating.current?.matches(':hover')
            ) {
              context.onOpenChange(false, event.nativeEvent, 'focus');
            }
          },
        })}
        ref={triggerRef}
        data-variant={variant}
        data-open={visible || undefined}
        className={classNames('altertable-tooltip-trigger', className)}
      >
        {Children.map(children, child =>
          isValidElement<{ 'aria-describedby'?: string }>(child)
            ? cloneElement(child, {
                'aria-describedby':
                  [child.props['aria-describedby'], visible ? id : undefined]
                    .filter(Boolean)
                    .join(' ') || undefined,
              })
            : child
        )}
      </span>
      {visible && (
        <FloatingPortal
          root={portalRoot ?? dialogRoot ?? undefined}
          preserveTabOrder={false}
        >
          <TooltipSurface
            {...getFloatingProps({
              tabIndex: undefined,
              onMouseDown(event: MouseEvent<HTMLSpanElement>) {
                // Passive hints must not move focus or the keyboard navigation start point.
                event.preventDefault();
              },
            })}
            ref={setFloating}
            id={id}
            role="tooltip"
            data-variant={variant}
            data-instant={isInstantPhase || undefined}
            style={floatingStyles}
          >
            {content}
          </TooltipSurface>
        </FloatingPortal>
      )}
    </>
  );
}
