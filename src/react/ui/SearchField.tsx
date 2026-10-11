import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  type ComponentRef,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';
import { classNames } from '@/src/react/ui/classNames';
import { SearchInput } from '@/src/react/ui/SearchInput';
import { Button } from '@/src/react/ui/Button';
import { AppIcon } from '@/src/react/ui/icons';

export type SearchFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  showLabel?: boolean;
  /** Enable page search shortcuts on one primary search field per app. */
  focusShortcut?: boolean;
  size?: 'default' | 'compact';
  description?: ReactNode;
  status?: ReactNode;
  busy?: boolean;
  resetValue?: string;
  inputProps?: Omit<
    ComponentPropsWithRef<'input'>,
    'type' | 'value' | 'children'
  >;
  children?: ReactNode;
} & Omit<ComponentPropsWithRef<'form'>, 'onChange' | 'onSubmit' | 'children'>;

/**
 * The caller owns filtering, URL state, and whether search runs while typing or on submit.
 * Escape and Clear reset the query.
 */
export function SearchField({
  label,
  value,
  onChange,
  onSubmit,
  placeholder,
  showLabel = false,
  focusShortcut = false,
  size = 'default',
  description,
  status,
  busy,
  resetValue = '',
  inputProps,
  children,
  className,
  ...props
}: SearchFieldProps) {
  const inputRef = useRef<ComponentRef<'input'>>(null);
  useImperativeHandle(inputProps?.ref, () => inputRef.current!);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!focusShortcut) return;
    const input = inputRef.current;
    if (!input) return;
    const document = input.ownerDocument;
    function focusSearch(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        event.altKey
      )
        return;
      const command =
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'k';
      const slash = event.key === '/' && !event.metaKey && !event.ctrlKey;
      if (!command && !slash) return;
      const target = document.activeElement;
      if (
        slash &&
        target instanceof HTMLElement &&
        target.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'
        )
      )
        return;
      if (
        Array.from(
          document.querySelectorAll(
            '[role="dialog"], [role="listbox"], [role="menu"]'
          )
        ).some(element => element.getClientRects().length > 0)
      )
        return;
      if (
        !input ||
        input.disabled ||
        input.getAttribute('aria-disabled') === 'true' ||
        !input.getClientRects().length
      )
        return;
      event.preventDefault();
      if (target !== input && target instanceof HTMLElement)
        returnFocusRef.current = target;
      input.focus();
      input.select();
    }
    document.addEventListener('keydown', focusSearch);
    return () => document.removeEventListener('keydown', focusSearch);
  }, [focusShortcut]);
  const id = useId();
  const inputId = inputProps?.id ?? id;
  const descriptionId = description ? `${id}-description` : undefined;
  const statusId = status ? `${id}-status` : undefined;

  return (
    <search
      className="altertable-search-landmark"
      aria-label={props['aria-label'] ?? label}
    >
      <form
        {...props}
        className={classNames('altertable-search', className)}
        data-size={size}
        onSubmit={event => {
          event.preventDefault();
          onSubmit?.(value);
        }}
      >
        <label
          htmlFor={inputId}
          className={classNames(
            'altertable-search-label',
            !showLabel && 'altertable-sr-only'
          )}
        >
          {label}
        </label>
        <div className="altertable-search-row">
          <SearchInput
            {...inputProps}
            ref={inputRef}
            aria-keyshortcuts={
              focusShortcut
                ? 'Meta+k Control+k /'
                : inputProps?.['aria-keyshortcuts']
            }
            size={size}
            loading={busy}
            id={inputId}
            type="search"
            value={value}
            placeholder={placeholder ?? 'Search'}
            enterKeyHint="search"
            aria-busy={busy || undefined}
            aria-describedby={
              [descriptionId, statusId, inputProps?.['aria-describedby']]
                .filter(Boolean)
                .join(' ') || undefined
            }
            className={classNames(
              'altertable-search-input',
              inputProps?.className
            )}
            onBlur={event => {
              returnFocusRef.current = null;
              inputProps?.onBlur?.(event);
            }}
            onChange={event => {
              inputProps?.onChange?.(event);
              if (!event.defaultPrevented) onChange(event.currentTarget.value);
            }}
            onKeyDown={event => {
              inputProps?.onKeyDown?.(event);
              if (
                !event.defaultPrevented &&
                !event.nativeEvent.isComposing &&
                event.key === 'Escape'
              ) {
                if (value !== resetValue) {
                  event.preventDefault();
                  event.stopPropagation();
                  onChange(resetValue);
                } else if (returnFocusRef.current?.isConnected) {
                  event.preventDefault();
                  event.stopPropagation();
                  returnFocusRef.current.focus();
                  returnFocusRef.current = null;
                }
              }
            }}
            endAction={
              value !== resetValue ? (
                <Button
                  variant="ghost"
                  size="icon-compact"
                  aria-label={`Clear ${label.toLowerCase()}`}
                  onClick={() => {
                    onChange(resetValue);
                    inputRef.current?.focus();
                  }}
                >
                  <AppIcon name="reset" size={16} />
                </Button>
              ) : null
            }
          />
          {children}
        </div>
        {description && (
          <p id={descriptionId} className="altertable-search-description">
            {description}
          </p>
        )}
        {status && (
          <output id={statusId} className="altertable-search-status">
            {status}
          </output>
        )}
      </form>
    </search>
  );
}
