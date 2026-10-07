import { injectDataAppStyles } from '@altertable/data-app/react';

document.querySelector('#inject')!.addEventListener('click', () => {
  injectDataAppStyles({ nonce: 'styles-test' });
});
document.querySelector('#iframe')!.addEventListener('click', () => {
  const target = document.querySelector('iframe')!.contentDocument!;
  injectDataAppStyles({ document: target, nonce: 'styles-test' });
  injectDataAppStyles({ document: target, nonce: 'styles-test' });
});
