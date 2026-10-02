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
  let failed = false;
  const bundleSource = `altertable-data-app-${crypto.randomUUID()}.js`;
  const bridge = createIframeTransport({
    parentOrigin,
    window: frame,
    mode: 'bundle',
    loadScript(javascript) {
      if (loaded !== undefined) {
        if (javascript === loaded) {
          if (failed) bridge.fail();
          else bridge.ready();
        } else bridge.fail();

        return;
      }
      loaded = javascript;
      try {
        const script = frame.document.createElement('script');
        script.textContent = `${javascript}\n//# sourceURL=${bundleSource}`;
        frame.document.body.append(script);
        if (!failed) bridge.ready();
      } catch {
        reportError();
      }
    },
  });

  function reportError() {
    failed = true;
    bridge.fail();
  }

  function reportBundleError(event: ErrorEvent) {
    if (event.filename === bundleSource) reportError();
  }

  function reportBundleRejection(event: PromiseRejectionEvent) {
    if (
      event.reason instanceof Error &&
      event.reason.stack?.includes(bundleSource)
    )
      reportError();
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
