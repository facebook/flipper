/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {LauncherMsg} from '../reducers/application';
import {colors, FlexRow, Glyph, styled} from 'flipper';
import Tooltip from '../ui/components/Tooltip';
import isProduction from '../utils/isProduction';
import {
  checkForUpdate,
  VersionCheckResult,
} from '../utils/publicVersionChecker';
import {reportPlatformFailures} from '../utils/metrics';
import React from 'react';
import {shell} from 'electron';
import config from '../utils/processConfig';
import isFBBuild from '../fb-stubs/config';

const Container = styled(FlexRow)({
  alignItems: 'center',
  marginLeft: 4,
});

type Props = {
  launcherMsg: LauncherMsg;
  version: string;
};

type State = {
  versionCheckResult: VersionCheckResult;
};

function getSeverityColor(severity: 'warning' | 'error'): string {
  switch (severity) {
    case 'warning':
      return colors.light30;
    case 'error':
      return colors.cherry;
  }
}

export default class UpdateIndicator extends React.PureComponent<Props, State> {
  state = {
    versionCheckResult: {kind: 'up-to-date'} as VersionCheckResult,
  };

  renderMessage(): React.ReactNode {
    if (this.props.launcherMsg.message.length == 0) {
      return null;
    }

    return (
      <Container>
        <span title={this.props.launcherMsg.message}>
          <Glyph
            color={getSeverityColor(this.props.launcherMsg.severity)}
            name="caution-triangle"
          />
        </span>
      </Container>
    );
  }

  renderUpdateIndicator(): React.ReactNode {
    const result = this.state.versionCheckResult;
    if (result.kind !== 'update-available') {
      return null;
    }

    const container = (
      <Container>
        <span onClick={() => shell.openExternal(result.url)}>
          <Glyph
            color={getSeverityColor(this.props.launcherMsg.severity)}
            name="caution-triangle"
          />
        </span>
      </Container>
    );
    return (
      <Tooltip
        options={{position: 'toLeft'}}
        title={`Update to Flipper v${result.version} available. Click to download.`}
        children={container}
      />
    );
  }

  componentDidMount() {
    if (isProduction() && (config().launcherEnabled || !isFBBuild)) {
      reportPlatformFailures(
        checkForUpdate(this.props.version).then((res) => {
          if (res.kind === 'error') {
            console.warn('Version check failure: ', res.msg);
            throw new Error(res.msg);
          }

          this.setState({versionCheckResult: res});
        }),
        'publicVersionCheck',
      );
    }
  }

  render(): React.ReactNode {
    return (
      <>
        {this.renderMessage()}
        {this.renderUpdateIndicator()}
      </>
    );
  }
}
