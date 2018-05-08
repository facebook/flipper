/**
 * Copyright 2004-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import {Component, FlexColumn, Sidebar, colors} from 'sonar';
import Intro from './ui/components/intro/intro.js';
import {connect} from 'react-redux';
import {
  toggleRightSidebarAvailable,
  toggleRightSidebarVisible,
} from './reducers/application.js';
import type {SonarBasePlugin} from './plugin.js';
import type LogManager from './fb-stubs/Logger';

type Props = {
  plugin: SonarBasePlugin<>,
  state?: any,
  logger: LogManager,
  rightSidebarVisible: boolean,
  rightSidebarAvailable: boolean,
  toggleRightSidebarVisible: (available: ?boolean) => void,
  toggleRightSidebarAvailable: (available: ?boolean) => void,
};

type State = {
  showIntro: boolean,
};

class PluginContainer extends Component<Props, State> {
  state = {
    showIntro:
      typeof this.props.plugin.renderIntro === 'function' &&
      window.localStorage.getItem(
        `${this.props.plugin.constructor.id}.introShown`,
      ) !== 'true',
  };

  _sidebar: ?React$Node;

  static Container = FlexColumn.extends({
    width: 0,
    flexGrow: 1,
    flexShrink: 1,
    backgroundColor: colors.white,
  });

  componentWillUnmount() {
    performance.mark(`init_${this.props.plugin.constructor.id}`);
  }

  componentDidMount() {
    this.props.logger.trackTimeSince(
      `init_${this.props.plugin.constructor.id}`,
    );
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.plugin !== this.props.plugin) {
      this.props.logger.trackTimeSince(
        `init_${this.props.plugin.constructor.id}`,
      );
    }
  }

  componentWillUpdate(nextProps: Props) {
    if (this.props.plugin !== nextProps.plugin) {
      performance.mark(`init_${nextProps.plugin.constructor.id}`);
    }
    let sidebarContent;
    if (typeof nextProps.plugin.renderSidebar === 'function') {
      sidebarContent = nextProps.plugin.renderSidebar();
    }

    if (sidebarContent == null) {
      this._sidebar = null;
      nextProps.toggleRightSidebarAvailable(false);
    } else {
      this._sidebar = (
        <Sidebar position="right" width={400} key="sidebar">
          {sidebarContent}
        </Sidebar>
      );
      nextProps.toggleRightSidebarAvailable(true);
    }
  }

  onDismissIntro = () => {
    const {plugin} = this.props;
    window.localStorage.setItem(`${plugin.constructor.id}.introShown`, 'true');
    this.setState({
      showIntro: false,
    });
  };

  render() {
    const {plugin} = this.props;

    return [
      <PluginContainer.Container key="plugin">
        {this.state.showIntro ? (
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

export default connect(
  ({application: {rightSidebarVisible, rightSidebarAvailable}}) => ({
    rightSidebarVisible,
    rightSidebarAvailable,
  }),
  {
    toggleRightSidebarAvailable,
    toggleRightSidebarVisible,
  },
)(PluginContainer);
