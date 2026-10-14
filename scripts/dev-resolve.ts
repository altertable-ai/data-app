import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const checkoutRoot = resolve(import.meta.dir, '..');

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
  const { ALTERTABLE_DATA_PROXY_URL: proxyUrl, ALTERTABLE_API_BASE: apiBase } =
    environment;
  let target: string;
  if (proxyUrl)
    target =
      'Lakehouse: CLI proxy selected (ALTERTABLE_DATA_PROXY_URL takes precedence).';
  else
    target = apiBase
      ? 'Lakehouse: configured API selected (ALTERTABLE_API_BASE).'
      : 'Lakehouse: https://api.altertable.ai selected.';
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
