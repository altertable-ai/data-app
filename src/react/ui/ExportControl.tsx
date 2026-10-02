import { useState } from 'react';
import {
  exportCsv,
  type CsvExport,
  type CsvTable,
} from '@/src/react/ui/csv-export';
import { IconButton } from '@/src/react/ui/IconButton';
import { Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';
import { PressButton } from '@/src/react/ui/Button';
import { AppIcon } from '@/src/react/ui/icons';
import { Toast } from '@/src/react/ui/Toast';

export function ExportControl({ csv }: { csv: CsvExport }) {
  const [open, setOpen] = useState(false);
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
        <MenuTrigger isOpen={open} onOpenChange={setOpen}>
          <PressButton
            variant="elevated"
            size="icon"
            aria-label="Export"
            isDisabled={status === 'pending'}
            aria-busy={status === 'pending'}
          >
            <AppIcon name="export" />
          </PressButton>
          <Popover placement="bottom end" className="altertable-export-popover">
            <Menu aria-label="Export data">
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
          </Popover>
        </MenuTrigger>
      )}
    </>
  );
}
