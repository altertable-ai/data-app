import { moveFilterImports } from './move-filter-imports.ts';

type MigrationStep = { id: string } & (
  | { rewrite: (source: string) => string }
  | { pattern: RegExp; message: string }
);

export const migrationsByVersion: Readonly<
  Record<string, readonly MigrationStep[]>
> = {
  '0.76.0': [
    {
      id: 'calendar-date-ranges',
      pattern:
        /\b(?:DateRangePicker|DateRangeRequest|dateRangeVariable|defineDateRangeContract)\b/,
      message:
        'Review date bounds, reporting timezones, and SQL predicates when moving to datetime ranges.',
    },
  ],
  '0.77.0': [
    {
      id: 'move-filter-imports',
      rewrite: moveFilterImports,
    },
    {
      id: 'operation-filters-and-views',
      pattern:
        /\b(?:defineDataView|defineTimeView|defineFacetFilter|defineDateRangeContract|dateTimeRangeVariable|searchVariable|choiceVariable|multiChoiceVariable|variableInput|parseEmptyInput)\b/,
      message:
        'Review operation inputs, filter defaults, and widget query scope against the new view API.',
    },
  ],
  '0.78.0': [
    {
      id: 'registered-query-client',
      pattern: /\b(?:serveLocalApp|createDataClient|defineDataQueryRoute)\b/,
      message:
        'Review how app operations use the registered-query client and how local apps serve queries.',
    },
    {
      id: 'embedded-page-actions',
      pattern:
        /\b(?:DataAppBridge|attachDataAppBridge|toolbarActions|footerActions)\b/,
      message:
        'Review custom page actions and move embedded controls into the host where needed.',
    },
  ],
  '0.79.0': [
    {
      id: 'unbound-ui-widgets',
      pattern:
        /import\s*(?:type\s*)?\{[^}]*\b(?:DataApp|DataValue|MetricWidget|TableWidget|TextWidget|VisualizationWidget)(?:Props)?\b[^}]*\}\s*from\s*['"]@altertable\/data-app-react\/ui['"]/,
      message:
        'Bind these widgets to a view: `@altertable/data-app-react/ui` no longer exports unbound `DataApp`, `DataValue`, `MetricWidget`, `TableWidget`, `TextWidget`, or `VisualizationWidget`.',
    },
    {
      id: 'empty-row-views',
      pattern: /\bdefine(?:Detail)?View\(/,
      message:
        "Review views that return rows without `isEmpty`: a result with no rows now shows the view's empty state.",
    },
  ],
};
