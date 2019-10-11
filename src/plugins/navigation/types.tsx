/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type URI = string;

export type State = {
  shouldShowSaveBookmarkDialog: boolean;
  shouldShowURIErrorDialog: boolean;
  saveBookmarkURI: URI | null;
  requiredParameters: Array<string>;
};

export type PersistedState = {
  bookmarks: Map<URI, Bookmark>;
  navigationEvents: Array<NavigationEvent>;
  bookmarksProvider: AutoCompleteProvider;
  appMatchPatterns: Array<AppMatchPattern>;
  appMatchPatternsProvider: AutoCompleteProvider;
  currentURI: string;
};

export type NavigationEvent = {
  date: Date | null;
  uri: URI | null;
  className: string | null;
  screenshot: string | null;
};

export type Bookmark = {
  uri: URI;
  commonName: string | null;
};

export type AutoCompleteProvider = {
  icon: string;
  matchPatterns: Map<string, URI>;
};

export type AutoCompleteLineItem = {
  icon: string;
  matchPattern: string;
  uri: URI;
};

export type AppMatchPattern = {
  className: string;
  pattern: string;
};
