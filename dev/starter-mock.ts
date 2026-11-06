/** Mock image with DuckDB 2 and semantic_layer (altertable-mock PR #31). */
export const starterMockImage =
  'ghcr.io/altertable-ai/altertable-mock@sha256:fc23b3fc07865b4d469f0451e36ee1f514e321848abdc38cc4a267e8ccfa33d0';

/** Fictional evidence for the metric and Finding examples. Never run on a user's lakehouse. */
export const starterSeedStatements = [
  'CREATE SCHEMA starter_demo',
  'CREATE TABLE starter_demo.sample_counts (group_name VARCHAR, segment_name VARCHAR, sample_count BIGINT)',
  "INSERT INTO starter_demo.sample_counts VALUES ('Alpha', 'Online', 1500000), ('Alpha', 'Retail', 700000), ('Beta', 'Partner', 600000)",
  `CREATE SEMANTIC VIEW starter_sample_counts
   TABLES (samples AS starter_demo.sample_counts)
   DIMENSIONS (samples.group_name AS group_name, samples.segment_name AS segment_name)
   METRICS (samples.sample_count AS SUM(samples.sample_count))`,
  // Daily samples for the Finding exploration: Alpha Online lifts in the week of March 9, 2026.
  'CREATE TABLE starter_demo.daily_samples (sample_date DATE, group_name VARCHAR, segment_name VARCHAR, sample_count BIGINT)',
  `INSERT INTO starter_demo.daily_samples
   SELECT CAST(day AS DATE), group_name, segment_name,
     base + (dayofweek(day) % 3) * 500
       + CASE WHEN day BETWEEN DATE '2026-03-09' AND DATE '2026-03-15' THEN lift ELSE 0 END
   FROM generate_series(DATE '2026-01-05', DATE '2026-03-29', INTERVAL 1 DAY) AS days(day),
     (VALUES ('Alpha', 'Online', 20000, 12000), ('Alpha', 'Retail', 10000, 1000), ('Beta', 'Partner', 8000, 0))
       AS members(group_name, segment_name, base, lift)`,
];
