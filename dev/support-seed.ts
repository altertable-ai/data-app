/** Current support workload: three queues, twelve agents, mixed priorities and ageing tickets. */
export const supportSeedStatements = [
  'CREATE SCHEMA support',
  'CREATE TABLE support.queues (id INTEGER, name VARCHAR, region VARCHAR)',
  "INSERT INTO support.queues VALUES (101, 'Billing and accounts', 'EMEA'), (102, 'Developer platform', 'EMEA'), (201, 'Customer onboarding', 'Americas')",
  'CREATE TABLE support.agents (id INTEGER, name VARCHAR, queue_id INTEGER)',
  "INSERT INTO support.agents SELECT i, ['Avery Chen', 'Morgan Patel', 'Riley Martin', 'Sam Rivera', 'Alex Kim', 'Casey Dubois', 'Jordan Lee', 'Taylor Brooks', 'Robin Garcia', 'Drew Wilson', 'Jamie Smith', 'Quinn Jones'][i], CASE WHEN i<=4 THEN 101 WHEN i<=8 THEN 102 ELSE 201 END FROM range(1,13) t(i)",
  'CREATE TABLE support.tickets (id INTEGER, subject VARCHAR, agent_id INTEGER, priority VARCHAR, status VARCHAR, created_at TIMESTAMP, due_at TIMESTAMP)',
  `INSERT INTO support.tickets SELECT 4000+i,
 CASE WHEN ((i-1)%11)+1<=4 THEN ['Payment declined', 'Invoice correction', 'Plan upgrade'][((i-1)%3)+1] WHEN ((i-1)%11)+1<=8 THEN ['API connection timeout', 'Webhook delivery delay', 'Rate limit errors'][((i-1)%3)+1] ELSE ['Workspace setup', 'Account access', 'Import assistance'][((i-1)%3)+1] END,
 ((i-1)%11)+1,
 CASE WHEN i%7=0 THEN 'Urgent' WHEN i%3=0 THEN 'High' ELSE 'Normal' END,
 CASE WHEN i%5=0 THEN 'Resolved' WHEN i%4=0 THEN 'Pending' ELSE 'Open' END,
 CAST(current_timestamp AT TIME ZONE 'UTC' AS TIMESTAMP) - to_hours(CAST((i*7)%120 AS INTEGER)),
 CAST(current_timestamp AT TIME ZONE 'UTC' AS TIMESTAMP) + to_hours(CAST(CASE WHEN i%7=0 THEN -12 WHEN i%3=0 THEN (i%24)-10 ELSE (i%48)+4 END AS INTEGER))
 FROM range(1,85) t(i)`,
];
