import type { CalendarDate } from '@internationalized/date';
import type { RangeValue } from 'react-aria-components';

type PickerState = {
  status: 'closed' | 'presets' | 'editing' | 'calendar';
  draft: string;
  edited: boolean;
  highlight: number;
  error: string;
  help: boolean;
  helpSide: 'left' | 'right' | 'inline';
  calendarSelection: RangeValue<CalendarDate> | null;
  complete: boolean;
};
export const initialPickerState: PickerState = {
  status: 'closed',
  draft: '',
  edited: false,
  highlight: -1,
  error: '',
  help: false,
  helpSide: 'left',
  calendarSelection: null,
  complete: false,
};
type PickerAction =
  | { type: 'open'; draft: string; helpSide: PickerState['helpSide'] }
  | { type: 'close' }
  | { type: 'edit'; draft: string }
  | { type: 'calendar'; selection: PickerState['calendarSelection'] }
  | { type: 'error'; error: string }
  | { type: 'update'; value: Partial<PickerState> };

export function dateTimeRangePickerReducer(
  state: PickerState,
  action: PickerAction
): PickerState {
  switch (action.type) {
    case 'open':
      return {
        ...state,
        ...(state.status === 'closed'
          ? { draft: action.draft, edited: false, error: '', help: false }
          : {}),
        status: 'presets',
        highlight: -1,
        helpSide: action.helpSide,
      };
    case 'close':
      return { ...state, status: 'closed', help: false, error: '' };
    case 'edit':
      return {
        ...state,
        draft: action.draft,
        edited: true,
        status: 'editing',
        highlight: -1,
        error: '',
      };
    case 'calendar':
      return {
        ...state,
        calendarSelection: action.selection,
        complete: false,
        status: 'calendar',
        help: false,
        error: '',
      };
    case 'error':
      return { ...state, error: action.error, help: true };
    case 'update':
      return { ...state, ...action.value };
  }
}
