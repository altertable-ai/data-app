import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { DataReading } from '@/src/core/reading';

export type DataValueProps<Value> = {
  reading: DataReading<Value>;
  fallback: ReactNode;
  children: (value: Value) => ReactNode;
} & Omit<ComponentPropsWithRef<'span'>, 'children'>;

/** Bind inline content to displayed data. Keep static wording outside this span. */
export function DataValue<Value>({
  reading,
  fallback,
  children,
  ...props
}: DataValueProps<Value>) {
  return (
    <span {...props} aria-busy={reading.loading || props['aria-busy']}>
      {reading.loading ? fallback : children(reading.value)}
    </span>
  );
}
