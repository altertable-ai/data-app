import { join } from 'node:path';

const entries = {
  'starter-finding-data-app':
    'packages/data-app-examples/templates/starter-finding-data-app/index.tsx',
  'starter-metric-data-app':
    'packages/data-app-examples/templates/starter-metric-data-app/index.tsx',
  'starter-data-app':
    'packages/data-app-examples/templates/starter-data-app/index.tsx',
  bundle: 'tests/public-api/fixtures/bundle-app.tsx',
  'cost-dashboard': 'tests/public-api/fixtures/cost-dashboard.tsx',
  'starter-authoring-features':
    'tests/public-api/fixtures/authoring-features-app.tsx',
  frame: 'tests/public-api/fixtures/bridge-frame.ts',
  annotations: 'tests/public-api/fixtures/annotations-app.tsx',
  'annotation-state': 'tests/public-api/fixtures/annotation-state-app.tsx',
  'content-sizing': 'tests/public-api/fixtures/content-sizing-app.tsx',
  diagnostics: 'tests/public-api/fixtures/diagnostics-app.tsx',
} as const;

async function buildFixtureBundles(directory: string) {
  await Promise.all(
    Object.entries(entries).map(async ([name, entry]) => {
      const result = await Bun.build({
        entrypoints: [entry],
        target: 'browser',
        format: 'iife',
        sourcemap: name === 'diagnostics' ? 'inline' : 'none',
        define: { 'import.meta.env': '{}' },
      });
      await Bun.write(join(directory, `${name}.js`), result.outputs[0]!);
    })
  );
}

await buildFixtureBundles(process.argv[2]!);
