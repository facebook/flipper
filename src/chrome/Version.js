/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Component, FlexRow, colors, LoadingIndicator} from 'sonar';
import {version} from '../../package.json';
import {remote} from 'electron';
import * as path from 'path';
import {userInfo} from 'os';
import * as fs from 'fs';

const VERSION_URL =
  'https://interngraph.intern.facebook.com/sonar/version?app=543626909362475&token=AeNRaexWgPooanyxG0';

type VersionState = {
  status: 'unknown' | 'outdated' | 'latest' | 'updated' | 'errored',
};

export default class Version extends Component<{}, VersionState> {
  state = {
    status: 'unknown',
  };

  static Container = FlexRow.extends({
    alignItems: 'center',
    marginRight: 7,
    marginLeft: 7,
    marginTop: -1,
    color: colors.light50,
  });

  static UpdatedContainer = FlexRow.extends({
    backgroundColor: colors.blackAlpha10,
    borderRadius: '999em',
    padding: '2px 6px',
    marginLeft: 7,
    color: colors.light80,
    '&:hover': {
      backgroundColor: colors.blackAlpha15,
    },
  });

  componentDidMount() {
    this.watchUpdates();

    this.checkVersion().catch(() => {
      this.setState({status: 'errored'});
    });
  }

  async watchUpdates() {
    fs.watch(path.join(userInfo().homedir, '.sonar-desktop'), () =>
      this.setState({status: 'updated'}),
    );
  }

  async checkVersion() {
    const req = await fetch(VERSION_URL);
    const json = await req.json();
    this.setState({status: json.version === version ? 'latest' : 'outdated'});
  }

  onClick = () => {
    // mark the app to relaunch once killed
    remote.app.relaunch();
    // close the current window
    remote.getCurrentWindow().destroy();
  };

  render() {
    const {status} = this.state;
    return (
      <Version.Container>
        {version}
        {status === 'outdated' && [
          <Version.Container key="loading">
            <LoadingIndicator size={16} />
          </Version.Container>,
          'Updating...',
        ]}
        {status === 'updated' && (
          <Version.UpdatedContainer onClick={this.onClick}>
            Restart Sonar
          </Version.UpdatedContainer>
        )}
      </Version.Container>
    );
  }
}
