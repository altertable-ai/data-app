import { createContext, useContext } from 'react';

/** Components inside render their content without interactive behavior or controls. */
export const StaticRenderContext = createContext(false);

/** True when the component should render static output, such as for a capture. */
export function useStaticRender() {
  return useContext(StaticRenderContext);
}
