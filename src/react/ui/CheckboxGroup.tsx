import type { ComponentPropsWithRef } from 'react';
import { invariant } from '@/src/core/invariant';
import { CheckboxGroupContext } from '@/src/react/ui/Checkbox';
import { classNames } from '@/src/react/ui/classNames';
export type CheckboxGroupProps = Omit<
  ComponentPropsWithRef<'fieldset'>,
  'onChange'
> & {
  label: string;
  values: readonly string[];
  onChange: (values: string[]) => void;
};
export function CheckboxGroup({
  label,
  values,
  onChange,
  className,
  children,
  disabled,
  ...props
}: CheckboxGroupProps) {
  invariant(
    new Set(values).size === values.length,
    'Checkbox group values must be unique.'
  );
  return (
    <fieldset
      {...props}
      disabled={disabled}
      className={classNames('altertable-checkbox-group', className)}
    >
      <legend>{label}</legend>
      <CheckboxGroupContext
        value={{
          values,
          disabled,
          onChange(value, checked) {
            onChange(
              checked
                ? [...values.filter(item => item !== value), value]
                : values.filter(item => item !== value)
            );
          },
        }}
      >
        {children}
      </CheckboxGroupContext>
    </fieldset>
  );
}
