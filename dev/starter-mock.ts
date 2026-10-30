/** Mock image with DuckDB 2 and semantic_layer (altertable-mock PR #31). */
export const starterMockImage =
  'ghcr.io/altertable-ai/altertable-mock@sha256:fc23b3fc07865b4d469f0451e36ee1f514e321848abdc38cc4a267e8ccfa33d0';

/** Fictional evidence shared by the metric and Finding examples. Never run on a user's lakehouse. */
export const starterSeedStatements = [
  'CREATE SCHEMA starter_demo',
  'CREATE TABLE starter_demo.sample_counts (group_name VARCHAR, segment_name VARCHAR, sample_count BIGINT)',
  "INSERT INTO starter_demo.sample_counts VALUES ('Alpha', 'Online', 1500000), ('Alpha', 'Retail', 700000), ('Beta', 'Partner', 600000)",
  `CREATE SEMANTIC VIEW starter_sample_counts
   TABLES (samples AS starter_demo.sample_counts)
   DIMENSIONS (samples.group_name AS group_name, samples.segment_name AS segment_name)
   METRICS (samples.sample_count AS SUM(samples.sample_count))`,
];
