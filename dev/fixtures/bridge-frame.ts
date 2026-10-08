import { bridgeRoutes } from '@/dev/fixtures/bridge-routes';
import {
  createMessageClient,
  createIframeTransport,
  createDataAppNavigation,
} from '@altertable/data-app/client';
const bridge = createIframeTransport({
  parentOrigin:
    document.documentElement.dataset.parentOrigin ?? window.location.origin,
});
const navigation = createDataAppNavigation({ bridge });
const messages = createMessageClient(bridgeRoutes, bridge.request);
const result = document.getElementById('result')!;
const location = document.getElementById('location')!;
const log = document.createElement('button');
log.textContent = 'Write logs';
log.addEventListener('click', () => {
  bridge.logger.log('plain');
  bridge.logger.info(() => ['completed', { rows: 3 }]);
  bridge.logger.warn('slow');
  bridge.logger.error('failed');
});
document.body.append(log);

function showLocation() {
  location.textContent = window.location.search + window.location.hash;
}

window.addEventListener('popstate', showLocation);
document.getElementById('query')!.addEventListener('click', () => {
  void messages.request('test:echo', { period: 'last-7' }).then(response => {
    result.textContent = JSON.stringify(response);
  });
});
document.getElementById('filter')!.addEventListener('click', () => {
  window.history.pushState(null, '', '?period=last-7#daily');
  navigation.publish('push');
  showLocation();
});
showLocation();
