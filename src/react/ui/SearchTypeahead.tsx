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
} from '@floating-ui/react';
import { SearchField, type SearchFieldProps } from '@/src/react/ui/SearchField';
import { PopoverContainerContext } from '@/src/react/ui/PopoverSurface';

export type SearchSuggestion = {
  id: string;
  title: string;
  description?: string;
  onSelect: () => void;
};
export type SearchTypeaheadProps = SearchFieldProps & {
  /** Suggestions from the displayed result, in its order. No additional filtering or request. */
  items: readonly SearchSuggestion[];
};

/** An editable combobox with manual selection: typing searches, selecting invokes an action.
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
  const open = expanded && !!props.value.trim() && (items.length > 0 || !!busy);
  const activeIndex = items.findIndex(item => item.id === activeId);
  const active = open && activeIndex >= 0 ? items[activeIndex] : undefined;
  const {
    // Floating UI exposes closure callbacks; neither depends on a method receiver.
    // oxlint-disable-next-line typescript/unbound-method
    refs: { setReference, setFloating },
    floatingStyles,
  } = useFloating({
    open,
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(6),
      flip(),
      shift({ padding: 12 }),
      size({
        apply({ rects, availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
            maxHeight: `${Math.max(0, availableHeight)}px`,
          });
        },
      }),
    ],
  });
  const anchor = useCallback(
    (element: ComponentRef<'input'> | null) => {
      setReference(element?.parentElement ?? null);
    },
    [setReference]
  );
  const input = useMergeRefs([anchor, inputProps?.ref]);
  const panel = useMergeRefs([setFloating]);
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
    item.onSelect();
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
              const next =
                event.key === 'ArrowDown'
                  ? Math.min(items.length - 1, activeIndex + 1)
                  : activeIndex < 0
                    ? items.length - 1
                    : Math.max(0, activeIndex - 1);
              setActiveId(items[next]!.id);
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
            ref={panel}
            style={floatingStyles}
            className="altertable-popover-surface altertable-search-suggestions"
          >
            {busy ? (
              <output className="altertable-search-suggestions-status">
                Updating results…
              </output>
            ) : (
              <output className="altertable-sr-only">
                {items.length} suggestions
              </output>
            )}
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
                  <span>{item.title}</span>
                  {item.description && <small>{item.description}</small>}
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
