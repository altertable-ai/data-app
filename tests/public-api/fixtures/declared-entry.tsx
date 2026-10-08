import { injectDataAppStyles, mountDataApp } from '@altertable/data-app/react';
import { DeclaredApp, dataApp } from '@/tests/public-api/fixtures/declared-app';
injectDataAppStyles();
mountDataApp({
  config: dataApp.config,
  component: DeclaredApp,
});
