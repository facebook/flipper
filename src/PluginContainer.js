/**
 * Copyright 2004-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import {Component, FlexColumn, Sidebar, colors} from 'sonar';
import Intro from './ui/components/intro/intro.js';
import type {SonarBasePlugin} from './plugin.js';
import PropTypes from 'prop-types';
import type LogManager from './fb-stubs/Logger';

type PluginContainerProps = {
  plugin: SonarBasePlugin<>,
  logger: LogManager,
  rightSidebarVisible: ?boolean,
  onSetRightSidebarVisible: (visible: ?boolean) => void,
};

export default class PluginContainer extends Component<PluginContainerProps> {
  _lastState: ?Object;
  _sidebar: ?React$Node;

  static Container = FlexColumn.extends({
    width: 0,
    flexGrow: 1,
    flexShrink: 1,
    backgroundColor: colors.white,
  });

  static childContextTypes = {
    plugin: PropTypes.string,
  };

  getChildContext() {
    return {plugin: this.props.plugin.constructor.id};
  }

  componentWillUnmount() {
    performance.mark(`init_${this.props.plugin.constructor.id}`);
  }

  componentDidMount() {
    this.props.logger.trackTimeSince(
      `init_${this.props.plugin.constructor.id}`,
    );
  }

  componentDidUpdate(prevProps: PluginContainerProps) {
    if (prevProps.plugin !== this.props.plugin) {
      this.props.logger.trackTimeSince(
        `init_${this.props.plugin.constructor.id}`,
      );
    }
  }

  shouldComponentUpdate(nextProps: PluginContainerProps) {
    return (
      nextProps.rightSidebarVisible !== this.props.rightSidebarVisible ||
      nextProps.plugin !== this.props.plugin ||
      this._lastState !== this.props.plugin.state
    );
  }

  componentWillUpdate(nextProps: PluginContainerProps) {
    if (this.props.plugin !== nextProps.plugin) {
      performance.mark(`init_${nextProps.plugin.constructor.id}`);
    }
    let sidebarContent;
    if (typeof nextProps.plugin.renderSidebar === 'function') {
      sidebarContent = nextProps.plugin.renderSidebar();
    }

    if (sidebarContent == null) {
      this._sidebar = null;
      nextProps.onSetRightSidebarVisible(null);
    } else {
      this._sidebar = (
        <Sidebar position="right" width={400} key="sidebar">
          {sidebarContent}
        </Sidebar>
      );
      nextProps.onSetRightSidebarVisible(
        nextProps.rightSidebarVisible !== false,
      );
    }
  }

  onDismissIntro = () => {
    const {plugin} = this.props;
    window.localStorage.setItem(`${plugin.constructor.id}.introShown`, 'true');
    this.forceUpdate();
  };

  render() {
    const {plugin} = this.props;
    const showIntro =
      typeof plugin.renderIntro === 'function' &&
      window.localStorage.getItem(`${plugin.constructor.id}.introShown`) !==
        'true';
    this._lastState = plugin.state;
    return [
      <PluginContainer.Container key="plugin">
        {showIntro ? (
          <Intro
            title={plugin.constructor.title}
            icon={plugin.constructor.icon}
            screenshot={plugin.constructor.screenshot}
            onDismiss={this.onDismissIntro}>
            {typeof plugin.renderIntro === 'function' && plugin.renderIntro()}
          </Intro>
        ) : (
          plugin.render()
        )}
      </PluginContainer.Container>,
      this.props.rightSidebarVisible === false ? null : this._sidebar,
    ];
  }
}
