import assert from 'node:assert/strict';
import { builtinModules } from 'node:module';
import { relative, resolve } from 'node:path';

import released from '@/.release-please-manifest.json';
import workspace from '@/package.json';
import starter from '@/packages/data-app-examples/templates/starter-local-data-app/package.json';
import findingStarter from '@/packages/data-app-examples/templates/starter-local-finding-data-app/package.json';
import metricStarter from '@/packages/data-app-examples/templates/starter-local-metric-data-app/package.json';
import release from '@/release-please-config.json';
import { packages } from '@/scripts/packages';

const builtins = new Set([...builtinModules, 'bun', 'bun:sqlite']);
const names = new Set(packages.map(pkg => pkg.manifest.name));
assert(workspace.private, 'The workspace root must never publish');
assert.equal(
  workspace.version,
  released['.'],
  'Release manifest and workspace versions differ'
);
const updates = new Set(
  release.packages['.']['extra-files']
    .filter(update => update.type === 'json')
    .map(update => `${update.path}:${update.jsonpath}`)
);
function releaseVersion(path: string, field: string) {
  assert(
    updates.has(`${path}:${field}`),
    `Release Please does not update ${path}:${field}`
  );
}
for (const id of [
  'starter-local-data-app',
  'starter-local-metric-data-app',
  'starter-local-finding-data-app',
]) {
  for (const filename of ['AGENTS.md', 'README.md']) {
    const path = `packages/data-app-examples/templates/${id}/${filename}`;
    assert(
      release.packages['.']['extra-files'].some(
        update => update.type === 'generic' && update.path === path
      ),
      `Release Please does not update starter guidance: ${path}`
    );
    const source = await Bun.file(path).text();
    const taggedLinks = [
      ...source.matchAll(
        /github\.com\/altertable-ai\/data-app\/blob\/v([^/]+)\//g
      ),
    ];
    assert(taggedLinks.length > 0, `Missing release-matched guidance: ${path}`);
    for (const match of taggedLinks)
      assert.equal(
        match[1],
        workspace.version,
        `${path}: guidance version differs`
      );
    const annotatedLines = source
      .split('\n')
      .filter(line => line.includes('<!-- x-release-please-version -->'));
    assert(annotatedLines.length > 0, `${path}: missing release annotation`);
    for (const line of annotatedLines)
      assert.equal(
        [...line.matchAll(/\d+\.\d+\.\d+/g)].length,
        1,
        `${path}: release annotations must contain exactly one version`
      );
  }
}
for (const { directory } of packages)
  releaseVersion(`${directory}/package.json`, '$.version');
for (const [path, manifest] of [
  ['package.json', workspace],
  [
    'packages/data-app-examples/templates/starter-local-data-app/package.json',
    starter,
  ],
  [
    'packages/data-app-examples/templates/starter-local-metric-data-app/package.json',
    metricStarter,
  ],
  [
    'packages/data-app-examples/templates/starter-local-finding-data-app/package.json',
    findingStarter,
  ],
  ...packages.map(
    pkg => [`${pkg.directory}/package.json`, pkg.manifest] as const
  ),
] as const) {
  for (const section of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
  ] as const) {
    const dependencies: Record<string, string> =
      section in manifest
        ? (manifest[section as keyof typeof manifest] as Record<string, string>)
        : {};
    for (const [name, version] of Object.entries(dependencies)) {
      if (names.has(name)) {
        assert.equal(version, workspace.version, `${path}: mismatched ${name}`);
        releaseVersion(path, `$.${section}['${name}']`);
      }
    }
  }
}
for (const { directory, manifest } of packages) {
  assert.equal(
    manifest.version,
    workspace.version,
    `${manifest.name}: release versions differ`
  );
  const dependencies: Record<string, string> = {
    ...('dependencies' in manifest ? manifest.dependencies : {}),
    ...('devDependencies' in manifest ? manifest.devDependencies : {}),
    ...('peerDependencies' in manifest ? manifest.peerDependencies : {}),
  };
  for await (const path of new Bun.Glob('**/*.{ts,tsx}').scan(
    `${directory}/src`
  )) {
    const file = resolve(directory, 'src', path);
    const source = await Bun.file(file).text();
    for (const [, specifier] of source.matchAll(
      /(?:\bfrom\s+|\bimport\s*\(\s*|^\s*import\s+)["']([^"'\s]+)["']/gm
    )) {
      if (!specifier) continue;
      if (specifier.startsWith('.')) {
        const target = relative(
          resolve(directory, 'src'),
          resolve(file, '..', specifier)
        );
        assert(
          !target.startsWith('..'),
          `${file}: import escapes package: ${specifier}`
        );
      } else {
        assert(
          !specifier.startsWith('@/'),
          `${file}: repository alias in package`
        );
        if (specifier.startsWith('node:') || builtins.has(specifier)) continue;
        const name = specifier.startsWith('@')
          ? specifier.split('/').slice(0, 2).join('/')
          : specifier.split('/')[0]!;
        assert(
          Object.hasOwn(dependencies, name),
          `${file}: undeclared dependency ${name}`
        );
      }
    }
  }
}
console.log('Package boundaries and coordinated versions verified.');
