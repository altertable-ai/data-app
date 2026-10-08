import { useState } from 'react';
import type { ComponentPropsWithRef } from 'react';
import {
  NumberField as AriaNumberField,
  Label,
  Input,
  Group,
} from 'react-aria-components';
import { classNames } from '@/src/react/ui/classNames';

export type NumberFieldProps = Omit<
  ComponentPropsWithRef<typeof AriaNumberField>,
  'value' | 'onChange' | 'className'
> & {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  className?: string;
};
/** Localized numeric entry. Empty input is null rather than zero. */
export function NumberField({
  label,
  value,
  onChange,
  className,
  ...props
}: NumberFieldProps) {
  return (
    <AriaNumberField
      {...props}
      value={value ?? NaN}
      onChange={value => onChange(Number.isFinite(value) ? value : null)}
      className={classNames('altertable-number-field', className)}
    >
      <Label>{label}</Label>
      <Group data-atbl-internal-surface="field" data-atbl-focus="group">
        <Input data-atbl-control="text" />
      </Group>
    </AriaNumberField>
  );
}
export type NumberRange = { min?: number; max?: number };
export type NumberRangeFieldProps = {
  label: string;
  value: NumberRange;
  onChange: (value: NumberRange) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
};
/** Commit valid intervals; retain invalid draft bounds so users can correct them. */
export function NumberRangeField({
  label,
  value,
  onChange,
  min,
  max,
  disabled,
  className,
}: NumberRangeFieldProps) {
  const [draft, setDraft] = useState(value);
  const [previous, setPrevious] = useState(value);
  if (previous.min !== value.min || previous.max !== value.max) {
    setPrevious(value);
    setDraft(value);
  }
  const invalid =
    draft.min !== undefined && draft.max !== undefined && draft.min > draft.max;
  function change(bound: 'min' | 'max', number: number | null) {
    const next = { ...draft, [bound]: number ?? undefined };
    setDraft(next);
    if (
      next.min === undefined ||
      next.max === undefined ||
      next.min <= next.max
    )
      onChange(next);
  }
  return (
    <fieldset
      className={classNames('altertable-number-range-field', className)}
      disabled={disabled}
    >
      <legend>{label}</legend>
      <NumberField
        label="Minimum"
        value={draft.min ?? null}
        onChange={number => change('min', number)}
        minValue={min}
        maxValue={max}
        isInvalid={invalid}
      />
      <NumberField
        label="Maximum"
        value={draft.max ?? null}
        onChange={number => change('max', number)}
        minValue={min}
        maxValue={max}
        isInvalid={invalid}
      />
      {invalid && <p role="alert">Minimum must not exceed maximum.</p>}
    </fieldset>
  );
}
