import { useEffect, useId, useRef, useState } from 'react';
import {
  Dialog,
  DialogTrigger,
  ListBox,
  ListBoxItem,
  Popover,
  type Selection,
} from 'react-aria-components';
import { invariant } from '@/src/core/invariant';
import { PressButton as Button } from '@/src/react/ui/Button';
import { Skeleton } from '@/src/react/ui/Skeleton';
import { RequestHint } from '@/src/react/ui/RequestHint';
import { SearchInput } from '@/src/react/ui/SearchInput';
import { AppIcon } from '@/src/react/ui/icons';
import { GradientScroll } from '@/src/react/ui/GradientScroll';
import { SelectionMark } from '@/src/react/ui/SelectionMark';
import { SearchMatch } from '@/src/react/ui/SearchMatch';
import { searchItems } from '@/src/react/ui/searchItems';

import type { ChoiceOption } from '@/src/core/variables';
export type { ChoiceOption } from '@/src/core/variables';

type SharedProps = {
  label: string;
  options: readonly ChoiceOption[];
  /** Separate source state, rendered last with a divider and the shared option component. */
  missingOption?: ChoiceOption;
  disabled?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  /** Known options remain selectable while refreshing; unavailable selected IDs are retained. */
  loading?: boolean;
  /** Shows failure feedback without removing known options or unavailable selections. */
  error?: boolean;
  onRetry?: () => void;
};
export type SingleChoicePickerProps = SharedProps & {
  selectionMode: 'single';
  value: string;
  onChange: (value: string) => void;
  values?: never;
  maxSelected?: never;
  emptySelectionLabel?: never;
};
export type MultiChoicePickerProps = SharedProps & {
  selectionMode: 'multiple';
  values: readonly string[];
  onChange: (values: string[]) => void;
  /** Positive integer; at capacity, only unselected options are disabled. */
  maxSelected: number;
  /** Meaning of an empty selection belongs to the caller, e.g. All or Select a value. */
  emptySelectionLabel: string;
  value?: never;
};
export type ChoicePickerProps =
  | SingleChoicePickerProps
  | MultiChoicePickerProps;

