import { Database } from 'bun:sqlite';
import { createDataHandler } from '@altertable/data-app/server';
import type { Lakehouse, QueryParameters } from '@altertable/data-app/contract';
import { operations } from '@/dev/exploration/data';
import page from '@/dev/exploration/index.html';

const database = new Database(':memory:');
database.exec(`CREATE TABLE countries (code TEXT PRIMARY KEY, name TEXT NOT NULL, region TEXT NOT NULL);
  CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, country TEXT NOT NULL REFERENCES countries(code));
  CREATE TABLE orders (id INTEGER PRIMARY KEY, day TEXT NOT NULL, customer_id INTEGER NOT NULL REFERENCES customers(id), amount_cents INTEGER NOT NULL, status TEXT NOT NULL);`);
const countries = [
  ['FR', 'France', 'Europe'],
  ['DE', 'Germany', 'Europe'],
  ['US', 'United States', 'North America'],
  ['CA', 'Canada', 'North America'],
];
const customers = [
  'Amélie Laurent',
  'Hugo Martin',
  'Lena Fischer',
  'Jonas Weber',
  'Maya Chen',
  'Noah Williams',
  'Olivia Roy',
  'Liam Tremblay',
];
for (const country of countries)
  database.query('INSERT INTO countries VALUES (?, ?, ?)').run(...country);
for (const [index, name] of customers.entries())
  database
    .query('INSERT INTO customers VALUES (?, ?, ?)')
    .run(index + 1, name, countries[Math.floor(index / 2)]![0]!);
let orderId = 1001;
for (let day = 1; day <= 14; day++)
  for (let customer = 1; customer <= customers.length; customer++) {
    if ((day + customer) % 3 === 0) continue;
    const cents =
      9000 + (customer <= 4 ? 14000 : 0) + customer * 1700 + day * 430;
    database
      .query('INSERT INTO orders VALUES (?, ?, ?, ?, ?)')
      .run(
        orderId++,
        `2026-10-${String(day).padStart(2, '0')}`,
        customer,
        cents,
        (day + customer) % 7 === 0 ? 'refunded' : 'paid'
      );
  }
const lakehouse: Lakehouse = {
  async queryAll(statement, { params = {}, limit, signal }) {
    signal.throwIfAborted();
    const bindings = Object.fromEntries(
      Object.entries(params).map(([key, value]) => [`$${key}`, value])
    ) as QueryParameters;
    const query = database.query(statement);
    const rows = query.values(bindings);
    return {
      columns: query.columnNames.map(name => ({ name })),
      rows: rows.slice(0, limit),
      queryId: crypto.randomUUID(),
    };
  },
};
const handleData = createDataHandler(operations, async () => ({ lakehouse }));
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.PORT ?? 27419),
  routes: { '/': page },
  fetch: handleData,
});
console.log(`Sales explorer running at ${server.url}`);
