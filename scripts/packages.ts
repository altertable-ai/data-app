import core from '@/packages/data-app/package.json';
import embed from '@/packages/data-app-embed/package.json';
import react from '@/packages/data-app-react/package.json';
import bun from '@/packages/data-app-bun/package.json';
import examples from '@/packages/data-app-examples/package.json';
import worker from '@/packages/data-app-worker/package.json';

/** Dependency order also defines build, pack, and publication order. */
export const packages = [core, embed, react, bun, worker, examples].map(
  manifest => ({
    manifest,
    directory: `packages/${manifest.name.slice('@altertable/'.length)}`,
  })
);
