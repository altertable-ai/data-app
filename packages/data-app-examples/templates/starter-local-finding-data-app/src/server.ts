import { serveLocalApp } from '@altertable/data-app-bun';

import page from '#app/index.html';
import { operations } from '#app/operations.ts';
import { dataApp } from '#config';

serveLocalApp({ page, operations, title: dataApp.title });
