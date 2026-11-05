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
  return { controlled, namedStart, namedEnd };
}

void verifyControlledDateRange;
