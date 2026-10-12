import { PopoverSurface } from '@/src/react/ui/PopoverSurface';
import {
  Select as AriaSelect,
  Label,
  SelectValue,
  ListBox,
  ListBoxItem,
} from 'react-aria-components';
import {
  PickerTriggerContent,
  type ControlLabelPlacement,
} from '@/src/react/ui/PickerField';
import { PressButton } from '@/src/react/ui/Button';
import { SelectionMark } from '@/src/react/ui/SelectionMark';
import { validateChoiceOptions, type ChoiceOption } from '@/src/core/variables';
import { invariant } from '@/src/core/invariant';
import { classNames } from '@/src/react/ui/classNames';

export type SelectProps = {
  label: string;
  labelPlacement?: ControlLabelPlacement;
  options: readonly ChoiceOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  className?: string;
  /** Align the popup with the selection button. Defaults to start. */
  align?: 'start' | 'end';
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
  align = 'start',
  labelPlacement = 'above',
  ...props
}: SelectProps) {
  const inline = labelPlacement === 'inline';
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
      className={classNames('altertable-select', 'altertable-field', className)}
      data-label-placement={labelPlacement}
    >
      <Label className={inline ? 'altertable-sr-only' : undefined}>
        {label}
      </Label>
      <PressButton
        className={classNames(
          'altertable-select-trigger',
          inline && 'altertable-picker-trigger'
        )}
      >
        <PickerTriggerContent
          label={label}
          labelPlacement={labelPlacement}
          value={<SelectValue>{selected.label}</SelectValue>}
        />
      </PressButton>
      <PopoverSurface
        className="altertable-select-popover"
        placement={`bottom ${align}`}
      >
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
      </PopoverSurface>
    </AriaSelect>
  );
}
