import { serveLocalApp } from '@altertable/data-app-bun';

import page from '#app/index.html';
import { operations } from '#app/operations.ts';
import { dataApp as app } from '#config';

serveLocalApp({ page, operations, title: app.title });
