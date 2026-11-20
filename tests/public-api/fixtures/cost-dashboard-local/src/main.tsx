import { mountDataApp } from '@altertable/data-app-react';
import { installLocalQueryLakehouse } from '@altertable/data-app/client';

import { dataApp } from '@/tests/public-api/fixtures/cost-dashboard-local/app';
import { App } from '@/tests/public-api/fixtures/cost-dashboard-local/src/App';

installLocalQueryLakehouse();
mountDataApp({ app: dataApp, component: App });
