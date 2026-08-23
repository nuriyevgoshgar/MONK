"use client";

// A very small IndexedDB wrapper — enough to keep one object store of
// downloaded books without pulling in a library.
const DB_NAME = "monk";
const DB_VERSION = 1;
export const DOWNLOADS_STORE = "downloads";

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(DOWNLOADS_STORE)) {
        db.createObjectStore(DOWNLOADS_STORE, { keyPath: "bookId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();

  try {
    const transaction = db.transaction(DOWNLOADS_STORE, mode);
    const result = await promisify(run(transaction.objectStore(DOWNLOADS_STORE)));

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });

    return result;
  } finally {
    db.close();
  }
}

export const idbGet = <T>(key: string) =>
  withStore<T | undefined>("readonly", (store) => store.get(key));

export const idbGetAll = <T>() =>
  withStore<T[]>("readonly", (store) => store.getAll());

export const idbPut = <T>(value: T) =>
  withStore("readwrite", (store) => store.put(value as unknown as IDBValidKey));

export const idbDelete = (key: string) =>
  withStore("readwrite", (store) => store.delete(key));

export const idbClear = () =>
  withStore("readwrite", (store) => store.clear());
