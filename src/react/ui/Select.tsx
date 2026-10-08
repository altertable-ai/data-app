import type { ComponentPropsWithRef } from 'react';
import { validateChoiceOptions, type ChoiceOption } from '@/src/core/variables';
import { invariant } from '@/src/core/invariant';
import { classNames } from '@/src/react/ui/classNames';

export type SelectProps = Omit<
  ComponentPropsWithRef<'select'>,
  'value' | 'onChange' | 'children' | 'multiple'
> & {
  label: string;
  options: readonly ChoiceOption[];
  value: string;
  onChange: (value: string) => void;
};
/** Compact native single selection; values are stable option IDs. */
export function Select({
  label,
  options,
  value,
  onChange,
  className,
  ...props
}: SelectProps) {
  validateChoiceOptions(options);
  invariant(
    options.some(option => option.id === value),
    'Select value must refer to an available option.'
  );
  return (
    <label className={classNames('altertable-select', className)}>
      <span>{label}</span>
      <select
        {...props}
        data-atbl-control="action"
        data-atbl-focus="ring"
        value={value}
        onChange={event => onChange(event.currentTarget.value)}
      >
        {options.map(option => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
