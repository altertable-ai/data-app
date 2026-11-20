import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const oldestSupportedVersion = '0.75.0';
const releaseHeading = /^## \[/m;
const releaseVersion = /^\d+\.\d+\.\d+(?=\])/;
const breakingChangesHeading = /^### .*BREAKING CHANGES/m;

export async function buildMigrationGuides(
  packageDirectory: string,
  outputDirectory: string,
  currentVersion: string
) {
  const changelog = await readFile('CHANGELOG.md', 'utf8');
  const sections = changelog.split(releaseHeading).slice(1);
  const start = sections.findIndex(section =>
    section.startsWith(`${currentVersion}]`)
  );
  const baseline = sections.findIndex(section =>
    section.startsWith(`${oldestSupportedVersion}]`)
  );
  if (start < 0 || baseline <= start)
    throw new Error(`Missing SDK migration history for ${currentVersion}`);

  const output = join(outputDirectory, 'migrations');
  await mkdir(output, { recursive: true });
  const releases: string[] = [];
  for (const section of sections.slice(start, baseline).reverse()) {
    const version = releaseVersion.exec(section)?.[0];
    if (!version)
      throw new Error('Invalid SDK release heading in CHANGELOG.md');
    releases.push(version);
    const guide = join(packageDirectory, 'migrations', `${version}.md`);
    const target = join(output, `${version}.md`);
    const contents = await readFile(guide, 'utf8').catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
        return undefined;
      }
    );
    if (contents === undefined && breakingChangesHeading.test(section))
      throw new Error(`SDK ${version} has breaking changes. Add ${guide}.`);
    if (contents !== undefined && !contents.trim())
      throw new Error(`Empty SDK migration guide: ${guide}.`);

    await writeFile(
      target,
      contents ??
        `# Upgrade to SDK ${version}\n\nNo app source migration is required.\n`
    );
  }
  return { oldestSupportedVersion, releases };
}
