import type { ComponentPropsWithRef, ReactNode } from 'react';
import {
  RadioGroup as AriaRadioGroup,
  Radio as AriaRadio,
  Label,
} from 'react-aria-components';
import { classNames } from '@/src/react/ui/classNames';
import { validateChoiceOptions, type ChoiceOption } from '@/src/core/variables';

export type RadioGroupProps = Omit<
  ComponentPropsWithRef<typeof AriaRadioGroup>,
  'className' | 'children'
> & { children: ReactNode; label: string; className?: string };
export function RadioGroup({
  label,
  className,
  children,
  ...props
}: RadioGroupProps) {
  return (
    <AriaRadioGroup
      {...props}
      className={classNames('altertable-radio-group', className)}
    >
      <Label>{label}</Label>
      {children}
    </AriaRadioGroup>
  );
}
export type RadioProps = Omit<
  ComponentPropsWithRef<typeof AriaRadio>,
  'className'
> & { className?: string };
export function Radio({ className, children, ...props }: RadioProps) {
  return (
    <AriaRadio
      {...props}
      data-atbl-control="action"
      data-atbl-focus="ring"
      className={classNames('altertable-radio', className)}
    >
      {state => (
        <>
          <span className="altertable-radio-mark" aria-hidden="true" />
          {typeof children === 'function' ? children(state) : children}
        </>
      )}
    </AriaRadio>
  );
}
export type SegmentedControlProps = Omit<RadioGroupProps, 'children'> & {
  options: readonly ChoiceOption[];
};
/** A compact radio group; arrow keys follow standard radio selection behavior. */
export function SegmentedControl({
  options,
  className,
  ...props
}: SegmentedControlProps) {
  validateChoiceOptions(options);
  return (
    <RadioGroup
      {...props}
      orientation="horizontal"
      className={classNames('altertable-segmented-control', className)}
    >
      {options.map(option => (
        <Radio
          key={option.id}
          value={option.id}
          data-atbl-internal-surface="option"
        >
          {option.label}
        </Radio>
      ))}
    </RadioGroup>
  );
}
