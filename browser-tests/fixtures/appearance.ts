import {
  applyAppearance,
  type AppearanceOptions,
} from '@altertable/data-app/appearance';
import { injectDataAppStyles } from '@altertable/data-app/react';

injectDataAppStyles();
let cleanup: (() => void) | undefined;
Object.assign(window, {
  setAppearance(options: AppearanceOptions) {
    cleanup?.();
    cleanup = applyAppearance(options);
  },
  clearAppearance() {
    cleanup?.();
    cleanup = undefined;
  },
});

for (let index = 1; index <= 8; index++) {
  const swatch = document.createElement('div');
  swatch.dataset.chart = String(index);
  swatch.style.backgroundColor = `var(--at-chart-${index})`;
  document.querySelector('#palette')!.append(swatch);
}

declare global {
  interface Window {
    setAppearance(options: AppearanceOptions): void;
    clearAppearance(): void;
  }
}
