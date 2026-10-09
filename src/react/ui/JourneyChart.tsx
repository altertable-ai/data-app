import { useLayoutEffect, useRef, useState } from 'react';
import { invariant } from '@/src/core/invariant';
import { Button } from '@/src/react/ui/Button';
import { classNames } from '@/src/react/ui/classNames';
import type { PopulationChartProps } from '@/src/react/ui/chart-data';
import { formatNumber, formatPercent } from '@/src/core/format';
import {
  buildJourneyFlow,
  limitJourneyFlow,
  type JourneyChartPath,
  type JourneyNode,
} from '@/src/react/ui/journey-flow';

export type { JourneyChartPath } from '@/src/react/ui/journey-flow';
export type JourneyChartProps = PopulationChartProps & {
  /** Full paths and their population counts. Branches and outcomes are derived internally. */
  paths: readonly JourneyChartPath[];
};

/** Path exploration with two initial steps, expandable prefixes, and three events per depth.
 * Counts and flows use the Step 1 population. Compose inside VisualizationWidget. */
export function JourneyChart({
  paths,
  unit,
  ariaLabel,
  className,
  formatValue = formatNumber,
}: JourneyChartProps) {
  const ids = new Set<string>();
  let total = 0;
  for (const path of paths) {
    invariant(
      path.id.trim().length > 0 && !ids.has(path.id),
      'journey path chart IDs must be nonblank and unique.'
    );
    ids.add(path.id);
    invariant(
      Number.isFinite(path.count) && path.count >= 0,
      'journey chart counts must be finite and nonnegative.'
    );
    total += path.count;
    invariant(
      path.steps.length > 0 &&
        path.steps.every(step => step.event.trim().length > 0),
      'journey chart paths require nonblank events.'
    );
  }
  invariant(
    Number.isFinite(total),
    'journey chart total count must be finite.'
  );
  // A changed displayed result starts a new exploration, including in inspection views.
  return (
    <section
      className={classNames('altertable-journey-chart', className)}
      aria-label={ariaLabel}
    >
      {paths.length === 0 ? (
        <span>No data</span>
      ) : (
        <JourneyFlow
          key={JSON.stringify(paths)}
          paths={paths}
          unit={unit}
          formatValue={formatValue}
        />
      )}
    </section>
  );
}

