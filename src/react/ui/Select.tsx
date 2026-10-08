import {
  Select as AriaSelect,
  Label,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
} from 'react-aria-components';
import { PressButton } from '@/src/react/ui/Button';
import { AppIcon } from '@/src/react/ui/icons';
import { SelectionMark } from '@/src/react/ui/SelectionMark';
import { validateChoiceOptions, type ChoiceOption } from '@/src/core/variables';
import { invariant } from '@/src/core/invariant';
import { classNames } from '@/src/react/ui/classNames';

export type SelectProps = {
  label: string;
  options: readonly ChoiceOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  className?: string;
};
/** Labeled single selection with keyboard navigation and a styled listbox. */
export function Select({
  label,
  options,
  value,
  onChange,
  disabled,
  required,
  className,
  ...props
}: SelectProps) {
  validateChoiceOptions(options);
  const selected = options.find(option => option.id === value);
  invariant(selected, 'Select value must refer to an available option.');
  return (
    <AriaSelect
      {...props}
      selectedKey={value}
      onSelectionChange={key => {
        if (key !== null) onChange(String(key));
      }}
      isDisabled={disabled}
      isRequired={required}
      className={classNames('altertable-select', className)}
    >
      <Label>{label}</Label>
      <PressButton className="altertable-select-trigger">
        <SelectValue>{selected.label}</SelectValue>
        <AppIcon name="disclosure" size={14} />
      </PressButton>
      <Popover className="altertable-select-popover" placement="bottom start">
        <ListBox
          items={options}
          aria-label={`${label} values`}
          className="altertable-select-options"
        >
          {option => (
            <ListBoxItem
              id={option.id}
              textValue={option.label}
              className="altertable-select-option"
              data-atbl-control="action"
              data-atbl-internal-surface="option"
              data-atbl-focus="inset"
            >
              {({ isSelected }) => (
                <>
                  <SelectionMark selected={isSelected} multiple={false} />
                  <span>
                    {option.label}
                    {option.description && <small>{option.description}</small>}
                  </span>
                </>
              )}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}
