/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {
  FlipperDevicePlugin,
  Device,
  styled,
  colors,
  FlexRow,
  FlexColumn,
} from 'flipper';
import LaunchScreen from './LaunchScreen';
import Banner, {isBannerEnabled} from './Banner';
import SelectScreen from './SelectScreen';
import ErrorScreen from './ErrorScreen';
import ChromeDevTools from './ChromeDevTools';

const POLL_SECS = 5 * 1000;
const METRO_HOST = 'http://localhost:8081';

export type Target = Readonly<{
  id: string;
  description: string;
  title: string;
  faviconUrl: string;
  devtoolsFrontendUrl: string;
  type: string;
  webSocketDebuggerUrl: string;
  vm: string;
}>;

export type Targets = ReadonlyArray<Target>;

type State = Readonly<{
  targets?: Targets | null;
  selectedTarget?: Target | null;
  error?: Error | null;
}>;

const Content = styled(FlexRow)({
  height: '100%',
  width: '100%',
  flexGrow: 1,
  justifyContent: 'center',
  alignItems: 'center',
});

const Container = styled(FlexColumn)({
  height: '100%',
  width: '100%',
  justifyContent: 'flex-start',
  alignItems: 'flex-start',
  backgroundColor: colors.light02,
});

export default class extends FlipperDevicePlugin<State, any, any> {
  static title = 'Hermes Debugger';
  static id = 'Hermesdebuggerrn';
  static icon = 'code';

  static supportsDevice(device: Device) {
    return !device.isArchived && device.os === 'Metro';
  }

  state: State = {
    targets: null,
    selectedTarget: null,
    error: null,
  };

  poll?: NodeJS.Timeout;

  componentDidMount() {
    // This is a pretty basic polling mechnaism. We ask Metro every POLL_SECS what the
    // current available targets are and only handle a few basic state transitions.
    this.poll = setInterval(this.checkDebugTargets, POLL_SECS);
    this.checkDebugTargets();
  }

  componentWillUnmount() {
    if (this.poll) {
      clearInterval(this.poll);
    }
  }

  checkDebugTargets = () => {
    fetch(`${METRO_HOST}/json`)
      .then((res) => res.json())
      .then(
        (result) => {
          // We only want to use the Chrome Reload targets.
          const targets = result.filter(
            (target: any) =>
              target.title ===
              'React Native Experimental (Improved Chrome Reloads)',
          );

          // Find the currently selected target.
          // If the current selectedTarget isn't returned, clear it.
          let currentlySelected = null;
          if (this.state.selectedTarget != null) {
            for (const target of result) {
              if (
                this.state.selectedTarget?.webSocketDebuggerUrl ===
                target.webSocketDebuggerUrl
              ) {
                currentlySelected = this.state.selectedTarget;
              }
            }
          }

          // Auto-select the first target if there is one,
          // but don't change the one that's already selected.
          const selectedTarget =
            currentlySelected == null && targets.length === 1
              ? targets[0]
              : currentlySelected;

          this.setState({
            error: null,
            targets,
            selectedTarget,
          });
        },
        (error) => {
          this.setState({
            targets: null,
            selectedTarget: null,
            error,
          });
        },
      );
  };

  handleSelect = (selectedTarget: Target) => this.setState({selectedTarget});

  renderContent() {
    const {error, selectedTarget, targets} = this.state;

    if (selectedTarget) {
      let bannerMargin = null;
      if (isBannerEnabled()) {
        bannerMargin = '29px';
      }

      return (
        <ChromeDevTools
          url={selectedTarget.devtoolsFrontendUrl}
          marginTop={bannerMargin}
        />
      );
    } else if (targets != null && targets.length === 0) {
      return <LaunchScreen />;
    } else if (targets != null && targets.length > 0) {
      return <SelectScreen targets={targets} onSelect={this.handleSelect} />;
    } else if (error != null) {
      return <ErrorScreen error={error} />;
    } else {
      return null;
    }
  }

  render() {
    return (
      <Container>
        <Banner />
        <Content>{this.renderContent()}</Content>
      </Container>
    );
  }
}
