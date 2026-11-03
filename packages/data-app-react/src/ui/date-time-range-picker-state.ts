import type { DateTimeRange } from '@altertable/data-app/contract';

type PickerState = {
  open: boolean;
  mode: 'presets' | 'editing' | 'calendar';
  draft: string;
  edited: boolean;
  highlight: number;
  error: string;
  help: boolean;
  helpSide: 'left' | 'right' | 'inline';
  calendar: DateTimeRange | null;
  complete: boolean;
};
export const initialPickerState: PickerState = {
  open: false,
  mode: 'presets',
  draft: '',
  edited: false,
  highlight: -1,
  error: '',
  help: false,
  helpSide: 'left',
  calendar: null,
  complete: false,
};
type PickerAction =
  | { type: 'open'; draft: string; helpSide: PickerState['helpSide'] }
  | { type: 'close' }
  | { type: 'edit'; draft: string }
  | { type: 'calendar'; value: DateTimeRange | null }
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
        ...(!state.open
          ? { draft: action.draft, edited: false, error: '', help: false }
          : {}),
        open: true,
        mode: 'presets',
        highlight: -1,
        helpSide: action.helpSide,
      };
    case 'close':
      return { ...state, open: false, help: false, error: '' };
    case 'edit':
      return {
        ...state,
        draft: action.draft,
        edited: true,
        mode: 'editing',
        highlight: -1,
        error: '',
      };
    case 'calendar':
      return {
        ...state,
        calendar: action.value,
        complete: false,
        mode: 'calendar',
        help: false,
        error: '',
      };
    case 'error':
      return { ...state, error: action.error, help: true };
    case 'update':
      return { ...state, ...action.value };
  }
}
