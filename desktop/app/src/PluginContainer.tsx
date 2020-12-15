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
  PluginDefinition,
  isSandyPlugin,
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
  Glyph,
  Label,
  VBox,
  View,
} from './ui';
import {
  StaticView,
  setStaticView,
  pluginIsStarred,
  starPlugin,
} from './reducers/connections';
import React, {PureComponent} from 'react';
import {connect, ReactReduxContext} from 'react-redux';
import {setPluginState} from './reducers/pluginStates';
import {Settings} from './reducers/settings';
import {selectPlugin} from './reducers/connections';
import {State as Store, MiddlewareAPI} from './reducers/index';
import {activateMenuItems} from './MenuBar';
import {Message} from './reducers/pluginMessageQueue';
import {Idler} from './utils/Idler';
import {processMessageQueue} from './utils/messageQueue';
import {ToggleButton, SmallText, Layout} from './ui';
import {theme, TrackingScope, _SandyPluginRenderer} from 'flipper-plugin';
import {isDevicePluginDefinition} from './utils/pluginUtils';
import ArchivedDevice from './devices/ArchivedDevice';
import {ContentContainer} from './sandy-chrome/ContentContainer';
import {Alert, Typography} from 'antd';
import {InstalledPluginDetails} from 'plugin-lib';
import semver from 'semver';
import {activatePlugin} from './reducers/pluginManager';
import {produce} from 'immer';

const {Text, Link} = Typography;

const Container = styled(FlexColumn)({
  width: 0,
  flexGrow: 1,
  flexShrink: 1,
  backgroundColor: colors.white,
});

export const SidebarContainer = styled(FlexRow)({
  backgroundColor: colors.light02,
  height: '100%',
  overflow: 'auto',
});

