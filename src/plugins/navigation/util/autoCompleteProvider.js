/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow strict-local
 */

import type {
  URI,
  Bookmark,
  AutoCompleteProvider,
  AutoCompleteLineItem,
} from '../flow-types';

export function DefaultProvider(): AutoCompleteProvider {
  this.icon = 'caution';
  this.matchPatterns = new Map<string, URI>();
  return this;
}

export const bookmarksToAutoCompleteProvider: (
  Map<URI, Bookmark>,
) => AutoCompleteProvider = bookmarks => {
  const autoCompleteProvider = {
    icon: 'bookmark',
    matchPatterns: new Map<string, URI>(),
  };
  bookmarks.forEach((bookmark, uri) => {
    const matchPattern = bookmark.commonName + ' - ' + uri;
    autoCompleteProvider.matchPatterns.set(matchPattern, uri);
  });
  return autoCompleteProvider;
};

export const filterMatchPatterns: (
  Map<string, URI>,
  string,
  number,
) => Map<string, URI> = (matchPatterns, query, maxItems) => {
  const filteredPatterns = new Map<string, URI>();
  for (const [pattern, uri] of matchPatterns) {
    if (filteredPatterns.size >= maxItems) {
      break;
    } else if (pattern.toLowerCase().includes(query.toLowerCase())) {
      filteredPatterns.set(pattern, uri);
    }
  }
  return filteredPatterns;
};

const filterProvider: (
  AutoCompleteProvider,
  string,
  number,
) => AutoCompleteProvider = (provider, query, maxItems) => {
  return {
    ...provider,
    matchPatterns: filterMatchPatterns(provider.matchPatterns, query, maxItems),
  };
};

export const filterProvidersToLineItems: (
  Array<AutoCompleteProvider>,
  string,
  number,
) => Array<AutoCompleteLineItem> = (providers, query, maxItems) => {
  let itemsLeft = maxItems;
  const lineItems = new Array<AutoCompleteLineItem>(0);
  for (const provider of providers) {
    const filteredProvider = filterProvider(provider, query, itemsLeft);
    filteredProvider.matchPatterns.forEach((uri, matchPattern) => {
      lineItems.unshift({
        icon: provider.icon,
        matchPattern,
        uri,
      });
    });
    itemsLeft -= filteredProvider.matchPatterns.size;
  }
  return lineItems;
};
