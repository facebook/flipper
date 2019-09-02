/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Button, styled} from 'flipper';
import {connect} from 'react-redux';
import React, {Component} from 'react';
import {State as Store} from '../reducers';
import {readBookmarksFromDB} from '../plugins/navigation/util/indexedDB';
import {State as NavPluginState} from '../plugins/navigation/flow-types';
import BaseDevice from '../devices/BaseDevice';
import {State as PluginState} from 'src/reducers/pluginStates';

type State = {
  bookmarks: Array<Bookmark>;
};

type OwnProps = {};

type StateFromProps = {
  currentURI: string;
  selectedDevice: BaseDevice | null | undefined;
};

type DispatchFromProps = {};

type Bookmark = {
  uri: string;
  commonName: string;
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
  state = {
    bookmarks: [],
    hasRetrievedBookmarks: false,
    retreivingBookmarks: false,
  };

  goToLocation = (location: string) => {
    const {selectedDevice} = this.props;
    if (selectedDevice != null) {
      selectedDevice.navigateToLocation(location);
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

  componentDidMount = () => {
    this.updateBookmarks();
  };

  render() {
    const {currentURI} = this.props;
    const {bookmarks} = this.state;
    return (
      <DropdownButton
        onMouseDown={this.updateBookmarks}
        compact={true}
        dropdown={[
          {
            label: 'Bookmarks',
            enabled: false,
          },
          ...bookmarks.map(bookmark => {
            return {
              click: () => {
                this.goToLocation(bookmark.uri);
              },
              label: shortenText(
                bookmark.commonName + ' - ' + bookmark.uri,
                100,
              ),
            };
          }),
        ]}>
        {(currentURI && shortenText(currentURI)) || '(none)'}
      </DropdownButton>
    );
  }
}

const mapStateFromPluginStatesToProps = (pluginStates: PluginState) => {
  const navPluginState: NavPluginState =
    pluginStates[
      Object.keys(pluginStates).find(key => /#Navigation$/.test(key))
    ];
  const currentURI = navPluginState && navPluginState.currentURI;
  return {
    currentURI,
  };
};

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  ({connections: {selectedDevice}, pluginStates}) => ({
    selectedDevice,
    ...mapStateFromPluginStatesToProps(pluginStates),
  }),
)(LocationsButton);
