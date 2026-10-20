import { localLakehouse } from '../index.ts';
import { serveAppFile } from './index.ts';

const file = process.env.ALTERTABLE_APP_FILE;
if (!file)
  throw new Error(
    'Missing ALTERTABLE_APP_FILE. Set an absolute app source path.'
  );

// The caller launches from its installed runtime project, independently of the
// source file and of this package's location in node_modules.
const runtimeDirectory = process.cwd();
const preview = await serveAppFile({
  file,
  port: process.env.PORT === undefined ? undefined : Number(process.env.PORT),
  lakehouse: localLakehouse(),
  resolveDependency: specifier => Bun.resolveSync(specifier, runtimeDirectory),
});

for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, async () => {
    await preview.stop();
    process.exit(0);
  });

console.log(`Data app running at ${preview.url} (${file})`);
