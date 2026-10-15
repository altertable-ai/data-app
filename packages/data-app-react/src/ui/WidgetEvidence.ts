import { type AboutSubject } from './AboutData.tsx';

type EvidenceDetails = Omit<
  AboutSubject,
  'id' | 'title' | 'description' | 'visual' | 'visualKind' | 'references'
> & { id: string };

export type WidgetEvidence = EvidenceDetails &
  (
    | { glossaryIds: [string, ...string[]]; queryNames?: string[] }
    | { queryNames: [string, ...string[]]; glossaryIds?: string[] }
  );
