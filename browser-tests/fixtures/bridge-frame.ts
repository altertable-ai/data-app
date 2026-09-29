import { bridgeRoutes } from '@/browser-tests/fixtures/bridge-routes';
import {
  createMessageClient,
  createIframeTransport,
} from '@altertable/data-app/client';
const bridge = createIframeTransport({
  parentOrigin:
    document.documentElement.dataset.parentOrigin ?? window.location.origin,
});
const messages = createMessageClient(bridgeRoutes, bridge.request);
const result = document.getElementById('result')!;
const location = document.getElementById('location')!;

function showLocation() {
  location.textContent = window.location.search + window.location.hash;
}

window.addEventListener('popstate', showLocation);
document.getElementById('query')!.addEventListener('click', () => {
  void messages.request('test.echo', { period: 'last-7' }).then(response => {
    result.textContent = JSON.stringify(response);
  });
});
document.getElementById('filter')!.addEventListener('click', () => {
  window.history.pushState(null, '', '?period=last-7#daily');
  bridge.location('push');
  showLocation();
});
showLocation();
