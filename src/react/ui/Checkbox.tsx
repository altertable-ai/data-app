import { useId, type ReactNode } from 'react';
import { SelectionMark } from '@/src/react/ui/SelectionMark';
import { classNames } from '@/src/react/ui/classNames';

export type CheckboxProps = {
  label: string;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

export function Checkbox({
  label,
  description,
  checked,
  onChange,
  disabled,
  className,
}: CheckboxProps) {
  const descriptionId = useId();

  return (
    <label
      data-atbl-focus="ring"
      data-atbl-control="action"
      className={classNames('altertable-checkbox', className)}
    >
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        aria-describedby={description ? descriptionId : undefined}
        onChange={event => onChange(event.currentTarget.checked)}
      />
      <SelectionMark selected={checked} />
      <span>
        {label}
        {description && <small id={descriptionId}>{description}</small>}
      </span>
    </label>
  );
}
