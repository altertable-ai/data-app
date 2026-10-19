import { afterEach, expect, test } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { packages } from '@/scripts/packages';

const temporary: string[] = [];
afterEach(async () => {
  await Promise.all(
    temporary.splice(0).map(path => rm(path, { recursive: true, force: true }))
  );
});

/** Exercise publication decisions with a fake registry and npm, never the network. */
async function publication(
  options: {
    statuses?: Record<string, number>;
    failPackage?: string;
    registryVersion?: string;
  } = {}
) {
  const directory = await mkdtemp(join(tmpdir(), 'data-app-release-'));
  temporary.push(directory);
  const bin = join(directory, 'bin');
  await mkdir(bin);
  for (const pkg of packages) {
    await mkdir(join(directory, pkg.directory), { recursive: true });
    await writeFile(
      join(directory, pkg.directory, 'package.json'),
      JSON.stringify(pkg.manifest)
    );
  }
  await writeFile(
    join(bin, 'curl'),
    `#!/usr/bin/env node
const fs = require('node:fs');
const url = new URL(process.argv.at(-1));
const name = decodeURIComponent(url.pathname.split('/')[1]);
const version = process.env.REGISTRY_VERSION || url.pathname.split('/').at(-1);
fs.writeFileSync('published.json', JSON.stringify({ version }));
process.stdout.write(String(JSON.parse(process.env.REGISTRY_STATUSES)[name] || 404));
`,
    { mode: 0o755 }
  );
  await writeFile(
    join(bin, 'npm'),
    `#!/usr/bin/env node
require('node:fs').appendFileSync('npm-calls.jsonl', JSON.stringify(process.argv.slice(2)) + '\\n');
if (process.argv[3] === process.env.FAIL_PACKAGE) process.exit(1);
`,
    { mode: 0o755 }
  );
  const child = spawn('bash', [resolve('scripts/release/publish.sh')], {
    cwd: directory,
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      REGISTRY_STATUSES: JSON.stringify(options.statuses ?? {}),
      FAIL_PACKAGE: options.failPackage,
      REGISTRY_VERSION: options.registryVersion,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', data => {
    output += data;
  });
  child.stderr.on('data', data => {
    output += data;
  });
  const code = await new Promise<number | null>((done, reject) => {
    child.on('error', reject);
    child.on('exit', done);
  });
  const calls = await readFile(
    join(directory, 'npm-calls.jsonl'),
    'utf8'
  ).catch(() => '');
  return {
    code,
    output,
    calls: calls.trim()
      ? calls
          .trim()
          .split('\n')
          .map(line => JSON.parse(line) as string[])
      : [],
  };
}

const expectedCalls = packages.map(pkg => [
  'publish',
  `./${pkg.directory}`,
  '--provenance',
]);

test('publishes every missing package in dependency order with provenance', async () => {
  const result = await publication();
  expect(result.code, result.output).toBe(0);
  expect(result.calls).toEqual(expectedCalls);
});

test('retries a partial release by skipping completed package versions', async () => {
  const failureIndex = packages.findIndex(
    pkg => pkg.directory === 'packages/data-app-embed'
  );
  const completed = packages.slice(0, failureIndex);
  const failed = await publication({
    failPackage: './packages/data-app-embed',
  });
  expect(failed.code).not.toBe(0);
  expect(failed.calls).toEqual(expectedCalls.slice(0, failureIndex + 1));
  const retried = await publication({
    statuses: Object.fromEntries(
      completed.map(pkg => [pkg.manifest.name, 200])
    ),
  });
  expect(retried.code, retried.output).toBe(0);
  expect(retried.calls).toEqual(expectedCalls.slice(failureIndex));
});

test('a fully published release is an idempotent no-op', async () => {
  const result = await publication({
    statuses: Object.fromEntries(packages.map(pkg => [pkg.manifest.name, 200])),
  });
  expect(result.code, result.output).toBe(0);
  expect(result.calls).toEqual([]);
});

test('registry failures stop publication instead of authorizing a publish', async () => {
  const result = await publication({
    statuses: { [packages[0]!.manifest.name]: 503 },
  });
  expect(result.code).not.toBe(0);
  expect(result.output).toContain('HTTP 503');
  expect(result.calls).toEqual([]);
});

test('existing registry metadata must match the requested version', async () => {
  const result = await publication({
    statuses: { [packages[0]!.manifest.name]: 200 },
    registryVersion: '0.0.0',
  });
  expect(result.code).not.toBe(0);
  expect(result.calls).toEqual([]);
});
