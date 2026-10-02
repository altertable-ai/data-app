import { expect, test } from 'bun:test';
import { formatCsv } from '@/src/react/ui/csv-export';

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
