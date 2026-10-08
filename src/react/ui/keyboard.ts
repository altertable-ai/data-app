type KeyEvent = Pick<
  KeyboardEvent,
  'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'isComposing'
>;

/** Keep local key actions separate from shortcuts and IME composition. Pass React's nativeEvent. */
export function isPlainKeyEvent(
  event: KeyEvent,
  { allowShift = false }: { allowShift?: boolean } = {}
): boolean {
  return (
    !event.isComposing &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    (allowShift || !event.shiftKey)
  );
}
