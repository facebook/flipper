/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow strict-local
 */

import {FlipperPlugin} from 'flipper';
import {
  BookmarksSidebar,
  SearchBar,
  Timeline,
  ScrollableFlexColumn,
} from './components';

type State = {||};

export type NavigationEvent = {|
  date: ?Date,
  uri: ?string,
|};

export type Bookmark = {|
  uri: string,
  commonName: ?string,
|};

export type PersistedState = {|
  navigationEvents: Array<NavigationEvent>,
  bookmarks: Array<Bookmark>,
|};

export default class extends FlipperPlugin<State, {}, PersistedState> {
  static title = 'Navigation';
  static id = 'Navigation';
  static icon = 'directions';
  static keyboardActions = ['clear'];

  static defaultPersistedState: PersistedState = {
    navigationEvents: [],
    bookmarks: [],
  };

  static persistedStateReducer = (
    persistedState: PersistedState,
    method: string,
    payload: NavigationEvent,
  ): $Shape<PersistedState> => {
    switch (method) {
      case 'nav_event':
        return {
          ...persistedState,
          navigationEvents: [
            {
              uri: payload.uri === undefined ? null : payload.uri,
              date: payload.date || new Date(),
            },
            ...persistedState.navigationEvents,
          ],
        };
      default:
        return {
          ...persistedState,
        };
    }
  };

  onKeyboardAction = (action: string) => {
    if (action === 'clear') {
      this.props.setPersistedState({navigationEvents: []});
    }
  };

  navigateTo = (query: string) => {
    this.getDevice().then(device => {
      device.navigateToLocation(query);
    });
  };

  render() {
    const {navigationEvents, bookmarks} = this.props.persistedState;
    return (
      <ScrollableFlexColumn>
        <SearchBar
          onNavigate={this.navigateTo}
          onFavorite={(query: string) => {}}
        />
        <Timeline events={navigationEvents} onNavigate={this.navigateTo} />
        <BookmarksSidebar bookmarks={bookmarks} />
      </ScrollableFlexColumn>
    );
  }
}

/* @scarf-info: do not remove, more info: https://fburl.com/scarf */
/* @scarf-generated: flipper-plugin index.js.template 0bfa32e5-fb15-4705-81f8-86260a1f3f8e */
