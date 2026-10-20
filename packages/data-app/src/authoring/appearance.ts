/** Appearance configured by app authors. */
export type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';

export type AppearanceSettings = {
  theme: ThemePreference;
  /** Palette for surfaces, text, and borders; independent of the accent. */
  baseColor: 'neutral' | 'slate' | 'warm';
  /** Emphasis color for checked controls and selected dates; options use the base palette. */
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
