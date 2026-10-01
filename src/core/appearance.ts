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

const palettes = {
  neutral: {
    light: ['#ffffff', '#ffffff', '#f6f7f7', '#202124', '#687078', '#e3e6e8'],
    dark: ['#151719', '#202326', '#292d31', '#f2f3f4', '#aeb5bc', '#3b4248'],
  },
  slate: {
    light: ['#f8fafc', '#ffffff', '#f1f5f9', '#17212f', '#607083', '#dce3ea'],
    dark: ['#111820', '#1b2530', '#263340', '#f0f4f8', '#a8b5c3', '#3a4857'],
  },
  warm: {
    light: ['#fbfaf8', '#ffffff', '#f5f2ed', '#292723', '#736e66', '#e8e2da'],
    dark: ['#1b1916', '#25221e', '#302c27', '#f5f1eb', '#bcb3a8', '#494239'],
  },
} as const;

const spaces = {
  compact: ['4px', '8px', '12px', '18px', '24px'],
  comfortable: ['5px', '10px', '16px', '24px', '32px'],
  spacious: ['6px', '12px', '20px', '30px', '40px'],
} as const;

const radii = {
  none: ['0px', '0px', '0px'],
  small: ['4px', '7px', '9px'],
  medium: ['7px', '12px', '16px'],
  large: ['10px', '18px', '24px'],
} as const;

function fontStack(family: string): string {
  return family === 'system'
    ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, ui-sans-serif, sans-serif"
    : `${JSON.stringify(family)}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, ui-sans-serif, sans-serif`;
}

/**
 * Install semantic tokens on the document root, including portaled UI. Returns a cleanup for
 * system-theme listening.
 */
export function applyAppearance(value?: AppearanceOptions): () => void {
  const settings = normalizeAppearance(value);
  const root = document.documentElement;
  const preference = window.matchMedia('(prefers-color-scheme: dark)');
  const [xs, sm, md, lg, xl] = spaces[settings.density];
  const [control, surface, overlay] = radii[settings.cornerRadius];
  const tokens: Record<string, string> = {
    '--at-font': fontStack(settings.typography.body),
    '--at-font-heading': fontStack(settings.typography.heading),
    '--at-space-xs': xs,
    '--at-space-sm': sm,
    '--at-space-md': md,
    '--at-space-lg': lg,
    '--at-space-xl': xl,
    '--at-layout-gap': `clamp(${md}, 2.5vw, ${lg})`,
    '--at-radius-control': control,
    '--at-radius-surface': surface,
    '--at-radius-overlay': overlay,
    '--at-shadow-overlay':
      settings.elevation === 'flat'
        ? 'none'
        : settings.elevation === 'raised'
          ? '0 24px 72px rgb(0 0 0 / 24%)'
          : '0 18px 50px rgb(0 0 0 / 16%)',
    '--at-shadow-surface':
      settings.elevation === 'flat'
        ? 'none'
        : settings.elevation === 'raised'
          ? '0 8px 28px rgb(20 28 40 / 10%)'
          : '0 3px 16px rgb(20 28 40 / 5%)',
  };

  function applyColors(): void {
    const dark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' && preference.matches);
    const [background, surfaceColor, subtle, text, muted, border] =
      palettes[settings.baseColor][dark ? 'dark' : 'light'];
    const accent = dark
      ? (settings.darkAccentColor ??
        `color-mix(in srgb, ${settings.accentColor} 50%, white)`)
      : settings.accentColor;
    settings.chartColors.forEach((chartColor, index) => {
      tokens[`--at-chart-${index + 1}`] = dark
        ? `color-mix(in srgb, ${chartColor} 60%, white)`
        : chartColor;
    });
    Object.assign(tokens, {
      '--at-background': background,
      '--at-surface': surfaceColor,
      '--at-subtle': subtle,
      '--at-text': text,
      '--at-muted': muted,
      '--at-border': border,
      '--at-accent': accent,
      '--at-focus-color': muted,
      '--at-control-hover-border': `color-mix(in srgb, ${muted} 45%, ${border})`,
      '--at-accent-hover': `color-mix(in srgb, ${accent} 80%, ${dark ? 'white' : 'black'})`,
      '--at-accent-subtle': `color-mix(in srgb, ${accent} ${dark ? 22 : 12}%, ${surfaceColor})`,
      '--at-on-accent': dark ? background : '#ffffff',
      '--at-danger': dark ? '#f97066' : '#b42318',
      '--at-backdrop': dark ? 'rgb(0 0 0 / 55%)' : 'rgb(15 23 30 / 22%)',
      '--at-code-surface': dark ? '#242a31' : '#f4f6f9',
      '--at-code-text': dark ? '#e5e9ef' : '#273242',
    });
    root.style.colorScheme = dark ? 'dark' : 'light';
    for (const [name, token] of Object.entries(tokens))
      root.style.setProperty(name, token);
  }
  applyColors();
  if (settings.theme === 'system')
    preference.addEventListener('change', applyColors);

  return () => {
    preference.removeEventListener('change', applyColors);
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
