import { type DisclosedQuery } from '@altertable/data-app/contract';
import { type DataView } from '@altertable/data-app/internal';
import { createContext, useContext } from 'react';

import { type AboutEmpty } from './AboutData.tsx';
import { type DataContext } from './data-context.ts';

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
