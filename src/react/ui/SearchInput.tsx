import type { ComponentPropsWithRef, ReactNode } from 'react';
import { AppIcon } from '@/src/react/ui/icons';
import { classNames } from '@/src/react/ui/classNames';

/** One search control surface for picker search and table/page search. */
export function SearchInput({
  focusRing = true,
  size = 'default',
  endAction,
  loading = false,
  className,
  onKeyDown,
  ...props
}: Omit<ComponentPropsWithRef<'input'>, 'size' | 'children'> & {
  size?: 'default' | 'compact';
  /** Menu search delegates focus indication to the active option. */
  focusRing?: boolean;
  endAction?: ReactNode;
  /** Replaces the search glyph in its existing space; input and results remain usable. */
  loading?: boolean;
}) {
  return (
    <div
      data-atbl-internal-surface="field"
      data-atbl-focus={focusRing ? 'group' : undefined}
      className="altertable-search-input-wrap"
      data-size={size}
    >
      <AppIcon
        name={loading ? 'loading' : 'search'}
        size={17}
        className={loading ? 'altertable-search-input-spinner' : undefined}
      />
      <input
        data-atbl-control="text"
        {...props}
        onKeyDown={event => {
          onKeyDown?.(event);
          if (
            !event.defaultPrevented &&
            event.key === 'Escape' &&
            !event.currentTarget.value
          ) {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.blur();
            // Keep keyboard dismissal within a modal menu after leaving its search field.
            event.currentTarget
              .closest<HTMLElement>('[role="dialog"]')
              ?.focus();
          }
        }}
        type="search"
        className={classNames('altertable-search-input', className)}
      />
      {endAction}
    </div>
  );
}
