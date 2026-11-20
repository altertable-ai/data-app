import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function buildMigrationGuides(
  directory: string,
  outdir: string,
  currentVersion: string
): Promise<string[]> {
  const changelog = await readFile('CHANGELOG.md', 'utf8');
  const sections = changelog.split(/^## \[/m).slice(1);
  const start = sections.findIndex(section =>
    section.startsWith(`${currentVersion}]`)
  );
  const baseline = sections.findIndex(section => section.startsWith('0.75.0]'));
  if (start < 0 || baseline <= start)
    throw new Error(`Missing SDK migration history for ${currentVersion}`);

  const output = join(outdir, 'migrations');
  await mkdir(output, { recursive: true });
  const versions: string[] = [];
  for (const section of sections.slice(start, baseline).reverse()) {
    const version = /^\d+\.\d+\.\d+(?=\])/.exec(section)?.[0];
    if (!version)
      throw new Error('Invalid SDK release heading in CHANGELOG.md');
    versions.push(version);
    const guide = join(directory, 'migrations', `${version}.md`);
    const target = join(output, `${version}.md`);
    if (await Bun.file(guide).exists()) {
      if (!(await readFile(guide, 'utf8')).trim())
        throw new Error(`Empty SDK migration guide: ${guide}`);
      await cp(guide, target);
    } else if (/^### .*BREAKING CHANGES/m.test(section)) {
      throw new Error(`SDK ${version} has breaking changes. Add ${guide}.`);
    } else {
      await writeFile(
        target,
        `# Upgrade to SDK ${version}\n\nNo app source migration is required.\n`
      );
    }
  }
  return versions;
}
