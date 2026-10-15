import { useState } from 'react';
import {
  exportCsv,
  type CsvExport,
  type CsvTable,
} from '@/src/react/ui/csv-export';
import { IconButton } from '@/src/react/ui/IconButton';
import {
  MenuTrigger,
  MenuButton,
  MenuPopover,
  Menu,
  MenuItem,
} from '@/src/react/ui/Menu';
import { AppIcon } from '@/src/react/ui/icons';
import { Toast } from '@/src/react/ui/Toast';
import { Tooltip } from '@/src/react/ui/Tooltip';

export function ExportControl({ csv }: { csv?: CsvExport }) {
  const [menu, setMenu] = useState<CsvExport>();
  const [downloadState, setDownloadState] = useState<
    | { kind: 'idle' | 'pending' }
    | { kind: 'error'; csv: CsvExport; table?: CsvTable }
  >({ kind: 'idle' });
  const displayed = menu ?? csv;
  const pending = downloadState.kind === 'pending';

  async function download(payload: CsvExport, table?: CsvTable) {
    setMenu(undefined);
    setDownloadState({ kind: 'pending' });
    try {
      await exportCsv(payload, table);
      setDownloadState({ kind: 'idle' });
    } catch {
      setDownloadState({ kind: 'error', csv: payload, table });
    }
  }

  return (
    <>
      {downloadState.kind === 'error' && (
        <Toast
          state="error"
          position="top"
          onRetry={() => void download(downloadState.csv, downloadState.table)}
        >
          Couldn’t export data.
        </Toast>
      )}
      {!displayed ? (
        <IconButton
          icon="export"
          variant="elevated"
          label="Export CSV"
          tooltip="Export data…"
          disabled
        />
      ) : displayed.tables.length === 1 ? (
        <IconButton
          icon="export"
          variant="elevated"
          label="Export CSV"
          tooltip="Export data…"
          disabled={pending}
          aria-busy={pending}
          onClick={() => void download(displayed)}
        />
      ) : (
        <MenuTrigger
          isOpen={!!menu}
          onOpenChange={open => setMenu(open ? csv : undefined)}
        >
          <Tooltip content="Export data…">
            <MenuButton
              variant="elevated"
              size="icon"
              aria-label="Export"
              isDisabled={pending}
              aria-busy={pending}
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
                  displayed,
                  key === 'all' ? undefined : displayed.tables[Number(key)]
                )
              }
            >
              {displayed.tables.map((table, index) => (
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