const Waiting = styled(FlexColumn)({
  width: '100%',
  height: '100%',
  flexGrow: 1,
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
  isSandy?: boolean;
};

type StateFromProps = {
  pluginState: Object;
  activePlugin: PluginDefinition | undefined;
  target: Client | BaseDevice | null;
  pluginKey: string | null;
  deepLinkPayload: unknown;
  selectedApp: string | null;
  isArchivedDevice: boolean;
  pendingMessages: Message[] | undefined;
  pluginIsEnabled: boolean;
  settingsState: Settings;
  latestInstalledVersion: InstalledPluginDetails | undefined;
};

type DispatchFromProps = {
  selectPlugin: (payload: {
    selectedPlugin: string | null;
    selectedApp?: string | null;
    deepLinkPayload: unknown;
  }) => any;
  setPluginState: (payload: {pluginKey: string; state: any}) => void;
  setStaticView: (payload: StaticView) => void;
  starPlugin: typeof starPlugin;
  activatePlugin: typeof activatePlugin;
};

type Props = StateFromProps & DispatchFromProps & OwnProps;

type State = {
  progress: {current: number; total: number};
  autoUpdateAlertSuppressed: Set<string>;
};

class PluginContainer extends PureComponent<Props, State> {
  static contextType = ReactReduxContext;

  constructor(props: Props) {
    super(props);
    this.reloadPlugin = this.reloadPlugin.bind(this);
  }

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
    // N.B. for Sandy plugins this lifecycle is managed by PluginRenderer
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

  state = {
    progress: {current: 0, total: 0},
    autoUpdateAlertSuppressed: new Set<string>(),
  };

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
    // make sure deeplinks are propagated
    const {deepLinkPayload, target, activePlugin} = this.props;
    if (deepLinkPayload && activePlugin && target) {
      target.sandyPluginStates
        .get(activePlugin.id)
        ?.triggerDeepLink(deepLinkPayload);
    }
  }

  processMessageQueue() {
    const {
      pluginKey,
      pendingMessages,
      activePlugin,
      pluginIsEnabled,
      target,
    } = this.props;
    if (pluginKey !== this.pluginBeingProcessed) {
      this.pluginBeingProcessed = pluginKey;
      this.cancelCurrentQueue();
      this.setState((state) =>
        produce(state, (draft) => {
          draft.progress = {current: 0, total: 0};
        }),
      );
      // device plugins don't have connections so no message queues
      if (!activePlugin || isDevicePluginDefinition(activePlugin)) {
        return;
      }
      if (
        pluginIsEnabled &&
        target instanceof Client &&
        activePlugin &&
        (isSandyPlugin(activePlugin) || activePlugin.persistedStateReducer) &&
        pluginKey &&
        pendingMessages?.length
      ) {
        const start = Date.now();
        this.idler = new Idler();
        processMessageQueue(
          isSandyPlugin(activePlugin)
            ? target.sandyPluginStates.get(activePlugin.id)!
            : activePlugin,
          pluginKey,
          this.store,
          (progress) => {
            this.setState((state) =>
              produce(state, (draft) => {
                draft.progress = progress;
              }),
            );
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
                  plugin: activePlugin,
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

  renderNoPluginActive() {
    return (
      <View grow>
        <Waiting>
          <VBox>
            <Glyph
              name="cup"
              variant="outline"
              size={24}
              color={colors.light30}
            />
          </VBox>
          <VBox>
            <Label>No plugin selected</Label>
          </VBox>
        </Waiting>
      </View>
    );
  }

  reloadPlugin() {
    const {activatePlugin, latestInstalledVersion} = this.props;
    if (latestInstalledVersion) {
      activatePlugin({
        plugin: latestInstalledVersion,
        enable: false,
        notifyIfFailed: true,
      });
    }
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
      settingsState,
      isSandy,
      latestInstalledVersion,
    } = this.props;
    if (!activePlugin || !target || !pluginKey) {
      console.warn(`No selected plugin. Rendering empty!`);
      return this.renderNoPluginActive();
    }
    let pluginElement: null | React.ReactElement<any>;
    const showUpdateAlert =
      latestInstalledVersion &&
      activePlugin &&
      !this.state.autoUpdateAlertSuppressed.has(
        `${latestInstalledVersion.name}@${latestInstalledVersion.version}`,
      ) &&
      semver.gt(latestInstalledVersion.version, activePlugin.version);
    if (isSandyPlugin(activePlugin)) {
      // Make sure we throw away the container for different pluginKey!
      const instance = target.sandyPluginStates.get(activePlugin.id);
      if (!instance) {
        // happens if we selected a plugin that is not enabled on a specific app or not supported on a specific device.
        return this.renderNoPluginActive();
      }
      pluginElement = (
        <_SandyPluginRenderer key={pluginKey} plugin={instance} />
      );
    } else {
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
        setStaticView: (payload: StaticView) =>
          this.props.setStaticView(payload),
        setPersistedState: (state) => setPluginState({pluginKey, state}),
        target,
        deepLinkPayload: this.props.deepLinkPayload,
        selectPlugin: (pluginID: string, deepLinkPayload: unknown) => {
          const {target} = this.props;
          // check if plugin will be available
          if (
            target instanceof Client &&
            target.plugins.some((p) => p === pluginID)
          ) {
            this.props.selectPlugin({
              selectedPlugin: pluginID,
              deepLinkPayload,
            });
            return true;
          } else if (target instanceof BaseDevice) {
            this.props.selectPlugin({
              selectedPlugin: pluginID,
              deepLinkPayload,
            });
            return true;
          } else {
            return false;
          }
        },
        ref: this.refChanged,
        isArchivedDevice,
        settingsState,
      };
      pluginElement = (
        <TrackingScope scope={'plugin:' + activePlugin.id}>
          {React.createElement(activePlugin, props)}
        </TrackingScope>
      );
    }
    return isSandy ? (
      <Layout.Top>
        <div>
          {showUpdateAlert && (
            <Alert
              message={
                <Text>
                  Plugin "{activePlugin.title}" v
                  {latestInstalledVersion?.version} downloaded and ready to
                  install. <Link onClick={this.reloadPlugin}>Reload</Link> to
                  start using new version.
                </Text>
              }
              type="info"
              onClose={() =>
                this.setState((state) =>
                  produce(state, (draft) => {
                    draft.autoUpdateAlertSuppressed.add(
                      `${latestInstalledVersion?.name}@${latestInstalledVersion?.version}`,
                    );
                  }),
                )
              }
              style={{marginBottom: theme.space.large}}
              showIcon
              closable
            />
          )}
        </div>
        <Layout.Right>
          <ErrorBoundary
            heading={`Plugin "${
              activePlugin.title || 'Unknown'
            }" encountered an error during render`}>
            <ContentContainer>{pluginElement}</ContentContainer>
          </ErrorBoundary>
          <SidebarContainer id="detailsSidebar" />
        </Layout.Right>
      </Layout.Top>
    ) : (
      <React.Fragment>
        <Container key="plugin">
          <ErrorBoundary
            heading={`Plugin "${
              activePlugin.title || 'Unknown'
            }" encountered an error during render`}>
            {pluginElement}
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
    pluginManager: {installedPlugins},
    pluginMessageQueue,
    settingsState,
  }) => {
    let pluginKey = null;
    let target = null;
    let activePlugin: PluginDefinition | undefined;
    let pluginIsEnabled = false;

    if (selectedPlugin) {
      activePlugin = devicePlugins.get(selectedPlugin);
      target = selectedDevice;
      if (selectedDevice && activePlugin) {
        pluginKey = getPluginKey(selectedDevice.serial, activePlugin.id);
        pluginIsEnabled = true;
      } else {
        target =
          clients.find((client: Client) => client.id === selectedApp) || null;
        activePlugin = clientPlugins.get(selectedPlugin);
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
      settingsState,
      latestInstalledVersion: installedPlugins.get(
        activePlugin?.packageName ?? '',
      ),
    };
    return s;
  },
  {
    setPluginState,
    selectPlugin,
    setStaticView,
    starPlugin,
    activatePlugin,
  },
)(PluginContainer);