/** Searchable selection picker with one focus and popup model for single and multiple values. */
export function ChoicePicker(props: ChoicePickerProps) {
  const multiple = props.selectionMode === 'multiple';
  const { label, options, missingOption, disabled, loading, error, onRetry } =
    props;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const statusId = useId();
  const popupId = useId();
  const chosen = multiple ? props.values : [props.value];
  const selected = new Set(chosen);
  const selectedOptions = [
    ...options,
    ...(missingOption ? [missingOption] : []),
  ];
  const labels = chosen.map(
    id => selectedOptions.find(option => option.id === id)?.label ?? id
  );
  const ids = selectedOptions.map(option => option.id);
  invariant(
    ids.every(id => !!id.trim()) && new Set(ids).size === ids.length,
    'ChoicePicker option IDs must be nonempty and unique.'
  );
  invariant(
    !multiple ||
      (Number.isSafeInteger(props.maxSelected) && props.maxSelected >= 1),
    'ChoicePicker maxSelected must be a positive integer.'
  );
  invariant(
    !multiple ||
      (new Set(chosen).size === chosen.length &&
        chosen.length <= props.maxSelected),
    'ChoicePicker selection must be unique and within maxSelected.'
  );
  invariant(
    loading || error || chosen.every(id => ids.includes(id)),
    'ChoicePicker selection must refer to available option IDs.'
  );
  invariant(
    !multiple || !!props.emptySelectionLabel.trim(),
    'ChoicePicker emptySelectionLabel must describe the empty selection.'
  );
  const display = multiple
    ? labels.join(', ') || props.emptySelectionLabel
    : labels[0];
  const matches = searchItems(selectedOptions, search.trim(), {
    attributes: [
      {
        name: 'label',
        getter(option) {
          return option.label;
        },
      },
      {
        name: 'description',
        getter(option) {
          return option.description ?? '';
        },
      },
    ],
  });
  const atLimit = multiple && chosen.length >= props.maxSelected;
  const canClear = multiple && chosen.length > 0;
  const feedback = error
    ? 'Couldn’t load values'
    : loading
      ? 'Loading values…'
      : matches.length
        ? `${matches.length} ${matches.length === 1 ? 'value' : 'values'}`
        : (props.emptyMessage ?? 'No matching values');

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  function select(selection: Selection) {
    if (selection === 'all') return;
    const ids = [...selection].map(String);
    if (multiple) {
      if (ids.length <= props.maxSelected) props.onChange(ids);
    } else {
      const id = ids[0];
      if (id !== undefined) {
        props.onChange(id);
        setOpen(false);
        setSearch('');
      }
    }
  }

  function clear() {
    if (multiple) props.onChange([]);
    setOpen(false);
    setSearch('');
  }

  return (
    <DialogTrigger
      isOpen={open}
      onOpenChange={next => {
        setOpen(next);
        if (!next) setSearch('');
      }}
    >
      <Button
        aria-haspopup="dialog"
        aria-controls={open ? popupId : undefined}
        className="altertable-picker-trigger"
        isDisabled={disabled}
        aria-label={`${label}: ${display}`}
      >
        <span className="altertable-picker-label" aria-hidden="true">
          {label}
        </span>
        <strong className="altertable-picker-value" aria-hidden="true">
          {display}
        </strong>
        <AppIcon name="disclosure" size={14} />
      </Button>
      <Popover
        className="altertable-choice-picker-popover"
        placement="bottom start"
      >
        <Dialog
          id={popupId}
          aria-label={`${label} options`}
          className="altertable-choice-picker-dialog"
        >
          <SearchInput
            focusRing={false}
            size="compact"
            loading={loading}
            ref={searchRef}
            aria-label={`Search ${label.toLocaleLowerCase()} values`}
            aria-describedby={statusId}
            placeholder={props.placeholder ?? 'Search values'}
            value={search}
            onChange={event => setSearch(event.currentTarget.value)}
            onKeyDown={event => {
              if (event.key !== 'ArrowDown' || !matches.length) return;
              event.preventDefault();
              listRef.current?.focus();
            }}
          />
          <output
            id={statusId}
            className="altertable-choice-picker-status"
            aria-live={error ? 'off' : 'polite'}
          >
            {error ? `${matches.length} available values` : feedback}
            {atLimit
              ? `. Maximum of ${props.maxSelected} selections reached.`
              : ''}
          </output>
          <GradientScroll className="altertable-choice-picker-options">
            {matches.length > 0 ? (
              <ListBox
                aria-busy={loading || undefined}
                ref={listRef}
                items={matches}
                aria-label={`${label} values`}
                aria-describedby={statusId}
                selectionMode={multiple ? 'multiple' : 'single'}
                selectionBehavior="toggle"
                escapeKeyBehavior="none"
                disallowEmptySelection={!multiple}
                selectedKeys={selected}
                onSelectionChange={select}
              >
                {hit => (
                  <ListBoxItem
                    data-atbl-internal-surface="option"
                    data-atbl-focus="inset"
                    data-atbl-control="action"
                    id={hit.item.id}
                    data-missing={
                      hit.item.id === missingOption?.id || undefined
                    }
                    textValue={hit.item.label}
                    isDisabled={atLimit && !selected.has(hit.item.id)}
                  >
                    <SelectionMark
                      selected={selected.has(hit.item.id)}
                      multiple={multiple}
                    />
                    <span className="altertable-choice-picker-option-content">
                      <span>
                        <SearchMatch match={hit.matches.label} />
                      </span>
                      {hit.item.description && (
                        <small>
                          <SearchMatch match={hit.matches.description} />
                        </small>
                      )}
                    </span>
                  </ListBoxItem>
                )}
              </ListBox>
            ) : loading && !error ? (
              <div
                className="altertable-choice-picker-skeletons"
                aria-hidden="true"
              >
                {[0, 1, 2].map(row => (
                  <Skeleton key={row} />
                ))}
              </div>
            ) : (
              <div className="altertable-choice-picker-empty">
                {error ? 'Values are unavailable' : feedback}
              </div>
            )}
          </GradientScroll>
          {error && (
            <RequestHint
              status={{
                kind: 'error',
                message: 'Couldn’t load values',
                onRetry,
              }}
              retryLabel="Try again"
            />
          )}
          {canClear && (
            <div className="altertable-choice-picker-actions">
              <Button variant="ghost" size="compact" onPress={clear}>
                Clear selection
              </Button>
            </div>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
