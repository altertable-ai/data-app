import { DataAppFrame, type StaticDataAppProps } from './DataAppFrame.tsx';

export type DataAppProps = StaticDataAppProps;

/** Setup and static screens; fetched data uses the declared-view DataApp. */
export function DataApp({ csvExport, ...props }: DataAppProps) {
  return (
    <DataAppFrame
      {...props}
      csvExport={csvExport && { loading: false, value: csvExport }}
    />
  );
}
