import type { ReactNode } from 'react';
import type { GlossaryEntry } from '@/src/react/ui/data-context';
import { HelpPopover } from '@/src/react/ui/HelpPopover';

export type GlossaryDefinitionProps = {
  entry: GlossaryEntry;
  children?: ReactNode;
};

export function GlossaryDefinition({
  entry,
  children,
}: GlossaryDefinitionProps) {
  return (
    <HelpPopover
      trigger={children ?? entry.term}
      triggerLabel={`Explain ${entry.term}`}
      label={entry.term}
      triggerProps={{ className: 'altertable-glossary-definition-trigger' }}
      panelProps={{ className: 'altertable-glossary-definition-popover' }}
    >
      <strong>{entry.term}</strong>
      <div>{entry.definition}</div>
    </HelpPopover>
  );
}
