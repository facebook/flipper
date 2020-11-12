/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type URI = string;

export type RawNavigationEvent = {
  date: string | undefined;
  uri: URI | undefined;
  class: string | undefined;
  screenshot: string | undefined;
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
