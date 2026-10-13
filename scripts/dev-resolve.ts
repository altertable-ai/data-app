import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BunPlugin } from 'bun';

export const root = resolve(import.meta.dir, '..');

/** Apps outside the checkout use its package build and its single React copy. */
const checkout: BunPlugin = {
  name: 'data-app-checkout',
  setup(build) {
    build.onResolve(
      { filter: /^(?:@altertable\/data-app|react|react-dom)(?:\/.*)?$/ },
      args =>
        args.importer.startsWith(`${root}/`)
          ? undefined
          : { path: Bun.resolveSync(args.path, root) }
    );
  },
};

// Loaded both as a `--preload` for server code and as a `[serve.static]` plugin for HTML bundles.
void Bun.plugin(checkout);

export default checkout;

/** Accept the CLI's credential names and describe which lakehouse `localLakehouse()` will query. */
export function configureLakehouse(environment = process.env) {
  for (const name of ['USERNAME', 'PASSWORD'])
    if (
      !environment[`ALTERTABLE_LAKEHOUSE_${name}`] &&
      environment[`ALTERTABLE_${name}`]
    )
      environment[`ALTERTABLE_LAKEHOUSE_${name}`] =
        environment[`ALTERTABLE_${name}`];
  const {
    ALTERTABLE_DATA_PROXY_URL: proxyUrl,
    ALTERTABLE_LAKEHOUSE_USERNAME: username,
    ALTERTABLE_LAKEHOUSE_PASSWORD: password,
    ALTERTABLE_API_BASE: apiBase,
  } = environment;
  if (proxyUrl)
    return `Lakehouse: CLI proxy at ${proxyUrl}${username ? ' (ALTERTABLE_DATA_PROXY_URL takes precedence over credentials)' : ''}`;
  if (username && password)
    return `Lakehouse: ${apiBase || 'https://api.altertable.ai'} as ${username}`;
  return 'Lakehouse: no credentials. Set ALTERTABLE_USERNAME and ALTERTABLE_PASSWORD, and optionally ALTERTABLE_API_BASE.';
}

export async function ensurePackageBuild() {
  if (existsSync(resolve(root, 'dist/index.js'))) return;
  const build = Bun.spawn([process.execPath, 'run', 'build'], {
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if ((await build.exited) !== 0) process.exit(1);
}
