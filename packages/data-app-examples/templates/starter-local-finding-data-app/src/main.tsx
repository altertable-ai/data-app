import { mountDataApp } from '@altertable/data-app-react';
import { installLocalQueryLakehouse } from '@altertable/data-app/client';

import { App } from '#app/App.tsx';
import { dataApp } from '#config';

installLocalQueryLakehouse();
mountDataApp({ app: dataApp, component: App });
