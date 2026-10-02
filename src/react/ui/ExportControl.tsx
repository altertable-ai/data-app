import { useState } from 'react';
import { exportCsv, type CsvExport } from '@/src/react/ui/csv-export';
import { IconButton } from '@/src/react/ui/IconButton';

export function ExportControl({ csv }: { csv: CsvExport }) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'error'>('idle');

  async function download() {
    setStatus('pending');
    try {
      await exportCsv(csv);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  return (
    <>
      {status === 'error' && (
        <span role="alert">Couldn’t export CSV. Try again.</span>
      )}
      <IconButton
        icon="export"
        variant="elevated"
        label="Export CSV"
        disabled={status === 'pending'}
        aria-busy={status === 'pending'}
        onClick={() => void download()}
      />
    </>
  );
}
