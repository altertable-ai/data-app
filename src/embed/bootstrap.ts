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
        script.textContent = javascript;
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

  frame.addEventListener('error', reportError);
  frame.addEventListener('unhandledrejection', reportError);
  const uninstall = installDataAppTransport(bridge, frame);

  return () => {
    frame.removeEventListener('error', reportError);
    frame.removeEventListener('unhandledrejection', reportError);
    uninstall();
  };
}
