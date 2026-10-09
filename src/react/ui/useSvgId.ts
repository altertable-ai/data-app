import { useId } from 'react';

/** Stable React ID for SVG definitions and their URL references; safe with identifier prefixes. */
export function useSvgId(): string {
  const id = useId();
  return `svg-${Array.from(id, character =>
    /[a-zA-Z0-9-]/.test(character)
      ? character
      : `_${character.codePointAt(0)!.toString(16)}_`
  ).join('')}`;
}
