import { type DataReading } from '@altertable/data-app/internal';
import { type ReactNode } from 'react';

import { ownedSource } from './source-owner.ts';
import { type DeclaredView } from './view-runtime.tsx';

export type DataContentState<Data, Input> = { scope: DataReading<string> } & (
  | { loading: true; data?: never; input?: never }
  | { loading: false; data: Data; input: Input }
);

/** Content receives only displayed data, its original input, and the derived scope. */
export function defineDataContent<Data, Input>(
  render: (state: DataContentState<Data, Input>) => ReactNode,
  options: {
    describeInput?: (input: Input) => string;
  } = {}
) {
  return {
    loadingFallback: render({
      loading: true,
      scope: { loading: true },
    }),
    children(this: void, data: Data, input: Input) {
      return render({
        loading: false,
        data,
        input,
        scope: {
          loading: false,
          value: options.describeInput?.(input) ?? 'this view',
        },
      });
    },
  };
}

/** A section's request owner and render layout are declared together. */
export class ViewContent<Data, Input> {
  #view: DeclaredView<Data, Input>;
  #layout: ReturnType<typeof defineDataContent<Data, Input>>;
  constructor(
    view: DeclaredView<Data, Input>,
    render: (source: DataContentState<Data, Input>) => ReactNode,
    describeInput: (input: Input) => string
  ) {
    this.#view = view;
    this.#layout = defineDataContent(
      source => render(ownedSource(view, source)),
      { describeInput }
    );
  }
  static section<Data, Input>(content: ViewContent<Data, Input>) {
    return { view: content.#view, ...content.#layout };
  }
}
export function sectionContent<Data, Input>(content: ViewContent<Data, Input>) {
  return ViewContent.section(content);
}
