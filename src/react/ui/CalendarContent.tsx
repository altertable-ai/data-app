import {
  Button,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarMonthPicker,
  CalendarYearPicker,
  Select,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
} from 'react-aria-components';
import { AppIcon } from '@/src/react/ui/icons';

export function CalendarContent() {
  return (
    <>
      <header>
        <Button slot="previous" aria-label="Previous month">
          <AppIcon name="previousMonth" size={16} />
        </Button>
        <CalendarMonthPicker format="short">
          {picker => (
            <Select
              aria-label={picker['aria-label']}
              selectedKey={String(picker.value)}
              onSelectionChange={key => picker.onChange(Number(key))}
              className="altertable-calendar-select"
            >
              <Button>
                <SelectValue />
                <AppIcon name="disclosure" size={14} />
              </Button>
              <Popover
                className="altertable-calendar-select-popover"
                placement="bottom start"
              >
                <ListBox items={picker.items}>
                  {month => (
                    <ListBoxItem
                      id={String(month.id)}
                      textValue={month.formatted}
                    >
                      {month.formatted}
                    </ListBoxItem>
                  )}
                </ListBox>
              </Popover>
            </Select>
          )}
        </CalendarMonthPicker>
        <CalendarYearPicker>
          {picker => (
            <Select
              aria-label={picker['aria-label']}
              selectedKey={String(picker.value)}
              onSelectionChange={key => picker.onChange(Number(key))}
              className="altertable-calendar-select"
            >
              <Button>
                <SelectValue />
                <AppIcon name="disclosure" size={14} />
              </Button>
              <Popover
                className="altertable-calendar-select-popover"
                placement="bottom start"
              >
                <ListBox items={picker.items}>
                  {year => (
                    <ListBoxItem
                      id={String(year.id)}
                      textValue={year.formatted}
                    >
                      {year.formatted}
                    </ListBoxItem>
                  )}
                </ListBox>
              </Popover>
            </Select>
          )}
        </CalendarYearPicker>
        <Button slot="next" aria-label="Next month">
          <AppIcon name="nextMonth" size={16} />
        </Button>
      </header>
      <CalendarGrid>
        <CalendarGridHeader>
          {day => <CalendarHeaderCell>{day}</CalendarHeaderCell>}
        </CalendarGridHeader>
        <CalendarGridBody>
          {date => <CalendarCell date={date} />}
        </CalendarGridBody>
      </CalendarGrid>
    </>
  );
}
