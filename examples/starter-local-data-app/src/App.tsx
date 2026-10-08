import { GettingStarted } from "@altertable/data-app/react/ui";
import { dataContext } from "#app/data-context.ts";
import { DATA_APP_CONFIG as app } from "#config";

/** Connectivity-only screen. Investigate the requested question, then replace this with a view
 * that leads with a supported finding and explores the useful angles behind it. */
export function App() {
  return <GettingStarted config={app} dataContext={dataContext} />;
}
