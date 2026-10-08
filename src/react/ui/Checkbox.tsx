import { createContext, useContext, useId, type ReactNode } from 'react';
import { invariant } from '@/src/core/invariant';
import { SelectionMark } from '@/src/react/ui/SelectionMark';
import { classNames } from '@/src/react/ui/classNames';

export const CheckboxGroupContext = createContext<{
  values: readonly string[];
  disabled?: boolean;
  onChange: (value: string, checked: boolean) => void;
} | null>(null);
export type CheckboxProps = {
  label: string;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
} & (
  | { value: string; checked?: never; onChange?: never }
  | { value?: never; checked: boolean; onChange: (checked: boolean) => void }
);
export function Checkbox({
  label,
  description,
  checked,
  value,
  onChange,
  disabled,
  className,
}: CheckboxProps) {
  const group = useContext(CheckboxGroupContext);
  const descriptionId = useId();
  invariant(
    value === undefined || group,
    'A checkbox with value must belong to a CheckboxGroup.'
  );
  const selected =
    value === undefined ? checked : group!.values.includes(value);
  return (
    <label
      data-atbl-focus="ring"
      data-atbl-control="action"
      className={classNames('altertable-checkbox', className)}
    >
      <input
        type="checkbox"
        value={value}
        checked={selected}
        aria-label={label}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled || group?.disabled}
        onChange={event => {
          if (value === undefined) onChange!(event.currentTarget.checked);
          else group!.onChange(value, event.currentTarget.checked);
        }}
      />
      <SelectionMark selected={selected} />
      <span>
        {label}
        {description && <small id={descriptionId}>{description}</small>}
      </span>
    </label>
  );
}
