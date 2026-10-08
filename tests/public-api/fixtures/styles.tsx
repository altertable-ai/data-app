import { createRoot } from 'react-dom/client';
import { Grid, injectDataAppStyles } from '@altertable/data-app/react';
function Report() {
  return (
    <Grid aria-label="Report grid" columns={2}>
      <p>First finding</p>
      <p>Second finding</p>
    </Grid>
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
