import {
  annotationDraftRoute,
  annotationUpdateRoute,
  annotationModeRoute,
  annotationEditorStateRoute,
  type DataAppAnnotationDraft,
} from '@/src/core/annotations';
import type { MessageTransport } from '@/src/core/messages';
import { createMessageClient } from '@/src/client/messages';

/** Deliver annotations to the authenticated host. Acknowledgement means retained, not sent to an agent. */
export function createAnnotationClient(transport: MessageTransport) {
  const client = createMessageClient(
    {
      'annotation:draft': annotationDraftRoute,
      'annotation:update': annotationUpdateRoute,
      'annotation:mode': annotationModeRoute,
      'annotation:editor': annotationEditorStateRoute,
    },
    transport
  );
  return {
    setEditorState(hasUnsavedChanges: boolean) {
      return client.request('annotation:editor', { hasUnsavedChanges });
    },
    addAnnotation(
      draft: DataAppAnnotationDraft,
      options?: { signal?: AbortSignal }
    ) {
      return client.request('annotation:draft', draft, options);
    },
    updateAnnotation(
      id: string,
      comment: string,
      options?: { signal?: AbortSignal }
    ) {
      return client.request('annotation:update', { id, comment }, options);
    },
    setMode(active: boolean, options?: { signal?: AbortSignal }) {
      return client.request('annotation:mode', { active }, options);
    },
  };
}
