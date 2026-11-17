import { isRecord } from './record.ts';

/** Page actions an embedded app offers its host, replaced as a whole on every change.
 * An absent key means the app does not offer that action. */
export type DataAppActions = {
  /** Run `refresh`; while `refreshing`, run `cancelRefresh` if `cancellable`. */
  refresh?: { refreshing: boolean; cancellable: boolean };
  /** Run `exportCsv`. `tables` names the datasets an action's `table` may select. */
  exportCsv?: { enabled: boolean; tables: readonly string[] };
  /** Run `presentStory`; while `presenting`, run `closeStory`. */
  presentStory?: { enabled: boolean; presenting: boolean };
  /** Run `aboutData` to open the data inspector. */
  aboutData?: { enabled: boolean };
};

/** A host request to run an offered page action. The app ignores unavailable actions. */
export type DataAppAction =
  | { type: 'refresh' }
  | { type: 'cancelRefresh' }
  /** Omit `table` to export every dataset, as a ZIP when there are several. */
  | { type: 'exportCsv'; table?: string }
  | { type: 'presentStory' }
  | { type: 'closeStory' }
  | { type: 'aboutData' };

const MAX_TABLES = 64;

export function parseDataAppActions(value: unknown): DataAppActions {
  if (!isRecord(value)) throw new Error('Invalid actions.');
  const actions: DataAppActions = {};
  const { refresh, exportCsv } = value;
  if (refresh !== undefined) {
    if (
      !isRecord(refresh) ||
      typeof refresh.refreshing !== 'boolean' ||
      typeof refresh.cancellable !== 'boolean'
    )
      throw new Error('Invalid refresh action.');
    actions.refresh = {
      refreshing: refresh.refreshing,
      cancellable: refresh.cancellable,
    };
  }
  if (exportCsv !== undefined) {
    if (
      !isRecord(exportCsv) ||
      typeof exportCsv.enabled !== 'boolean' ||
      !Array.isArray(exportCsv.tables) ||
      exportCsv.tables.length > MAX_TABLES ||
      !exportCsv.tables.every(
        table => typeof table === 'string' && table.length <= 256
      )
    )
      throw new Error('Invalid export action.');
    actions.exportCsv = {
      enabled: exportCsv.enabled,
      tables: [...(exportCsv.tables as string[])],
    };
  }
  const { presentStory } = value;
  if (presentStory !== undefined) {
    if (
      !isRecord(presentStory) ||
      typeof presentStory.enabled !== 'boolean' ||
      typeof presentStory.presenting !== 'boolean'
    )
      throw new Error('Invalid story action.');
    actions.presentStory = {
      enabled: presentStory.enabled,
      presenting: presentStory.presenting,
    };
  }
  const { aboutData } = value;
  if (aboutData !== undefined) {
    if (!isRecord(aboutData) || typeof aboutData.enabled !== 'boolean')
      throw new Error('Invalid inspection action.');
    actions.aboutData = { enabled: aboutData.enabled };
  }
  return actions;
}

export function parseDataAppAction(value: unknown): DataAppAction {
  if (!isRecord(value)) throw new Error('Invalid action.');
  switch (value.type) {
    case 'refresh':
    case 'cancelRefresh':
    case 'presentStory':
    case 'closeStory':
    case 'aboutData':
      return { type: value.type };
    case 'exportCsv':
      if (value.table !== undefined && typeof value.table !== 'string')
        throw new Error('Invalid export table.');
      return value.table === undefined
        ? { type: 'exportCsv' }
        : { type: 'exportCsv', table: value.table };
    default:
      throw new Error('Unknown action.');
  }
}
