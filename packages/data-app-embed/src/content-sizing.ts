type FrameInsets = { top: number; bottom: number };

/** Bound resize feedback, including proportional and oscillating layouts. */
const MAX_RESIZE_ATTEMPTS = 20;

/** Applies app-reported heights to a content-sized iframe and publishes the part of it the parent shows.
 * Overflow-clipping ancestors and the parent viewport bound that visible part. */
export function createContentSizing({
  iframe,
  window: host,
  publish,
  fallback,
}: {
  iframe: HTMLIFrameElement;
  window: Window;
  publish: (insets: FrameInsets) => void;
  fallback: () => void;
}) {
  let observer: ResizeObserver | undefined;
  let authoredHeight = '';
  let scheduled: number | undefined;
  let published: FrameInsets | undefined;
  let previousBounds: DOMRect | undefined;
  let viewportDirty = true;
  let appliedHeight: number | undefined;
  let resizeAttempts = 0;

  function insets(bounds: DOMRect): FrameInsets {
    if (host.document.fullscreenElement === iframe)
      return { top: 0, bottom: 0 };
    const top = bounds.top + iframe.clientTop;
    const height = iframe.clientHeight;
    const { body, documentElement } = host.document;
    let visibleTop = 0;
    let visibleBottom = documentElement.clientHeight;
    for (
      let element = iframe.parentElement;
      element && element !== body && element !== documentElement;
      element = element.parentElement
    ) {
      if (host.getComputedStyle(element).overflowY === 'visible') continue;
      const clipTop = element.getBoundingClientRect().top + element.clientTop;
      visibleTop = Math.max(visibleTop, clipTop);
      visibleBottom = Math.min(visibleBottom, clipTop + element.clientHeight);
    }
    const hiddenTop = Math.min(height, Math.max(0, visibleTop - top));

    return {
      top: Math.round(hiddenTop),
      bottom: Math.round(
        Math.min(height - hiddenTop, Math.max(0, top + height - visibleBottom))
      ),
    };
  }

  function measure() {
    scheduled = undefined;
    if (!observer) return;
    // Size observers miss position-only layout shifts. Read frame bounds each
    // rendered frame, but walk clipping ancestors only when geometry changes.
    const bounds = iframe.getBoundingClientRect();
    if (
      viewportDirty ||
      bounds.top !== previousBounds?.top ||
      bounds.height !== previousBounds.height
    ) {
      viewportDirty = false;
      previousBounds = bounds;
      const next = insets(bounds);
      if (next.top !== published?.top || next.bottom !== published.bottom) {
        published = next;
        publish(next);
      }
    }
    if (observer) scheduled = host.requestAnimationFrame(measure);
  }

  function schedule() {
    viewportDirty = true;
    if (observer && scheduled === undefined)
      scheduled = host.requestAnimationFrame(measure);
  }

  function enable() {
    if (observer) return;
    authoredHeight = iframe.style.height;
    observer = new (host.document.defaultView ?? globalThis).ResizeObserver(
      schedule
    );
    // Insets depend on the clipping ancestors as well as the frame itself.
    for (
      let element: Element | null = iframe;
      element;
      element = element.parentElement
    )
      observer.observe(element);
    host.addEventListener('scroll', schedule, { capture: true, passive: true });
    host.addEventListener('resize', schedule);
    host.document.addEventListener('fullscreenchange', schedule);
    schedule();
  }

  function disable() {
    if (!observer) return;
    observer.disconnect();
    observer = undefined;
    published = undefined;
    previousBounds = undefined;
    if (scheduled !== undefined) host.cancelAnimationFrame(scheduled);
    scheduled = undefined;
    host.removeEventListener('scroll', schedule, { capture: true });
    host.removeEventListener('resize', schedule);
    host.document.removeEventListener('fullscreenchange', schedule);
    iframe.style.height = authoredHeight;
    resetConvergence();
  }

  function resetConvergence() {
    appliedHeight = undefined;
    resizeAttempts = 0;
  }

  return {
    setEnabled(value: boolean) {
      if (value) enable();
      else disable();
    },
    /** A new app session has not received the current insets. */
    connected() {
      published = undefined;
      resetConvergence();
      schedule();
    },
    /** `height` is the app document's height; frame borders and padding are added to it.
     * A matching report acknowledges convergence after the host applied the height. */
    resize(height: number) {
      if (!observer) return;
      if (height === appliedHeight) resizeAttempts = 0;
      else if (++resizeAttempts > MAX_RESIZE_ATTEMPTS) return fallback();
      appliedHeight = height;
      const style = host.getComputedStyle(iframe);
      const edges =
        style.boxSizing === 'border-box'
          ? parseFloat(style.borderTopWidth) +
            parseFloat(style.borderBottomWidth) +
            parseFloat(style.paddingTop) +
            parseFloat(style.paddingBottom)
          : 0;
      iframe.style.height = `${height + edges}px`;
    },
    dispose: disable,
  };
}
