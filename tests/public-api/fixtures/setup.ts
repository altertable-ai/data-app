import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  interface ProvidedContext {
    fixtureBundles: string;
  }
}

export default async function setup(project: TestProject) {
  const directory = await mkdtemp(join(tmpdir(), 'data-app-browser-'));
  function cleanup() {
    return rm(directory, { recursive: true, force: true });
  }
  function build() {
    execFileSync(
      'bun',
      [fileURLToPath(new URL('./bundles.ts', import.meta.url)), directory],
      { stdio: 'inherit' }
    );
  }
  try {
    build();
    project.provide('fixtureBundles', directory);
    project.onTestsRerun(build);
    return cleanup;
  } catch (error) {
    await cleanup();
    throw error;
  }
}
