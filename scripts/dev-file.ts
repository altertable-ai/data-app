import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  previewLakehouseEnvironment,
  ensurePackageBuild,
  checkoutRoot,
} from '@/scripts/dev-resolve';

const usage =
  'Usage: bun run dev:file <path>\nThe file must be a single-file data app such as examples/starter-data-app/index.tsx. Use `bun run dev:dir <path>` for a local app directory.';
const argument = process.argv[2];
if (!argument) {
  console.error(usage);
  process.exit(1);
}
const appFile = resolve(process.env.INIT_CWD ?? process.cwd(), argument);
if (!existsSync(appFile) || !statSync(appFile).isFile()) {
  console.error(`No data app file at ${appFile}.\n${usage}`);
  process.exit(1);
}
await ensurePackageBuild();
const [{ serveAppFile }, { localLakehouse }] = await Promise.all([
  import('@altertable/data-app/server/bun/preview'),
  import('@altertable/data-app/server/bun'),
]);
const { environment, target } = previewLakehouseEnvironment();
const preview = await serveAppFile({
  file: appFile,
  port: Number(process.env.PORT ?? 25937),
  dependenciesFrom: checkoutRoot,
  lakehouse: localLakehouse(environment),
});
console.log(`Data app ${appFile} running at ${preview.url}\n${target}`);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, async () => {
    await preview.stop();
    process.exit(0);
  });
