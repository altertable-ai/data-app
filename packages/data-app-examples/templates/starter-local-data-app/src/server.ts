import { serveLocalApp } from '@altertable/data-app-bun';

import page from '#app/index.html';
import { dataApp } from '#config';

serveLocalApp({ page, app: dataApp });
