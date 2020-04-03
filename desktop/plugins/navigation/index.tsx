/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import {FlipperPlugin, FlexColumn, bufferToBlob} from 'flipper';
import {
  BookmarksSidebar,
  SaveBookmarkDialog,
  SearchBar,
  Timeline,
  RequiredParametersDialog,
} from './components';
import {
  removeBookmark,
  readBookmarksFromDB,
  writeBookmarkToDB,
} from './util/indexedDB';
import {
  appMatchPatternsToAutoCompleteProvider,
  bookmarksToAutoCompleteProvider,
  DefaultProvider,
} from './util/autoCompleteProvider';
import {getAppMatchPatterns} from './util/appMatchPatterns';
import {getRequiredParameters, filterOptionalParameters} from './util/uri';
import {
  State,
  PersistedState,
  Bookmark,
  NavigationEvent,
  AppMatchPattern,
} from './types';
import React from 'react';

export default class extends FlipperPlugin<State, any, PersistedState> {
  static title = 'Navigation';
  static id = 'Navigation';
  static icon = 'directions';

  static defaultPersistedState = {
    navigationEvents: [],
    bookmarks: new Map<string, Bookmark>(),
    currentURI: '',
    bookmarksProvider: DefaultProvider(),
    appMatchPatterns: [],
    appMatchPatternsProvider: DefaultProvider(),
  };

  state = {
    shouldShowSaveBookmarkDialog: false,
    saveBookmarkURI: null as string | null,
    shouldShowURIErrorDialog: false,
    requiredParameters: [],
  };

  static persistedStateReducer = (
    persistedState: PersistedState,
    method: string,
    payload: any,
  ) => {
    switch (method) {
      case 'nav_event':
        const navigationEvent: NavigationEvent = {
          uri:
            payload.uri === undefined ? null : decodeURIComponent(payload.uri),
          date: new Date(payload.date) || new Date(),
          className: payload.class === undefined ? null : payload.class,
          screenshot: null,
        };

        return {
          ...persistedState,
          currentURI:
            navigationEvent.uri == null
              ? persistedState.currentURI
              : decodeURIComponent(navigationEvent.uri),
          navigationEvents: [
            navigationEvent,
            ...persistedState.navigationEvents,
          ],
        };
      default:
        return persistedState;
    }
  };

  subscribeToNavigationEvents = () => {
    this.client.subscribe('nav_event', () =>
      // Wait for view to render and then take a screenshot
      setTimeout(async () => {
        const device = await this.getDevice();
        const screenshot = await device.screenshot();
        const blobURL = URL.createObjectURL(bufferToBlob(screenshot));
        this.props.persistedState.navigationEvents[0].screenshot = blobURL;
        this.props.setPersistedState({...this.props.persistedState});
      }, 1000),
    );
  };

  componentDidMount() {
    const {selectedApp} = this.props;
    this.subscribeToNavigationEvents();
    this.getDevice()
      .then((device) => getAppMatchPatterns(selectedApp, device))
      .then((patterns: Array<AppMatchPattern>) => {
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
    readBookmarksFromDB().then((bookmarks) => {
      this.props.setPersistedState({
        bookmarks: bookmarks,
        bookmarksProvider: bookmarksToAutoCompleteProvider(bookmarks),
      });
    });
  }

  navigateTo = async (query: string) => {
    const filteredQuery = filterOptionalParameters(query);
    this.props.setPersistedState({currentURI: filteredQuery});
    const requiredParameters = getRequiredParameters(filteredQuery);
    if (requiredParameters.length === 0) {
      const device = await this.getDevice();
      if (this.realClient.query.app === 'Facebook' && device.os === 'iOS') {
        // use custom navigate_to event for Wilde
        this.client.send('navigate_to', {
          url: filterOptionalParameters(filteredQuery),
        });
      } else {
        device.navigateToLocation(filterOptionalParameters(filteredQuery));
      }
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
      commonName: bookmark.commonName,
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
      <FlexColumn grow>
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
        <BookmarksSidebar
          bookmarks={bookmarks}
          onRemove={this.removeBookmark}
          onNavigate={this.navigateTo}
        />
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
      </FlexColumn>
    );
  }
}

/* @scarf-info: do not remove, more info: https://fburl.com/scarf */
/* @scarf-generated: flipper-plugin index.js.template 0bfa32e5-fb15-4705-81f8-86260a1f3f8e */
