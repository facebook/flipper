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
  SaveBookmarkDialog,
  SearchBar,
  Timeline,
  ScrollableFlexColumn,
} from './components';
import {readBookmarksFromDB, writeBookmarkToDB} from './util/indexedDB';

type State = {|
  bookmarks: Map<string, Bookmark>,
  shouldShowSaveBookmarkDialog: boolean,
  saveBookmarkURI: ?string,
|};

export type NavigationEvent = {|
  date: ?Date,
  uri: ?string,
|};

export type Bookmark = {|
  uri: string,
  commonName: string,
|};

export type PersistedState = {|
  navigationEvents: Array<NavigationEvent>,
|};

export default class extends FlipperPlugin<State, {}, PersistedState> {
  static title = 'Navigation';
  static id = 'Navigation';
  static icon = 'directions';
  static keyboardActions = ['clear'];

  static defaultPersistedState: PersistedState = {
    navigationEvents: [],
  };

  state = {
    bookmarks: new Map<string, Bookmark>(),
    shouldShowSaveBookmarkDialog: false,
    saveBookmarkURI: null,
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

  componentDidMount = () => {
    readBookmarksFromDB().then(bookmarks => {
      this.setState({bookmarks});
    });
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

  onFavorite = (uri: string) => {
    this.setState({shouldShowSaveBookmarkDialog: true, saveBookmarkURI: uri});
  };

  addBookmark = (bookmark: Bookmark) => {
    const newBookmark = {
      uri: bookmark.uri,
      commonName:
        bookmark.commonName.length > 0 ? bookmark.commonName : bookmark.uri,
    };
    writeBookmarkToDB(newBookmark);
    const newMapRef = this.state.bookmarks;
    newMapRef.set(newBookmark.uri, newBookmark);
    this.setState({bookmarks: newMapRef});
  };

  render() {
    const {bookmarks, shouldShowSaveBookmarkDialog} = this.state;
    const {navigationEvents} = this.props.persistedState;
    return (
      <ScrollableFlexColumn>
        <SearchBar
          bookmarks={bookmarks}
          onNavigate={this.navigateTo}
          onFavorite={this.onFavorite}
        />
        <Timeline
          bookmarks={bookmarks}
          events={navigationEvents}
          onNavigate={this.navigateTo}
          onFavorite={this.onFavorite}
        />
        <BookmarksSidebar bookmarks={bookmarks} onNavigate={this.navigateTo} />
        <SaveBookmarkDialog
          shouldShow={shouldShowSaveBookmarkDialog}
          uri={this.state.saveBookmarkURI}
          onHide={() => this.setState({shouldShowSaveBookmarkDialog: false})}
          onSubmit={this.addBookmark}
        />
      </ScrollableFlexColumn>
    );
  }
}

/* @scarf-info: do not remove, more info: https://fburl.com/scarf */
/* @scarf-generated: flipper-plugin index.js.template 0bfa32e5-fb15-4705-81f8-86260a1f3f8e */
