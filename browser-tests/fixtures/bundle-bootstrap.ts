import { startDataAppBootstrap } from '@altertable/data-app/embed';
const parentOrigin = new URL(window.location.href).searchParams.get('parent');
if (!parentOrigin) throw new Error('Missing trusted parent origin.');
startDataAppBootstrap({ parentOrigin });
