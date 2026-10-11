import { createContext } from 'react';
import type { SearchSuggestion } from '@/src/react/ui/SearchTypeahead';

/** The primary view supplies suggestions from exactly the source displayed by its widgets. */
export const SearchSuggestionsContext = createContext<{
  items: readonly SearchSuggestion[];
  busy: boolean;
} | null>(null);

/** Share five slots across datasets, redistribute unused slots, and retain grouped source order. */
export function balanceSearchSuggestions(
  groups: readonly (readonly SearchSuggestion[])[]
) {
  const counts = groups.map(() => 0);
  let remaining = 5;
  while (remaining > 0) {
    let added = false;
    for (let index = 0; index < groups.length && remaining > 0; index++) {
      if (counts[index]! < groups[index]!.length) {
        counts[index]!++;
        remaining--;
        added = true;
      }
    }
    if (!added) break;
  }
  return groups.flatMap((items, index) => items.slice(0, counts[index]));
}
