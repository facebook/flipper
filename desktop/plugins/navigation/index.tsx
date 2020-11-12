/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import {bufferToBlob} from 'flipper';
import {
  BookmarksSidebar,
  SaveBookmarkDialog,
  SearchBar,
  Timeline,
  RequiredParametersDialog,
} from './components';
import {
  removeBookmarkFromDB,
  readBookmarksFromDB,
  writeBookmarkToDB,
} from './util/indexedDB';
import {
  appMatchPatternsToAutoCompleteProvider,
  bookmarksToAutoCompleteProvider,
} from './util/autoCompleteProvider';
import {getAppMatchPatterns} from './util/appMatchPatterns';
import {getRequiredParameters, filterOptionalParameters} from './util/uri';
import {
  Bookmark,
  NavigationEvent,
  AppMatchPattern,
  URI,
  RawNavigationEvent,
} from './types';
import React, {useMemo} from 'react';
import {
  PluginClient,
  createState,
  useValue,
  usePlugin,
  Layout,
  renderReactRoot,
} from 'flipper-plugin';

export type State = {
  shouldShowSaveBookmarkDialog: boolean;
  shouldShowURIErrorDialog: boolean;
  saveBookmarkURI: URI | null;
  requiredParameters: Array<string>;
};

type Events = {
  nav_event: RawNavigationEvent;
};

type Methods = {
  navigate_to(params: {url: string}): Promise<void>;
};

export type NavigationPlugin = ReturnType<typeof plugin>;

export function plugin(client: PluginClient<Events, Methods>) {
  const bookmarks = createState(new Map<URI, Bookmark>(), {
    persist: 'bookmarks',
  });
  const navigationEvents = createState<NavigationEvent[]>([], {
    persist: 'navigationEvents',
  });
  const appMatchPatterns = createState<AppMatchPattern[]>([], {
    persist: 'appMatchPatterns',
  });
  const currentURI = createState('');
  const shouldShowSaveBookmarkDialog = createState(false);
  const saveBookmarkURI = createState<null | string>(null);

  client.onMessage('nav_event', async (payload) => {
    const navigationEvent: NavigationEvent = {
      uri: payload.uri === undefined ? null : decodeURIComponent(payload.uri),
      date: payload.date ? new Date(payload.date) : new Date(),
      className: payload.class === undefined ? null : payload.class,
      screenshot: null,
    };

    if (navigationEvent.uri) currentURI.set(navigationEvent.uri);

    navigationEvents.update((draft) => {
      draft.unshift(navigationEvent);
    });

    const screenshot: Buffer = await client.device.realDevice.screenshot();
    const blobURL = URL.createObjectURL(bufferToBlob(screenshot));
    // this process is async, make sure we update the correct one..
    const navigationEventIndex = navigationEvents
      .get()
      .indexOf(navigationEvent);
    if (navigationEventIndex !== -1) {
      navigationEvents.update((draft) => {
        draft[navigationEventIndex].screenshot = blobURL;
      });
    }
  });

  getAppMatchPatterns(client.appId, client.device.realDevice)
    .then((patterns) => {
      appMatchPatterns.set(patterns);
    })
    .catch((e) => {
      console.error('[Navigation] Failed to find appMatchPatterns', e);
    });

  readBookmarksFromDB().then((bookmarksData) => {
    bookmarks.set(bookmarksData);
  });

  function navigateTo(query: string) {
    const filteredQuery = filterOptionalParameters(query);
    currentURI.set(filteredQuery);
    const params = getRequiredParameters(filteredQuery);
    if (params.length === 0) {
      if (client.appName === 'Facebook' && client.device.os === 'iOS') {
        // use custom navigate_to event for Wilde
        client.send('navigate_to', {
          url: filterOptionalParameters(filteredQuery),
        });
      } else {
        client.device.realDevice.navigateToLocation(
          filterOptionalParameters(filteredQuery),
        );
      }
    } else {
      renderReactRoot((unmount) => (
        <RequiredParametersDialog
          onHide={unmount}
          uri={filteredQuery}
          requiredParameters={params}
          onSubmit={navigateTo}
        />
      ));
    }
  }

  function onFavorite(uri: string) {
    shouldShowSaveBookmarkDialog.set(true);
    saveBookmarkURI.set(uri);
  }

  function addBookmark(bookmark: Bookmark) {
    const newBookmark = {
      uri: bookmark.uri,
      commonName: bookmark.commonName,
    };

    bookmarks.update((draft) => {
      draft.set(newBookmark.uri, newBookmark);
    });
    writeBookmarkToDB(newBookmark);
  }

  function removeBookmark(uri: string) {
    bookmarks.update((draft) => {
      draft.delete(uri);
    });
    removeBookmarkFromDB(uri);
  }

  return {
    navigateTo,
    onFavorite,
    addBookmark,
    removeBookmark,
    bookmarks,
    saveBookmarkURI,
    shouldShowSaveBookmarkDialog,
    appMatchPatterns,
    navigationEvents,
    currentURI,
    getAutoCompleteAppMatchPatterns(
      query: string,
      bookmarks: Map<string, Bookmark>,
      appMatchPatterns: AppMatchPattern[],
      limit: number,
    ): AppMatchPattern[] {
      const q = query.toLowerCase();
      const results: AppMatchPattern[] = [];
      for (const item of appMatchPatterns) {
        if (
          !bookmarks.has(item.pattern) &&
          (item.className.toLowerCase().includes(q) ||
            item.pattern.toLowerCase().includes(q))
        ) {
          results.push(item);
          if (--limit < 1) break;
        }
      }
      return results;
    },
  };
}

export function Component() {
  const instance = usePlugin(plugin);
  const bookmarks = useValue(instance.bookmarks);
  const appMatchPatterns = useValue(instance.appMatchPatterns);
  const saveBookmarkURI = useValue(instance.saveBookmarkURI);
  const shouldShowSaveBookmarkDialog = useValue(
    instance.shouldShowSaveBookmarkDialog,
  );
  const currentURI = useValue(instance.currentURI);
  const navigationEvents = useValue(instance.navigationEvents);

  const autoCompleteProviders = useMemo(
    () => [
      bookmarksToAutoCompleteProvider(bookmarks),
      appMatchPatternsToAutoCompleteProvider(appMatchPatterns),
    ],
    [bookmarks, appMatchPatterns],
  );
  return (
    <Layout.Container>
      <SearchBar
        providers={autoCompleteProviders}
        bookmarks={bookmarks}
        onNavigate={instance.navigateTo}
        onFavorite={instance.onFavorite}
        uriFromAbove={currentURI}
      />
      <Timeline
        bookmarks={bookmarks}
        events={navigationEvents}
        onNavigate={instance.navigateTo}
        onFavorite={instance.onFavorite}
      />
      <BookmarksSidebar
        bookmarks={bookmarks}
        onRemove={instance.removeBookmark}
        onNavigate={instance.navigateTo}
      />
      <SaveBookmarkDialog
        shouldShow={shouldShowSaveBookmarkDialog}
        uri={saveBookmarkURI}
        onHide={() => {
          instance.shouldShowSaveBookmarkDialog.set(false);
        }}
        edit={saveBookmarkURI != null ? bookmarks.has(saveBookmarkURI) : false}
        onSubmit={instance.addBookmark}
        onRemove={instance.removeBookmark}
      />
    </Layout.Container>
  );
}

/* @scarf-info: do not remove, more info: https://fburl.com/scarf */
/* @scarf-generated: flipper-plugin index.js.template 0bfa32e5-fb15-4705-81f8-86260a1f3f8e */
