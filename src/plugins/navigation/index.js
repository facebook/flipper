/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow strict-local
 */

import {FlipperPlugin, bufferToBlob} from 'flipper';
import {
  BookmarksSidebar,
  SaveBookmarkDialog,
  SearchBar,
  Timeline,
  ScrollableFlexColumn,
  RequiredParametersDialog,
} from './components';
import {
  removeBookmark,
  readBookmarksFromDB,
  writeBookmarkToDB,
} from './util/indexedDB.tsx';
import {
  appMatchPatternsToAutoCompleteProvider,
  bookmarksToAutoCompleteProvider,
  DefaultProvider,
} from './util/autoCompleteProvider';
import {getAppMatchPatterns} from './util/appMatchPatterns';
import {getRequiredParameters, filterOptionalParameters} from './util/uri.tsx';

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
    bookmarks: new Map<string, Bookmark>(),
    currentURI: '',
    bookmarksProvider: new DefaultProvider(),
    appMatchPatterns: [],
    appMatchPatternsProvider: new DefaultProvider(),
  };

  state = {
    shouldShowSaveBookmarkDialog: false,
    saveBookmarkURI: null,
    shouldShowURIErrorDialog: false,
    requiredParameters: [],
  };

  static persistedStateReducer = (
    persistedState: PersistedState,
    method: string,
    payload: NavigationEvent,
  ): $Shape<PersistedState> => {
    switch (method) {
      default:
        return {
          ...persistedState,
        };
    }
  };

  subscribeToNavigationEvents = () => {
    this.client.subscribe('nav_event', payload => {
      let {persistedState} = this.props;
      const {setPersistedState} = this.props;
      const navigationEvent: NavigationEvent = {
        uri: payload.uri === undefined ? null : decodeURIComponent(payload.uri),
        date: payload.date || new Date(),
        className: payload.class === undefined ? null : payload.class,
        screenshot: null,
      };
      setPersistedState({
        ...persistedState,
        currentURI:
          payload.uri == null
            ? persistedState.currentURI
            : decodeURIComponent(payload.uri),
        navigationEvents: [navigationEvent, ...persistedState.navigationEvents],
      });
      // Wait for view to render and then take a screenshot
      setTimeout(() => {
        persistedState = this.props.persistedState;
        this.getDevice()
          .then(device => device.screenshot())
          .then((buffer: Buffer) => {
            const blobURL = URL.createObjectURL(bufferToBlob(buffer));
            navigationEvent.screenshot = blobURL;
            setPersistedState({...persistedState});
          });
      }, 1000);
    });
  };

  componentDidMount = () => {
    const {selectedApp} = this.props;
    this.subscribeToNavigationEvents();
    getAppMatchPatterns(selectedApp)
      .then(patterns => {
        this.props.setPersistedState({
          appMatchPatterns: patterns,
          appMatchPatternsProvider: appMatchPatternsToAutoCompleteProvider(
            patterns,
          ),
        });
      })
      .catch(() => {
        /* Silently fail here. */
      });
    readBookmarksFromDB().then(bookmarks => {
      this.props.setPersistedState({
        bookmarks: bookmarks,
        bookmarksProvider: bookmarksToAutoCompleteProvider(bookmarks),
      });
    });
  };

  onKeyboardAction = (action: string) => {
    if (action === 'clear') {
      this.props.setPersistedState({navigationEvents: []});
    }
  };

  navigateTo = (query: string) => {
    const filteredQuery = filterOptionalParameters(query);
    this.props.setPersistedState({currentURI: filteredQuery});
    const requiredParameters = getRequiredParameters(filteredQuery);
    if (requiredParameters.length === 0) {
      this.getDevice().then(device => {
        device.navigateToLocation(filterOptionalParameters(filteredQuery));
      });
    } else {
      this.setState({
        requiredParameters,
        shouldShowURIErrorDialog: true,
      });
    }
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
    const newMapRef = this.props.persistedState.bookmarks;
    newMapRef.set(newBookmark.uri, newBookmark);
    this.props.setPersistedState({
      bookmarks: newMapRef,
      bookmarksProvider: bookmarksToAutoCompleteProvider(newMapRef),
    });
  };

  removeBookmark = (uri: string) => {
    removeBookmark(uri);
    const newMapRef = this.props.persistedState.bookmarks;
    newMapRef.delete(uri);
    this.props.setPersistedState({
      bookmarks: newMapRef,
      bookmarksProvider: bookmarksToAutoCompleteProvider(newMapRef),
    });
  };

  render() {
    const {
      saveBookmarkURI,
      shouldShowSaveBookmarkDialog,
      shouldShowURIErrorDialog,
      requiredParameters,
    } = this.state;
    const {
      bookmarks,
      bookmarksProvider,
      currentURI,
      appMatchPatternsProvider,
      navigationEvents,
    } = this.props.persistedState;
    const autoCompleteProviders = [bookmarksProvider, appMatchPatternsProvider];
    return (
      <ScrollableFlexColumn>
        <SearchBar
          providers={autoCompleteProviders}
          bookmarks={bookmarks}
          onNavigate={this.navigateTo}
          onFavorite={this.onFavorite}
          uriFromAbove={currentURI}
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
        <RequiredParametersDialog
          shouldShow={shouldShowURIErrorDialog}
          onHide={() => this.setState({shouldShowURIErrorDialog: false})}
          uri={currentURI}
          requiredParameters={requiredParameters}
          onSubmit={this.navigateTo}
        />
      </ScrollableFlexColumn>
    );
  }
}

/* @scarf-info: do not remove, more info: https://fburl.com/scarf */
/* @scarf-generated: flipper-plugin index.js.template 0bfa32e5-fb15-4705-81f8-86260a1f3f8e */
