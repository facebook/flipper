/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow strict-local
 */

import NavigationPlugin from '../';
import {DefaultProvider} from '../util/autoCompleteProvider';

import type {Bookmark, PersistedState, URI} from '../flow-types';

function constructPersistedStateMock(): PersistedState {
  return {
    appMatchPatterns: [],
    appMatchPatternsProvider: new DefaultProvider(),
    bookmarksProvider: new DefaultProvider(),
    bookmarks: new Map<URI, Bookmark>(),
    navigationEvents: [],
  };
}

function constructPersistedStateMockWithEvents(): PersistedState {
  return {
    appMatchPatterns: [],
    appMatchPatternsProvider: new DefaultProvider(),
    bookmarksProvider: new DefaultProvider(),
    bookmarks: new Map<URI, Bookmark>(),
    navigationEvents: [
      {
        uri: 'mock://this_is_a_mock_uri/mock/1',
        date: DATE_MOCK_2,
      },
      {
        uri: 'mock://this_is_a_mock_uri/mock/2',
        date: DATE_MOCK_3,
      },
    ],
  };
}

const DATE_MOCK_1 = new Date(2019, 6, 17, 11, 10, 0, 0);
const DATE_MOCK_2 = new Date(2019, 6, 18, 11, 10, 0, 0);
const DATE_MOCK_3 = new Date(2019, 6, 19, 11, 10, 0, 0);

const INCOMING_NAV_EVENT = {
  uri: 'mock://this_is_a_mock_uri/mock',
  date: DATE_MOCK_1,
};

const INCOMING_UNDEFINED_NAV_EVENT = {
  date: DATE_MOCK_1,
};

test('add incoming nav event to persisted state', () => {
  const persistedState = constructPersistedStateMock();
  const reducer = NavigationPlugin.persistedStateReducer;
  if (reducer) {
    const newPersistedState = reducer(
      persistedState,
      'nav_event',
      INCOMING_NAV_EVENT,
    );
    expect(newPersistedState.navigationEvents).toEqual([
      {
        uri: 'mock://this_is_a_mock_uri/mock',
        date: DATE_MOCK_1,
      },
    ]);
  } else {
    expect(reducer).not.toBeNull();
  }
});

test('add incoming nav event to persisted state with nav events', () => {
  const persistedState = constructPersistedStateMockWithEvents();
  const reducer = NavigationPlugin.persistedStateReducer;
  if (reducer) {
    const newPersistedState = reducer(
      persistedState,
      'nav_event',
      INCOMING_NAV_EVENT,
    );
    expect(newPersistedState.navigationEvents).toEqual([
      {
        uri: 'mock://this_is_a_mock_uri/mock',
        date: DATE_MOCK_1,
      },
      ...persistedState.navigationEvents,
    ]);
  } else {
    expect(reducer).not.toBeNull();
  }
});

test('add incoming nav event with undefined uri to persisted state', () => {
  const persistedState = constructPersistedStateMock();
  const reducer = NavigationPlugin.persistedStateReducer;
  if (reducer) {
    const newPersistedState = reducer(
      persistedState,
      'nav_event',
      INCOMING_UNDEFINED_NAV_EVENT,
    );
    expect(newPersistedState.navigationEvents).toEqual([
      {
        uri: null,
        date: DATE_MOCK_1,
      },
    ]);
  } else {
    expect(reducer).not.toBeNull();
  }
});
