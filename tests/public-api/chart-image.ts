import type { Locator } from 'playwright';

/** Inspect rendered colors without depending on chart markup or SVG commands. */
export async function readChartImage(chart: Locator) {
  const screenshot = await chart.screenshot({
    animations: 'disabled',
    scale: 'css',
  });
  return chart.page().evaluate(async encoded => {
    const response = await fetch(`data:image/png;base64,${encoded}`);
    const image = await createImageBitmap(await response.blob());
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    image.close();
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels: number[] = [];
    for (let index = 0; index < data.length; index += 4) {
      pixels.push(
        (data[index]! << 16) | (data[index + 1]! << 8) | data[index + 2]!
      );
    }
    return { width: canvas.width, height: canvas.height, pixels };
  }, screenshot.toString('base64'));
}
