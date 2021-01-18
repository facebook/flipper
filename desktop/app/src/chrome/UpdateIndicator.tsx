/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {LauncherMsg} from '../reducers/application';
import {FlexRow, Glyph, styled} from '../ui';
import {Tooltip} from 'antd';
import isProduction from '../utils/isProduction';
import {
  checkForUpdate,
  VersionCheckResult,
} from '../utils/publicVersionChecker';
import {reportPlatformFailures} from '../utils/metrics';
import React from 'react';
import {shell} from 'electron';
import config from '../utils/processConfig';
import fbConfig from '../fb-stubs/config';
import {useStore} from '../utils/useStore';
import {remote} from 'electron';
import {theme} from 'flipper-plugin';
const version = remote.app.getVersion();

const Container = styled(FlexRow)({
  alignItems: 'center',
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
      return theme.warningColor;
    case 'error':
      return theme.errorColor;
  }
}

class UpdateIndicatorImpl extends React.PureComponent<Props, State> {
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
        <span
          onClick={() => shell.openExternal(result.url)}
          role="button"
          tabIndex={0}>
          <Glyph
            color={getSeverityColor(this.props.launcherMsg.severity)}
            name="caution-triangle"
          />
        </span>
      </Container>
    );
    return (
      <Tooltip
        placement="right"
        title={`Update to Flipper v${result.version} available. Click to download.`}
        children={container}
      />
    );
  }

  componentDidMount() {
    if (isProduction() && (config().launcherEnabled || !fbConfig.isFBBuild)) {
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

export default function UpdateIndicator() {
  const launcherMsg = useStore((state) => state.application.launcherMsg);
  return <UpdateIndicatorImpl launcherMsg={launcherMsg} version={version} />;
}
