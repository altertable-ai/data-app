import { ownedSource } from '@/src/react/source-owner';
import type { DeclaredView, ViewResult } from '@/src/react/view-runtime';
import type { ViewSource } from '@/src/react/bindings';
import type { ReactNode } from 'react';
import type { DataReading } from '@/src/core/reading';
import { displayedSnapshot } from '@/src/core/data-view';
import type { EmptyContent } from '@/src/react/ui/presentation';

/** Every request state is explicit. Only displayed states contain data and its original input. */
export type DataContentState<Data, Input> = ViewSource<Data, Input> & {
  scope: DataReading<string>;
  refetch: () => unknown;
  cancel: () => unknown;
};

/** A section's request owner and render layout are declared together. */
export class ViewContent<Data, Input> {
  #view: DeclaredView<Data, Input>;
  #render: (source: DataContentState<Data, Input>) => ReactNode;
  constructor(
    view: DeclaredView<Data, Input>,
    render: (source: DataContentState<Data, Input>) => ReactNode
  ) {
    this.#view = view;
    this.#render = render;
  }
  static view<Data, Input>(content: ViewContent<Data, Input>) {
    return content.#view;
  }
  static render<Data, Input>(
    content: ViewContent<Data, Input>,
    result: ViewResult<Data, Input>,
    emptyFallback: EmptyContent = result.emptyFallback
  ) {
    const feedback = {
      scope: result.scope ?? { loading: true as const },
      refetch: result.refetch,
      cancel: result.cancel,
      revision: result.revision,
    };
    const view = result.view;
    const source: DataContentState<Data, Input> =
      view.kind === 'loading'
        ? { ...feedback, state: 'loading' }
        : view.kind === 'error'
          ? { ...feedback, state: 'error', error: view.error }
          : view.kind === 'empty'
            ? { ...feedback, state: 'empty', input: view.input, emptyFallback }
            : { ...feedback, ...displayedSnapshot(view)! };
    return content.#render(ownedSource(content.#view, source));
  }
}
