/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  URI,
  Bookmark,
  AutoCompleteProvider,
  AutoCompleteLineItem,
  AppMatchPattern,
} from '../types';

export function DefaultProvider(): AutoCompleteProvider {
  return {
    icon: 'caution',
    matchPatterns: new Map<string, URI>(),
  };
}

export const bookmarksToAutoCompleteProvider = (
  bookmarks: Map<URI, Bookmark>,
) => {
  const autoCompleteProvider = {
    icon: 'bookmark',
    matchPatterns: new Map<string, URI>(),
  } as AutoCompleteProvider;
  bookmarks.forEach((bookmark, uri) => {
    const matchPattern = bookmark.commonName + ' - ' + uri;
    autoCompleteProvider.matchPatterns.set(matchPattern, uri);
  });
  return autoCompleteProvider;
};

export const appMatchPatternsToAutoCompleteProvider = (
  appMatchPatterns: Array<AppMatchPattern>,
) => {
  const autoCompleteProvider = {
    icon: 'mobile',
    matchPatterns: new Map<string, URI>(),
  };
  appMatchPatterns.forEach((appMatchPattern) => {
    const matchPattern =
      appMatchPattern.className + ' - ' + appMatchPattern.pattern;
    autoCompleteProvider.matchPatterns.set(
      matchPattern,
      appMatchPattern.pattern,
    );
  });
  return autoCompleteProvider;
};

export const filterMatchPatterns = (
  matchPatterns: Map<string, URI>,
  query: URI,
  maxItems: number,
) => {
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

const filterProvider = (
  provider: AutoCompleteProvider,
  query: string,
  maxItems: number,
) => {
  return {
    ...provider,
    matchPatterns: filterMatchPatterns(provider.matchPatterns, query, maxItems),
  };
};

export const filterProvidersToLineItems = (
  providers: Array<AutoCompleteProvider>,
  query: string,
  maxItems: number,
) => {
  let itemsLeft = maxItems;
  const lineItems = new Array<AutoCompleteLineItem>(0);
  for (const provider of providers) {
    const filteredProvider = filterProvider(provider, query, itemsLeft);
    filteredProvider.matchPatterns.forEach((uri, matchPattern) => {
      lineItems.push({
        icon: provider.icon,
        matchPattern,
        uri,
      });
    });
    itemsLeft -= filteredProvider.matchPatterns.size;
  }
  return lineItems;
};
