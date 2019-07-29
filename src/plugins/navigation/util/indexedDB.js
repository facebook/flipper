/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow strict-local
 */

import type {Bookmark} from '../flow-types';

const FLIPPER_NAVIGATION_PLUGIN_DB = 'flipper_navigation_plugin_db';
const FLIPPER_NAVIGATION_PLUGIN_DB_VERSION = 1;

const BOOKMARKS_KEY = 'bookmarks';

const createBookmarksObjectStore: IDBDatabase => Promise<void> = (
  db: IDBDatabase,
) => {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(BOOKMARKS_KEY)) {
      const bookmarksObjectStore = db.createObjectStore(BOOKMARKS_KEY, {
        keyPath: 'uri',
      });
      bookmarksObjectStore.transaction.oncomplete = () => resolve();
      bookmarksObjectStore.transaction.onerror = event =>
        reject(event.target.error);
    } else {
      resolve();
    }
  });
};

const initializeNavigationPluginDB: IDBDatabase => Promise<Array<void>> = (
  db: IDBDatabase,
) => {
  return Promise.all([createBookmarksObjectStore(db)]);
};

const openNavigationPluginDB: () => Promise<IDBDatabase> = () => {
  return new Promise((resolve, reject) => {
    const openRequest = window.indexedDB.open(
      FLIPPER_NAVIGATION_PLUGIN_DB,
      FLIPPER_NAVIGATION_PLUGIN_DB_VERSION,
    );
    openRequest.onupgradeneeded = () => {
      const db = openRequest.result;
      initializeNavigationPluginDB(db).then(() => resolve(db));
    };
    openRequest.onerror = event => reject(event.target.error);
    openRequest.onsuccess = () => resolve(openRequest.result);
  });
};

export const writeBookmarkToDB: Bookmark => Promise<void> = (
  bookmark: Bookmark,
) => {
  return new Promise((resolve, reject) => {
    openNavigationPluginDB()
      .then((db: IDBDatabase) => {
        const bookmarksObjectStore = db
          .transaction(BOOKMARKS_KEY, 'readwrite')
          .objectStore(BOOKMARKS_KEY);
        const request = bookmarksObjectStore.put(bookmark);
        request.onsuccess = () => resolve();
        request.onerror = event => reject(event.target.error);
      })
      .catch(reject);
  });
};

export const readBookmarksFromDB: () => Promise<Map<string, Bookmark>> = () => {
  return new Promise((resolve, reject) => {
    const bookmarks = new Map();
    openNavigationPluginDB()
      .then((db: IDBDatabase) => {
        const bookmarksObjectStore = db
          .transaction(BOOKMARKS_KEY)
          .objectStore(BOOKMARKS_KEY);
        bookmarksObjectStore.openCursor().onsuccess = event => {
          const cursor = event.target.result;
          if (cursor) {
            const bookmark = cursor.value;
            bookmarks.set(bookmark.uri, bookmark);
            cursor.continue();
          } else {
            resolve(bookmarks);
          }
        };
        bookmarksObjectStore.openCursor().onerror = event =>
          reject(event.target.error);
      })
      .catch(reject);
  });
};

export const removeBookmark: (uri: string) => Promise<void> = uri => {
  return new Promise((resolve, reject) => {
    openNavigationPluginDB()
      .then((db: IDBDatabase) => {
        const bookmarksObjectStore = db
          .transaction(BOOKMARKS_KEY, 'readwrite')
          .objectStore(BOOKMARKS_KEY);
        const request = bookmarksObjectStore.delete(uri);
        request.onsuccess = resolve;
        request.onerror = event => reject(event.target.error);
      })
      .catch(reject);
  });
};
