import { strToU8, zipSync } from 'fflate';
import { getDataAppTransport } from '@/src/client/iframe';

export type CsvCell = string | number | boolean | null | undefined;

/** One named dataset with ordered columns and raw displayed values. */
export type CsvTable = {
  name: string;
  columns: readonly string[];
  rows: readonly (readonly CsvCell[])[];
};

/** All distinct datasets in the displayed result; filename names the download. */
export type CsvExport = {
  filename: string;
  tables: readonly [CsvTable, ...CsvTable[]];
};

export function formatCsv({
  columns,
  rows,
}: Pick<CsvTable, 'columns' | 'rows'>): string {
  if (!columns.length) throw new Error('CSV export needs at least one column.');
  if (rows.some(row => row.length !== columns.length))
    throw new Error('CSV rows must match the export columns.');
  function cell(value: CsvCell): string {
    if (value === null || value === undefined) return '';
    let text = String(value);
    if (typeof value === 'string' && /^[\s]*[=+\-@]|^[\t\r\n]/.test(text))
      text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }
  return (
    [columns, ...rows].map(row => row.map(cell).join(',')).join('\r\n') + '\r\n'
  );
}

function filenameWithExtension(name: string, extension: 'csv' | 'zip'): string {
  const filename = name.toLowerCase().endsWith(`.${extension}`)
    ? name
    : `${name.replace(/\.(?:csv|zip)$/i, '')}.${extension}`;
  if (!name.trim() || filename.length > 255 || /[\p{Cc}\\/]/u.test(filename))
    throw new Error('Export filenames must be nonempty names without paths.');
  return filename;
}

export function createCsvDownload(
  data: CsvExport,
  selectedTable?: CsvTable
): { filename: string; blob: Blob; route: 'export:csv' | 'export:zip' } {
  if (!data.tables.length)
    throw new Error('CSV export needs at least one dataset.');
  const names = data.tables.map(table =>
    filenameWithExtension(table.name, 'csv')
  );
  if (new Set(names.map(name => name.toLowerCase())).size !== names.length)
    throw new Error('CSV dataset names must be unique.');
  const table =
    selectedTable ?? (data.tables.length === 1 ? data.tables[0] : undefined);
  if (table)
    return {
      filename: filenameWithExtension(
        selectedTable ? table.name : data.filename,
        'csv'
      ),
      blob: new Blob(['\uFEFF' + formatCsv(table)], {
        type: 'text/csv;charset=utf-8',
      }),
      route: 'export:csv',
    };
  const files = Object.fromEntries(
    data.tables.map((dataset, index) => [
      names[index]!,
      strToU8('\uFEFF' + formatCsv(dataset)),
    ])
  );
  return {
    filename: filenameWithExtension(data.filename, 'zip'),
    blob: new Blob([zipSync(files, { level: 0 })], { type: 'application/zip' }),
    route: 'export:zip',
  };
}

export async function exportCsv(
  data: CsvExport,
  table?: CsvTable
): Promise<void> {
  const { filename, blob, route } = createCsvDownload(data, table);
  const transport = getDataAppTransport();
  if (transport) {
    await transport.request({ route, payload: { filename, blob } });
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
