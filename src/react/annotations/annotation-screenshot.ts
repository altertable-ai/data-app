import { toCanvas } from 'html-to-image';
import type { AnnotationRect } from '@/src/react/annotations/annotation-targets';
import type { DataAppAnnotationDraft } from '@/src/core/annotations';

/** Capture the visible target at selection time; never include annotation controls. */
export async function captureAnnotationScreenshot(
  element: HTMLElement,
  region?: AnnotationRect
): Promise<NonNullable<DataAppAnnotationDraft['context']['screenshot']>> {
  const rect = element.getBoundingClientRect();
  const left = Math.max(0, region?.x ?? rect.left);
  const top = Math.max(0, region?.y ?? rect.top);
  const width =
    Math.min(window.innerWidth, region ? region.x + region.width : rect.right) -
    left;
  const height =
    Math.min(
      window.innerHeight,
      region ? region.y + region.height : rect.bottom
    ) - top;
  if (width <= 0 || height <= 0)
    throw new Error('The annotation area is not visible.');
  const scale = Math.min(1, 1024 / width, 1024 / height);
  const source = await toCanvas(element, {
    width,
    height,
    canvasWidth: Math.max(1, Math.round(width * scale)),
    canvasHeight: Math.max(1, Math.round(height * scale)),
    pixelRatio: 1,
    skipFonts: true,
    style: {
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin: '0',
      position: 'relative',
      top: '0',
      left: '0',
      right: 'auto',
      bottom: 'auto',
      transformOrigin: 'top left',
      transform: `translate(${rect.left - left}px, ${rect.top - top}px)`,
    },
    backgroundColor:
      getComputedStyle(document.documentElement)
        .getPropertyValue('--atbl-background')
        .trim() || '#fff',
    filter: node =>
      !(node instanceof Element && node.closest('[data-annotation-ui]')),
  });
  let outputScale = 1;
  for (let attempt = 0; attempt < 5; attempt++) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(source.width * outputScale));
    canvas.height = Math.max(1, Math.round(source.height * outputScale));
    canvas
      .getContext('2d')!
      .drawImage(source, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    if (dataUrl.length <= 349_550)
      return {
        mimeType: 'image/png',
        dataUrl,
        width: canvas.width,
        height: canvas.height,
      };
    outputScale *= 0.75;
  }
  throw new Error('The annotation image is too large.');
}
