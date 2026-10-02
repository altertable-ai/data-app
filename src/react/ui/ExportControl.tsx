import { useState } from 'react';
import {
  exportCsv,
  type CsvExport,
  type CsvTable,
} from '@/src/react/ui/csv-export';
import { IconButton } from '@/src/react/ui/IconButton';
import { Menu, MenuItem } from 'react-aria-components';
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import { Toast } from '@/src/react/ui/Toast';

export function ExportControl({ csv }: { csv: CsvExport }) {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-end',
    strategy: 'fixed',
    middleware: [offset(8), flip(), shift({ padding: 12, crossAxis: true })],
    whileElementsMounted: (reference, floating, update) =>
      autoUpdate(reference, floating, update, { elementResize: false }),
  });
  const { getFloatingProps } = useInteractions([useDismiss(context)]);
  const [status, setStatus] = useState<'idle' | 'pending' | 'error'>('idle');

  const [retryTableName, setRetryTableName] = useState<string>();
  async function download(table?: CsvTable) {
    setOpen(false);
    setRetryTableName(table?.name);
    setStatus('pending');
    try {
      await exportCsv(csv, table);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  return (
    <>
      {status === 'error' && (
        <Toast
          state="error"
          position="top"
          onRetry={() =>
            void download(
              csv.tables.find(table => table.name === retryTableName)
            )
          }
        >
          Couldn’t export data.
        </Toast>
      )}
      {csv.tables.length === 1 ? (
        <IconButton
          icon="export"
          variant="elevated"
          label="Export CSV"
          disabled={status === 'pending'}
          aria-busy={status === 'pending'}
          onClick={() => void download()}
        />
      ) : (
        <>
          <IconButton
            ref={element => refs.setReference(element)}
            variant="elevated"
            icon="export"
            label="Export"
            disabled={status === 'pending'}
            aria-busy={status === 'pending'}
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={() => setOpen(value => !value)}
            onKeyDown={event => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setOpen(true);
              }
            }}
          />
          {open && (
            <FloatingPortal>
              <FloatingFocusManager context={context}>
                <div
                  {...getFloatingProps()}
                  ref={element => refs.setFloating(element)}
                  style={floatingStyles}
                  className="altertable-export-popover"
                >
                  <Menu aria-label="Export data" onClose={() => setOpen(false)}>
                    {csv.tables.map((table, index) => (
                      <MenuItem
                        key={index}
                        id={index}
                        onAction={() => void download(table)}
                      >
                        Export {table.name} (CSV)
                      </MenuItem>
                    ))}
                    <MenuItem id="all" onAction={() => void download()}>
                      Export all (ZIP)
                    </MenuItem>
                  </Menu>
                </div>
              </FloatingFocusManager>
            </FloatingPortal>
          )}
        </>
      )}
    </>
  );
}
