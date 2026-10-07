import type { DataView } from '@/src/core/data-view';
import { createContext, useContext } from 'react';
import type { DisclosedQuery } from '@/src/core/contract';
import type { AboutEmpty } from '@/src/react/ui/AboutData';
import type { DataContext } from '@/src/react/ui/data-context';

export type InspectionDefaults = {
  dataContext: DataContext;
  primaryView?: DataView<unknown, unknown>;
  empty?: AboutEmpty;
  queries?: DisclosedQuery[];
};

export const InspectionContext =
  /* @__PURE__ */ createContext<InspectionDefaults | null>(null);

export function useInspectionDefaults(): InspectionDefaults | null {
  return useContext(InspectionContext);
}
