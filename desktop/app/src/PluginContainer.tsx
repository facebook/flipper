/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  FlipperPlugin,
  FlipperDevicePlugin,
  Props as PluginProps,
} from './plugin';
import {Logger} from './fb-interfaces/Logger';
import BaseDevice from './devices/BaseDevice';
import {pluginKey as getPluginKey} from './reducers/pluginStates';
import Client from './Client';
import {
  ErrorBoundary,
  FlexColumn,
  FlexRow,
  colors,
  styled,
  ArchivedDevice,
  Glyph,
  Label,
  VBox,
  View,
} from 'flipper';
import {
  StaticView,
  setStaticView,
  pluginIsStarred,
  starPlugin,
} from './reducers/connections';
import React, {PureComponent} from 'react';
import {connect, ReactReduxContext} from 'react-redux';
import {setPluginState} from './reducers/pluginStates';
import {selectPlugin} from './reducers/connections';
import {State as Store, MiddlewareAPI} from './reducers/index';
import {activateMenuItems} from './MenuBar';
import {Message} from './reducers/pluginMessageQueue';
import {Idler} from './utils/Idler';
import {processMessageQueue} from './utils/messageQueue';
import {ToggleButton, SmallText} from './ui';

const Container = styled(FlexColumn)({
  width: 0,
  flexGrow: 1,
  flexShrink: 1,
  backgroundColor: colors.white,
});

export const SidebarContainer = styled(FlexRow)({
  backgroundColor: colors.light02,
  height: '100%',
  overflow: 'scroll',
});

const Waiting = styled(FlexColumn)({
  width: '100%',
  height: '100%',
  flexGrow: 1,
  background: colors.light02,
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
});

function ProgressBar({progress}: {progress: number}) {
  return (
    <ProgressBarContainer>
      <ProgressBarBar progress={progress} />
    </ProgressBarContainer>
  );
}

const ProgressBarContainer = styled.div({
  border: `1px solid ${colors.cyan}`,
  borderRadius: 4,
  width: 300,
});

const ProgressBarBar = styled.div<{progress: number}>(({progress}) => ({
  background: colors.cyan,
  width: `${Math.min(100, Math.round(progress * 100))}%`,
  height: 8,
}));

type OwnProps = {
  logger: Logger;
};

type StateFromProps = {
  pluginState: Object;
  activePlugin: typeof FlipperPlugin | typeof FlipperDevicePlugin | null;
  target: Client | BaseDevice | null;
  pluginKey: string | null;
  deepLinkPayload: string | null;
  selectedApp: string | null;
  isArchivedDevice: boolean;
  pendingMessages: Message[] | undefined;
  pluginIsEnabled: boolean;
};

type DispatchFromProps = {
  selectPlugin: (payload: {
    selectedPlugin: string | null;
    selectedApp?: string | null;
    deepLinkPayload: string | null;
  }) => any;
  setPluginState: (payload: {pluginKey: string; state: any}) => void;
  setStaticView: (payload: StaticView) => void;
  starPlugin: typeof starPlugin;
};

type Props = StateFromProps & DispatchFromProps & OwnProps;

type State = {
  progress: {current: number; total: number};
};

class PluginContainer extends PureComponent<Props, State> {
  static contextType = ReactReduxContext;

  plugin:
    | FlipperPlugin<any, any, any>
    | FlipperDevicePlugin<any, any, any>
    | null
    | undefined;

  refChanged = (
    ref:
      | FlipperPlugin<any, any, any>
      | FlipperDevicePlugin<any, any, any>
      | null
      | undefined,
  ) => {
    if (this.plugin) {
      this.plugin._teardown();
      this.plugin = null;
    }
    if (ref && this.props.target) {
      activateMenuItems(ref);
      ref._init();
      this.props.logger.trackTimeSince(`activePlugin-${ref.constructor.id}`);
      this.plugin = ref;
    }
  };

  idler?: Idler;
  pluginBeingProcessed: string | null = null;

  state = {progress: {current: 0, total: 0}};

  get store(): MiddlewareAPI {
    return this.context.store;
  }

  componentWillUnmount() {
    if (this.plugin) {
      this.plugin._teardown();
      this.plugin = null;
    }
    this.cancelCurrentQueue();
  }

  componentDidMount() {
    this.processMessageQueue();
  }

  componentDidUpdate() {
    this.processMessageQueue();
  }

  processMessageQueue() {
    const {
      pluginKey,
      pendingMessages,
      activePlugin,
      pluginIsEnabled,
    } = this.props;
    if (pluginKey !== this.pluginBeingProcessed) {
      this.pluginBeingProcessed = pluginKey;
      this.cancelCurrentQueue();
      this.setState({progress: {current: 0, total: 0}});
      if (
        pluginIsEnabled &&
        activePlugin &&
        activePlugin.persistedStateReducer &&
        pluginKey &&
        pendingMessages?.length
      ) {
        const start = Date.now();
        this.idler = new Idler();
        processMessageQueue(
          activePlugin,
          pluginKey,
          this.store,
          (progress) => {
            this.setState({progress});
          },
          this.idler,
        ).then((completed) => {
          const duration = Date.now() - start;
          this.props.logger.track(
            'duration',
            'queue-processing-before-plugin-open',
            {
              completed,
              duration,
            },
            activePlugin.id,
          );
        });
      }
    }
  }

  cancelCurrentQueue() {
    if (this.idler && !this.idler.isCancelled()) {
      this.idler.cancel();
    }
  }