function JourneyFlow({
  paths,
  unit,
  formatValue,
}: Pick<JourneyChartProps, 'paths' | 'unit'> & {
  formatValue: (value: number) => string;
}) {
  const [expandedBranch, setExpandedBranch] = useState<string[]>([]);
  const [visibleEventsByDepth, setVisibleEventsByDepth] = useState<
    Record<number, number>
  >({});
  const graph = limitJourneyFlow(
    buildJourneyFlow(paths, expandedBranch),
    visibleEventsByDepth
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingDepth = useRef<number | null>(null);
  const depthCount = Math.max(0, ...graph.nodes.map(node => node.depth)) + 1;
  const startingCount = graph.nodes
    .filter(node => node.depth === 0)
    .reduce((sum, node) => sum + node.count, 0);
  function percent(count: number) {
    return formatPercent(startingCount > 0 ? count / startingCount : null);
  }
  const nodeWidth = 176;
  const nodeHeight = 96;
  const barWidth = 16;
  const rowSpacing = nodeHeight + 80;
  const columnSpacing = nodeWidth + 112;
  const width = 34 + nodeWidth + (depthCount - 1) * columnSpacing;
  function columnX(depth: number) {
    return 10 + depth * columnSpacing;
  }
  useLayoutEffect(() => {
    const depth = pendingDepth.current;
    const container = scrollRef.current;
    if (depth === null || !container || depth >= depthCount) return;
    pendingDepth.current = null;
    const left = columnX(depth);
    const right = left + nodeWidth + 24;
    const nextLeft =
      left < container.scrollLeft
        ? left - 24
        : right > container.scrollLeft + container.clientWidth
          ? right - container.clientWidth
          : container.scrollLeft;
    if (nextLeft !== container.scrollLeft)
      container.scrollTo({
        left: Math.max(0, nextLeft),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
  });
  const columns = Array.from({ length: depthCount }, (_, depth) =>
    graph.nodes
      .filter(node => node.depth === depth)
      .sort((a, b) => {
        function rank(node: JourneyNode) {
          return node.outcome === 'event'
            ? 0
            : node.outcome === 'other'
              ? 1
              : 2;
        }
        return (
          rank(a) - rank(b) || b.count - a.count || a.key.localeCompare(b.key)
        );
      })
  );
  const positions = new Map<
    string,
    { node: JourneyNode; x: number; y: number }
  >();
  columns.forEach((column, depth) => {
    const parent = columns[depth - 1]?.find(node => node.expanded);
    const parentY = parent ? positions.get(parent.key)?.y : undefined;
    const top = Math.max(
      104,
      (parentY ?? 104) - (column.length > 1 ? rowSpacing : 0)
    );
    column.forEach((node, index) =>
      positions.set(node.key, {
        node,
        x: columnX(depth),
        y: top + index * rowSpacing,
      })
    );
  });
  const height = Math.max(
    280,
    ...[...positions.values()].map(position => position.y + nodeHeight + 40)
  );
  const outgoingOffsets = new Map<string, number>();
  const incomingOffsets = new Map<string, number>();
  const orderedLinks = [...graph.links].sort(
    (a, b) =>
      (positions.get(a.source)?.y ?? 0) - (positions.get(b.source)?.y ?? 0) ||
      (positions.get(a.target)?.y ?? 0) - (positions.get(b.target)?.y ?? 0)
  );
  const links = orderedLinks.flatMap(link => {
    const source = positions.get(link.source);
    const target = positions.get(link.target);
    if (!source || !target || link.count <= 0 || startingCount <= 0) return [];
    const x0 = source.x + barWidth;
    const x1 = target.x;
    const mid = (x0 + x1) / 2;
    const sourceTop = source.y + (outgoingOffsets.get(link.source) ?? 0);
    const targetTop = target.y + (incomingOffsets.get(link.target) ?? 0);
    const thickness = (link.count / startingCount) * nodeHeight;
    outgoingOffsets.set(
      link.source,
      (outgoingOffsets.get(link.source) ?? 0) + thickness
    );
    incomingOffsets.set(
      link.target,
      (incomingOffsets.get(link.target) ?? 0) + thickness
    );
    return [
      {
        muted: target.node.outcome === 'end' || target.node.outcome === 'other',
        d: `M${x0},${sourceTop} C${mid},${sourceTop} ${mid},${targetTop} ${x1},${targetTop} L${x1},${targetTop + thickness} C${mid},${targetTop + thickness} ${mid},${sourceTop + thickness} ${x0},${sourceTop + thickness} Z`,
      },
    ];
  });
  return (
    <div ref={scrollRef} className="altertable-journey-scroll">
      <div
        className="altertable-journey-plot"
        style={{ minWidth: width, minHeight: height }}
      >
        <svg width="100%" height="100%" aria-hidden="true" focusable="false">
          <path
            d={links
              .filter(link => !link.muted)
              .map(link => link.d)
              .join(' ')}
            fill="color-mix(in srgb, var(--atbl-chart-5) 22%, var(--atbl-surface))"
          />
          <path
            d={links
              .filter(link => link.muted)
              .map(link => link.d)
              .join(' ')}
            fill="color-mix(in srgb, var(--atbl-muted) 22%, var(--atbl-surface))"
          />
        </svg>
        {columns.map((column, depth) => (
          <span
            key={depth}
            className="altertable-journey-stage"
            style={{ left: columnX(depth) }}
          >
            {column.length > 0 &&
            column.every(
              node => node.outcome !== 'event' && node.outcome !== 'other'
            )
              ? 'Outcome'
              : `Step ${depth + 1}`}
          </span>
        ))}
        {[...positions.values()].map(({ node, x, y }) => (
          <div
            key={node.key}
            className="altertable-journey-node"
            style={{
              left: x,
              top: y,
              width: nodeWidth,
              height:
                startingCount > 0
                  ? (node.count / startingCount) * nodeHeight
                  : 0,
            }}
          >
            <div
              className="altertable-journey-bar"
              data-event={node.outcome === 'event' || undefined}
              aria-hidden="true"
              style={{ width: barWidth }}
            />
            <section
              aria-label={`${node.label}, step ${node.depth + 1}, ${formatValue(node.count)} ${unit}`}
              className="altertable-journey-label"
            >
              <span className="altertable-journey-name" title={node.label}>
                {node.label}
              </span>
              <span>
                {formatValue(node.count)} {unit} · {percent(node.count)}
              </span>
              {node.hiddenBranchCount ? (
                <span>
                  {node.hiddenBranchCount} hidden{' '}
                  {node.hiddenBranchCount === 1 ? 'event' : 'events'}
                </span>
              ) : null}
            </section>
            {node.expandable && (
              <Button
                variant="outline"
                size="icon-compact"
                className="altertable-journey-expand"
                aria-label={`${node.expanded ? 'Less' : 'More'} after ${node.label}, step ${node.depth + 1}`}
                aria-expanded={Boolean(node.expanded)}
                onClick={() => {
                  pendingDepth.current = node.expanded ? null : node.depth + 1;
                  setVisibleEventsByDepth(limits =>
                    Object.fromEntries(
                      Object.entries(limits).filter(
                        ([depth]) => Number(depth) <= node.depth
                      )
                    )
                  );
                  setExpandedBranch(
                    node.expanded
                      ? (node.branchKeys ?? []).slice(0, -1)
                      : (node.branchKeys ?? [])
                  );
                }}
              >
                {node.expanded ? '−' : '›'}
              </Button>
            )}
            {node.outcome === 'other' && (
              <Button
                size="compact"
                variant="ghost"
                className="altertable-journey-more"
                aria-label={`Show more events at step ${node.depth + 1}`}
                onClick={() =>
                  setVisibleEventsByDepth(limits => ({
                    ...limits,
                    [node.depth]: (limits[node.depth] ?? 3) + 3,
                  }))
                }
              >
                Show more events
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
