import { useState } from 'react';

import { exportCsv, type CsvExport, type CsvTable } from './csv-export.ts';
import { IconButton } from './IconButton.tsx';
import { AppIcon } from './icons.ts';
import {
  MenuTrigger,
  MenuButton,
  MenuPopover,
  Menu,
  MenuItem,
} from './Menu.tsx';
import { Toast } from './Toast.tsx';
import { Tooltip } from './Tooltip.tsx';

/** Runs CSV downloads for a toolbar control or a host action; failures render a retryable toast. */
export function useCsvExport(csv: CsvExport | undefined) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'error'>('idle');
  const [retryTableName, setRetryTableName] = useState<string>();

  async function download(table?: CsvTable) {
    if (!csv?.tables.length || status === 'pending') return;
    setRetryTableName(table?.name);
    setStatus('pending');
    try {
      await exportCsv(csv, table);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  const errorToast =
    status === 'error' && csv ? (
      <Toast
        state="error"
        position="top"
        onRetry={() =>
          void download(csv.tables.find(table => table.name === retryTableName))
        }
      >
        Couldn’t export data.
      </Toast>
    ) : null;

  return { status, download, errorToast };
}

export function ExportControl({ csv }: { csv?: CsvExport }) {
  const [open, setOpen] = useState(false);
  const { status, download: runDownload, errorToast } = useCsvExport(csv);

  function download(table?: CsvTable) {
    setOpen(false);
    return runDownload(table);
  }

  if (!csv?.tables.length) {
    return (
      <IconButton
        icon="export"
        variant="elevated"
        label="Export CSV"
        tooltip="Export data…"
        disabled
      />
    );
  }

  return (
    <>
      {errorToast}
      {csv.tables.length === 1 ? (
        <IconButton
          icon="export"
          variant="elevated"
          label="Export CSV"
          tooltip="Export data…"
          disabled={status === 'pending'}
          aria-busy={status === 'pending'}
          onClick={() => void download()}
        />
      ) : (
        <MenuTrigger isOpen={open} onOpenChange={setOpen}>
          <Tooltip content="Export data…">
            <MenuButton
              variant="elevated"
              size="icon"
              aria-label="Export"
              isDisabled={status === 'pending'}
              aria-busy={status === 'pending'}
            >
              <AppIcon name="export" />
            </MenuButton>
          </Tooltip>
          <MenuPopover
            placement="bottom end"
            className="altertable-export-popover"
          >
            <Menu
              aria-label="Export data"
              onAction={key =>
                void download(
                  key === 'all' ? undefined : csv.tables[Number(key)]
                )
              }
            >
              {csv.tables.map((table, index) => (
                <MenuItem
                  key={index}
                  id={index}
                  textValue={`Export ${table.name} CSV`}
                  aria-label={`Export ${table.name} CSV`}
                >
                  <span>Export {table.name}</span>
                  <span className="altertable-export-format">CSV</span>
                </MenuItem>
              ))}
              <MenuItem
                id="all"
                textValue="Export all ZIP"
                aria-label="Export all ZIP"
                className="altertable-export-all"
              >
                <span>Export all</span>
                <span className="altertable-export-format">ZIP</span>
              </MenuItem>
            </Menu>
          </MenuPopover>
        </MenuTrigger>
      )}
    </>
  );
}
