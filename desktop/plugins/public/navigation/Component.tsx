/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import {
  BookmarksSidebar,
  SaveBookmarkDialog,
  SearchBar,
  Timeline,
} from './components';
import {
  appMatchPatternsToAutoCompleteProvider,
  bookmarksToAutoCompleteProvider,
} from './util/autoCompleteProvider';
import React, {useMemo} from 'react';
import {useValue, usePlugin, Layout} from 'flipper-plugin';
import {plugin} from './plugin';

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
    <Layout.Container grow>
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
