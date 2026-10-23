import { type ComponentPropsWithRef } from 'react';

import { classNames } from './classNames.ts';

export type ShimmerTextProps = Omit<
  ComponentPropsWithRef<'span'>,
  'children'
> & {
  children: string;
};

/** Animated text for custom activity labels. Wrap in `<output>` to announce updates.
 * Respects reduced motion. */
export function ShimmerText({
  children,
  className,
  ...props
}: ShimmerTextProps) {
  return (
    <span
      {...props}
      className={classNames('altertable-shimmer-text', className)}
    >
      <span className="altertable-shimmer-text-base">{children}</span>
      <span className="altertable-shimmer-text-sweep" aria-hidden="true">
        <span data-text={children} />
      </span>
    </span>
  );
}
