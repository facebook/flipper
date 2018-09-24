/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {
  colors,
  Button,
  ButtonGroup,
  FlexRow,
  Component,
  Spacer,
  GK,
  styled,
} from 'flipper';
import {connect} from 'react-redux';
import {
  toggleBugDialogVisible,
  toggleLeftSidebarVisible,
  toggleRightSidebarVisible,
  togglePluginManagerVisible,
} from '../reducers/application.js';
import DevicesButton from './DevicesButton.js';
import ScreenCaptureButtons from './ScreenCaptureButtons.js';
import AutoUpdateVersion from './AutoUpdateVersion.js';
import config from '../fb-stubs/config.js';

const AppTitleBar = styled(FlexRow)(({focused}) => ({
  background: focused
    ? `linear-gradient(to bottom, ${colors.macOSTitleBarBackgroundTop} 0%, ${
        colors.macOSTitleBarBackgroundBottom
      } 100%)`
    : colors.macOSTitleBarBackgroundBlur,
  borderBottom: `1px solid ${
    focused ? colors.macOSTitleBarBorder : colors.macOSTitleBarBorderBlur
  }`,
  height: 38,
  flexShrink: 0,
  width: '100%',
  alignItems: 'center',
  paddingLeft: 80,
  paddingRight: 10,
  justifyContent: 'space-between',
  WebkitAppRegion: 'drag',
}));

type Props = {|
  windowIsFocused: boolean,
  leftSidebarVisible: boolean,
  rightSidebarVisible: boolean,
  rightSidebarAvailable: boolean,
  pluginManagerVisible: boolean,
  toggleBugDialogVisible: (visible?: boolean) => void,
  toggleLeftSidebarVisible: (visible?: boolean) => void,
  toggleRightSidebarVisible: (visible?: boolean) => void,
  togglePluginManagerVisible: (visible?: boolean) => void,
|};

class TitleBar extends Component<Props> {
  render() {
    return (
      <AppTitleBar focused={this.props.windowIsFocused} className="toolbar">
        <DevicesButton />
        <ScreenCaptureButtons />
        <Spacer />
        {process.platform === 'darwin' ? <AutoUpdateVersion /> : null}
        {config.bugReportButtonVisible && (
          <Button
            compact={true}
            onClick={() => this.props.toggleBugDialogVisible()}
            title="Report Bug"
            icon="bug"
          />
        )}
        {GK.get('sonar_dynamic_plugins') && (
          <Button
            compact={true}
            onClick={() => this.props.toggleBugDialogVisible()}
            selected={this.props.pluginManagerVisible}
            title="Plugin Manager"
            icon="apps"
          />
        )}
        <ButtonGroup>
          <Button
            compact={true}
            selected={this.props.leftSidebarVisible}
            onClick={() => this.props.toggleLeftSidebarVisible()}
            icon="icons/sidebar_left.svg"
            iconSize={20}
            title="Toggle Plugins"
          />
          <Button
            compact={true}
            selected={this.props.rightSidebarVisible}
            onClick={() => this.props.toggleRightSidebarVisible()}
            icon="icons/sidebar_right.svg"
            iconSize={20}
            title="Toggle Details"
            disabled={!this.props.rightSidebarAvailable}
          />
        </ButtonGroup>
      </AppTitleBar>
    );
  }
}

export default connect(
  ({
    application: {
      windowIsFocused,
      leftSidebarVisible,
      rightSidebarVisible,
      rightSidebarAvailable,
      pluginManagerVisible,
    },
  }) => ({
    windowIsFocused,
    leftSidebarVisible,
    rightSidebarVisible,
    rightSidebarAvailable,
    pluginManagerVisible,
  }),
  {
    toggleBugDialogVisible,
    toggleLeftSidebarVisible,
    toggleRightSidebarVisible,
    togglePluginManagerVisible,
  },
)(TitleBar);
