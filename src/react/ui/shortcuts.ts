import { useEffect } from 'react';

/**
 * `alt` is Alt/Option, leaving character keys and browser refresh untouched; `mod` is ⌘ on Apple
 * platforms and Ctrl elsewhere.
 */
export type Shortcut = {
  modifier: 'alt' | 'mod';
  shift?: boolean;
  code: string;
  key: string;
};

export const shortcuts = {
  annotate: { modifier: 'mod', shift: true, code: 'Period', key: '.' },
  sendAnnotations: { modifier: 'mod', code: 'Enter', key: 'Enter' },
  refresh: { modifier: 'alt', code: 'KeyR', key: 'R' },
  aboutData: { modifier: 'alt', code: 'KeyI', key: 'I' },
  playStory: { modifier: 'mod', shift: true, code: 'Enter', key: 'Enter' },
} as const satisfies Record<string, Shortcut>;

function isApple(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    /Macintosh|Mac OS X|iPhone|iPad/.test(navigator.userAgent)
  );
}

export function shortcutLabel({ modifier, shift, key }: Shortcut): string {
  const platform = isApple() ? 'apple' : 'other';
  const modifierLabel = {
    apple: { alt: '⌥', mod: '⌘' },
    other: { alt: 'Alt+', mod: 'Ctrl+' },
  }[platform][modifier];
  const shiftLabel = shift ? { apple: '⇧', other: 'Shift+' }[platform] : '';
  const keyLabel =
    platform === 'apple'
      ? (({ Enter: '↩' } as Record<string, string>)[key] ?? key)
      : key;

  return `${modifierLabel}${shiftLabel}${keyLabel}`;
}

export function ariaKeyShortcuts({ modifier, shift, key }: Shortcut): string {
  const modifiers = { alt: ['Alt'], mod: ['Meta', 'Control'] }[modifier];

  return modifiers
    .map(name => `${name}+${shift ? 'Shift+' : ''}${key}`)
    .join(' ');
}

export function isEditingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    !!target.closest(
      "input, textarea, select, [contenteditable], [role='textbox']"
    )
  );
}

export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: Shortcut
): boolean {
  if (
    event.defaultPrevented ||
    event.repeat ||
    event.isComposing ||
    event.shiftKey !== (shortcut.shift ?? false) ||
    event.code !== shortcut.code
  )
    return false;
  const apple = isApple();
  const mod = apple ? event.metaKey : event.ctrlKey;
  return shortcut.modifier === 'alt'
    ? event.altKey && !event.ctrlKey && !event.metaKey
    : mod && !event.altKey && !(apple ? event.ctrlKey : event.metaKey);
}

/** Bind a page-level shortcut. Ignored while typing or while a modal layer is open. */
export function useShortcut(
  shortcut: Shortcut,
  action: () => void,
  enabled = true,
  allowWhileEditing = false
): void {
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (
        !matchesShortcut(event, shortcut) ||
        document.querySelector('dialog:modal') ||
        (!allowWhileEditing && isEditingTarget(event.target))
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      action();
    }

    document.addEventListener('keydown', onKeyDown, true);

    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [shortcut, enabled, allowWhileEditing, action]);
}
