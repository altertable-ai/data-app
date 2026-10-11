import { createContext } from 'react';
import type { SearchSuggestion } from '@/src/react/ui/SearchTypeahead';

/** The primary view supplies suggestions from exactly the source displayed by its widgets. */
export const SearchSuggestionsContext = createContext<{
  items: readonly SearchSuggestion[];
  busy: boolean;
} | null>(null);
