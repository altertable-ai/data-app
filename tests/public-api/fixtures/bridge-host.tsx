import {
  StrictMode,
  useRef,
  useReducer,
  useState,
  type ComponentRef,
} from 'react';
import { createRoot } from 'react-dom/client';
import { createMessageRouter } from '@altertable/data-app/contract';
import { createHttpTransport } from '@altertable/data-app/client';
import {
  createNavigationHandler,
  type DataAppLogger,
} from '@altertable/data-app/embed';
import { bridgeRoutes } from '@/tests/public-api/fixtures/bridge-routes';
import { DataAppBridge } from '@altertable/data-app/react/embed';

function Host() {
  const [echoRequests, setEchoRequests] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [cancelledRequests, setCancelledRequests] = useState(0);

  const [iframe, setIframe] = useState<ComponentRef<'iframe'> | null>(null);
  const [generation, bumpGeneration] = useReducer(value => value + 1, 0);
  const [version, bumpVersion] = useReducer(value => value + 1, 1);
  const brokenLogger = useRef(false);
  const [logging, setLogging] = useState(true);
  const [loggerCalls, setLoggerCalls] = useState(0);
  const [logs, setLogs] = useState<unknown[][]>([]);
  function record(level: string, args: unknown[]) {
    setLoggerCalls(previous => previous + 1);
    if (brokenLogger.current) throw new Error('Consumer logger failed');
    if (!['plain', 'completed', 'slow', 'failed'].includes(String(args[0])))
      return;
    setLogs(previous => [...previous, [version, level, ...args]]);
  }
  const logger: DataAppLogger = {
    log: (...args) => record('log', args),
    info: (...args) => record('info', args),
    warn: (...args) => record('warn', args),
    error: (...args) => record('error', args),
  };
  const forward = createHttpTransport();
  const router = createMessageRouter(bridgeRoutes, {
    'data:query'({ operation, input }, { signal }) {
      return forward(operation, input, signal);
    },
    'navigation:update': createNavigationHandler(),
    'test:wait'(_input, { signal }) {
      setPendingRequests(value => value + 1);
      return new Promise<number>((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => {
            setPendingRequests(value => value - 1);
            setCancelledRequests(value => value + 1);
            reject(signal.reason);
          },
          { once: true }
        );
      });
    },
    'test:echo'({ period }) {
      setEchoRequests(value => value + 1);
      return { period, version };
    },
  });

  return (
    <>
      <output aria-label="Echo requests">{echoRequests}</output>
      <output aria-label="Pending requests">{pendingRequests}</output>
      <output aria-label="Cancelled requests">{cancelledRequests}</output>
      <button onClick={bumpGeneration}>Replace iframe</button>
      <button onClick={bumpVersion}>Change handler</button>
      <button onClick={() => setLogging(!logging)}>Toggle logging</button>
      <button
        onClick={() => {
          brokenLogger.current = !brokenLogger.current;
        }}
      >
        Break logger
      </button>
      <output aria-label="Logger invocations">{loggerCalls}</output>
      <output aria-label="Host logs" id="logs">
        {JSON.stringify(logs)}
      </output>
      <DataAppBridge
        iframe={iframe}
        connection={{ type: 'origin', origin: window.location.origin }}
        onMessage={router.dispatch}
        logger={logging ? logger : undefined}
      />
      <iframe
        key={generation}
        ref={setIframe}
        title="Embedded test app"
        src={
          new URLSearchParams(location.search).has('timeout')
            ? '/bridge-frame?timeout=1'
            : '/bridge-frame'
        }
      />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Host />
  </StrictMode>
);
