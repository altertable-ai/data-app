import type { DataAppConfig } from '@/src/core/config';
import { validateQueries } from '@/src/core/queries';
import {
  checkFields,
  isRecord,
  type ValidationIssue,
} from '@/src/core/validation';

/** Plain declaration data, with SQL and parameter defaults preserved as authored. */
export type DataAppManifest = DataAppConfig;
export type DataAppManifestIssue = ValidationIssue;
export type DataAppManifestValidation = {
  manifest: DataAppManifest | null;
  issues: DataAppManifestIssue[];
};

/** Validate external declaration data without coercing fields or filling defaults. */
export function validateDataAppManifest(
  value: unknown
): DataAppManifestValidation {
  const issues: ValidationIssue[] = [];
  function object(
    value: unknown,
    fields: string[],
    path: string[]
  ): value is Record<string, unknown> {
    if (!isRecord(value)) {
      issues.push({ path, message: 'Expected an object.' });
      return false;
    }
    checkFields(value, fields, path, issues);
    return true;
  }
  function string(value: unknown, path: (string | number)[], nonempty = false) {
    if (typeof value !== 'string' || (nonempty && !value.trim()))
      issues.push({
        path,
        message: nonempty
          ? 'Expected a nonempty string.'
          : 'Expected a string.',
      });
  }
  if (
    object(
      value,
      [
        'title',
        'description',
        'scope',
        'queries',
        'appearance',
        'dateFormatting',
      ],
      []
    )
  ) {
    string(value.title, ['title'], true);
    string(value.description, ['description']);
    if (object(value.scope, ['organization', 'environment'], ['scope'])) {
      string(value.scope.organization, ['scope', 'organization'], true);
      string(value.scope.environment, ['scope', 'environment'], true);
    }
    issues.push(
      ...validateQueries(value.queries).map(issue => ({
        ...issue,
        path: ['queries', ...issue.path],
      }))
    );
    if (isRecord(value.queries)) {
      for (const [name, query] of Object.entries(value.queries)) {
        if (!isRecord(query)) continue;
        checkFields(query, ['statement', 'params'], ['queries', name], issues);
        if (!isRecord(query.params)) continue;
        for (const [key, declaration] of Object.entries(query.params)) {
          if (isRecord(declaration))
            checkFields(
              declaration,
              ['defaultValue'],
              ['queries', name, 'params', key],
              issues
            );
        }
      }
    }
    if (
      Object.hasOwn(value, 'dateFormatting') &&
      object(value.dateFormatting, ['locale', 'timeZone'], ['dateFormatting'])
    ) {
      for (const key of ['locale', 'timeZone'])
        if (Object.hasOwn(value.dateFormatting, key))
          string(value.dateFormatting[key], ['dateFormatting', key]);
    }
    if (
      Object.hasOwn(value, 'appearance') &&
      object(
        value.appearance,
        [
          'theme',
          'baseColor',
          'accentColor',
          'darkAccentColor',
          'chartColors',
          'density',
          'cornerRadius',
          'elevation',
          'typography',
        ],
        ['appearance']
      )
    ) {
      const options: Record<string, string[]> = {
        theme: ['light', 'dark', 'system'],
        baseColor: ['neutral', 'slate', 'warm'],
        density: ['compact', 'comfortable', 'spacious'],
        cornerRadius: ['none', 'small', 'medium', 'large'],
        elevation: ['flat', 'subtle', 'raised'],
      };
      for (const [key, allowed] of Object.entries(options)) {
        if (
          Object.hasOwn(value.appearance, key) &&
          !allowed.includes(value.appearance[key] as string)
        )
          issues.push({
            path: ['appearance', key],
            message: `Expected one of: ${allowed.join(', ')}.`,
          });
      }
      for (const key of ['accentColor', 'darkAccentColor'])
        if (Object.hasOwn(value.appearance, key))
          string(value.appearance[key], ['appearance', key]);
      if (Object.hasOwn(value.appearance, 'chartColors')) {
        const colors = value.appearance.chartColors;
        if (!Array.isArray(colors))
          issues.push({
            path: ['appearance', 'chartColors'],
            message: 'Expected an array of strings.',
          });
        else
          colors.forEach((color, index) =>
            string(color, ['appearance', 'chartColors', index])
          );
      }
      if (
        Object.hasOwn(value.appearance, 'typography') &&
        object(
          value.appearance.typography,
          ['body', 'heading'],
          ['appearance', 'typography']
        )
      ) {
        for (const key of ['body', 'heading'])
          if (Object.hasOwn(value.appearance.typography, key))
            string(value.appearance.typography[key], [
              'appearance',
              'typography',
              key,
            ]);
      }
    }
  }
  return {
    manifest: issues.length ? null : (value as DataAppManifest),
    issues,
  };
}
