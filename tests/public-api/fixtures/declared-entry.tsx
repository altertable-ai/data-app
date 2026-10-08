import { injectDataAppStyles, mountDataApp } from '@altertable/data-app/react';
import {
  DeclaredApp,
  DATA_APP_CONFIG,
} from '@/tests/public-api/fixtures/declared-app';
injectDataAppStyles();
mountDataApp({
  config: DATA_APP_CONFIG,
  component: DeclaredApp,
});
