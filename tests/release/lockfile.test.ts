import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, expect, test } from 'vitest';

const temporary: string[] = [];
afterEach(async () => {
  await Promise.all(
    temporary.splice(0).map(path => rm(path, { recursive: true, force: true }))
  );
});

async function synchronize(
  options: { branch?: string; mismatchedHead?: boolean; changed?: boolean } = {}
) {
  const directory = await mkdtemp(join(tmpdir(), 'data-app-release-lock-'));
  temporary.push(directory);
  const bin = join(directory, 'bin');
  await mkdir(bin);
  await writeFile(
    join(bin, 'git'),
    `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync('calls.jsonl', JSON.stringify(['git', ...args]) + '\\n');
if (args[0] === 'rev-parse') process.stdout.write(args[1] === 'HEAD' && process.env.MISMATCH === 'true' ? 'different' : 'release-sha');
if (args[0] === 'diff') process.exit(process.env.CHANGED === 'true' ? 1 : 0);
`,
    { mode: 0o755 }
  );
  await writeFile(
    join(bin, 'bun'),
    `#!/usr/bin/env node
require('node:fs').appendFileSync('calls.jsonl', JSON.stringify(['bun', ...process.argv.slice(2)]) + '\\n');
`,
    { mode: 0o755 }
  );
  const child = spawn(
    'bash',
    [resolve('scripts/release/refresh-lockfile.sh')],
    {
      cwd: directory,
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        RELEASE_PR_BRANCH: options.branch ?? 'release-please--branches--main',
        MISMATCH: String(options.mismatchedHead ?? false),
        CHANGED: String(options.changed ?? false),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
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
  const content = await readFile(join(directory, 'calls.jsonl'), 'utf8').catch(
    () => ''
  );
  const calls = content.trim()
    ? content
        .trim()
        .split('\n')
        .map(line => JSON.parse(line) as string[])
    : [];
  return { code, calls, output };
}

test('refreshes a verified release PR even when checkout has no local branch', async () => {
  const result = await synchronize({ changed: true });
  expect(result.code, result.output).toBe(0);
  expect(result.calls).toContainEqual([
    'bun',
    'install',
    '--lockfile-only',
    '--ignore-scripts',
  ]);
  expect(result.calls).toContainEqual(['git', 'add', 'bun.lock']);
  expect(result.calls.at(-1)).toEqual([
    'git',
    'push',
    'origin',
    'HEAD:refs/heads/release-please--branches--main',
  ]);
  expect(result.calls.some(call => call.includes('branch'))).toBe(false);
});

test('does not commit or push an unchanged lockfile', async () => {
  const result = await synchronize();
  expect(result.code, result.output).toBe(0);
  expect(
    result.calls.some(call => call.includes('push') || call.includes('commit'))
  ).toBe(false);
});

test('rejects other branches and a checkout that does not match the release PR', async () => {
  for (const options of [{ branch: 'main' }, { mismatchedHead: true }]) {
    const result = await synchronize(options);
    expect(result.code).not.toBe(0);
    expect(
      result.calls.some(call => call[0] === 'bun' || call.includes('push'))
    ).toBe(false);
  }
});
