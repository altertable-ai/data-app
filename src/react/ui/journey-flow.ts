/** Aggregated route; repeated events remain distinct by depth and prefix. */
export type JourneyChartPath = {
  /** Unique, nonblank path ID. */
  id: string;
  /** At least one nonblank event; null property means no property grouping. */
  steps: readonly { event: string; property: string | null }[];
  /** Finite, nonnegative population following this route. */
  count: number;
  /** True: converted; false: dropped off; null: no conversion classification. */
  converted: boolean | null;
  /** Stops at the last loaded event, without adding an outcome or expand control. */
  truncated: boolean;
};

export type JourneyNode = {
  key: string;
  label: string;
  depth: number;
  outcome: 'event' | 'converted' | 'drop-off' | 'truncated' | 'end' | 'other';
  count: number;
  pathKeys: string[];
  branchKeys?: string[];
  expandable?: boolean;
  expanded?: boolean;
  hiddenBranchCount?: number;
};

export function journeyNodes(
  path: JourneyChartPath
): Omit<JourneyNode, 'count' | 'pathKeys'>[] {
  const nodes: Omit<JourneyNode, 'count' | 'pathKeys'>[] = path.steps.map(
    (step, depth) => ({
      key: JSON.stringify([depth, 'event', step.event, step.property]),
      label:
        step.property === null
          ? step.event
          : `${step.event} · ${step.property}`,
      depth,
      outcome: 'event',
    })
  );
  const outcome = path.truncated
    ? 'truncated'
    : path.converted === false
      ? 'drop-off'
      : path.converted === true
        ? 'converted'
        : 'end';
  const label =
    outcome === 'truncated'
      ? 'More steps'
      : outcome === 'drop-off'
        ? 'Drop-off'
        : outcome === 'converted'
          ? 'Converted'
          : 'End of path';
  nodes.push({
    key: JSON.stringify([nodes.length, outcome]),
    label,
    depth: nodes.length,
    outcome,
  });
  return nodes;
}

export function buildJourneyFlow(
  paths: readonly JourneyChartPath[],
  expandedBranch?: string[]
) {
  const nodes = new Map<string, JourneyNode>();
  const links = new Map<
    string,
    {
      key: string;
      source: string;
      target: string;
      count: number;
      pathKeys: string[];
    }
  >();
  for (const path of paths) {
    const fullSequence = journeyNodes(path);
    if (path.truncated) fullSequence.pop();
    const sequence =
      expandedBranch === undefined
        ? fullSequence
        : fullSequence.flatMap((node, index) => {
            const branchKeys = fullSequence
              .slice(0, index + 1)
              .map(step => step.key);
            const parentExpanded =
              index <= 1 ||
              branchKeys
                .slice(0, index)
                .every((key, depth) => expandedBranch[depth] === key);
            if (!parentExpanded) return [];
            return [
              {
                ...node,
                key: JSON.stringify(branchKeys),
                branchKeys,
                expandable: index >= 1 && index < fullSequence.length - 1,
                expanded: branchKeys.every(
                  (key, depth) => expandedBranch[depth] === key
                ),
              },
            ];
          });
    sequence.forEach((node, index) => {
      const current = nodes.get(node.key) ?? {
        ...node,
        count: 0,
        pathKeys: [],
      };
      current.count += path.count;
      if ('expandable' in node && node.expandable) current.expandable = true;
      current.pathKeys.push(path.id);
      nodes.set(node.key, current);
      const previous = sequence[index - 1];
      if (!previous) return;
      const key = JSON.stringify([previous.key, node.key]);
      const link = links.get(key) ?? {
        key,
        source: previous.key,
        target: node.key,
        count: 0,
        pathKeys: [],
      };
      link.count += path.count;
      link.pathKeys.push(path.id);
      links.set(key, link);
    });
  }
  return { nodes: [...nodes.values()], links: [...links.values()] };
}

export function limitJourneyFlow(
  graph: ReturnType<typeof buildJourneyFlow>,
  visibleEventsByDepth: Record<number, number> = {}
) {
  const nodes: JourneyNode[] = [];
  const replacements = new Map<string, string>();
  for (const depth of new Set(graph.nodes.map(node => node.depth))) {
    const column = graph.nodes
      .filter(node => node.depth === depth)
      .sort(
        (a, b) =>
          Number(Boolean(b.expanded)) - Number(Boolean(a.expanded)) ||
          b.count - a.count ||
          a.key.localeCompare(b.key)
      );
    const events = column.filter(node => node.outcome === 'event');
    const outcomes = column.filter(node => node.outcome !== 'event');
    const limit = visibleEventsByDepth[depth] ?? 3;
    if (events.length <= limit) {
      nodes.push(...column);
      continue;
    }
    nodes.push(...events.slice(0, limit), ...outcomes);
    const hidden = events.slice(limit);
    const key = JSON.stringify(['other', depth]);
    hidden.forEach(node => replacements.set(node.key, key));
    nodes.push({
      key,
      label: 'More events',
      depth,
      outcome: 'other',
      hiddenBranchCount: hidden.length,
      count: hidden.reduce((sum, node) => sum + node.count, 0),
      pathKeys: [...new Set(hidden.flatMap(node => node.pathKeys))],
    });
  }
  const links = new Map<string, (typeof graph.links)[number]>();
  for (const link of graph.links) {
    const source = replacements.get(link.source) ?? link.source;
    const target = replacements.get(link.target) ?? link.target;
    const key = JSON.stringify([source, target]);
    const existing = links.get(key);
    if (existing) {
      existing.count += link.count;
      existing.pathKeys.push(...link.pathKeys);
    } else {
      links.set(key, {
        ...link,
        key,
        source,
        target,
        pathKeys: [...link.pathKeys],
      });
    }
  }
  return { nodes, links: [...links.values()] };
}
