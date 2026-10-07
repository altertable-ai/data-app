import type { ReactNode } from 'react';
import type { DataAppConfig } from '@/src/core/config';
import type { DisclosedQuery } from '@/src/core/contract';
import type { DataContext } from '@/src/react/ui/data-context';
import type { CsvExport } from '@/src/react/ui/csv-export';
import { DataAppFrame } from '@/src/react/ui/DataAppFrame';

export type DataAppProps = {
  config: DataAppConfig;
  dataContext: DataContext;
  children: ReactNode;
  description?: ReactNode;
  toolbarActions?: ReactNode;
  footerActions?: ReactNode;
  csvExport?: CsvExport;
  queries?: DisclosedQuery[];
};

/** Setup and static screens; fetched data uses the declared-view DataApp. */
export function DataApp(props: DataAppProps) {
  return <DataAppFrame {...props} />;
}
