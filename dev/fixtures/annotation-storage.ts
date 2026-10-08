import {
  parseDataAppAnnotationDraft,
  type DataAppAnnotationDraft,
} from '@/src/core/annotations';

export type AnnotationDraftSnapshot = {
  sourceVersion: string;
  drafts: DataAppAnnotationDraft[];
};

async function openAnnotationDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('altertable-annotations', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Scope keys by account and app. Image bytes remain local until explicit submission. */
export async function loadAnnotationDrafts(
  key: string
): Promise<AnnotationDraftSnapshot | undefined> {
  const database = await openAnnotationDatabase();
  try {
    const value = await new Promise<unknown>((resolve, reject) => {
      const request = database
        .transaction('drafts')
        .objectStore('drafts')
        .get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (value === undefined) return undefined;
    if (
      !value ||
      typeof value !== 'object' ||
      !('sourceVersion' in value) ||
      typeof value.sourceVersion !== 'string' ||
      !('drafts' in value) ||
      !Array.isArray(value.drafts) ||
      value.drafts.length > 20
    )
      throw new Error('Invalid stored annotations.');
    return {
      sourceVersion: value.sourceVersion,
      drafts: value.drafts.map(parseDataAppAnnotationDraft),
    };
  } finally {
    database.close();
  }
}

/** Resolve only after the transaction commits; hosts may report storage failure independently. */
export async function saveAnnotationDrafts(
  key: string,
  snapshot: AnnotationDraftSnapshot
): Promise<void> {
  const database = await openAnnotationDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('drafts', 'readwrite');
      const store = transaction.objectStore('drafts');
      if (snapshot.drafts.length) store.put(snapshot, key);
      else store.delete(key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}
