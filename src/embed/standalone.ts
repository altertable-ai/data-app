import { startDataAppBootstrap } from '@/src/embed/bootstrap';

// The hosting service supplies trust in the HTML, before any app script runs.
const parentOrigin = (document.currentScript as HTMLScriptElement | null)
  ?.dataset.parentOrigin;
if (!parentOrigin) throw new Error('Missing trusted parent origin.');

startDataAppBootstrap({ parentOrigin });
