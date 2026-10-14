import { randomUuid } from '@/src/core/uuid';
import {
  createIframeTransport,
  installDataAppTransport,
} from '@/src/client/iframe';

/** Run from a trusted bootstrap page in an allow-scripts-only iframe. CSP can prohibit network access. */
export function startDataAppBootstrap({
  parentOrigin,
  window: frame = window,
}: {
  parentOrigin: string;
  window?: Window;
}) {
  let loaded: string | undefined;
  let failure: { cause: unknown } | undefined;
  const bundleSource = `altertable-data-app-${randomUuid()}.js`;
  const bridge = createIframeTransport({
    parentOrigin,
    window: frame,
    mode: 'bundle',
    loadScript(javascript) {
      if (loaded !== undefined) {
        if (javascript !== loaded)
          bridge.fail(
            new Error('This frame already evaluated a different app script.')
          );
        else if (failure) bridge.fail(failure.cause);
        else bridge.ready();

        return;
      }
      loaded = javascript;
      try {
        const script = frame.document.createElement('script');
        script.textContent = `${javascript}\n//# sourceURL=${bundleSource}`;
        frame.document.body.append(script);
        if (!failure) bridge.ready();
      } catch (error) {
        reportError(error);
      }
    },
  });

  function reportError(error: unknown) {
    failure = { cause: error };
    bridge.fail(error);
  }

  function reportBundleError(event: ErrorEvent) {
    if (event.filename === bundleSource)
      reportError(event.error ?? event.message);
  }

  function reportBundleRejection(event: PromiseRejectionEvent) {
    if (
      event.reason instanceof Error &&
      event.reason.stack?.includes(bundleSource)
    )
      reportError(event.reason);
  }

  frame.addEventListener('error', reportBundleError);
  frame.addEventListener('unhandledrejection', reportBundleRejection);
  const uninstall = installDataAppTransport(bridge, frame);

  return () => {
    frame.removeEventListener('error', reportBundleError);
    frame.removeEventListener('unhandledrejection', reportBundleRejection);
    uninstall();
  };
}
