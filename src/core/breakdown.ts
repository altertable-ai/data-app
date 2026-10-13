import { invariant } from '@/src/core/invariant';
import type { AppVariable } from '@/src/core/variables';

export type BreakdownLevel = { id: string; label: string };
export type BreakdownMember = {
  level: string;
  id: string | number;
  label: string;
};
export type BreakdownPath = readonly BreakdownMember[];
export type BreakdownVariable = AppVariable<BreakdownPath, 'breakdown'> & {
  levels: readonly BreakdownLevel[];
  rootLabel: string;
  parse: (value: unknown) => BreakdownPath;
  /** The next unselected level is the displayed grouping. */
  level: (path: BreakdownPath) => BreakdownLevel;
};

/** One exploration path; ordinary filters stay separate and grouping derives from depth. */
export function breakdownVariable({
  key,
  label,
  levels,
  rootLabel = `All ${levels[0]?.label.toLowerCase() ?? 'records'}`,
}: {
  key: string;
  label: string;
  levels: readonly BreakdownLevel[];
  rootLabel?: string;
}): BreakdownVariable {
  invariant(
    levels.length > 0 &&
      levels.every(level => !!level.id.trim() && !!level.label.trim()) &&
      new Set(levels.map(level => level.id)).size === levels.length,
    'Breakdown levels need unique IDs and nonempty labels.'
  );
  invariant(
    !!label.trim() && !!rootLabel.trim(),
    'Breakdowns need a label and root label.'
  );
  function parse(value: unknown): BreakdownPath {
    invariant(
      Array.isArray(value) && value.length < levels.length,
      'A breakdown path must leave a grouping level.'
    );
    const path = value.map((member, index) => {
      invariant(
        member && typeof member === 'object',
        'Expected a breakdown member.'
      );
      const { level, id, label } = member as BreakdownMember;
      invariant(
        level === levels[index]!.id,
        'Breakdown members must follow the declared level order.'
      );
      invariant(
        typeof id === 'string'
          ? !!id.trim() && id.length <= 256
          : typeof id === 'number' && Number.isFinite(id),
        'Breakdown members need a stable string or numeric ID.'
      );
      invariant(
        typeof label === 'string' && !!label.trim() && label.length <= 256,
        'Breakdown member labels must be nonempty and bounded.'
      );
      return { level, id, label };
    });
    invariant(
      JSON.stringify(path).length <= 8192,
      'Breakdown paths must fit in a shared URL.'
    );
    return path;
  }
  function same(left: BreakdownPath, right: BreakdownPath) {
    return (
      JSON.stringify(left.map(({ level, id }) => ({ level, id }))) ===
      JSON.stringify(right.map(({ level, id }) => ({ level, id })))
    );
  }
  return {
    kind: 'breakdown',
    label,
    levels,
    rootLabel,
    urlKeys: [key],
    defaultValue: [],
    history: 'push',
    parse,
    level(path) {
      return levels[parse(path).length]!;
    },
    describe: path =>
      path.length ? path.map(member => member.label).join(' → ') : rootLabel,
    read(params) {
      try {
        const value = params.get(key);
        return value ? parse(JSON.parse(value)) : [];
      } catch {
        return [];
      }
    },
    write(path) {
      const parsed = parse(path);
      return { [key]: parsed.length ? JSON.stringify(parsed) : null };
    },
    valid(value): value is BreakdownPath {
      try {
        parse(value);
        return true;
      } catch {
        return false;
      }
    },
    same,
  };
}

/** Reuse the declaration in the operation's input parser. Labels never supply query predicates. */
export function parseBreakdownPath(
  value: unknown,
  variable: BreakdownVariable
): BreakdownPath {
  return variable.parse(value);
}
