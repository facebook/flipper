/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow strict-local
 */

export type State = {|
  bookmarks: Map<string, Bookmark>,
  shouldShowSaveBookmarkDialog: boolean,
  saveBookmarkURI: ?string,
|};

export type PersistedState = {|
  navigationEvents: Array<NavigationEvent>,
|};

export type NavigationEvent = {|
  date: ?Date,
  uri: ?string,
|};

export type Bookmark = {|
  uri: string,
  commonName: string,
|};
