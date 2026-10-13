import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  configureLakehouse,
  ensurePackageBuild,
  root,
} from '@/scripts/dev-resolve';

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

// The app's own bunfig would be ignored with --config, so extend it rather than replace it.
const plugin = join(root, 'scripts/dev-resolve.ts');
const appConfigPath = join(directory, 'bunfig.toml');
const appConfig = existsSync(appConfigPath)
  ? readFileSync(appConfigPath, 'utf8')
  : '';
if (/^\s*\[serve\.static\]/m.test(appConfig)) {
  console.error(
    `${appConfigPath} already configures [serve.static]; run the app with its own \`bun run dev\` instead.`
  );
  process.exit(1);
}
const configDirectory = mkdtempSync(join(tmpdir(), 'data-app-dev-dir-'));
const config = join(configDirectory, 'bunfig.toml');
writeFileSync(
  config,
  `${appConfig}\n[serve.static]\nplugins = [${JSON.stringify(plugin)}]\n`
);

console.log(configureLakehouse());
const child = Bun.spawn(
  [
    process.execPath,
    `--config=${config}`,
    `--preload=${plugin}`,
    '--hot',
    'src/server.ts',
  ],
  {
    cwd: directory,
    env: process.env,
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
