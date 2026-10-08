/**
 * Brand settings; parsing is portable, while theme application requires the browser.
 * @module @altertable/data-app/appearance
 */
export type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';

export type AppearanceSettings = {
  theme: ThemePreference;
  baseColor: 'neutral' | 'slate' | 'warm';
  accentColor: string;
  darkAccentColor?: string;
  chartColors: string[];
  density: 'compact' | 'comfortable' | 'spacious';
  cornerRadius: 'none' | 'small' | 'medium' | 'large';
  elevation: 'flat' | 'subtle' | 'raised';
  typography: { body: string; heading: string };
};

/** App-authored overrides; omitted fields use the package defaults. */
export type AppearanceOptions = Partial<
  Omit<AppearanceSettings, 'typography'>
> & { typography?: Partial<AppearanceSettings['typography']> };

export type ThemeController = {
  getTheme: () => ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  subscribe: (listener: () => void) => () => void;
};

const defaults: AppearanceSettings = {
  theme: 'light',
  baseColor: 'neutral',
  accentColor: '#405d47',
  darkAccentColor: '#a6c4ad',
  chartColors: [
    '#285fc0',
    '#a95319',
    '#147862',
    '#7243aa',
    '#aa3958',
    '#475569',
  ],
  density: 'comfortable',
  cornerRadius: 'medium',
  elevation: 'subtle',
  typography: { body: 'system', heading: 'system' },
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function oneOf<T extends string>(
  value: unknown,
  options: readonly T[]
): value is T {
  return typeof value === 'string' && options.includes(value as T);
}

function color(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

function font(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 120 &&
    !/[;{}()]/.test(value)
  );
}

/** Preserve supported external settings and use defaults for invalid fields. */
export function parseAppearance(value: unknown): AppearanceSettings {
  if (!record(value)) return normalizeAppearance();
  const typography = record(value.typography) ? value.typography : {};

  return normalizeAppearance({
    theme: oneOf(value.theme, ['light', 'dark', 'system'])
      ? value.theme
      : undefined,
    baseColor: oneOf(value.baseColor, ['neutral', 'slate', 'warm'])
      ? value.baseColor
      : undefined,
    accentColor: color(value.accentColor) ? value.accentColor : undefined,
    darkAccentColor: color(value.darkAccentColor)
      ? value.darkAccentColor
      : undefined,
    chartColors:
      Array.isArray(value.chartColors) &&
      value.chartColors.length >= 1 &&
      value.chartColors.length <= 8 &&
      value.chartColors.every(color)
        ? value.chartColors
        : undefined,
    density: oneOf(value.density, ['compact', 'comfortable', 'spacious'])
      ? value.density
      : undefined,
    cornerRadius: oneOf(value.cornerRadius, [
      'none',
      'small',
      'medium',
      'large',
    ])
      ? value.cornerRadius
      : undefined,
    elevation: oneOf(value.elevation, ['flat', 'subtle', 'raised'])
      ? value.elevation
      : undefined,
    typography: {
      body: font(typography.body) ? typography.body : undefined,
      heading: font(typography.heading) ? typography.heading : undefined,
    },
  });
}

/** Resolve typed app settings without repeating authoring checks at runtime. */
export function normalizeAppearance(
  value: AppearanceOptions = {}
): AppearanceSettings {
  return {
    theme: value.theme ?? defaults.theme,
    baseColor: value.baseColor ?? defaults.baseColor,
    accentColor: value.accentColor ?? defaults.accentColor,
    density: value.density ?? defaults.density,
    cornerRadius: value.cornerRadius ?? defaults.cornerRadius,
    elevation: value.elevation ?? defaults.elevation,
    darkAccentColor:
      value.darkAccentColor ??
      (value.accentColor === undefined ? defaults.darkAccentColor : undefined),
    chartColors: [...(value.chartColors ?? defaults.chartColors)],
    typography: {
      body: value.typography?.body ?? defaults.typography.body,
      heading: value.typography?.heading ?? defaults.typography.heading,
    },
  };
}

function fontStack(family: string): string {
  return family === 'system'
    ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, ui-sans-serif, sans-serif"
    : `${JSON.stringify(family)}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, ui-sans-serif, sans-serif`;
}

/** Choose a foreground after the browser resolves the configured CSS color. */
function accentForeground(settings: AppearanceSettings, dark: boolean): string {
  const accent =
    getComputedStyle(document.documentElement).getPropertyValue(
      '--atbl-accent'
    ) ||
    (dark
      ? (settings.darkAccentColor ??
        `color-mix(in srgb, ${settings.accentColor} 50%, white)`)
      : settings.accentColor);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d')!;
  context.fillStyle = accent;
  context.fillRect(0, 0, 1, 1);
  const channels = [...context.getImageData(0, 0, 1, 1).data]
    .slice(0, 3)
    .map(value => {
      const channel = value / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    });
  const luminance =
    channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
  return (luminance + 0.05) / 0.05 > 1.05 / (luminance + 0.05)
    ? '#000000'
    : '#ffffff';
}

/**
 * Select document-owned appearance presets and brand inputs. Public CSS tokens remain
 * overridable in stylesheets. Cleanup restores the previous document appearance.
 */
export function applyAppearance(value?: AppearanceOptions): () => void {
  const settings = normalizeAppearance(value);
  const root = document.documentElement;
  const preference = window.matchMedia('(prefers-color-scheme: dark)');
  const attributes: Record<string, string> = {
    'data-atbl-appearance': '',
    'data-atbl-base-color': settings.baseColor,
    'data-atbl-density': settings.density,
    'data-atbl-radius': settings.cornerRadius,
    'data-atbl-elevation': settings.elevation,
    'data-atbl-theme': '',
  };
  const inputs: Record<string, string> = {
    '--atbl-input-font': fontStack(settings.typography.body),
    '--atbl-input-font-heading': fontStack(settings.typography.heading),
    '--atbl-input-accent': settings.accentColor,
    '--atbl-input-dark-accent': settings.darkAccentColor ?? '',
    '--atbl-input-on-accent': '',
  };
  const chartColors = settings.chartColors.length
    ? settings.chartColors
    : defaults.chartColors;
  // Every categorical slot is defined, including after shrinking a custom palette.
  for (let index = 0; index < 8; index++)
    inputs[`--atbl-input-chart-${index + 1}`] =
      chartColors[index % chartColors.length]!;

  const previousAttributes = Object.keys(attributes).map(
    name => [name, root.getAttribute(name)] as const
  );
  const previousInputs = Object.keys(inputs).map(
    name =>
      [
        name,
        root.style.getPropertyValue(name),
        root.style.getPropertyPriority(name),
      ] as const
  );
  for (const [name, token] of Object.entries(inputs)) {
    if (token) root.style.setProperty(name, token);
    else root.style.removeProperty(name);
  }
  for (const [name, attribute] of Object.entries(attributes))
    root.setAttribute(name, attribute);

  function applyTheme(): void {
    const dark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' && preference.matches);
    root.setAttribute('data-atbl-theme', dark ? 'dark' : 'light');
    root.style.setProperty(
      '--atbl-input-on-accent',
      accentForeground(settings, dark)
    );
  }
  applyTheme();
  if (settings.theme === 'system')
    preference.addEventListener('change', applyTheme);

  return () => {
    preference.removeEventListener('change', applyTheme);
    for (const [name, attribute] of previousAttributes) {
      if (attribute === null) root.removeAttribute(name);
      else root.setAttribute(name, attribute);
    }
    for (const [name, token, priority] of previousInputs) {
      if (token) root.style.setProperty(name, token, priority);
      else root.style.removeProperty(name);
    }
  };
}

/** Persist a viewer theme preference. Applying appearance belongs to the UI owner. */
export function createThemeController(
  initialTheme: ThemePreference = 'light'
): ThemeController {
  const storageKey = 'altertable.data-app.theme';
  let theme = initialTheme;
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (oneOf(saved, ['light', 'dark', 'system'])) theme = saved;
  } catch {
    // Storage can be unavailable in private browsing or embedded contexts.
  }
  const listeners = new Set<() => void>();

  return {
    getTheme() {
      return theme;
    },
    setTheme(nextTheme) {
      if (nextTheme === theme) return;
      theme = nextTheme;
      try {
        window.localStorage.setItem(storageKey, theme);
      } catch {
        // The selection still applies to this page.
      }
      listeners.forEach(listener => listener());
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
  };
}
