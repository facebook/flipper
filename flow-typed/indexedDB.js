declare class DOMStringList {
  +[key: number]: string;
  +length: number;
  item: number => string | null;
  contains: string => boolean;
}

declare interface IDBDatabase extends EventTarget {
  close(): void;
  createObjectStore(
    name: string,
    options?: {
      keyPath?: ?(string | string[]),
      autoIncrement?: boolean,
      ...
    },
  ): IDBObjectStore;
  deleteObjectStore(name: string): void;
  transaction(
    storeNames: string | string[],
    mode?: 'readonly' | 'readwrite' | 'versionchange',
  ): IDBTransaction;
  name: string;
  version: number;
  objectStoreNames: string[];
  objectStoreNames: DOMStringList;
  onabort: (e: any) => mixed;
  onclose: (e: any) => mixed;
  onerror: (e: any) => mixed;
  onversionchange: (e: any) => mixed;
}
