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
import {
  removeBookmark,
  readBookmarksFromDB,
  writeBookmarkToDB,
} from './util/indexedDB';

import type {
  State,
  PersistedState,
  Bookmark,
  NavigationEvent,
} from './flow-types';

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

  removeBookmark = (uri: string) => {
    removeBookmark(uri);
    const newMapRef = this.state.bookmarks;
    newMapRef.delete(uri);
    this.setState({bookmarks: newMapRef});
  };

  render() {
    const {
      bookmarks,
      saveBookmarkURI,
      shouldShowSaveBookmarkDialog,
    } = this.state;
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
          uri={saveBookmarkURI}
          onHide={() => this.setState({shouldShowSaveBookmarkDialog: false})}
          edit={
            saveBookmarkURI != null ? bookmarks.has(saveBookmarkURI) : false
          }
          onSubmit={this.addBookmark}
          onRemove={this.removeBookmark}
        />
      </ScrollableFlexColumn>
    );
  }
}

/* @scarf-info: do not remove, more info: https://fburl.com/scarf */
/* @scarf-generated: flipper-plugin index.js.template 0bfa32e5-fb15-4705-81f8-86260a1f3f8e */
