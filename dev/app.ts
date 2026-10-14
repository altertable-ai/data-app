import { defineDataApp } from '@altertable/data-app';

export const dataApp = defineDataApp({
  title: 'Orders',
  description:
    'Explore revenue, orders, and products across countries and reporting periods.',
  scope: { organization: 'demo', environment: 'sample' },
  appearance: { theme: 'system' },
  queries: {
    ordersByCountry: {
      statement: `
SELECT c.country, count(o.id) AS order_count,
  CAST(coalesce(sum(o.amount) FILTER (WHERE o.status = 'paid'), 0) AS DOUBLE) AS revenue,
  CAST(coalesce(sum(o.amount), 0) AS DOUBLE) AS order_value,
  CAST(coalesce(sum(o.amount) FILTER (WHERE o.status = 'refunded'), 0) AS DOUBLE) AS refunds
FROM demo.customers c LEFT JOIN demo.orders o ON o.customer_id = c.id AND o.ordered_at >= CAST($start AS DATE) AND o.ordered_at < CAST($end AS DATE) + INTERVAL 1 DAY
WHERE ($country IS NULL OR c.country = $country) AND ($region IS NULL OR CASE WHEN c.country = 'US' THEN 'North America' ELSE 'Europe' END = $region) AND ($customerId IS NULL OR c.id = $customerId)
GROUP BY c.country ORDER BY revenue DESC, c.country`,
      params: {
        start: {},
        end: {},
        country: { defaultValue: null },
        region: { defaultValue: null },
        customerId: { defaultValue: null },
      },
    },
    ordersByDay: {
      statement: `
SELECT CAST(g.day AS DATE) AS day, count(o.id) AS order_count
FROM generate_series(CAST($start AS DATE), CAST($end AS DATE), INTERVAL 1 DAY) g(day)
LEFT JOIN (
  SELECT o.id, o.ordered_at FROM demo.orders o JOIN demo.customers c ON c.id = o.customer_id
  WHERE o.ordered_at >= CAST($start AS DATE) AND o.ordered_at < CAST($end AS DATE) + INTERVAL 1 DAY AND ($country IS NULL OR c.country = $country) AND ($region IS NULL OR CASE WHEN c.country = 'US' THEN 'North America' ELSE 'Europe' END = $region) AND ($customerId IS NULL OR c.id = $customerId)
) o ON CAST(o.ordered_at AS DATE) = CAST(g.day AS DATE)
GROUP BY 1 ORDER BY 1`,
      params: {
        start: {},
        end: {},
        country: { defaultValue: null },
        region: { defaultValue: null },
        customerId: { defaultValue: null },
      },
    },
    ordersByValue: {
      statement: `
SELECT CASE WHEN o.amount < $smallMax THEN 'under-100'
  WHEN o.amount < $mediumMax THEN '100-to-250'
  WHEN o.amount < $largeMax THEN '250-to-500' ELSE '500-and-over' END AS band, count(*) AS order_count
FROM demo.orders o JOIN demo.customers c ON c.id = o.customer_id WHERE o.ordered_at >= CAST($start AS DATE) AND o.ordered_at < CAST($end AS DATE) + INTERVAL 1 DAY AND ($country IS NULL OR c.country = $country) AND ($region IS NULL OR CASE WHEN c.country = 'US' THEN 'North America' ELSE 'Europe' END = $region) AND ($customerId IS NULL OR c.id = $customerId)
AND o.amount >= $minimum
GROUP BY band ORDER BY min(o.amount)`,
      params: {
        minimum: {},
        smallMax: {},
        mediumMax: {},
        largeMax: {},
        start: {},
        end: {},
        country: { defaultValue: null },
        region: { defaultValue: null },
        customerId: { defaultValue: null },
      },
    },
    previousPeriod: {
      statement: `
SELECT count(o.id) AS order_count,
  CAST(coalesce(sum(o.amount) FILTER (WHERE o.status = 'paid'), 0) AS DOUBLE) AS revenue,
  CAST(coalesce(sum(o.amount), 0) AS DOUBLE) AS order_value,
  CAST(coalesce(sum(o.amount) FILTER (WHERE o.status = 'refunded'), 0) AS DOUBLE) AS refunds
FROM demo.orders o JOIN demo.customers c ON c.id = o.customer_id
WHERE $enabled AND o.ordered_at >= CAST($start AS DATE) AND o.ordered_at < CAST($end AS DATE) + INTERVAL 1 DAY AND ($country IS NULL OR c.country = $country) AND ($region IS NULL OR CASE WHEN c.country = 'US' THEN 'North America' ELSE 'Europe' END = $region) AND ($customerId IS NULL OR c.id = $customerId)`,
      params: {
        start: {},
        end: {},
        country: { defaultValue: null },
        region: { defaultValue: null },
        customerId: { defaultValue: null },
        enabled: { defaultValue: false },
      },
    },
    orders: {
      statement: `
SELECT o.id, c.name AS customer, c.country, CAST(o.ordered_at AS DATE) AS day,
  o.status, o.campaign, CAST(o.amount AS DOUBLE) AS amount
FROM demo.orders o JOIN demo.customers c ON c.id = o.customer_id
WHERE o.ordered_at >= CAST($start AS DATE) AND o.ordered_at < CAST($end AS DATE) + INTERVAL 1 DAY AND ($country IS NULL OR c.country = $country) AND ($region IS NULL OR CASE WHEN c.country = 'US' THEN 'North America' ELSE 'Europe' END = $region) AND ($customerId IS NULL OR c.id = $customerId)
ORDER BY o.ordered_at DESC, o.id DESC LIMIT 100`,
      params: {
        start: {},
        end: {},
        country: { defaultValue: null },
        region: { defaultValue: null },
        customerId: { defaultValue: null },
      },
    },
    ordersInScope: {
      statement: `
SELECT o.id, c.name AS customer, c.country, CAST(o.ordered_at AS DATE) AS day,
  o.status, o.campaign, CAST(o.amount AS DOUBLE) AS amount, count(*) OVER () AS total_count
FROM demo.orders o JOIN demo.customers c ON c.id = o.customer_id
WHERE o.ordered_at >= CAST($start AS DATE) AND o.ordered_at < CAST($end AS DATE) + INTERVAL 1 DAY AND ($country IS NULL OR c.country = $country) AND ($region IS NULL OR CASE WHEN c.country = 'US' THEN 'North America' ELSE 'Europe' END = $region) AND ($customerId IS NULL OR c.id = $customerId)
AND ($status = 'all' OR o.status = $status)
AND ($amountMin IS NULL OR o.amount >= $amountMin)
AND ($amountMax IS NULL OR o.amount < $amountMax)
ORDER BY o.ordered_at DESC, o.id DESC`,
      params: {
        status: { defaultValue: 'all' },
        amountMin: { defaultValue: null },
        amountMax: { defaultValue: null },
        start: {},
        end: {},
        country: { defaultValue: null },
        region: { defaultValue: null },
        customerId: { defaultValue: null },
      },
    },
    items: {
      statement: `
WITH recent AS (SELECT o.id, c.name AS customer, c.country, CAST(o.ordered_at AS DATE) AS day,
  o.status, o.campaign, CAST(o.amount AS DOUBLE) AS amount
FROM demo.orders o JOIN demo.customers c ON c.id = o.customer_id
WHERE o.ordered_at >= CAST($start AS DATE) AND o.ordered_at < CAST($end AS DATE) + INTERVAL 1 DAY AND ($country IS NULL OR c.country = $country) AND ($region IS NULL OR CASE WHEN c.country = 'US' THEN 'North America' ELSE 'Europe' END = $region) AND ($customerId IS NULL OR c.id = $customerId)
ORDER BY o.ordered_at DESC, o.id DESC LIMIT 100)
SELECT i.order_id, p.name, p.category, i.quantity, CAST(i.unit_price AS DOUBLE) AS unit_price
FROM recent r JOIN demo.order_items i ON i.order_id = r.id JOIN demo.products p ON p.id = i.product_id
ORDER BY i.order_id DESC, p.id`,
      params: {
        start: {},
        end: {},
        country: { defaultValue: null },
        region: { defaultValue: null },
        customerId: { defaultValue: null },
      },
    },
    orderDetail: {
      statement: `
SELECT o.id, c.name, c.country, CAST(o.ordered_at AS DATE), o.status, o.campaign,
  CAST(o.amount AS DOUBLE), p.name, p.category, i.quantity, CAST(i.unit_price AS DOUBLE)
FROM demo.orders o JOIN demo.customers c ON c.id = o.customer_id
JOIN demo.order_items i ON i.order_id = o.id JOIN demo.products p ON p.id = i.product_id
WHERE o.id = $orderId AND o.ordered_at >= CAST($start AS DATE)
  AND o.ordered_at < CAST($end AS DATE) + INTERVAL 1 DAY
  AND ($country IS NULL OR c.country = $country) AND ($region IS NULL OR CASE WHEN c.country = 'US' THEN 'North America' ELSE 'Europe' END = $region) AND ($customerId IS NULL OR c.id = $customerId)
ORDER BY p.id`,
      params: {
        orderId: {},
        start: {},
        end: {},
        country: { defaultValue: null },
        region: { defaultValue: null },
        customerId: { defaultValue: null },
      },
    },
    geographicRevenue: {
      statement: `
SELECT CASE $groupBy WHEN 'region' THEN CASE WHEN c.country = 'US' THEN 'North America' ELSE 'Europe' END
  WHEN 'country' THEN c.country ELSE CAST(c.id AS VARCHAR) END AS id,
  CASE $groupBy WHEN 'region' THEN CASE WHEN c.country = 'US' THEN 'North America' ELSE 'Europe' END
  WHEN 'country' THEN c.country ELSE c.name END AS label,
  CAST(coalesce(sum(o.amount) FILTER (WHERE o.status = 'paid'), 0) AS DOUBLE) AS revenue
FROM demo.customers c LEFT JOIN demo.orders o ON o.customer_id = c.id
  AND o.ordered_at >= CAST($start AS DATE) AND o.ordered_at < CAST($end AS DATE) + INTERVAL 1 DAY
WHERE ($country IS NULL OR c.country = $country) AND ($region IS NULL OR CASE WHEN c.country = 'US' THEN 'North America' ELSE 'Europe' END = $region) AND ($customerId IS NULL OR c.id = $customerId)
GROUP BY 1, 2 ORDER BY revenue DESC, id`,
      params: {
        start: {},
        end: {},
        country: { defaultValue: null },
        region: { defaultValue: null },
        customerId: { defaultValue: null },
        groupBy: {},
      },
    },
  },
});
