import { useId } from 'react';

const svgIdCharacterPattern = /[a-zA-Z0-9-]/;

/** Stable React ID for SVG definitions and their URL references; safe with identifier prefixes. */
export function useSvgId(): string {
  const id = useId();
  const encodedId = Array.from(id, character =>
    svgIdCharacterPattern.test(character)
      ? character
      : `_${character.codePointAt(0)!.toString(16)}_`
  ).join('');
  return ['svg', encodedId].join('-');
}
