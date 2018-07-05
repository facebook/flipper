/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {FlexRow, Text, colors, LoadingIndicator, Glyph, Component} from 'sonar';
import {remote} from 'electron';
import isProduction from '../utils/isProduction.js';
import config from '../fb-stubs/config.js';
const version = remote.app.getVersion();

const VersionText = Text.extends({
  color: colors.light50,
  marginLeft: 4,
  marginTop: 2,
});

const Container = FlexRow.extends({
  alignItems: 'center',
});

type State = {
  updater:
    | 'error'
    | 'checking-for-update'
    | 'update-available'
    | 'update-not-available'
    | 'update-downloaded',
  error?: string,
};

export default class AutoUpdateVersion extends Component<{}, State> {
  state = {
    updater: 'update-not-available',
  };

  componentDidMount() {
    if (isProduction()) {
      remote.autoUpdater.setFeedURL(
        `${config.updateServer}?version=${version}`,
      );

      remote.autoUpdater.on('update-downloaded', () => {
        this.setState({updater: 'update-downloaded'});

        const notification = new window.Notification('Update available', {
          body: 'Restart Sonar to update to the latest version.',
          requireInteraction: true,
        });
        notification.onclick = remote.autoUpdater.quitAndInstall;
      });

      remote.autoUpdater.on('error', error => {
        this.setState({updater: 'error', error: error.toString()});
      });

      remote.autoUpdater.on('checking-for-update', () => {
        this.setState({updater: 'checking-for-update'});
      });

      remote.autoUpdater.on('update-available', error => {
        this.setState({updater: 'update-available'});
      });

      remote.autoUpdater.on('update-not-available', error => {
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
            title="Update available. Restart Sonar."
            onClick={remote.autoUpdater.quitAndInstall}>
            <Glyph color={colors.light30} name="breaking-news" />
          </span>
        )}
        {isProduction() && <VersionText>{version}</VersionText>}
      </Container>
    );
  }
}
