import { type ComponentRef, type Ref } from 'react';
import { AppIcon } from '../ui/icons.ts';
import { Button } from '../ui/Button.tsx';
import { Kbd } from '../ui/Kbd.tsx';
import { AnnotationTooltip } from './AnnotationTooltip.tsx';
import { shortcuts, ariaKeyShortcuts } from '../ui/shortcuts.ts';

type AnnotationTriggerProps = {
  buttonRef: Ref<ComponentRef<'button'>>;
  active: boolean;
  disabled: boolean;
  count: number;
  onToggle: () => void;
};

export function AnnotationTrigger({
  buttonRef,
  active,
  disabled,
  count,
  onToggle,
}: AnnotationTriggerProps) {
  return (
    <AnnotationTooltip
      content={
        <>
          Point at items to change the data app{' '}
          <Kbd shortcut={shortcuts.annotate} />
        </>
      }
    >
      <Button
        data-annotation-ui
        className="altertable-annotation-trigger"
        aria-label="Annotate"
        aria-keyshortcuts={ariaKeyShortcuts(shortcuts.annotate)}
        size="compact"
        variant="elevated"
        ref={buttonRef}
        aria-pressed={active}
        disabled={disabled}
        onClick={onToggle}
      >
        <AppIcon name="annotate" size={16} /> Annotate{' '}
        {count > 0 && (
          <span className="altertable-annotation-count">{count}</span>
        )}
      </Button>
    </AnnotationTooltip>
  );
}
