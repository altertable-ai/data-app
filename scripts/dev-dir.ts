import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import {
  getTsconfig,
  createPathsMatcher,
  type TsConfigJson,
} from 'get-tsconfig';
import manifest from '@/package.json';
import {
  previewLakehouseEnvironment,
  ensurePackageBuild,
  checkoutRoot,
} from '@/scripts/dev-resolve';

type ImportPaths = Record<string, string[]>;

const usage =
  'Usage: bun run dev:dir <path>\nThe directory must contain a local data app with src/server.ts. Use `bun run dev:file <path>` for a single-file app.';
const argument = process.argv[2];
if (!argument) {
  console.error(usage);
  process.exit(1);
}
const directory = resolve(process.env.INIT_CWD ?? process.cwd(), argument);
const server = join(directory, 'src/server.ts');
if (!existsSync(server)) {
  console.error(`No local data app server at ${server}.\n${usage}`);
  process.exit(1);
}
await ensurePackageBuild();

const appConfig = readAppImportPaths(directory);
const checkoutPaths = checkoutImportPaths();
const previewConfig = {
  extends: appConfig.configPath,
  compilerOptions: {
    paths: { ...appConfig.paths, ...checkoutPaths },
  },
} satisfies TsConfigJson;

const configDirectory = mkdtempSync(join(tmpdir(), 'data-app-dev-dir-'));
const tsconfig = join(configDirectory, 'tsconfig.json');
writeFileSync(tsconfig, JSON.stringify(previewConfig));

const { environment, target } = previewLakehouseEnvironment();
console.log(target);
const child = Bun.spawn(
  [
    process.execPath,
    `--tsconfig-override=${tsconfig}`,
    '--watch',
    '--no-clear-screen',
    'src/server.ts',
  ],
  {
    cwd: directory,
    env: environment,
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  }
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => child.kill(signal));
const exitCode = await child.exited;
rmSync(configDirectory, { recursive: true, force: true });
process.exit(exitCode);

function readAppImportPaths(directory: string): {
  configPath: string | undefined;
  paths: ImportPaths;
} {
  const appTsconfig = getTsconfig(directory);
  const matchPaths = appTsconfig ? createPathsMatcher(appTsconfig) : null;
  const patterns = Object.keys(
    appTsconfig?.config.compilerOptions?.paths ?? {}
  );
  // Absolute targets preserve inherited aliases when the override lives elsewhere.
  const paths = matchPaths
    ? Object.fromEntries(
        patterns.map(pattern => [pattern, matchPaths(pattern)])
      )
    : {};
  return { configPath: appTsconfig?.path, paths };
}

function checkoutImportPaths(): ImportPaths {
  const paths: ImportPaths = {};
  for (const [entry, target] of Object.entries(manifest.exports)) {
    const subpath = entry === '.' ? '' : entry.slice(1);
    const specifier = `@altertable/data-app${subpath}`;
    const javascript = 'import' in target ? target.import : target.default;
    paths[specifier] = [resolve(checkoutRoot, javascript)];
  }
  for (const name of ['react', 'react-dom']) {
    const entry = Bun.resolveSync(name, checkoutRoot);
    paths[name] = [entry];
    paths[`${name}/*`] = [join(dirname(entry), '*')];
  }
  return paths;
}
