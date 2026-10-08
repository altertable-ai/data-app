import { useState } from 'react';
import { DialogTrigger, Dialog, Popover } from 'react-aria-components';
import { PressButton } from '@/src/react/ui/Button';
import { AppIcon } from '@/src/react/ui/icons';
import { Select } from '@/src/react/ui/Select';
import {
  NumberField,
  NumberRangeField,
  type NumberRange,
} from '@/src/react/ui/NumberField';
import {
  numberOperatorLabels,
  type NumberFilter,
  type NumberOperator,
  type NumberSelection,
} from '@/src/core/filters';

export type NumberFilterPickerProps = {
  filter: NumberFilter;
  value: NumberSelection;
  onChange: (value: NumberSelection) => void;
  disabled?: boolean;
};
type Mode = 'all' | 'range' | NumberOperator;

/** Edit a numeric predicate in a panel. Apply commits one complete value; dismissing discards the draft. */
export function NumberFilterPicker({
  filter,
  value,
  onChange,
  disabled,
}: NumberFilterPickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
      <PressButton
        className="altertable-picker-trigger"
        aria-label={`${filter.label}: ${filter.describe?.(value)}`}
        isDisabled={disabled}
      >
        <span className="altertable-picker-label">{filter.label}</span>
        <strong className="altertable-picker-value">
          {filter.describe?.(value)}
        </strong>
        <AppIcon name="disclosure" size={14} />
      </PressButton>
      <Popover
        className="altertable-number-filter-popover"
        placement="bottom start"
      >
        <Dialog
          aria-label={`${filter.label} filter`}
          className="altertable-number-filter-dialog"
        >
          <NumberFilterEditor
            key={JSON.stringify(value)}
            filter={filter}
            value={value}
            onApply={next => {
              onChange(next);
              setOpen(false);
            }}
            onCancel={() => setOpen(false)}
          />
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
function NumberFilterEditor({
  filter,
  value,
  onApply,
  onCancel,
}: {
  filter: NumberFilter;
  value: NumberSelection;
  onApply: (value: NumberSelection) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<Mode>(
    value.kind === 'comparison' ? value.operator : value.kind
  );
  const [number, setNumber] = useState<number | null>(
    value.kind === 'comparison'
      ? value.value
      : value.kind === 'range'
        ? (value.min ?? value.max ?? null)
        : null
  );
  const [range, setRange] = useState<NumberRange>(
    value.kind === 'range' ? { min: value.min, max: value.max } : {}
  );
  const [rangeValid, setRangeValid] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const selection: NumberSelection =
    mode === 'all'
      ? { kind: 'all' }
      : mode === 'range'
        ? { kind: 'range', ...range }
        : { kind: 'comparison', operator: mode, value: number ?? NaN };
  const valid = filter.valid(selection) && (mode !== 'range' || rangeValid);
  return (
    <form
      className="altertable-number-filter-editor"
      onSubmit={event => {
        event.preventDefault();
        if (valid) onApply(selection);
        else setSubmitted(true);
      }}
    >
      <h3>{filter.label}</h3>
      <Select
        label="Condition"
        value={mode}
        onChange={next => {
          setMode(next as Mode);
          setRangeValid(true);
          setSubmitted(false);
        }}
        options={[
          { id: 'all', label: 'Any value' },
          { id: 'range', label: 'Between' },
          ...Object.entries(numberOperatorLabels).map(([id, label]) => ({
            id,
            label,
          })),
        ]}
      />
      {mode === 'range' ? (
        <NumberRangeField
          label="Bounds"
          value={range}
          onChange={setRange}
          onValidityChange={setRangeValid}
          min={filter.min}
          max={filter.max}
        />
      ) : mode !== 'all' ? (
        <NumberField
          label="Value"
          value={number}
          onChange={setNumber}
          minValue={filter.min}
          maxValue={filter.max}
        />
      ) : null}
      {submitted && (
        <p role="alert" className="altertable-number-filter-feedback">
          {!valid
            ? mode === 'range'
              ? 'Enter at least one bound.'
              : 'Enter a value.'
            : null}
        </p>
      )}
      <div className="altertable-number-filter-actions">
        {value.kind !== 'all' && (
          <PressButton variant="ghost" onPress={() => onApply({ kind: 'all' })}>
            Clear
          </PressButton>
        )}
        <PressButton onPress={onCancel}>Cancel</PressButton>
        <PressButton
          type="submit"
          variant="elevated"
          isDisabled={mode === 'range' && !rangeValid}
        >
          Apply
        </PressButton>
      </div>
    </form>
  );
}
