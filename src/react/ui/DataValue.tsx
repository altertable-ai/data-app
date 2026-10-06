import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { DataReading } from '@/src/core/reading';

export type DataValueProps<Value> = {
  reading: DataReading<Value>;
  loadingFallback: ReactNode;
  children: (value: Value) => ReactNode;
} & Omit<ComponentPropsWithRef<'span'>, 'children'>;

/** Bind inline content to displayed data. Keep static wording outside this span. */
export function DataValue<Value>({
  reading,
  loadingFallback,
  children,
  ...props
}: DataValueProps<Value>) {
  return (
    <span {...props} aria-busy={reading.loading || props['aria-busy']}>
      {reading.loading ? loadingFallback : children(reading.value)}
    </span>
  );
}
