import type { AboutSubject } from '@/src/react/ui/AboutData';

type EvidenceDetails = Omit<
  AboutSubject,
  'id' | 'title' | 'description' | 'visual' | 'glossaryIds' | 'queryNames'
> & { id: string };

export type WidgetEvidence = EvidenceDetails &
  (
    | { glossaryIds: [string, ...string[]]; queryNames?: string[] }
    | { queryNames: [string, ...string[]]; glossaryIds?: string[] }
  );
