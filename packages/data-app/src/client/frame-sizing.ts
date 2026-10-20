import { isDataAppPresentation } from '../core/presentation.ts';

/** Reports the document height to a parent that sizes the iframe to its content.
 * Sizing applies only while the parent requests it and a UI owner whose styles support it
 * has opted in, so older app styles under a newer bootstrap stay frame-sized.
 * The root attribute and inset properties let fixed overlays stay within the parent's visible area. */
export function createFrameSizing(
  document: Document,
  report: (height: number) => void
) {
  const root = document.documentElement;
  const frame = document.defaultView;
  let observer: ResizeObserver | undefined;
  let reported: number | undefined;
  let requested = false;
  let owners = 0;
  let viewport: { top: number; bottom: number } | undefined;

  function measure() {
    const height = Math.ceil(root.getBoundingClientRect().height);
    // A matching viewport acknowledges convergence after the parent resized us.
    // Resend it even if the content did not change, so independent updates do
    // not accumulate as one feedback loop in the host.
    if (height === reported && height !== frame?.innerHeight) return;
    reported = height;
    report(height);
  }

  function stop() {
    observer?.disconnect();
    observer = undefined;
    frame?.removeEventListener('resize', measure);
    reported = undefined;
    delete root.dataset.atblFrameSizing;
    root.style.removeProperty('--atbl-frame-inset-top');
    root.style.removeProperty('--atbl-frame-inset-bottom');
  }

  function applyViewport() {
    if (!observer || !viewport) return;
    root.style.setProperty('--atbl-frame-inset-top', `${viewport.top}px`);
    root.style.setProperty('--atbl-frame-inset-bottom', `${viewport.bottom}px`);
  }

  function sync() {
    if (!requested || !owners) return stop();
    if (observer) return;
    root.dataset.atblFrameSizing = 'content';
    observer = new (document.defaultView ?? globalThis).ResizeObserver(measure);
    observer.observe(root);
    frame?.addEventListener('resize', measure);
    applyViewport();
  }

  return {
    /** A new session starts with a parent that has not received the current height. */
    update(state: unknown, session: 'new' | 'current') {
      const presentation =
        state && typeof state === 'object' && 'presentation' in state
          ? state.presentation
          : undefined;
      requested =
        isDataAppPresentation(presentation) &&
        presentation.sizing === 'content';
      if (!requested) viewport = undefined;
      if (session === 'new') reported = undefined;
      if (observer && requested) measure();
      sync();
    },
    support() {
      owners++;
      sync();
      let released = false;

      return () => {
        if (released) return;
        released = true;
        owners--;
        sync();
      };
    },
    viewport(top: number, bottom: number) {
      if (!requested) return;
      viewport = { top, bottom };
      applyViewport();
    },
    dispose() {
      requested = false;
      viewport = undefined;
      owners = 0;
      stop();
    },
  };
}
