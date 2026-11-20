import { moveFilterImports } from './move-filter-imports.ts';

declare const DATA_APP_SDK_VERSION: string;
declare const DATA_APP_MIGRATION_VERSIONS: readonly string[];

const oldestSupportedVersion = '0.75.0';

const codemods: Readonly<Record<string, (source: string) => string>> = {
  '0.77.0': moveFilterImports,
};

export interface DataAppUpgradeOptions {
  source: string;
  fromVersion: string;
  toVersion?: string;
}

export interface DataAppUpgradeResult {
  source: string;
  appliedCodemods: string[];
  /** Review these releases' guides under dist/migrations before saving the app. */
  migrationGuides: string[];
}

function versionParts(version: string): number[] {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version))
    throw new RangeError(`Expected a stable SDK version, got ${version}`);
  const parts = version.split('.').map(Number);
  if (!parts.every(Number.isSafeInteger))
    throw new RangeError(`Invalid SDK version: ${version}`);
  return parts;
}

function compareVersions(left: string, right: string): number {
  const leftParts = versionParts(left);
  const rightParts = versionParts(right);
  return (
    leftParts[0]! - rightParts[0]! ||
    leftParts[1]! - rightParts[1]! ||
    leftParts[2]! - rightParts[2]!
  );
}

/** Apply available codemods in release order and list guides for the requested upgrade. */
export function upgradeDataApp({
  source,
  fromVersion,
  toVersion = DATA_APP_SDK_VERSION,
}: DataAppUpgradeOptions): DataAppUpgradeResult {
  if (
    compareVersions(fromVersion, oldestSupportedVersion) < 0 ||
    compareVersions(toVersion, DATA_APP_SDK_VERSION) > 0 ||
    compareVersions(fromVersion, toVersion) > 0
  )
    throw new RangeError(
      `Unsupported SDK upgrade: ${fromVersion} to ${toVersion}`
    );

  const migrationGuides = DATA_APP_MIGRATION_VERSIONS.filter(
    version =>
      compareVersions(version, fromVersion) > 0 &&
      compareVersions(version, toVersion) <= 0
  );
  const appliedCodemods: string[] = [];
  for (const version of migrationGuides) {
    const migrate = codemods[version];
    if (!migrate) continue;
    const updated = migrate(source);
    if (updated !== source) appliedCodemods.push(version);
    source = updated;
  }
  return { source, appliedCodemods, migrationGuides };
}
