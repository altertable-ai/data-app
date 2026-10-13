import { useRef } from 'react';
import type { BreakdownPath, BreakdownVariable } from '@/src/core/breakdown';
import { Button } from '@/src/react/ui/Button';

/** Path navigation changes only exploration; ordinary date and scope filters survive. */
export function BreakdownBreadcrumbs({
  variable,
  id,
  value,
  onChange,
  local = false,
}: {
  variable: BreakdownVariable;
  id?: string;
  /** Widget context names the displayed grouping and keeps recovery beside the data. */
  local?: boolean;
  value: BreakdownPath;
  onChange: (path: BreakdownPath) => void;
}) {
  const navigation = useRef<HTMLElement>(null);
  function change(path: BreakdownPath) {
    onChange(path);
    navigation.current?.focus({ preventScroll: true });
  }
  const path = variable.parse(value);
  return (
    <nav
      ref={navigation}
      id={id}
      tabIndex={-1}
      className="altertable-breakdown-breadcrumbs"
      aria-label={`${variable.label} ${local ? 'breakdown' : 'exploration'}`}
      data-breakdown-navigation={local || undefined}
    >
      {local && <span>Breakdown: {variable.level(path).label}</span>}
      <ol>
        <li>
          {path.length ? (
            <Button variant="ghost" onClick={() => change([])}>
              {variable.rootLabel}
            </Button>
          ) : (
            <span aria-current="page">{variable.rootLabel}</span>
          )}
        </li>
        {path.map((member, index) => (
          <li key={`${member.level}:${member.id}`}>
            <span aria-hidden="true">›</span>
            {index === path.length - 1 ? (
              <span aria-current="page">{member.label}</span>
            ) : (
              <Button
                variant="ghost"
                onClick={() => change(path.slice(0, index + 1))}
              >
                {member.label}
              </Button>
            )}
          </li>
        ))}
      </ol>
      {path.length > 0 && (
        <Button variant="ghost" onClick={() => change(path.slice(0, -1))}>
          Up one level
        </Button>
      )}
    </nav>
  );
}
