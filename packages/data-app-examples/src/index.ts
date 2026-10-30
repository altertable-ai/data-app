import { cp, mkdir, readdir, rename, rm } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const templateFileRenames = new Map([['_gitignore', '.gitignore']]);

/** Canonical starters available to scaffolding tools. IDs are stable across releases. */
export const dataAppExamples = [
  {
    id: 'starter-data-app',
    title: 'Hosted data app',
    description: 'A single-file React app for hosted execution.',
    mode: 'hosted',
  },
  {
    id: 'starter-local-data-app',
    title: 'Local data app',
    description: 'A Bun and React project with server-side lakehouse access.',
    mode: 'local',
  },
  {
    id: 'starter-metric-data-app',
    title: 'Hosted metric illustration',
    description: 'A focused metric app for hosted execution.',
    mode: 'hosted',
  },
  {
    id: 'starter-finding-data-app',
    title: 'Hosted Finding document',
    description: 'A focused finding app for hosted execution.',
    mode: 'hosted',
  },
  {
    id: 'starter-local-metric-data-app',
    title: 'Local metric illustration',
    description: 'A focused metric app for local execution.',
    mode: 'local',
  },
  {
    id: 'starter-local-finding-data-app',
    title: 'Local Finding document',
    description: 'A focused finding app for local execution.',
    mode: 'local',
  },
] as const;

/** Stable identifier for a canonical starter. */
export type DataAppExampleId = (typeof dataAppExamples)[number]['id'];

/** Absolute source directory. Use copyExample() to restore npm-excluded filenames. */
export function getExampleDirectory(id: DataAppExampleId): string {
  const example = dataAppExamples.find(example => example.id === id);
  if (!example) throw new Error(`Unknown data app example: ${id}`);
  return fileURLToPath(new URL(`../templates/${example.id}/`, import.meta.url));
}

/** Copy a starter into a new directory; reject existing destinations. */
export async function copyExample(
  id: DataAppExampleId,
  destination: string
): Promise<void> {
  const source = getExampleDirectory(id);
  await mkdir(destination);
  try {
    await cp(source, destination, {
      recursive: true,
      filter: path =>
        relative(source, path)
          .split(sep)
          .every(
            part =>
              part !== 'node_modules' &&
              part !== 'dist' &&
              !part.startsWith('.env')
          ),
    });
    for (const filename of await readdir(destination)) {
      const target = templateFileRenames.get(filename);
      if (target)
        await rename(join(destination, filename), join(destination, target));
    }
  } catch (error) {
    await rm(destination, { recursive: true, force: true });
    throw error;
  }
}
