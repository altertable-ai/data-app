import {
  dataAppStyleTokens,
  dataAppStyleClasses,
  dataAppStyleHooks,
} from '@/src/react/style-contract';

/** Static authoring checks; app-owned names are allowed, package implementation names are not. */
export function validateAuthoredStyles(
  source: string,
  kind: 'css' | 'markup'
): string[] {
  const diagnostics = new Set<string>();
  for (const match of source.matchAll(/--atbl-[\w-]+/g)) {
    const name = match[0];
    // A template may select an existing public family, such as chart colors.
    // Its interpolated value is a runtime concern; private or invented families remain invalid.
    const publicFamily =
      kind === 'markup' &&
      name.endsWith('-') &&
      source.slice(match.index + name.length).startsWith('${') &&
      dataAppStyleTokens.some(token => token.startsWith(name));
    if (
      !publicFamily &&
      !(dataAppStyleTokens as readonly string[]).includes(name)
    )
      diagnostics.add(
        `Unsupported token ${name}. Use a public token from docs/style-reference.md.`
      );
  }
  for (const [name] of source.matchAll(/--at-[\w-]+|data-at-[\w-]+/g))
    diagnostics.add(
      `Unsupported styling namespace ${name}. Use the atbl contract.`
    );

  // CSS selectors and DOM queries may select stable roots, but not private descendants.
  for (const [, name] of source.matchAll(/\.(altertable-[\w-]+)/g)) {
    if (!Object.hasOwn(dataAppStyleClasses, name))
      diagnostics.add(
        `Unsupported selector .${name}. Use a component className or documented root.`
      );
  }
  // Check literal classes in plain attributes and common JSX expression forms.
  for (const match of source.matchAll(
    /\bclass(?:Name)?\s*=\s*(?:["']([^"']*)["']|\{([^}]*)\})/g
  )) {
    const values =
      match[1] !== undefined
        ? [match[1]]
        : [...match[2]!.matchAll(/['"`]([^'"`]+)['"`]/g)].map(
            literal => literal[1]!
          );
    for (const value of values) {
      for (const name of value
        .split(/\s+/)
        .filter(name => name.startsWith('altertable-'))) {
        const hook =
          dataAppStyleClasses[name as keyof typeof dataAppStyleClasses];
        if (!hook || hook.kind !== 'utility')
          diagnostics.add(
            `Do not copy ${name} onto markup. Render its package component and use className for app-owned styling.`
          );
      }
    }
  }
  for (const [attribute] of source.matchAll(/data-atbl-[\w-]+/g)) {
    if (!Object.hasOwn(dataAppStyleHooks, attribute))
      diagnostics.add(
        `Unsupported attribute ${attribute}. Use a component or a documented native control hook.`
      );
  }
  for (const [attribute, values] of Object.entries(dataAppStyleHooks)) {
    const pattern = new RegExp(
      `${attribute}["']?\\s*(?:=|:)\\s*(?:\\{\\s*)?["']([^"']+)["']`,
      'g'
    );
    for (const [, value] of source.matchAll(pattern)) {
      if (!(values as readonly string[]).includes(value!))
        diagnostics.add(
          `Unsupported ${attribute} value ${value}. Expected ${values.join(', ')}.`
        );
    }
  }
  const literalColors =
    kind === 'css'
      ? /(?:^|[;{])\s*(?:color|background(?:-color)?|border(?:-[\w-]+)?|fill|stroke|box-shadow)\s*:[^;{}]*(?:#[\da-f]{3,8}\b|(?:rgb|hsl|oklch)\()/gim
      : /\b(?:color|backgroundColor|borderColor|fill|stroke|boxShadow)\s*:\s*['"](?:#[\da-f]{3,8}\b|(?:rgb|hsl|oklch)\()/gi;
  if (literalColors.test(source))
    diagnostics.add(
      'Use appearance configuration or semantic tokens instead of repeated literal UI colors.'
    );
  return [...diagnostics];
}
