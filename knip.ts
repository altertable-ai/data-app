import type { KnipConfig } from 'knip';

export default {
  // Bun serves these HTML modules and bundles their script entry points.
  compilers: {
    html: (source: string) =>
      [...source.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g)]
        .map(([, path]) => `import ${JSON.stringify(path)};`)
        .join('\n'),
  },
  // This is a process cwd-relative script argument, not a module import.
  ignoreUnresolved: ['tests/public-api/fixtures/server.ts'],
  workspaces: {
    '.': {
      entry: [
        // Published source entries; package.json points to built dist files.
        'src/index.ts',
        'src/core/{contract,config,format,appearance}.ts',
        'src/{client,embed,react,react/ui,react/embed,server,server/preview,worker}/index.ts',
        'src/server/local.ts',
        // Bun build targets and runtime script arguments aren't imports.
        'src/embed/standalone.ts',
        'src/server/preview/host.html',
        'dev/{server.ts,playground.tsx}',
        '{dev,tests/public-api}/fixtures/{bundle-app,annotations-app,annotation-state-app}.tsx',
        'examples/starter-data-app/index.tsx',
        'tests/public-api/*.types.{ts,tsx}',
        'tests/public-api/fixtures/server.ts',
      ],
      remark: {
        config: ['.remarkrc*.json'],
      },
    },
    // Knip doesn't discover the starter's `bun --hot` server entry.
    'examples/starter-local-data-app': {
      entry: ['src/server.ts'],
    },
  },
} satisfies KnipConfig;
