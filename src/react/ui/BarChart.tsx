import { AppIcon } from '@/src/react/ui/icons';
import { formatNumber } from '@/src/core/format';
import { chartBarFill } from '@/src/react/ui/chartColor';
import { Tooltip } from '@/src/react/ui/Tooltip';
import { useChartScrollToEnd } from '@/src/react/ui/use-chart-scroll-to-end';
import {
  openExplorationMenu,
  useChartActions,
  explorationMenuEvents,
  ExplorationActionMenu,
  getPrimaryExplorationAction,
} from '@/src/react/ui/ExplorationActionControl';
import { MenuButton, MenuTrigger } from '@/src/react/ui/Menu';
import {
  Fragment,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentRef,
  type RefObject,
} from 'react';

import {
  validateValueChartItems,
  type ChartItem,
  type ValueChartProps,
} from '@/src/react/ui/chart-data';

import { BarChart as RechartsBarChart, Cell } from 'recharts';
import {
  ChartBar,
  ChartXAxis,
  ChartYAxis,
} from '@/src/react/ui/chart-primitives';

export type BarChartItem = ChartItem;

export type BarChartProps<Row extends BarChartItem = BarChartItem> =
  ValueChartProps<Row>;

/** Nonnegative category values. Compose inside VisualizationWidget for a titled panel.
 * Owns hover/touch tooltips; no selection state or keyboard navigation. */
export function BarChart<Row extends BarChartItem>({
  items,
  unit,
  ariaLabel,
  formatValue = formatNumber,
  itemActions,
}: BarChartProps<Row>) {
  validateValueChartItems('bar', items);
  const chartActions = useChartActions();
  const [activeId, setActiveId] = useState<string>();
  const scrollport = useChartScrollToEnd(items);
  const menuTriggers = useRef(new Map<string, ComponentRef<'button'>>());

  const maximum = items.reduce((max, item) => Math.max(max, item.value), 1);

  return (
    <section className="altertable-selectable-bars" aria-label={ariaLabel}>
      {items.length === 0 && <span>No data</span>}
      <div className="altertable-selectable-bars-scroll" ref={scrollport}>
        <div
          className="altertable-selectable-bars-plot"
          style={{ minWidth: items.length * 45 }}
        >
          <div className="altertable-chart-canvas" aria-hidden="true">
            <RechartsBarChart
              data={items.map(item => ({
                ...item,
                plotValue: item.value / maximum,
              }))}
              responsive
              width="100%"
              height={220}
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              accessibilityLayer={false}
              tabIndex={-1}
              barCategoryGap="24%"
            >
              <ChartXAxis hide dataKey="id" scale="band" />
              <ChartYAxis hide domain={[0, 1]} allowDataOverflow />
              <ChartBar
                dataKey="plotValue"
                minPointSize={value => ((value ?? 0) > 0 ? 7 : 0)}
              >
                {items.map(item => (
                  <Cell
                    key={item.id}
                    fill={chartBarFill}
                    opacity={activeId === item.id ? 0.75 : 1}
                  />
                ))}
              </ChartBar>
            </RechartsBarChart>
          </div>
          <div className="altertable-selectable-bars-items">
            {items.map(item => {
              const actions = chartActions.actions(
                itemActions?.(item) ?? [],
                item.label,
                `${formatValue(item.value)} ${unit}`
              );
              const action = getPrimaryExplorationAction(actions);
              const menuTrigger: RefObject<ComponentRef<'button'> | null> = {
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
                        setActiveId(current =>
                          open
                            ? item.id
                            : current === item.id
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
                          className="altertable-selectable-bars-item"
                          aria-label={`${item.label}: ${formatValue(item.value)} ${unit}. ${action.label}`}
                          {...explorationMenuEvents(menuTrigger)}
                          onClick={event =>
                            action.onSelect(event.currentTarget)
                          }
                        >
                          <span className="altertable-selectable-bars-area" />
                        </button>
                      ) : actions.length ? (
                        <button
                          type="button"
                          data-atbl-focus="ring"
                          data-atbl-control="action"
                          className="altertable-selectable-bars-item"
                          aria-label={`${item.label}: ${formatValue(item.value)} ${unit}. Actions`}
                          {...explorationMenuEvents(menuTrigger)}
                          onClick={event =>
                            openExplorationMenu(menuTrigger, event)
                          }
                        >
                          <span className="altertable-selectable-bars-area" />
                        </button>
                      ) : (
                        <button
                          data-atbl-focus="ring"
                          data-atbl-control="default"
                          type="button"
                          tabIndex={-1}
                          className="altertable-selectable-bars-item"
                          aria-label={`${item.label}: ${formatValue(item.value)} ${unit}`}
                        >
                          <span className="altertable-selectable-bars-area" />
                        </button>
                      )}
                    </Tooltip>
                    <div className="altertable-chart-item-label-row">
                      {actions.length ? (
                        <MenuTrigger>
                          <MenuButton
                            className="altertable-selectable-bars-label"
                            variant="ghost"
                            size="compact"
                            {...explorationMenuEvents(menuTrigger)}
                            ref={element => {
                              if (element)
                                menuTriggers.current.set(item.id, element);
                              else menuTriggers.current.delete(item.id);
                            }}
                            aria-label={`${item.label}: Actions`}
                          >
                            {item.label}
                            <AppIcon name="disclosure" size={12} />
                          </MenuButton>
                          <ExplorationActionMenu
                            actions={actions}
                            ariaLabel={item.label}
                            triggerRef={menuTrigger}
                            placement="bottom"
                          />
                        </MenuTrigger>
                      ) : (
                        <span className="altertable-selectable-bars-label">
                          {item.label}
                        </span>
                      )}
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
      {chartActions.feedback}
    </section>
  );
}
