import { AppIcon } from '@/src/react/ui/icons';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { DisclosedQuery } from '@/src/core/contract';
import type { DataContext, GlossaryEntry } from '@/src/react/ui/data-context';
import { AboutData, type AboutEmpty } from '@/src/react/ui/AboutData';
import '@/src/react/ui/Inspect.css';

export type GlossaryExplanationProps = {
  entry: GlossaryEntry;
  empty?: AboutEmpty;
  title?: ReactNode;
  description?: ReactNode;
  visual?: ReactNode;
  queries?: DisclosedQuery[];
  dataContext?: DataContext;
} & Omit<ComponentPropsWithRef<'button'>, 'children' | 'title'>;

/** Opens the inspect sheet for one glossary term. Prefer a card's evidence slot
 * when the surface already has a title, description, and visual. */
export function GlossaryExplanation({
  entry,
  empty,
  title,
  description,
  visual,
  queries,
  dataContext,
  className,
  ...props
}: GlossaryExplanationProps) {
  return (
    <AboutData
      {...props}
      shortcut={false}
      iconOnly
      variant="ghost"
      title={title ?? entry.term}
      description={description}
      visual={visual}
      references={{ kind: 'entries', entries: [entry] }}
      empty={empty}
      dataContext={dataContext}
      queries={queries}
      className={className ?? 'altertable-inspect-trigger'}
      tooltip="Explore this term"
      aria-label={props['aria-label'] ?? `Explore ${entry.term}`}
    >
      <AppIcon name="openDetails" />
    </AboutData>
  );
}
