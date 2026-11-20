import { migrationsByVersion } from './migrations.ts';

declare const DATA_APP_SDK_VERSION: string;
declare const DATA_APP_MIGRATION_HISTORY: {
  oldestSupportedVersion: string;
  releases: readonly string[];
};

const STABLE_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export interface DataAppUpgradeOptions {
  source: string;
  fromVersion: string;
  toVersion?: string;
}

export interface DataAppUpgradeResult {
  source: string;
  steps: DataAppMigrationOutcome[];
  /** Review these releases' guides under dist/migrations before saving the app. */
  migrationGuides: string[];
}

export type DataAppMigrationOutcome = { id: string; version: string } & (
  | { status: 'applied' | 'unchanged' }
  | { status: 'review_required'; message: string }
);

type Version = readonly [major: number, minor: number, patch: number];

function parseVersion(version: string): Version {
  const match = STABLE_VERSION_PATTERN.exec(version);
  if (!match)
    throw new RangeError(`Expected a stable SDK version, got ${version}`);
  const parts: Version = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (!parts.every(Number.isSafeInteger))
    throw new RangeError(`Invalid SDK version: ${version}`);
  return parts;
}

function compareVersions(left: Version, right: Version): number {
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
}

/** Apply available codemods in release order and list guides for the requested upgrade. */
export function upgradeDataApp({
  source,
  fromVersion,
  toVersion = DATA_APP_SDK_VERSION,
}: DataAppUpgradeOptions): DataAppUpgradeResult {
  const from = parseVersion(fromVersion);
  const to = parseVersion(toVersion);
  const { oldestSupportedVersion, releases } = DATA_APP_MIGRATION_HISTORY;
  if (
    compareVersions(from, parseVersion(oldestSupportedVersion)) < 0 ||
    compareVersions(to, parseVersion(DATA_APP_SDK_VERSION)) > 0 ||
    compareVersions(from, to) > 0
  )
    throw new RangeError(
      `Unsupported SDK upgrade: ${fromVersion} to ${toVersion}`
    );

  const migrationGuides: string[] = [];
  const steps: DataAppMigrationOutcome[] = [];
  let upgradedSource = source;
  for (const version of releases) {
    const release = parseVersion(version);
    if (compareVersions(release, from) <= 0 || compareVersions(release, to) > 0)
      continue;
    migrationGuides.push(version);

    for (const step of migrationsByVersion[version] ?? []) {
      const { id } = step;
      if ('rewrite' in step) {
        const nextSource = step.rewrite(upgradedSource);
        steps.push({
          id,
          version,
          status: nextSource === upgradedSource ? 'unchanged' : 'applied',
        });
        upgradedSource = nextSource;
      } else {
        steps.push(
          step.pattern.test(upgradedSource)
            ? { id, version, status: 'review_required', message: step.message }
            : { id, version, status: 'unchanged' }
        );
      }
    }
  }
  return { source: upgradedSource, steps, migrationGuides };
}
