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
WHERE ($countryMode = 'all' OR CASE WHEN $countryMode = 'include' THEN c.country IS NOT DISTINCT FROM $country ELSE c.country IS DISTINCT FROM $country END)
GROUP BY c.country ORDER BY revenue DESC, c.country`,
      params: {
        start: {},
        end: {},
        countryMode: { defaultValue: 'all' },
        country: { defaultValue: null },
      },
    },
    ordersByDay: {
      statement: `
SELECT CAST(g.day AS DATE) AS day, count(o.id) AS order_count
FROM generate_series(CAST($start AS DATE), CAST($end AS DATE), INTERVAL 1 DAY) g(day)
LEFT JOIN (
  SELECT o.id, o.ordered_at FROM demo.orders o JOIN demo.customers c ON c.id = o.customer_id
  WHERE o.ordered_at >= CAST($start AS DATE) AND o.ordered_at < CAST($end AS DATE) + INTERVAL 1 DAY AND ($countryMode = 'all' OR CASE WHEN $countryMode = 'include' THEN c.country IS NOT DISTINCT FROM $country ELSE c.country IS DISTINCT FROM $country END)
) o ON CAST(o.ordered_at AS DATE) = CAST(g.day AS DATE)
GROUP BY 1 ORDER BY 1`,
      params: {
        start: {},
        end: {},
        countryMode: { defaultValue: 'all' },
        country: { defaultValue: null },
      },
    },
    ordersByValue: {
      statement: `
SELECT CASE WHEN o.amount < 100 THEN 'Under $100' WHEN o.amount < 250 THEN '$100–250'
  WHEN o.amount < 500 THEN '$250–500' ELSE '$500 and over' END AS band, count(*) AS order_count
FROM demo.orders o JOIN demo.customers c ON c.id = o.customer_id WHERE o.ordered_at >= CAST($start AS DATE) AND o.ordered_at < CAST($end AS DATE) + INTERVAL 1 DAY AND ($countryMode = 'all' OR CASE WHEN $countryMode = 'include' THEN c.country IS NOT DISTINCT FROM $country ELSE c.country IS DISTINCT FROM $country END)
GROUP BY band ORDER BY min(o.amount)`,
      params: {
        start: {},
        end: {},
        countryMode: { defaultValue: 'all' },
        country: { defaultValue: null },
      },
    },
    previousPeriod: {
      statement: `
SELECT count(o.id) AS order_count,
  CAST(coalesce(sum(o.amount) FILTER (WHERE o.status = 'paid'), 0) AS DOUBLE) AS revenue,
  CAST(coalesce(sum(o.amount), 0) AS DOUBLE) AS order_value,
  CAST(coalesce(sum(o.amount) FILTER (WHERE o.status = 'refunded'), 0) AS DOUBLE) AS refunds
FROM demo.orders o JOIN demo.customers c ON c.id = o.customer_id
WHERE $enabled AND o.ordered_at >= CAST($start AS DATE) AND o.ordered_at < CAST($end AS DATE) + INTERVAL 1 DAY AND ($countryMode = 'all' OR CASE WHEN $countryMode = 'include' THEN c.country IS NOT DISTINCT FROM $country ELSE c.country IS DISTINCT FROM $country END)`,
      params: {
        start: {},
        end: {},
        countryMode: { defaultValue: 'all' },
        country: { defaultValue: null },
        enabled: { defaultValue: false },
      },
    },
    orders: {
      statement: `
SELECT o.id, c.name AS customer, c.country, CAST(o.ordered_at AS DATE) AS day,
  o.status, o.campaign, CAST(o.amount AS DOUBLE) AS amount
FROM demo.orders o JOIN demo.customers c ON c.id = o.customer_id
WHERE o.ordered_at >= CAST($start AS DATE) AND o.ordered_at < CAST($end AS DATE) + INTERVAL 1 DAY AND ($countryMode = 'all' OR CASE WHEN $countryMode = 'include' THEN c.country IS NOT DISTINCT FROM $country ELSE c.country IS DISTINCT FROM $country END)
ORDER BY o.ordered_at DESC, o.id DESC LIMIT 100`,
      params: {
        start: {},
        end: {},
        countryMode: { defaultValue: 'all' },
        country: { defaultValue: null },
      },
    },
    items: {
      statement: `
WITH recent AS (SELECT o.id, c.name AS customer, c.country, CAST(o.ordered_at AS DATE) AS day,
  o.status, o.campaign, CAST(o.amount AS DOUBLE) AS amount
FROM demo.orders o JOIN demo.customers c ON c.id = o.customer_id
WHERE o.ordered_at >= CAST($start AS DATE) AND o.ordered_at < CAST($end AS DATE) + INTERVAL 1 DAY AND ($countryMode = 'all' OR CASE WHEN $countryMode = 'include' THEN c.country IS NOT DISTINCT FROM $country ELSE c.country IS DISTINCT FROM $country END)
ORDER BY o.ordered_at DESC, o.id DESC LIMIT 100)
SELECT i.order_id, p.name, p.category, i.quantity, CAST(i.unit_price AS DOUBLE) AS unit_price
FROM recent r JOIN demo.order_items i ON i.order_id = r.id JOIN demo.products p ON p.id = i.product_id
ORDER BY i.order_id DESC, p.id`,
      params: {
        start: {},
        end: {},
        countryMode: { defaultValue: 'all' },
        country: { defaultValue: null },
      },
    },
  },
});
