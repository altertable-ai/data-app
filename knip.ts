import { globSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { KnipConfig } from 'knip';

// Bun loads these modules through HTML rather than TypeScript imports.
const browserEntries = [
  ...globSync('{dev,tests/public-api}/**/*.html'),
].flatMap(file =>
  [...readFileSync(file, 'utf8').matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)]
    .map(([, source]) => join(dirname(file), source!))
    .filter(source => /\.[cm]?[jt]sx?$/.test(source))
);

// Public entry exports belong to consumers, including unreferenced subpaths.
const packages = Object.fromEntries(
  readdirSync('packages').map(directory => {
    const path = `packages/${directory}`;
    const manifest = JSON.parse(
      readFileSync(`${path}/package.json`, 'utf8')
    ) as {
      exports: Record<string, { import: string }>;
    };
    return [
      path,
      {
        entry: Object.values(manifest.exports).map(target =>
          target.import.replace('./dist/', 'src/').replace(/\.js$/, '.ts')
        ),
        project: ['src/**/*.{ts,tsx}'],
      },
    ];
  })
);

export default {
  treatConfigHintsAsErrors: true,
  workspaces: {
    '.': {
      entry: [
        'dev/server.ts',
        'dev/playground.tsx',
        'dev/fixtures/view-result.types.ts',
        'tests/**/*.types.{ts,tsx}',
        'tests/fixtures/manifest-consumer.ts',
        'tests/public-api/fixtures/server.ts',
        // Built through Bun.build() calls with runtime-generated options.
        'dev/fixtures/{bundle-app,annotation-state-app}.tsx',
        'dev/fixtures/bridge-frame.ts',
        'tests/public-api/fixtures/{bundle-app,annotations-app,annotation-state-app}.tsx',
        'tests/public-api/fixtures/bridge-frame.ts',
        ...browserEntries,
      ],
      project: [
        'scripts/**/*.ts',
        'dev/**/*.{ts,tsx}',
        'tests/**/*.{ts,tsx,js}',
      ],
      ignoreUnresolved: [
        // A child-process argument, not an imported module specifier.
        'tests/public-api/fixtures/server.ts',
        // Negative compiler-options fixture verifies missing side-effect imports.
        '@/tests/public-api/missing-side-effect-module',
      ],
      remark: { config: ['.remarkrc.json', '.remarkrc-external.json'] },
    },
    ...packages,
    'packages/data-app-bun': {
      ...packages['packages/data-app-bun'],
      entry: [
        ...packages['packages/data-app-bun']!.entry,
        'src/preview/host.tsx',
      ],
    },
    'packages/data-app-embed': {
      ...packages['packages/data-app-embed'],
      entry: [
        ...packages['packages/data-app-embed']!.entry,
        'src/standalone.ts',
      ],
      // React is required only by the optional /react entry.
      ignoreIssues: { 'package.json': ['optionalPeerDependencies'] },
    },
    'packages/data-app-examples': {
      ...packages['packages/data-app-examples'],
      entry: ['src/index.ts', 'templates/starter-data-app/index.tsx'],
      project: ['src/**/*.ts', 'templates/starter-data-app/*.tsx'],
    },
    'packages/data-app-examples/templates/starter-local-data-app': {
      entry: ['src/server.ts', 'src/main.tsx'],
      project: ['src/**/*.{ts,tsx}'],
    },
  },
} satisfies KnipConfig;
