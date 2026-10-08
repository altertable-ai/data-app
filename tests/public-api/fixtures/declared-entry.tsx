import { injectDataAppStyles, mountDataApp } from '@altertable/data-app/react';
import { DeclaredApp } from '@/tests/public-api/fixtures/declared-app';
injectDataAppStyles();
mountDataApp({
  config: {
    title: 'Declared views',
    scope: { organization: 'test', environment: 'test' },
    appearance: {},
  },
  component: DeclaredApp,
});
