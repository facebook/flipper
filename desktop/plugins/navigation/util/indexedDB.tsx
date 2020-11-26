/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Bookmark} from '../types';

const FLIPPER_NAVIGATION_PLUGIN_DB = 'flipper_navigation_plugin_db';
const FLIPPER_NAVIGATION_PLUGIN_DB_VERSION = 1;

const BOOKMARKS_KEY = 'bookmarks';

const createBookmarksObjectStore = (db: IDBDatabase) => {
  return new Promise<void>((resolve, reject) => {
    if (!db.objectStoreNames.contains(BOOKMARKS_KEY)) {
      const bookmarksObjectStore = db.createObjectStore(BOOKMARKS_KEY, {
        keyPath: 'uri',
      });
      bookmarksObjectStore.transaction.oncomplete = () => resolve();
      bookmarksObjectStore.transaction.onerror = () =>
        reject(bookmarksObjectStore.transaction.error);
    } else {
      resolve();
    }
  });
};

const initializeNavigationPluginDB = (db: IDBDatabase) => {
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
    openRequest.onerror = () => reject(openRequest.error);
    openRequest.onsuccess = () => resolve(openRequest.result);
  });
};

export const writeBookmarkToDB = (bookmark: Bookmark) => {
  return new Promise<void>((resolve, reject) => {
    openNavigationPluginDB()
      .then((db: IDBDatabase) => {
        const bookmarksObjectStore = db
          .transaction(BOOKMARKS_KEY, 'readwrite')
          .objectStore(BOOKMARKS_KEY);
        const request = bookmarksObjectStore.put(bookmark);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
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
        const request = bookmarksObjectStore.openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            const bookmark = cursor.value;
            bookmarks.set(bookmark.uri, bookmark);
            cursor.continue();
          } else {
            resolve(bookmarks);
          }
        };
        request.onerror = () => reject(request.error);
      })
      .catch(reject);
  });
};

export const removeBookmarkFromDB: (uri: string) => Promise<void> = (uri) => {
  return new Promise<void>((resolve, reject) => {
    openNavigationPluginDB()
      .then((db: IDBDatabase) => {
        const bookmarksObjectStore = db
          .transaction(BOOKMARKS_KEY, 'readwrite')
          .objectStore(BOOKMARKS_KEY);
        const request = bookmarksObjectStore.delete(uri);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
      .catch(reject);
  });
};
