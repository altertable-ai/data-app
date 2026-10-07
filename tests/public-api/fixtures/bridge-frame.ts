import { bridgeRoutes } from '@/tests/public-api/fixtures/bridge-routes';
import {
  createMessageClient,
  createIframeTransport,
  createDataAppNavigation,
} from '@altertable/data-app/client';
const bridge = createIframeTransport({
  timeoutMs: 1000,
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

let controller: AbortController;
for (const action of ['Concurrent queries', 'Wait for query', 'Cancel query']) {
  const button = document.createElement('button');
  button.textContent = action;
  button.addEventListener('click', () => {
    const result = document.getElementById('result')!;
    if (action === 'Cancel query') {
      controller.abort();
      return;
    }
    if (action === 'Concurrent queries') {
      void Promise.all(
        Array.from({ length: 50 }, (_, index) =>
          messages.request('test:echo', { period: String(index) })
        )
      ).then(values => {
        result.textContent = JSON.stringify(values);
      });
      return;
    }
    controller = new AbortController();
    void messages
      .request('test:wait', 1, { signal: controller.signal })
      .catch(error => {
        result.textContent =
          error.name === 'AbortError' ? error.name : (error.code ?? error.name);
      });
  });
  document.body.append(button);
}
