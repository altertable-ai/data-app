import {
  MessageRoutingError,
  type MessageInput,
  type MessageOutput,
  type MessageRoutes,
  type MessageTransport,
} from '@/src/core/messages';

/** Both ends validate using the same contracts; the transport owns delivery and cancellation. */
export function createMessageClient<const Routes extends MessageRoutes>(
  routes: Routes,
  transport: MessageTransport
) {
  return {
    async request<
      Name extends keyof Routes & string,
      const Input extends MessageInput<NoInfer<Routes[Name]>>,
    >(
      route: Name,
      payload: Input,
      { signal }: { signal?: AbortSignal } = {}
    ): Promise<MessageOutput<Routes[Name], Input>> {
      signal?.throwIfAborted();
      if (!Object.hasOwn(routes, route))
        throw new MessageRoutingError(
          'unknown_route',
          'Unknown message route.'
        );
      const contract = routes[route]!;
      let input: unknown;
      try {
        input = contract.input(payload);
      } catch {
        throw new MessageRoutingError(
          'invalid_payload',
          'Invalid message payload.'
        );
      }
      const response = await transport({ route, payload: input }, signal);
      signal?.throwIfAborted();
      try {
        return contract.output(response, input as never) as MessageOutput<
          Routes[Name],
          Input
        >;
      } catch (error) {
        if (error instanceof MessageRoutingError) throw error;
        throw new MessageRoutingError(
          'invalid_response',
          'Invalid message response.'
        );
      }
    },
  };
}
