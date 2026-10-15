import {
  formatDate,
  formatDateTime,
  type DateFormatOptions,
  type DateTimeFormatOptions,
} from '@altertable/data-app/format';

const defaults: DateFormatOptions = {};
const localized: DateTimeFormatOptions = {
  locale: 'fr-FR',
  timeZone: 'Europe/Paris',
  precision: 'second',
};
formatDate('2026-01-01', defaults);
formatDateTime('2026-01-01T12:00:00Z', localized);
formatDate('2026-01-01', { locale: undefined });
formatDate('2026-01-01', { missing: undefined });
formatDateTime('2026-01-01T12:00:00Z', { timeZone: undefined });
formatDateTime('2026-01-01T12:00:00Z', { precision: undefined });
