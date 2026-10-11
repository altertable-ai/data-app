import { createContext } from 'react';
import { matchSearchText } from '@/src/react/ui/searchItems';
import type { SearchSuggestion } from '@/src/react/ui/SearchTypeahead';

/** The primary view supplies suggestions from exactly the source displayed by its widgets. */
export const SearchSuggestionsContext = createContext<{
  groups: readonly (readonly SearchSuggestion[])[];
  busy: boolean;
} | null>(null);

/** Share five slots across datasets, then prioritize title matches without filtering source rows. */
export function balanceSearchSuggestions(
  groups: readonly (readonly SearchSuggestion[])[],
  query = ''
) {
  function score(item: SearchSuggestion) {
    const title = matchSearchText(item.title, query);
    if (title.ranges.length) return 2;
    return matchSearchText(item.description ?? '', query).ranges.length ? 1 : 0;
  }
  const rankedGroups = groups.map(items =>
    [...items].sort((a, b) => score(b) - score(a))
  );
  const counts = rankedGroups.map(() => 0);
  let remaining = 5;
  while (remaining > 0) {
    let added = false;
    for (let index = 0; index < rankedGroups.length && remaining > 0; index++) {
      if (counts[index]! < rankedGroups[index]!.length) {
        counts[index]!++;
        remaining--;
        added = true;
      }
    }
    if (!added) break;
  }
  return rankedGroups
    .flatMap((items, index) => items.slice(0, counts[index]))
    .sort((a, b) => score(b) - score(a));
}
