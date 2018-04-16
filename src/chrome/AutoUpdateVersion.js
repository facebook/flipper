/**
 * Copyright 2004-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {FlexRow, Text, colors, LoadingIndicator, Glyph, Component} from 'sonar';
import {ipcRenderer, remote} from 'electron';
import {isProduction} from '../utils/dynamicPluginLoading';
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
    | 'update-available'
    | 'update-not-available'
    | 'update-downloaded',
};

export default class AutoUpdateVersion extends Component<{}, State> {
  state = {
    updater: 'update-not-available',
  };

  componentDidMount() {
    ipcRenderer.on('updater', (event, data) => {
      if (data.type === 'error') {
        console.error(data.error);
      }
      this.setState({updater: data.type});
    });
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
          <span title="Error fetching update">
            <Glyph color={colors.light30} name="caution-triangle" />
          </span>
        )}
        {this.state.updater === 'update-downloaded' && (
          <span title="Update available. Restart Sonar.">
            <Glyph color={colors.light30} name="breaking-news" />
          </span>
        )}
        {isProduction() && <VersionText>{version}</VersionText>}
      </Container>
    );
  }
}
