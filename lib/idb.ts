export function openDB(name: string, version: number, onUpgrade: (db: IDBDatabase) => void): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(name, version);
      req.onupgradeneeded = () => onUpgrade(req.result);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
    });
  }
  
  export function tx<T>(db: IDBDatabase, store: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore & { set: (v: T) => void }) => void) {
    return new Promise<T>((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store) as IDBObjectStore & { set: (v: T) => void };
      let result: T | undefined;
      s.set = (v: T) => { result = v; };
      t.oncomplete = () => resolve(result as T);
      t.onerror = () => reject(t.error);
      fn(s);
    });
  }
  