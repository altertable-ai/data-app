import { InspectionOwner } from '@/src/react/ui/InspectionProvider';
import { useContext, useRef, useState, useSyncExternalStore } from 'react';
import { invariant } from '@/src/core/invariant';
import type { ExplorationActions } from '@/src/react/actions';
import { useDetailOpener } from '@/src/react/details';
import { searchParams, subscribeSearch } from '@/src/react/ui/search';
import { AppIcon } from '@/src/react/ui/icons';
import { Button } from '@/src/react/ui/Button';
import {
  MenuTrigger,
  MenuButton,
  MenuPopover,
  Menu,
  MenuItem,
} from '@/src/react/ui/Menu';

export type BoundExplorationActions<Row> = {
  items: (row: Row) => readonly { id: string; label: string }[];
  primary: (row: Row) => { id: string; label: string } | undefined;
  run: (id: string, row: Row, trigger?: HTMLElement) => void;
};
function currentSearch() {
  return searchParams().toString();
}

export function useExplorationActions<Row, Input>(
  actions: ExplorationActions<Row, Input> | undefined,
  source: { loading: true } | { loading?: false; input: Input },
  binding: object
): BoundExplorationActions<Row> | undefined {
  const openDetail = useDetailOpener();
  const inspection = useContext(InspectionOwner);
  useSyncExternalStore(subscribeSearch, currentSearch, () => '');
  invariant(
    !actions || actions.binding === binding,
    'Exploration actions must belong to the widget metric or dataset.'
  );
  if (!actions || source.loading) return undefined;
  const input = source.input;
  function items(row: Row) {
    return actions!.entries
      .filter(entry => entry.effect.available(row, input))
      .map(entry => {
        const label = entry.effect.label(row, input);
        invariant(
          typeof label === 'string' && !!label.trim(),
          `Exploration action ${entry.id} needs a nonempty label.`
        );
        return { id: entry.id, label };
      });
  }
  return {
    items,
    primary(row) {
      const available = items(row);
      const primary = actions.primary
        ? available.find(item => item.id === actions.primary)
        : undefined;
      return primary ?? (available.length === 1 ? available[0] : undefined);
    },
    run(id, row, trigger) {
      const entry = actions.entries.find(entry => entry.id === id);
      invariant(entry, `Unknown exploration action: ${id}.`);
      if (!entry.effect.available(row, input)) return;
      const request = entry.effect.resolve(row, input);
      if (request.kind === 'detail') {
        invariant(openDetail, 'Detail actions require DataApp.');
        const inspected = inspection?.snapshot();
        const returnTrigger =
          trigger?.closest('dialog') && inspected?.open
            ? (inspected.inspection.trigger.current ?? trigger)
            : trigger;
        openDetail(request.detail, returnTrigger);
      } else {
        request.apply();
        if (request.navigation)
          requestAnimationFrame(() => {
            const navigation = document.getElementById(request.navigation!);
            const sheet = navigation?.closest('dialog');
            const chartHeading = document.querySelector<HTMLElement>(
              `[data-breakdown-target="${CSS.escape(request.navigation!)}"] header button`
            );
            const target = navigation?.checkVisibility()
              ? (navigation.querySelector<HTMLElement>('button') ?? navigation)
              : chartHeading?.checkVisibility()
                ? chartHeading
                : document.querySelector<HTMLElement>(
                    sheet?.id
                      ? `[data-view-filters-trigger][aria-controls="${CSS.escape(sheet.id)}"]`
                      : '[data-view-filters-trigger]'
                  );
            target?.focus({ preventScroll: true });
          });
      }
    },
  };
}

/** One action is direct; several actions use a named menu unless a primary is declared. */
export function ExplorationActionControl<Row>({
  actions,
  row,
  label,
}: {
  actions: BoundExplorationActions<Row>;
  row: Row;
  label?: string;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const items = actions.items(row);
  const primary = actions.primary(row);
  if (!items.length) return null;
  const menuLabel = label ? `${label} actions` : 'Explore actions';
  const menu = items.length > 1 && (
    <MenuTrigger isOpen={open} onOpenChange={setOpen}>
      <MenuButton ref={trigger} aria-label={menuLabel}>
        Explore
        <AppIcon name="disclosure" size={14} />
      </MenuButton>
      <MenuPopover>
        <Menu
          aria-label={menuLabel}
          onAction={id => {
            setOpen(false);
            actions.run(String(id), row, trigger.current ?? undefined);
          }}
        >
          {items.map(item => (
            <MenuItem key={item.id} id={item.id}>
              {item.label}
            </MenuItem>
          ))}
        </Menu>
      </MenuPopover>
    </MenuTrigger>
  );
  return (
    <>
      {primary && (
        <Button
          aria-label={label ? `${primary.label}: ${label}` : primary.label}
          onClick={event => actions.run(primary.id, row, event.currentTarget)}
        >
          {primary.label}
        </Button>
      )}
      {menu}
    </>
  );
}
