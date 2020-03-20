/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Button, styled} from 'flipper';
import {connect} from 'react-redux';
import React, {Component} from 'react';
import {State as Store} from '../reducers';
import {
  readBookmarksFromDB,
  writeBookmarkToDB,
} from '../../../plugins/navigation/util/indexedDB';
import {PersistedState as NavPluginState} from '../../../plugins/navigation/types';
import BaseDevice from '../devices/BaseDevice';
import {State as PluginState} from 'app/src/reducers/pluginStates';
import {platform} from 'os';
import {getPluginKey} from '../utils/pluginUtils';

type State = {
  bookmarks: Array<Bookmark>;
  hasRetrievedBookmarks: boolean;
  retreivingBookmarks: boolean;
};

type OwnProps = {};

type StateFromProps = {
  currentURI: string | undefined;
  selectedDevice: BaseDevice | null | undefined;
};

type DispatchFromProps = {};

type Bookmark = {
  uri: string;
  commonName: string | null;
};

const DropdownButton = styled(Button)({
  fontSize: 11,
});

const shortenText = (text: string, MAX_CHARACTERS = 30): string => {
  if (text.length <= MAX_CHARACTERS) {
    return text;
  } else {
    return (
      text
        .split('')
        .slice(0, MAX_CHARACTERS)
        .join('') + '...'
    );
  }
};

type Props = OwnProps & StateFromProps & DispatchFromProps;
class LocationsButton extends Component<Props, State> {
  state: State = {
    bookmarks: [],
    hasRetrievedBookmarks: false,
    retreivingBookmarks: false,
  };

  componentDidMount() {
    document.addEventListener('keydown', this.keyDown);
    this.updateBookmarks();
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.keyDown);
  }

  goToLocation = (location: string) => {
    const {selectedDevice} = this.props;
    if (selectedDevice != null) {
      selectedDevice.navigateToLocation(location);
    }
  };

  keyDown = (e: KeyboardEvent) => {
    if (
      ((platform() === 'darwin' && e.metaKey) ||
        (platform() !== 'darwin' && e.ctrlKey)) &&
      /^\d$/.test(e.key) &&
      this.state.bookmarks.length >= parseInt(e.key, 10)
    ) {
      this.goToLocation(this.state.bookmarks[parseInt(e.key, 10) - 1].uri);
    }
  };

  updateBookmarks = () => {
    readBookmarksFromDB().then(bookmarksMap => {
      const bookmarks: Array<Bookmark> = [];
      bookmarksMap.forEach((bookmark: Bookmark) => {
        bookmarks.push(bookmark);
      });
      this.setState({bookmarks});
    });
  };

  render() {
    const {currentURI} = this.props;
    const {bookmarks} = this.state;

    const dropdown: any[] = [
      {
        label: 'Bookmarks',
        enabled: false,
      },
      ...bookmarks.map((bookmark, i) => {
        return {
          click: () => {
            this.goToLocation(bookmark.uri);
          },
          accelerator: i < 9 ? `CmdOrCtrl+${i + 1}` : undefined,
          label: shortenText(
            (bookmark.commonName ? bookmark.commonName + ' - ' : '') +
              bookmark.uri,
            100,
          ),
        };
      }),
    ];

    if (currentURI) {
      dropdown.push(
        {type: 'separator'},
        {
          label: 'Bookmark Current Location',
          click: async () => {
            await writeBookmarkToDB({
              uri: currentURI,
              commonName: null,
            });
            this.updateBookmarks();
          },
        },
      );
    }

    return (
      <DropdownButton
        onMouseDown={this.updateBookmarks}
        compact={true}
        dropdown={dropdown}>
        {(currentURI && shortenText(currentURI)) || '(none)'}
      </DropdownButton>
    );
  }
}

const mapStateFromPluginStatesToProps = (
  pluginStates: PluginState,
  selectedDevice: BaseDevice | null,
  selectedApp: string | null,
) => {
  const pluginKey = getPluginKey(selectedApp, selectedDevice, 'Navigation');
  let currentURI: string | undefined;
  if (pluginKey) {
    const navPluginState = pluginStates[pluginKey] as
      | NavPluginState
      | undefined;
    currentURI = navPluginState && navPluginState.currentURI;
  }
  return {
    currentURI,
  };
};

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  ({connections: {selectedDevice, selectedApp}, pluginStates}) => ({
    selectedDevice,
    ...mapStateFromPluginStatesToProps(
      pluginStates,
      selectedDevice,
      selectedApp,
    ),
  }),
)(LocationsButton);
