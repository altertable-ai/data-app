import { type Theme } from '@altertable/data-app/appearance';
import { type ReactNode } from 'react';

import { Tooltip } from '../ui/Tooltip.tsx';

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
