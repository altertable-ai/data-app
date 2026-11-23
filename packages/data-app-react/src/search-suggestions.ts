import { createContext } from 'react';

import { matchSearchText } from './ui/searchItems.ts';
import { type SearchSuggestion } from './ui/SearchTypeahead.tsx';

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
  if (!query.trim())
    return groups.flatMap((items, index) => items.slice(0, counts[index]));
  return groups
    .flatMap((items, index) =>
      counts[index]
        ? items
            .map(item => ({ item, score: score(item) }))
            .sort((left, right) => right.score - left.score)
            .slice(0, counts[index])
        : []
    )
    .sort((left, right) => right.score - left.score)
    .map(({ item }) => item);
}
