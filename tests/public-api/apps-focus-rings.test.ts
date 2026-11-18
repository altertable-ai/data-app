import { type Page } from 'playwright';
import { expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

type ClippedRing = { control: string; clippedBy: string; edges: string[] };

/** Reports the focused control when a clipping ancestor cuts its focus outline. */
function clippedFocusRing(page: Page) {
  return page.evaluate((): ClippedRing | null => {
    const focused = document.activeElement;
    if (!(focused instanceof HTMLElement)) return null;
    function hasRing(element: Element) {
      const style = getComputedStyle(element);
      return (
        style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0
      );
    }
    // A visually hidden input lends its ring to the control that wraps it.
    let hidden = false;
    for (
      let node: Element | null = focused;
      node && !hidden;
      node = node.parentElement
    )
      hidden = node.getBoundingClientRect().width <= 1;
    const control =
      hasRing(focused) && !hidden
        ? focused
        : focused.parentElement?.closest('[data-atbl-focus]');
    if (!control || !hasRing(control)) return null;
    const style = getComputedStyle(control);
    const extent =
      parseFloat(style.outlineOffset) + parseFloat(style.outlineWidth);
    const ring = control.getBoundingClientRect();
    const outer = {
      left: ring.left - extent,
      top: ring.top - extent,
      right: ring.right + extent,
      bottom: ring.bottom + extent,
    };
    const corners = [
      ['Top', 'Left', -1, -1],
      ['Top', 'Right', 1, -1],
      ['Bottom', 'Left', -1, 1],
      ['Bottom', 'Right', 1, 1],
    ] as const;
    function name(element: Element) {
      return (
        element.getAttribute('aria-label') ??
        (element.textContent?.trim() || element.className.toString())
      );
    }

    for (
      let ancestor = control.parentElement;
      ancestor && ancestor !== document.body;
      ancestor = ancestor.parentElement
    ) {
      const clip = getComputedStyle(ancestor);
      const clipsX = clip.overflowX !== 'visible';
      const clipsY = clip.overflowY !== 'visible';
      if (!clipsX && !clipsY) continue;
      const box = ancestor.getBoundingClientRect();
      const inner = {
        left: box.left + parseFloat(clip.borderLeftWidth),
        top: box.top + parseFloat(clip.borderTopWidth),
        right: box.right - parseFloat(clip.borderRightWidth),
        bottom: box.bottom - parseFloat(clip.borderBottomWidth),
      };
      const edges: string[] = [];
      if (clipsX && outer.left < inner.left - 0.25) edges.push('left');
      if (clipsX && outer.right > inner.right + 0.25) edges.push('right');
      if (clipsY && outer.top < inner.top - 0.25) edges.push('top');
      if (clipsY && outer.bottom > inner.bottom + 0.25) edges.push('bottom');

      // A rounded clip also cuts a ring corner that bulges past its curve.
      for (const [vertical, horizontal, sx, sy] of edges.length
        ? []
        : corners) {
        const radius =
          parseFloat(clip[`border${vertical}${horizontal}Radius`]) -
          parseFloat(clip[`border${horizontal}Width`]);
        if (radius <= 0) continue;
        const ringRadius = Math.max(
          0,
          parseFloat(style[`border${vertical}${horizontal}Radius`]) + extent
        );
        const inset = ringRadius * (1 - Math.SQRT1_2);
        const x = sx < 0 ? outer.left + inset : outer.right - inset;
        const y = sy < 0 ? outer.top + inset : outer.bottom - inset;
        const cx = sx < 0 ? inner.left + radius : inner.right - radius;
        const cy = sy < 0 ? inner.top + radius : inner.bottom - radius;
        const inCorner = (x - cx) * sx > 0 && (y - cy) * sy > 0;
        if (inCorner && Math.hypot(x - cx, y - cy) > radius + 0.5)
          edges.push(`${vertical} ${horizontal} corner`.toLowerCase());
      }
      if (edges.length)
        return { control: name(control), clippedBy: name(ancestor), edges };
    }
    return null;
  });
}

test('keyboard focus rings stay whole inside scrolling and rounded containers', async ({
  page,
}) => {
  await page.goto('/focus-rings');
  await expect
    .poll(() => page.getByRole('tab', { name: 'Summary' }).count())
    .toBe(1);

  const clipped: ClippedRing[] = [];
  const visited = new Set<string>();
  for (let step = 0; step < 30; step++) {
    await page.keyboard.press('Tab');
    const key = await page.evaluate(
      () => document.activeElement?.outerHTML.slice(0, 200) ?? ''
    );
    if (visited.has(key)) break;
    visited.add(key);
    const ring = await clippedFocusRing(page);
    if (ring) clipped.push(ring);
  }

  expect(visited.size).toBeGreaterThan(6);
  expect(clipped).toEqual([]);
});
