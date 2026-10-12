import {
  useId,
  useCallback,
  useState,
  useContext,
  useEffect,
  type ComponentRef,
} from 'react';
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  size,
  useFloating,
  useMergeRefs,
  type VirtualElement,
} from '@floating-ui/react';
import { SearchField, type SearchFieldProps } from '@/src/react/ui/SearchField';
import { PopoverContainerContext } from '@/src/react/ui/PopoverSurface';
import { SearchMatch } from '@/src/react/ui/SearchMatch';
import { matchSearchText } from '@/src/react/ui/searchItems';

export type SearchSuggestion = {
  id: string;
  title: string;
  description?: string;
  /** Override completing the query with this title, for example to open record details. */
  onSelect?: () => void;
};
export type SearchTypeaheadProps = SearchFieldProps & {
  /** Suggestions from the displayed result, in its order. No additional filtering or request. */
  items: readonly SearchSuggestion[];
};

/** An editable combobox with manual selection: typing searches, selecting completes the query unless overridden.
 * Input retains focus during navigation; Escape dismisses suggestions before clearing search. */
export function SearchTypeahead({
  items,
  busy,
  inputProps,
  ...props
}: SearchTypeaheadProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const listId = useId();
  const portal = useContext(PopoverContainerContext);
  const open = expanded && !!props.value.trim() && items.length > 0;
  const activeIndex = items.findIndex(item => item.id === activeId);
  const active = open && activeIndex >= 0 ? items[activeIndex] : undefined;
  const {
    // Floating UI exposes closure callbacks; neither depends on a method receiver.
    // oxlint-disable-next-line typescript/unbound-method
    refs: { setReference, setFloating },
    floatingStyles,
    isPositioned,
  } = useFloating({
    open,
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(6),
      flip(),
      shift({ padding: 12 }),
      size({
        apply({ availableWidth, availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            width: 'max-content',
            maxWidth: `${Math.min(640, availableWidth)}px`,
            maxHeight: `${Math.max(0, availableHeight)}px`,
          });
        },
      }),
    ],
  });
  const [anchors] = useState(
    () => new WeakMap<HTMLInputElement, VirtualElement>()
  );
  const anchor = useCallback(
    (element: ComponentRef<'input'> | null) => {
      if (!element) {
        setReference(null);
        return;
      }
      let reference = anchors.get(element);
      if (!reference) {
        reference = {
          contextElement: element,
          getBoundingClientRect() {
            const rect = element.getBoundingClientRect();
            const field = getComputedStyle(element.parentElement!);
            const padding = parseFloat(field.paddingInlineStart);
            const gap = parseFloat(field.columnGap);
            return new DOMRect(
              rect.x - padding,
              rect.y,
              rect.width + padding + gap,
              rect.height
            );
          },
        };
        anchors.set(element, reference);
      }
      setReference(reference);
    },
    [anchors, setReference]
  );
  const input = useMergeRefs([anchor, inputProps?.ref]);
  useEffect(() => {
    if (active) {
      document
        .getElementById(`${listId}-${encodeURIComponent(active.id)}`)
        ?.scrollIntoView({ block: 'nearest' });
    }
  }, [active, listId]);
  function select(item: SearchSuggestion) {
    setExpanded(false);
    setActiveId(null);
    if (item.onSelect) item.onSelect();
    else props.onChange(item.title);
  }
  return (
    <>
      <SearchField
        {...props}
        busy={busy}
        inputProps={{
          ...inputProps,
          ref: input,
          role: 'combobox',
          'aria-autocomplete': 'list',
          'aria-expanded': open,
          'aria-controls': open ? listId : undefined,
          'aria-activedescendant': active
            ? `${listId}-${encodeURIComponent(active.id)}`
            : undefined,
          autoComplete: 'off',
          onFocus(event) {
            inputProps?.onFocus?.(event);
            if (!event.defaultPrevented) setExpanded(true);
          },
          onBlur(event) {
            inputProps?.onBlur?.(event);
            setExpanded(false);
            setActiveId(null);
          },
          onChange(event) {
            inputProps?.onChange?.(event);
            if (!event.defaultPrevented) {
              setExpanded(true);
              setActiveId(null);
            }
          },
          onKeyDown(event) {
            inputProps?.onKeyDown?.(event);
            if (event.defaultPrevented || event.nativeEvent.isComposing) return;
            if (event.key === 'Escape' && open) {
              event.preventDefault();
              event.stopPropagation();
              setExpanded(false);
              setActiveId(null);
            } else if (
              (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
              props.value.trim() &&
              items.length
            ) {
              event.preventDefault();
              setExpanded(true);
              const step = event.key === 'ArrowDown' ? 1 : -1;
              const nextIndex = activeIndex + step;
              // Include the unselected search position (-1) in the cycle.
              const next =
                nextIndex >= items.length
                  ? -1
                  : nextIndex < -1
                    ? items.length - 1
                    : nextIndex;
              setActiveId(next < 0 ? null : items[next]!.id);
            } else if (event.key === 'Enter') {
              if (active) {
                event.preventDefault();
                select(active);
              } else setExpanded(false);
            }
          },
        }}
      />
      {open && (
        <FloatingPortal root={portal}>
          <div
            ref={setFloating}
            style={{
              ...floatingStyles,
              visibility: isPositioned ? 'visible' : 'hidden',
            }}
            data-size={props.size ?? 'default'}
            className="altertable-popover-surface altertable-search-suggestions"
          >
            <output className="altertable-sr-only">
              {busy ? 'Updating results…' : `${items.length} suggestions`}
            </output>
            {/* A native select cannot keep the editable input focused or expose rich record labels. */}
            {/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-to-interactive-role, jsx-a11y/click-events-have-key-events */}
            <ul
              id={listId}
              role="listbox"
              aria-label={`${props.label} suggestions`}
            >
              {items.map(item => (
                <li
                  key={item.id}
                  id={`${listId}-${encodeURIComponent(item.id)}`}
                  role="option"
                  aria-selected={active?.id === item.id}
                  data-atbl-control="action"
                  data-atbl-internal-surface="option"
                  data-selected={active?.id === item.id || undefined}
                  onPointerMove={() => setActiveId(item.id)}
                  onPointerDown={event => event.preventDefault()}
                  onClick={() => select(item)}
                >
                  <SearchMatch
                    match={matchSearchText(item.title, props.value)}
                  />
                  {item.description && (
                    <small>
                      <SearchMatch
                        match={matchSearchText(item.description, props.value)}
                      />
                    </small>
                  )}
                </li>
              ))}
            </ul>
            {/* oxlint-enable jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-to-interactive-role, jsx-a11y/click-events-have-key-events */}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
