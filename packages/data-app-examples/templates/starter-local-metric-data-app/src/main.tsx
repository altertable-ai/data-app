import { mountDataApp } from '@altertable/data-app-react';

import { App } from '#app/App.tsx';
import { dataApp } from '#config';

mountDataApp({ app: dataApp, component: App });
