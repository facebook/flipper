/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlexRow, colors, LoadingIndicator, Glyph, styled} from '../ui';
import {remote} from 'electron';
import isProduction from '../utils/isProduction';
import React, {Component} from 'react';
import config from '../fb-stubs/config';

const Container = styled(FlexRow)({
  alignItems: 'center',
});

type State = {
  updater:
    | 'error'
    | 'checking-for-update'
    | 'update-available'
    | 'update-not-available'
    | 'update-downloaded';
  error?: string;
};

type Props = {
  version: string;
};

export default class AutoUpdateVersion extends Component<Props, State> {
  state: State = {
    updater: 'update-not-available',
  };

  componentDidMount() {
    if (isProduction()) {
      // this will fail, if the app is not code signed
      try {
        remote.autoUpdater.setFeedURL({
          url: `${config.updateServer}?version=${this.props.version}`,
        });
      } catch (e) {
        console.error(e);
      }

      remote.autoUpdater.on('update-downloaded', () => {
        this.setState({updater: 'update-downloaded'});

        const notification = new Notification('Update available', {
          body: 'Restart Flipper to update to the latest version.',
          requireInteraction: true,
        });
        notification.onclick = remote.autoUpdater.quitAndInstall;
      });

      remote.autoUpdater.on('error', (error) => {
        this.setState({updater: 'error', error: error.toString()});
      });

      remote.autoUpdater.on('checking-for-update', () => {
        this.setState({updater: 'checking-for-update'});
      });

      remote.autoUpdater.on('update-available', () => {
        this.setState({updater: 'update-available'});
      });

      remote.autoUpdater.on('update-not-available', () => {
        this.setState({updater: 'update-not-available'});
      });

      remote.autoUpdater.checkForUpdates();
    }
  }

  render() {
    return (
      <Container>
        {this.state.updater === 'update-available' && (
          <span title="Downloading new version">
            <LoadingIndicator size={16} />
          </span>
        )}
        {this.state.updater === 'error' && (
          <span title={`Error fetching update: ${this.state.error || ''}`}>
            <Glyph color={colors.light30} name="caution-triangle" />
          </span>
        )}
        {this.state.updater === 'update-downloaded' && (
          <span
            tabIndex={-1}
            role="button"
            title="Update available. Restart Flipper."
            onClick={remote.autoUpdater.quitAndInstall}>
            <Glyph color={colors.light30} name="breaking-news" />
          </span>
        )}
      </Container>
    );
  }
}
