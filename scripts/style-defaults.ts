import { dataAppStyleTokens } from '@/src/react/style-contract';

/** Resolve computed defaults at the property that consumes them, after local inputs inherit. */
export function resolveStyleDefaults(css: string): string {
  const tokens = dataAppStyleTokens as Record<
    string,
    { scope: string; default: string }
  >;
  function expand(source: string, ancestors: string[] = []): string {
    return source.replace(
      /var\((--atbl-[\w-]+)\)/g,
      (reference, name: string) => {
        const token = tokens[name];
        if (token?.scope !== 'component') return reference;
        if (ancestors.includes(name))
          throw new Error(
            `Cyclic style default: ${[...ancestors, name].join(' -> ')}`
          );
        return `var(${name}, ${expand(token.default, [...ancestors, name])})`;
      }
    );
  }
  return expand(css);
}
