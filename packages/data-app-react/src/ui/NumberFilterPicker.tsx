import {
  type NumberFilter,
  type NumberOperator,
  type NumberSelection,
} from '@altertable/data-app/contract';
import { numberOperatorLabels } from '@altertable/data-app/internal';
import { useState } from 'react';
import { DialogTrigger, Dialog } from 'react-aria-components';

import { PressButton } from './Button.tsx';
import {
  NumberField,
  NumberRangeField,
  type NumberRange,
} from './NumberField.tsx';
import {
  PickerField,
  PickerTriggerContent,
  type ControlLabelPlacement,
} from './PickerField.tsx';
import { PopoverSurface } from './PopoverSurface.tsx';
import { Select } from './Select.tsx';

export type NumberFilterPickerProps = {
  filter: NumberFilter;
  labelPlacement?: ControlLabelPlacement;
  value: NumberSelection;
  onChange: (value: NumberSelection) => void;
  disabled?: boolean;
};
type NumberCondition = 'all' | 'range' | NumberOperator;

const conditionOptions = [
  { id: 'all', label: 'Any value' },
  { id: 'range', label: 'Between' },
  ...Object.entries(numberOperatorLabels).map(([id, label]) => ({ id, label })),
];

/** Edit a numeric predicate in a panel. Apply commits one complete value; dismissing discards the draft. */
export function NumberFilterPicker({
  filter,
  value,
  onChange,
  disabled,
  labelPlacement = 'inline',
}: NumberFilterPickerProps) {
  const [open, setOpen] = useState(false);
  const summary = filter.describe?.(value);
  return (
    <PickerField label={filter.label} labelPlacement={labelPlacement}>
      <DialogTrigger isOpen={open} onOpenChange={setOpen}>
        <PressButton
          className="altertable-picker-trigger"
          aria-label={`${filter.label}: ${summary}`}
          isDisabled={disabled}
        >
          <PickerTriggerContent
            label={filter.label}
            labelPlacement={labelPlacement}
            value={summary}
          />
        </PressButton>
        <PopoverSurface
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
        </PopoverSurface>
      </DialogTrigger>
    </PickerField>
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
  const [condition, setCondition] = useState<NumberCondition>(
    value.kind === 'comparison' ? value.operator : value.kind
  );
  const [comparisonValue, setComparisonValue] = useState<number | null>(
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
    condition === 'all'
      ? { kind: 'all' }
      : condition === 'range'
        ? { kind: 'range', ...range }
        : {
            kind: 'comparison',
            operator: condition,
            value: comparisonValue ?? NaN,
          };
  const valid =
    filter.valid(selection) && (condition !== 'range' || rangeValid);
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
        value={condition}
        onChange={next => {
          setCondition(next as NumberCondition);
          setRangeValid(true);
          setSubmitted(false);
        }}
        options={conditionOptions}
      />
      {condition === 'range' ? (
        <NumberRangeField
          label="Bounds"
          value={range}
          onChange={setRange}
          onValidityChange={setRangeValid}
          min={filter.min}
          max={filter.max}
        />
      ) : condition !== 'all' ? (
        <NumberField
          label="Value"
          value={comparisonValue}
          onChange={setComparisonValue}
          minValue={filter.min}
          maxValue={filter.max}
        />
      ) : null}
      {submitted && (
        <p role="alert" className="altertable-number-filter-feedback">
          {!valid
            ? condition === 'range'
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
          variant="primary"
          isDisabled={condition === 'range' && !rangeValid}
        >
          Apply
        </PressButton>
      </div>
    </form>
  );
}
