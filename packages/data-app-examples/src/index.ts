import { cp, mkdir, rename } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  if (id === 'starter-local-data-app')
    await rename(
      join(destination, '_gitignore'),
      join(destination, '.gitignore')
    );
}
