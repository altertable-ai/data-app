/** App-owned commerce story; the mock only executes SQL. Dates are complete UTC days.
 * Weekdays are busier, a campaign runs 21–27 days ago, France grows in the
 * latest 60 days, and refunds rise in the latest 14. Finland has no orders. */
const today = "CAST(current_timestamp AT TIME ZONE 'UTC' AS DATE)";
export const seedStatements = [
  'CREATE SCHEMA demo',
  'CREATE TABLE demo.customers (id INTEGER, name VARCHAR, country VARCHAR, created_at TIMESTAMP)',
  'CREATE TABLE demo.products (id INTEGER, name VARCHAR, category VARCHAR, price DECIMAL(10, 2))',
  'CREATE TABLE demo.orders (id INTEGER, customer_id INTEGER, amount DECIMAL(10, 2), status VARCHAR, campaign VARCHAR, ordered_at TIMESTAMP)',
  'CREATE TABLE demo.order_items (order_id INTEGER, product_id INTEGER, quantity INTEGER, unit_price DECIMAL(10, 2))',
  'CREATE TABLE demo.events (id INTEGER, customer_id INTEGER, name VARCHAR, properties JSON, occurred_at TIMESTAMP)',
  `INSERT INTO demo.customers
    SELECT i, 'Customer ' || lpad(CAST(i AS VARCHAR), 3, '0'),
      ['US', 'US', 'FR', 'GB', 'AT'][((i - 1) % 5) + 1],
      CAST(${today} - INTERVAL 210 DAY AS TIMESTAMP) + to_days(CAST(i % 20 AS INTEGER))
    FROM range(1, 121) t(i)`,
  `INSERT INTO demo.customers VALUES
    (121, 'Linus', 'FI', ${today} - INTERVAL 200 DAY)`,
  `INSERT INTO demo.products VALUES
    (1, 'Everyday tote', 'Accessories', 24),
    (2, 'Studio mug', 'Home', 18),
    (3, 'Linen shirt', 'Clothing', 68),
    (4, 'Weekend backpack', 'Accessories', 95),
    (5, 'Wool throw', 'Home', 120),
    (6, 'Trail jacket', 'Clothing', 145)`,
  `INSERT INTO demo.orders
    WITH days AS (
      SELECT ago, ${today} - to_days(CAST(ago AS INTEGER)) AS day,
        (CASE WHEN dayofweek(${today} - to_days(CAST(ago AS INTEGER))) IN (0, 6)
          THEN 10 ELSE 20 END) * (CASE WHEN ago BETWEEN 21 AND 27 THEN 3 ELSE 1 END) AS volume
      FROM range(1, 181) t(ago)
    ), numbered AS (
      SELECT CAST(row_number() OVER (ORDER BY day, slot) AS INTEGER) AS id, ago, day, slot
      FROM days, LATERAL range(1, volume + 1) t(slot)
    )
    SELECT id,
      CASE WHEN ago <= 60 AND slot % 4 = 0 THEN 3 + 5 * (id % 24)
        ELSE 1 + ((id * 7 + slot) % 120) END,
      0,
      CASE WHEN (id * 37 + slot * 11) % 100 < (CASE WHEN ago <= 14 THEN 14 ELSE 4 END) THEN 'refunded'
        WHEN id % 17 = 0 THEN 'pending' ELSE 'paid' END,
      CASE WHEN ago BETWEEN 21 AND 27 THEN 'Autumn essentials' ELSE 'Organic' END,
      CAST(day AS TIMESTAMP) + to_minutes(CAST(480 + (id * 53) % 900 AS INTEGER))
    FROM numbered`,
  `INSERT INTO demo.order_items
    SELECT o.id, p.id, 1 + (o.id + line) % 2, p.price
    FROM demo.orders o, LATERAL range(1, 2 + o.id % 3) t(line)
    JOIN demo.products p ON p.id = 1 + (o.id * 7 + line) % 6`,
  `UPDATE demo.orders SET amount = items.amount
    FROM (SELECT order_id, sum(quantity * unit_price) AS amount
      FROM demo.order_items GROUP BY order_id) items
    WHERE demo.orders.id = items.order_id`,
  `INSERT INTO demo.events
    SELECT id, id, 'signed_up', json_object('country', country), created_at
    FROM demo.customers
    UNION ALL
    SELECT 1000 + id, customer_id, 'checkout',
      json_object('order_id', id, 'amount', amount, 'campaign', campaign), ordered_at
    FROM demo.orders`,
];