  render() {
    const {
      activePlugin,
      pluginKey,
      target,
      pendingMessages,
      pluginIsEnabled,
    } = this.props;
    if (!activePlugin || !target || !pluginKey) {
      console.warn(`No selected plugin. Rendering empty!`);
      return null;
    }

    if (!pluginIsEnabled) {
      return this.renderPluginEnabler();
    }
    if (!pendingMessages || pendingMessages.length === 0) {
      return this.renderPlugin();
    }
    return this.renderPluginLoader();
  }

  renderPluginEnabler() {
    const activePlugin = this.props.activePlugin!;
    return (
      <View grow>
        <Waiting>
          <VBox>
            <FlexRow>
              <Label
                style={{
                  fontSize: '16px',
                  color: colors.light30,
                  textTransform: 'uppercase',
                }}>
                {activePlugin.title}
              </Label>
            </FlexRow>
          </VBox>
          <VBox>
            <ToggleButton
              toggled={false}
              onClick={() => {
                this.props.starPlugin({
                  selectedPlugin: activePlugin.id,
                  selectedApp: (this.props.target as Client).query.app,
                });
              }}
              large
            />
          </VBox>
          <VBox>
            <SmallText>Click to enable this plugin</SmallText>
          </VBox>
        </Waiting>
      </View>
    );
  }

  renderPluginLoader() {
    return (
      <View grow>
        <Waiting>
          <VBox>
            <Glyph
              name="dashboard"
              variant="outline"
              size={24}
              color={colors.light30}
            />
          </VBox>
          <VBox>
            <Label>
              Processing {this.state.progress.total} events for{' '}
              {this.props.activePlugin?.id ?? 'plugin'}
            </Label>
          </VBox>
          <VBox>
            <ProgressBar
              progress={this.state.progress.current / this.state.progress.total}
            />
          </VBox>
        </Waiting>
      </View>
    );
  }

  renderPlugin() {
    const {
      pluginState,
      setPluginState,
      activePlugin,
      pluginKey,
      target,
      isArchivedDevice,
      selectedApp,
    } = this.props;
    if (!activePlugin || !target || !pluginKey) {
      console.warn(`No selected plugin. Rendering empty!`);
      return null;
    }
    const props: PluginProps<Object> & {
      key: string;
      ref: (
        ref:
          | FlipperPlugin<any, any, any>
          | FlipperDevicePlugin<any, any, any>
          | null
          | undefined,
      ) => void;
    } = {
      key: pluginKey,
      logger: this.props.logger,
      selectedApp,
      persistedState: activePlugin.defaultPersistedState
        ? {
            ...activePlugin.defaultPersistedState,
            ...pluginState,
          }
        : pluginState,
      setStaticView: (payload: StaticView) => this.props.setStaticView(payload),
      setPersistedState: (state) => setPluginState({pluginKey, state}),
      target,
      deepLinkPayload: this.props.deepLinkPayload,
      selectPlugin: (pluginID: string, deepLinkPayload: string | null) => {
        const {target} = this.props;
        // check if plugin will be available
        if (
          target instanceof Client &&
          target.plugins.some((p) => p === pluginID)
        ) {
          this.props.selectPlugin({selectedPlugin: pluginID, deepLinkPayload});
          return true;
        } else if (target instanceof BaseDevice) {
          this.props.selectPlugin({selectedPlugin: pluginID, deepLinkPayload});
          return true;
        } else {
          return false;
        }
      },
      ref: this.refChanged,
      isArchivedDevice,
    };
    return (
      <React.Fragment>
        <Container key="plugin">
          <ErrorBoundary
            heading={`Plugin "${
              activePlugin.title || 'Unknown'
            }" encountered an error during render`}>
            {React.createElement(activePlugin, props)}
          </ErrorBoundary>
        </Container>
        <SidebarContainer id="detailsSidebar" />
      </React.Fragment>
    );
  }
}

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  ({
    connections: {
      selectedPlugin,
      selectedDevice,
      selectedApp,
      clients,
      deepLinkPayload,
      userStarredPlugins,
    },
    pluginStates,
    plugins: {devicePlugins, clientPlugins},
    pluginMessageQueue,
  }) => {
    let pluginKey = null;
    let target = null;
    let activePlugin:
      | typeof FlipperDevicePlugin
      | typeof FlipperPlugin
      | null = null;
    let pluginIsEnabled = false;

    if (selectedPlugin) {
      activePlugin = devicePlugins.get(selectedPlugin) || null;
      target = selectedDevice;
      if (selectedDevice && activePlugin) {
        pluginKey = getPluginKey(selectedDevice.serial, activePlugin.id);
        pluginIsEnabled = true;
      } else {
        target =
          clients.find((client: Client) => client.id === selectedApp) || null;
        activePlugin = clientPlugins.get(selectedPlugin) || null;
        if (activePlugin && target) {
          pluginKey = getPluginKey(target.id, activePlugin.id);
          pluginIsEnabled = pluginIsStarred(
            userStarredPlugins,
            selectedApp,
            activePlugin.id,
          );
        }
      }
    }
    const isArchivedDevice = !selectedDevice
      ? false
      : selectedDevice instanceof ArchivedDevice;
    if (isArchivedDevice) {
      pluginIsEnabled = true;
    }

    const pendingMessages = pluginKey
      ? pluginMessageQueue[pluginKey]
      : undefined;

    const s: StateFromProps = {
      pluginState: pluginStates[pluginKey as string],
      activePlugin: activePlugin,
      target,
      deepLinkPayload,
      pluginKey,
      isArchivedDevice,
      selectedApp: selectedApp || null,
      pendingMessages,
      pluginIsEnabled,
    };
    return s;
  },
  {
    setPluginState,
    selectPlugin,
    setStaticView,
    starPlugin,
  },
)(PluginContainer);
