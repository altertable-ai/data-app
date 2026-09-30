/**
 * Portable request handling with app-supplied authorization.
 * @module @altertable/data-app/server
 * @see https://github.com/altertable-ai/data-app/blob/main/docs/server.md
 */
export { createDataHandler } from '@/src/server/handler';
export type { RequestAccess } from '@/src/server/handler';
export { createHostedQueryHandler } from '@/src/server/hosted';
export type { HostedQueryAccess } from '@/src/server/hosted';
export { createQueryExecutorLakehouse } from '@/src/server/query-executor';
export type {
  QueryExecutor,
  QueryExecutorRequest,
} from '@/src/server/query-executor';
