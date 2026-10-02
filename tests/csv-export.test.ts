import { expect, test } from 'bun:test';
import { unzipSync, strFromU8 } from 'fflate';
import {
  createCsvDownload,
  formatCsv,
  type CsvExport,
} from '@/src/react/ui/csv-export';

test('CSV preserves column order, Unicode, raw numbers, zero, booleans and null cells', () => {
  expect(
    formatCsv({
      columns: ['Name', 'Value', 'Enabled', 'Missing'],
      rows: [
        ['München', 1234.5, true, null],
        ['Zero', 0, false, undefined],
      ],
    })
  ).toBe(
    'Name,Value,Enabled,Missing\r\nMünchen,1234.5,true,\r\nZero,0,false,\r\n'
  );
});

test('CSV quotes commas, quotes, and both newline characters', () => {
  expect(
    formatCsv({
      columns: ['Name, label', 'Text'],
      rows: [
        ['He said "hello"', 'First\nsecond'],
        ['München', 'First\rsecond'],
      ],
    })
  ).toBe(
    '"Name, label",Text\r\n"He said ""hello""","First\nsecond"\r\nMünchen,"First\rsecond"\r\n'
  );
});

test('CSV protects spreadsheet formulas in string cells while keeping numeric negatives', () => {
  expect(
    formatCsv({
      columns: ['Value'],
      rows: [
        ['=1+1'],
        [' +SUM(A1)'],
        ['-10'],
        ['@SUM(A1)'],
        ['\tformula'],
        [-10],
      ],
    })
  ).toBe(
    "Value\r\n'=1+1\r\n' +SUM(A1)\r\n'-10\r\n'@SUM(A1)\r\n'\tformula\r\n-10\r\n"
  );
});

test('CSV supports header-only files and rejects inconsistent table shapes', () => {
  expect(formatCsv({ columns: ['Name'], rows: [] })).toBe('Name\r\n');
  expect(() => formatCsv({ columns: [], rows: [] })).toThrow();
  expect(() => formatCsv({ columns: ['Name'], rows: [['A', 1]] })).toThrow();
});

test('multiple datasets download as a ZIP with distinct complete CSV files', async () => {
  const tables: CsvExport['tables'] = [
    { name: 'Groups', columns: ['Name', 'Count'], rows: [['München', 0]] },
    { name: 'Summary', columns: ['Total'], rows: [[0]] },
  ];
  const file = createCsvDownload({ filename: 'report', tables });
  expect(file.filename).toBe('report.zip');
  expect(file.route).toBe('export:zip');
  const files = unzipSync(new Uint8Array(await file.blob.arrayBuffer()));
  expect(Object.keys(files)).toEqual(['Groups.csv', 'Summary.csv']);
  expect(Array.from(files['Groups.csv']!.slice(0, 3))).toEqual([239, 187, 191]);
  expect(strFromU8(files['Groups.csv']!)).toBe('Name,Count\r\nMünchen,0\r\n');
  expect(strFromU8(files['Summary.csv']!)).toBe('Total\r\n0\r\n');
  const selected = createCsvDownload({ filename: 'report', tables }, tables[1]);
  expect(selected.filename).toBe('Summary.csv');
  expect(selected.route).toBe('export:csv');
  expect(await selected.blob.text()).toBe('\uFEFFTotal\r\n0\r\n'.slice(1));
});
test('export rejects empty collections, duplicate names and archive paths', () => {
  const table = { name: 'Groups', columns: ['Name'], rows: [] };
  // @ts-expect-error Exports require at least one dataset; reject invalid JavaScript callers too.
  expect(() => createCsvDownload({ filename: 'report', tables: [] })).toThrow();
  expect(() =>
    createCsvDownload({ filename: 'report', tables: [table, table] })
  ).toThrow();
  expect(() =>
    createCsvDownload({
      filename: 'report',
      tables: [{ ...table, name: '../groups' }],
    })
  ).toThrow();
});

test('ZIP compresses repetitive CSV data and preserves its exact bytes', async () => {
  const table = {
    name: 'Activity',
    columns: ['Group', 'Count'],
    rows: Array.from({ length: 1000 }, () => ['Alpha', 3]),
  };
  const file = createCsvDownload({
    filename: 'report',
    tables: [table, { ...table, name: 'Comparison' }],
  });
  const original = new TextEncoder().encode('\uFEFF' + formatCsv(table));
  const archive = new Uint8Array(await file.blob.arrayBuffer());
  expect(archive.byteLength).toBeLessThan(original.byteLength);
  const files = unzipSync(archive);
  expect(files['Activity.csv']).toEqual(original);
  expect(files['Comparison.csv']).toEqual(original);
});
