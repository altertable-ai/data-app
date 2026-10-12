import type { ComponentPropsWithRef, ElementType, ReactNode } from 'react';
import { classNames } from '@/src/react/ui/classNames';

export type SectionHeadingProps = {
  children: ReactNode;
  /** Document outline level. Defaults to the section level below the page title. */
  level?: 2 | 3 | 4 | 5 | 6;
} & Omit<ComponentPropsWithRef<'h2'>, 'children'>;

/** A section title with the shared section-heading appearance. */
export function SectionHeading({
  children,
  level = 2,
  className,
  ...props
}: SectionHeadingProps) {
  const Heading = `h${level}` as ElementType;
  return (
    <Heading
      {...props}
      className={classNames('altertable-section-heading', className)}
    >
      {children}
    </Heading>
  );
}
