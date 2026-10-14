import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BunPlugin } from 'bun';

export const checkoutRoot = resolve(import.meta.dir, '..');

/** Apps outside the checkout use its package build and its single React copy. */
const checkoutDependencies: BunPlugin = {
  name: 'data-app-checkout',
  setup(build) {
    build.onResolve(
      { filter: /^(?:@altertable\/data-app|react|react-dom)(?:\/.*)?$/ },
      args =>
        args.importer.startsWith(`${checkoutRoot}/`)
          ? undefined
          : { path: Bun.resolveSync(args.path, checkoutRoot) }
    );
  },
};

export default checkoutDependencies;

/** Accept the CLI's credential names and describe which lakehouse `localLakehouse()` will query. */
export function previewLakehouseEnvironment(input = process.env) {
  const environment = { ...input };
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
  let target: string;
  if (proxyUrl)
    target = `Lakehouse: CLI proxy at ${proxyUrl}${username ? ' (ALTERTABLE_DATA_PROXY_URL takes precedence over credentials)' : ''}`;
  else if (username && password)
    target = `Lakehouse: ${apiBase || 'https://api.altertable.ai'} as ${username}`;
  else
    target =
      'Lakehouse: no credentials. Set ALTERTABLE_USERNAME and ALTERTABLE_PASSWORD, and optionally ALTERTABLE_API_BASE.';
  return { environment, target };
}

export async function ensurePackageBuild() {
  if (existsSync(resolve(checkoutRoot, 'dist/index.js'))) return;
  const build = Bun.spawn([process.execPath, 'run', 'build'], {
    cwd: checkoutRoot,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if ((await build.exited) !== 0) process.exit(1);
}
