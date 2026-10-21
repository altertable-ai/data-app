import { rmdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const session = process.env.DATA_APP_DEV_SESSION;
if (session && !/^[a-f0-9-]+$/.test(session))
  throw new Error('Invalid package watcher session.');

// Separate owners must never clean each other's files after a crash/restart.
export function staging(directory: string) {
  return resolve(directory, '.dev-build', session ?? '.');
}

export function declarationConfig(directory: string) {
  return resolve(
    directory,
    `.tsconfig.dev${session ? `-${session}` : ''}.json`
  );
}

export async function cleanStaging(directory: string) {
  await rm(staging(directory), { recursive: true, force: true });
  await rm(declarationConfig(directory), { force: true });
  if (session) {
    try {
      await rmdir(resolve(directory, '.dev-build'));
    } catch (error) {
      if (
        !['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(
          (error as NodeJS.ErrnoException).code ?? ''
        )
      )
        throw error;
    }
  }
}
