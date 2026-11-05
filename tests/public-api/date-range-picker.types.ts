import type { DateRangePickerProps } from '@altertable/data-app-react/ui';

function verifyControlledDateRange(props: DateRangePickerProps) {
  const controlled: DateRangePickerProps = {
    value: { start: '2026-09-04', end: '2026-09-06' },
    onChange: props.onChange,
  };
  const namedStart: DateRangePickerProps = {
    ...controlled,
    // @ts-expect-error The single-input picker does not expose named start fields.
    startName: 'start',
  };
  // @ts-expect-error The single-input picker does not expose named end fields.
  const namedEnd: DateRangePickerProps = { ...controlled, endName: 'end' };
  const styled: DateRangePickerProps = {
    ...controlled,
    className: state => (state.isReadOnly ? 'readonly' : 'editable'),
    style: state => ({ opacity: state.isDisabled ? 0.5 : 1 }),
    validate: range =>
      range.start.compare(range.end) > 0 ? 'Invalid order' : null,
    isDateAvailable: date => date.day !== 11,
  };
  const ariaForm: DateRangePickerProps = {
    ...controlled,
    // @ts-expect-error React Aria-specific form validation is not part of the controlled picker API.
    validationBehavior: 'native',
  };
  return { controlled, namedStart, namedEnd, styled, ariaForm };
}

void verifyControlledDateRange;
