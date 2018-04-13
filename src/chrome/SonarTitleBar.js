/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

import type {Devices} from '../init.js';
import {
  colors,
  Button,
  ButtonGroup,
  FlexRow,
  FlexBox,
  Component,
  Spacer,
  Glyph,
  GK,
} from 'sonar';
import {
  loadsDynamicPlugins,
  dynamicPluginPath,
} from '../utils/dynamicPluginLoading.js';
import DevicesButton from './DevicesButton.js';
import Version from './Version.js';
import AutoUpdateVersion from './AutoUpdateVersion.js';
import PropTypes from 'prop-types';

const TitleBar = FlexRow.extends(
  {
    background: props =>
      props.focused
        ? `linear-gradient(to bottom, ${
            colors.macOSTitleBarBackgroundTop
          } 0%, ${colors.macOSTitleBarBackgroundBottom} 100%)`
        : colors.macOSTitleBarBackgroundBlur,
    borderBottom: props =>
      `1px solid ${
        props.focused
          ? colors.macOSTitleBarBorder
          : colors.macOSTitleBarBorderBlur
      }`,
    height: 38,
    flexShrink: 0,
    width: '100%',
    alignItems: 'center',
    paddingLeft: 80,
    paddingRight: 10,
    justifyContent: 'space-between',
    // $FlowFixMe
    WebkitAppRegion: 'drag',
  },
  {
    ignoreAttributes: ['focused'],
  },
);

const Icon = FlexBox.extends({
  marginRight: 3,
});

type Props = {|
  leftSidebarVisible: boolean,
  onToggleLeftSidebar: () => void,
  rightSidebarVisible: ?boolean,
  devices: Devices,
  pluginManagerVisible: boolean,
  onToggleRightSidebar: () => void,
  onTogglePluginManager: () => void,
  onReportBug: () => void,
|};

export default class SonarTitleBar extends Component<Props> {
  static contextTypes = {
    windowIsFocused: PropTypes.bool,
  };
  render() {
    return (
      <TitleBar focused={this.context.windowIsFocused} className="toolbar">
        <DevicesButton devices={this.props.devices} />
        <Spacer />
        {loadsDynamicPlugins() && (
          <Icon
            title={`Plugins are loaded dynamically from ${dynamicPluginPath() ||
              ''}`}>
            <Glyph color={colors.light30} name="flash-default" size={16} />
          </Icon>
        )}
        {process.platform === 'darwin' ? <AutoUpdateVersion /> : <Version />}
        <Button
          compact={true}
          onClick={this.props.onReportBug}
          title="Report Bug"
          icon="bug"
        />
        {GK.get('sonar_dynamic_plugins') && (
          <Button
            compact={true}
            onClick={this.props.onTogglePluginManager}
            selected={this.props.pluginManagerVisible}
            title="Plugin Manager"
            icon="apps"
          />
        )}
        <ButtonGroup>
          <Button
            compact={true}
            selected={this.props.leftSidebarVisible}
            onClick={this.props.onToggleLeftSidebar}
            icon="icons/sidebar_left.svg"
            iconSize={20}
            title="Toggle Plugins"
          />
          <Button
            compact={true}
            selected={Boolean(this.props.rightSidebarVisible)}
            onClick={this.props.onToggleRightSidebar}
            icon="icons/sidebar_right.svg"
            iconSize={20}
            title="Toggle Details"
            disabled={this.props.rightSidebarVisible == null}
          />
        </ButtonGroup>
      </TitleBar>
    );
  }
}
