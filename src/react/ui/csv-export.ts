import { getDataAppTransport } from '@/src/client/iframe';

export type CsvCell = string | number | boolean | null | undefined;

/** Ordered columns and raw values selected by the app from its displayed result. */
export type CsvExport = {
  filename: string;
  columns: readonly string[];
  rows: readonly (readonly CsvCell[])[];
};

export function formatCsv({
  columns,
  rows,
}: Pick<CsvExport, 'columns' | 'rows'>): string {
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

export async function exportCsv(data: CsvExport): Promise<void> {
  const filename = data.filename.toLowerCase().endsWith('.csv')
    ? data.filename
    : `${data.filename}.csv`;
  const content = '\uFEFF' + formatCsv(data);
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const transport = getDataAppTransport();
  if (transport) {
    await transport.request({
      route: 'export:csv',
      payload: { filename, blob },
    });
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
