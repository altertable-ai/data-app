import {
  DataSourceError,
  registeredQueryRoute,
  type SqlLakehouse,
} from '@altertable/data-app/contract';

const errorStatus = {
  unauthorized: 401,
  forbidden: 403,
  rate_limited: 429,
  query_rejected: 400,
  unavailable: 502,
} as const;

export type LocalQueryDefinition = {
  statement: string;
  params: Readonly<Record<string, unknown>>;
};

export async function queryResponse(
  lakehouse: SqlLakehouse,
  definition: LocalQueryDefinition,
  input: ReturnType<typeof registeredQueryRoute.input>,
  signal: AbortSignal
): Promise<Response> {
  if (
    Object.keys(input.params ?? {}).some(
      key => !Object.hasOwn(definition.params, key)
    )
  )
    return Response.json({ reason: 'query_rejected' }, { status: 400 });
  try {
    const result = await lakehouse.queryAll(definition.statement, {
      limit: input.limit,
      params: input.params,
      signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
    });
    return Response.json(registeredQueryRoute.output(result, input));
  } catch (error) {
    if (error instanceof DataSourceError)
      return Response.json(
        { reason: error.reason },
        { status: errorStatus[error.reason] }
      );
    console.error(error);
    return Response.json({ reason: 'unavailable' }, { status: 502 });
  }
}
