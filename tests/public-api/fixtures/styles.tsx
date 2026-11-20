import {
  Grid,
  GridItem,
  injectDataAppStyles,
} from '@altertable/data-app-react';
import { DataWidget } from '@altertable/data-app-react/ui';
import { createRoot } from 'react-dom/client';
function Report() {
  return (
    <>
      <Grid aria-label="Report grid" columns={2}>
        <p>First finding</p>
        <p>Second finding</p>
      </Grid>
      {(['start', 'stretch'] as const).map(align => (
        <Grid
          key={align}
          aria-label={`${align} cards`}
          columns={3}
          align={align}
        >
          <GridItem span={2}>
            <DataWidget title={`${align} short`}>
              <p>One finding.</p>
            </DataWidget>
          </GridItem>
          <GridItem>
            <DataWidget title={`${align} tall`}>
              <div>
                {Array.from({ length: 8 }, (_, i) => (
                  <p key={i}>Finding {i + 1}</p>
                ))}
              </div>
            </DataWidget>
          </GridItem>
        </Grid>
      ))}
    </>
  );
}
createRoot(document.getElementById('root')!).render(<Report />);
let installed: HTMLStyleElement | undefined;
document.getElementById('inject')!.addEventListener('click', () => {
  const style = injectDataAppStyles({ nonce: 'report-styles' });
  document.getElementById('identity')!.textContent =
    installed === style ? 'Reused stylesheet' : 'Installed stylesheet';
  installed = style;
});
document.getElementById('iframe')!.addEventListener('click', () => {
  const target = document.querySelector('iframe')!.contentDocument!;
  const root = target.createElement('div');
  target.body.append(root);
  createRoot(root).render(<Report />);
  injectDataAppStyles({ document: target, nonce: 'report-styles' });
});
