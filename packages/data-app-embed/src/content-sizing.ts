export type FrameInsets = { top: number; bottom: number };

/** Consecutive reports exceeding the applied height by the same amount that mark a feedback loop. */
const FEEDBACK_REPORTS = 20;

/** Applies app-reported heights to a content-sized iframe and publishes the part of it the parent shows.
 * Overflow-clipping ancestors and the parent viewport bound that visible part. */
export function createContentSizing({
  iframe,
  window: host,
  publish,
}: {
  iframe: HTMLIFrameElement;
  window: Window;
  publish: (insets: FrameInsets) => void;
}) {
  let observer: ResizeObserver | undefined;
  let authoredHeight = '';
  let scheduled: number | undefined;
  let published: string | undefined;
  // Content sized in viewport units grows with each applied height by a constant excess.
  let applied: number | undefined;
  let excess: number | undefined;
  let repeats = 0;
  let loopBase: number | undefined;
  let stalled = false;

  function insets(): FrameInsets {
    if (host.document.fullscreenElement === iframe)
      return { top: 0, bottom: 0 };
    const top = iframe.getBoundingClientRect().top + iframe.clientTop;
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
    const next = insets();
    const identity = `${next.top}:${next.bottom}`;
    if (identity === published) return;
    published = identity;
    publish(next);
  }

  function schedule() {
    if (observer && scheduled === undefined)
      scheduled = host.requestAnimationFrame(measure);
  }

  function enable() {
    if (observer) return;
    authoredHeight = iframe.style.height;
    observer = new (host.document.defaultView ?? globalThis).ResizeObserver(
      schedule
    );
    observer.observe(iframe);
    observer.observe(host.document.documentElement);
    host.addEventListener('scroll', schedule, { capture: true, passive: true });
    host.addEventListener('resize', schedule);
    host.document.addEventListener('fullscreenchange', schedule);
  }

  function disable() {
    if (!observer) return;
    observer.disconnect();
    observer = undefined;
    published = undefined;
    if (scheduled !== undefined) host.cancelAnimationFrame(scheduled);
    scheduled = undefined;
    host.removeEventListener('scroll', schedule, { capture: true });
    host.removeEventListener('resize', schedule);
    host.document.removeEventListener('fullscreenchange', schedule);
    iframe.style.height = authoredHeight;
    resetGrowth();
  }

  function resetGrowth() {
    applied = undefined;
    excess = undefined;
    repeats = 0;
    loopBase = undefined;
    stalled = false;
  }

  /** The height to apply, or undefined while following growth would feed a loop. */
  function follow(height: number) {
    if (stalled) {
      if (applied !== undefined && height > applied) return;
      stalled = false;
    }
    const next = applied === undefined ? undefined : height - applied;
    if (next !== undefined && next > 0 && next === excess) repeats++;
    else {
      repeats = 0;
      loopBase = applied;
    }
    excess = next;
    if (repeats < FEEDBACK_REPORTS) return height;
    stalled = true;
    return loopBase ?? height;
  }

  return {
    setEnabled(value: boolean) {
      if (value) enable();
      else disable();
    },
    /** A new app session has not received the current insets. */
    connected() {
      published = undefined;
      resetGrowth();
      schedule();
    },
    /** `height` is the app document's height; frame borders and padding are added to it.
     * Growth that keeps tracking the applied height stops at the height where it began. */
    resize(reported: number) {
      if (!observer) return;
      const height = follow(reported);
      if (height === undefined) return;
      applied = height;
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
