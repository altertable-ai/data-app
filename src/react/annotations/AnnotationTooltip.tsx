import type { ReactNode } from 'react';
import type { Theme } from '@/src/core/appearance';
import { Tooltip } from '@/src/react/ui/Tooltip';

type AnnotationTooltipProps = {
  content: ReactNode;
  children: ReactNode;
  theme?: Theme;
};

export function AnnotationTooltip({
  content,
  children,
  theme,
}: AnnotationTooltipProps) {
  return (
    <Tooltip
      content={
        <span
          className={
            theme
              ? 'altertable-annotation-bar-tooltip'
              : 'altertable-annotation-tooltip'
          }
          data-theme={theme}
        >
          {content}
        </span>
      }
    >
      {children}
    </Tooltip>
  );
}
