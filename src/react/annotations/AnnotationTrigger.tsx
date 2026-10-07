import type { ComponentRef, Ref } from 'react';
import { AppIcon } from '@/src/react/ui/icons';
import { Button } from '@/src/react/ui/Button';
import { Kbd } from '@/src/react/ui/Kbd';
import { AnnotationTooltip } from '@/src/react/annotations/AnnotationTooltip';
import { shortcuts, ariaKeyShortcuts } from '@/src/react/ui/shortcuts';

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
