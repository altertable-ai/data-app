import {
  DataAppFrame,
  type StaticDataAppProps,
} from '@/src/react/ui/DataAppFrame';

export type DataAppProps = StaticDataAppProps;

/** Setup and static screens; fetched data uses the declared-view DataApp. */
export function DataApp(props: DataAppProps) {
  return <DataAppFrame {...props} />;
}
