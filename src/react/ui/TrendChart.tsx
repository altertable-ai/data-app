import { formatNumber } from '@/src/core/format';
import { Tooltip } from '@/src/react/ui/Tooltip';
import { useChartScrollToEnd } from '@/src/react/ui/use-chart-scroll-to-end';
import {
  ExplorationActionControl,
  useChartActions,
  explorationMenuEvents,
  ExplorationActionMenu,
  getPrimaryExplorationAction,
} from '@/src/react/ui/ExplorationActionControl';
import { MenuButton, MenuTrigger } from '@/src/react/ui/Menu';
import {
  Fragment,
  useRef,
  useState,
  type ComponentRef,
  type RefObject,
} from 'react';
import {
  AreaChart as RechartsAreaChart,
  LineChart as RechartsLineChart,
  ReferenceLine,
} from 'recharts';
import {
  ChartArea,
  ChartLine,
  ChartDot,
  ChartXAxis,
  ChartYAxis,
} from '@/src/react/ui/chart-primitives';
import type { ChartItem, ValueChartProps } from '@/src/react/ui/chart-data';
import { validateChartIds, valueChartProblem } from '@/src/react/ui/chart-data';
import { ChartDataProblem } from '@/src/react/ui/ChartDataProblem';

/** Ordered, equally spaced samples; negative values share an explicit zero baseline. */
export function TrendChart<Row extends ChartItem>({
  items,
  unit,
  ariaLabel,
  formatValue = formatNumber,
  kind,
  itemActions,
}: ValueChartProps<Row> & { kind: 'line' | 'area' }) {
  validateChartIds(kind, items);
  const problem = valueChartProblem(kind, items);
  const Plot = kind === 'area' ? RechartsAreaChart : RechartsLineChart;
  const chartActions = useChartActions();
  const [activeIndex, setActiveIndex] = useState<number>();
  const scrollport = useChartScrollToEnd(items);
  const menuTriggers = useRef(new Map<string, ComponentRef<'button'>>());
  if (problem)
    return (
      <section aria-label={ariaLabel}>
        <ChartDataProblem problem={problem} />
      </section>
    );
  const magnitude = items.reduce(
    (max, item) => Math.max(max, Math.abs(item.value)),
    1
  );
  const low = items.reduce(
    (min, item) => Math.min(min, item.value / magnitude),
    0
  );
  const high = items.reduce(
    (max, item) => Math.max(max, item.value / magnitude),
    0
  );
  return (
    <section className="altertable-trend-chart" aria-label={ariaLabel}>
      {items.length === 0 && <span>No data</span>}
      {items.length > 0 && (
        <>
          <div className="altertable-trend-scroll" ref={scrollport}>
            <div
              className="altertable-trend-plot"
              style={{ minWidth: items.length * 40 }}
            >
              <div className="altertable-chart-canvas" aria-hidden="true">
                <Plot
                  data={items.map(item => ({
                    ...item,
                    plotValue: item.value / magnitude,
                  }))}
                  responsive
                  width="100%"
                  height={220}
                  margin={{ top: 12, right: 0, bottom: 12, left: 0 }}
                  accessibilityLayer={false}
                  tabIndex={-1}
                >
                  <ChartXAxis hide dataKey="id" scale="band" />
                  <ChartYAxis
                    hide
                    domain={[low, high === low ? low + 1 : high]}
                  />
                  <ReferenceLine y={0} stroke="var(--atbl-border)" />
                  {kind === 'area' && (
                    <ChartArea
                      dataKey="plotValue"
                      stroke="none"
                      fill="var(--atbl-chart-1)"
                      dot={false}
                      activeDot={false}
                    />
                  )}
                  <ChartLine
                    dataKey="plotValue"
                    dot={({ cx, cy, index }) =>
                      index === activeIndex ? (
                        <ChartDot
                          cx={cx}
                          cy={cy}
                          active={index === activeIndex}
                        />
                      ) : (
                        <g />
                      )
                    }
                    activeDot={false}
                  />
                </Plot>
              </div>
              <div className="altertable-trend-points">
                {items.map((item, index) => {
                  const declaredActions = itemActions?.(item) ?? [];
                  const actions = chartActions.actions(
                    declaredActions,
                    item.label,
                    `${formatValue(item.value)} ${unit}`
                  );
                  const action = getPrimaryExplorationAction(actions);
                  const menuTrigger: RefObject<ComponentRef<'button'> | null> =
                    {
                      get current() {
                        return menuTriggers.current.get(item.id) ?? null;
                      },
                    };
                  return (
                    <Fragment key={item.id}>
                      <div className="altertable-chart-item-actions">
                        <Tooltip
                          variant="chart"
                          onOpenChange={open =>
                            setActiveIndex(current =>
                              open
                                ? index
                                : current === index
                                  ? undefined
                                  : current
                            )
                          }
                          content={
                            <>
                              <strong>{item.label}</strong>
                              <span>
                                {formatValue(item.value)} {unit}
                              </span>
                            </>
                          }
                          className="altertable-chart-column"
                        >
                          {action ? (
                            <button
                              data-atbl-focus="ring"
                              data-atbl-control="action"
                              type="button"
                              className="altertable-trend-point"
                              aria-label={`${item.label}: ${formatValue(item.value)} ${unit}. ${action.label}`}
                              {...explorationMenuEvents(menuTrigger)}
                              onClick={event =>
                                action.onSelect(event.currentTarget)
                              }
                            >
                              <span className="altertable-trend-hit" />
                              <span className="altertable-trend-label">
                                {item.label}
                              </span>
                            </button>
                          ) : actions.length > 1 ? (
                            <MenuTrigger>
                              <MenuButton
                                {...explorationMenuEvents(menuTrigger)}
                                ref={element => {
                                  if (element)
                                    menuTriggers.current.set(item.id, element);
                                  else menuTriggers.current.delete(item.id);
                                }}
                                className="altertable-trend-point"
                                aria-label={`${item.label}: ${formatValue(item.value)} ${unit}. Actions`}
                              >
                                <span className="altertable-trend-hit" />
                                <span className="altertable-trend-label">
                                  {item.label}
                                </span>
                              </MenuButton>
                              <ExplorationActionMenu
                                actions={actions}
                                ariaLabel={`${item.label} actions`}
                                triggerRef={menuTrigger}
                              />
                            </MenuTrigger>
                          ) : (
                            <button
                              data-atbl-focus="ring"
                              data-atbl-control="default"
                              type="button"
                              tabIndex={-1}
                              className="altertable-trend-point"
                              aria-label={`${item.label}: ${formatValue(item.value)} ${unit}`}
                            >
                              <span className="altertable-trend-hit" />
                              <span className="altertable-trend-label">
                                {item.label}
                              </span>
                            </button>
                          )}
                        </Tooltip>
                        {action && (
                          <ExplorationActionControl
                            contextOnly={declaredActions.length === 1}
                            indicator="chevron"
                            ref={element => {
                              if (element)
                                menuTriggers.current.set(item.id, element);
                              else menuTriggers.current.delete(item.id);
                            }}
                            actions={actions}
                            ariaLabel={`${item.label} actions`}
                            hidePrimary={Boolean(action)}
                          />
                        )}
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
      {chartActions.feedback}
    </section>
  );
}
