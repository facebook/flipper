/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperPlugin, FlipperDevicePlugin} from './plugin';
import {Logger} from './fb-interfaces/Logger';
import BaseDevice from './devices/BaseDevice';
import {pluginKey as getPluginKey} from './utils/pluginUtils';
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
import {StaticView, setStaticView} from './reducers/connections';
import {switchPlugin} from './reducers/pluginManager';
import React, {PureComponent} from 'react';
import {connect, ReactReduxContext} from 'react-redux';
import {selectPlugin} from './reducers/connections';
import {State as Store, MiddlewareAPI} from './reducers/index';
import {activateMenuItems} from './MenuBar';
import {Message} from './reducers/pluginMessageQueue';
import {IdlerImpl} from './utils/Idler';
import {processMessageQueue} from './utils/messageQueue';
import {Layout} from './ui';
import {theme, _SandyPluginRenderer} from 'flipper-plugin';
import {
  ActivePluginListItem,
  isDevicePlugin,
  isDevicePluginDefinition,
} from './utils/pluginUtils';
import {ContentContainer} from './sandy-chrome/ContentContainer';
import {Alert, Typography} from 'antd';
import {InstalledPluginDetails} from 'flipper-plugin-lib';
import semver from 'semver';
import {loadPlugin} from './reducers/pluginManager';
import {produce} from 'immer';
import {reportUsage} from './utils/metrics';
import {PluginInfo} from './chrome/fb-stubs/PluginInfo';
import {getActiveClient, getActivePlugin} from './selectors/connections';

const {Text, Link} = Typography;

export const SidebarContainer = styled(FlexRow)({
  backgroundColor: theme.backgroundWash,
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
};

type StateFromProps = {
  activePlugin: ActivePluginListItem | null;
  target: Client | BaseDevice | null;
  pluginKey: string | null;
  deepLinkPayload: unknown;
  pendingMessages: Message[] | undefined;
  latestInstalledVersion: InstalledPluginDetails | undefined;
};

type DispatchFromProps = {
  selectPlugin: (payload: {
    selectedPlugin: string | null;
    selectedApp?: string | null;
    deepLinkPayload: unknown;
  }) => any;
  setStaticView: (payload: StaticView) => void;
  enablePlugin: typeof switchPlugin;
  loadPlugin: typeof loadPlugin;
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

  idler?: IdlerImpl;
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
        .get(activePlugin.details.id)
        ?.triggerDeepLink(deepLinkPayload);
    }
  }

  processMessageQueue() {
    const {pluginKey, pendingMessages, activePlugin, target} = this.props;
    if (pluginKey !== this.pluginBeingProcessed) {
      this.pluginBeingProcessed = pluginKey;
      this.cancelCurrentQueue();
      this.setState((state) =>
        produce(state, (draft) => {
          draft.progress = {current: 0, total: 0};
        }),
      );
      // device plugins don't have connections so no message queues
      if (
        !activePlugin ||
        activePlugin.status !== 'enabled' ||
        isDevicePluginDefinition(activePlugin.definition)
      ) {
        return;
      }
      if (
        target instanceof Client &&
        activePlugin &&
        pluginKey &&
        pendingMessages?.length
      ) {
        const start = Date.now();
        this.idler = new IdlerImpl();
        processMessageQueue(
          target.sandyPluginStates.get(activePlugin.definition.id)!,
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
        )
          .then((completed) => {
            const duration = Date.now() - start;
            this.props.logger.track(
              'duration',
              'queue-processing-before-plugin-open',
              {
                completed,
                duration,
              },
              activePlugin.definition.id,
            );
          })
          .catch((err) =>
            console.error('Error while processing plugin message queue', err),
          );
      }
    }
  }

  cancelCurrentQueue() {
    if (this.idler && !this.idler.isCancelled()) {
      this.idler.cancel();
    }
  }

  render() {
    const {activePlugin, pluginKey, target, pendingMessages} = this.props;
    if (!activePlugin || !target || !pluginKey) {
      return null;
    }
    if (activePlugin.status !== 'enabled') {
      return this.renderPluginInfo();
    }
    if (!pendingMessages || pendingMessages.length === 0) {
      return this.renderPlugin();
    }
    return this.renderPluginLoader();
  }

  renderPluginInfo() {
    return <PluginInfo />;
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
              {this.props.activePlugin?.details?.id ?? 'plugin'}
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
    const {loadPlugin, latestInstalledVersion} = this.props;
    if (latestInstalledVersion) {
      reportUsage(
        'plugin-auto-update:alert:reloadClicked',
        {
          version: latestInstalledVersion.version,
        },
        latestInstalledVersion.id,
      );
      loadPlugin({
        plugin: latestInstalledVersion,
        enable: false,
        notifyIfFailed: true,
      });
    }
  }

  renderPlugin() {
    const {activePlugin, pluginKey, target, latestInstalledVersion} =
      this.props;
    if (
      !activePlugin ||
      !target ||
      !pluginKey ||
      activePlugin.status !== 'enabled'
    ) {
      console.warn(`No selected plugin. Rendering empty!`);
      return this.renderNoPluginActive();
    }
    const showUpdateAlert =
      latestInstalledVersion &&
      activePlugin &&
      !this.state.autoUpdateAlertSuppressed.has(
        `${latestInstalledVersion.name}@${latestInstalledVersion.version}`,
      ) &&
      semver.gt(
        latestInstalledVersion.version,
        activePlugin.definition.version,
      );
    // Make sure we throw away the container for different pluginKey!
    const instance = target.sandyPluginStates.get(activePlugin.definition.id);
    if (!instance) {
      // happens if we selected a plugin that is not enabled on a specific app or not supported on a specific device.
      return this.renderNoPluginActive();
    }

    return (
      <Layout.Top>
        <div>
          {showUpdateAlert && (
            <Alert
              message={
                <Text>
                  Plugin "{activePlugin.definition.title}" v
                  {latestInstalledVersion?.version} is downloaded and ready to
                  install. <Link onClick={this.reloadPlugin}>Reload</Link> to
                  start using the new version.
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
              activePlugin.definition.title || 'Unknown'
            }" encountered an error during render`}>
            <ContentContainer>
              <_SandyPluginRenderer key={pluginKey} plugin={instance} />
            </ContentContainer>
          </ErrorBoundary>
          <SidebarContainer id="detailsSidebar" />
        </Layout.Right>
      </Layout.Top>
    );
  }
}

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  (state: Store) => {
    let pluginKey: string | null = null;
    let target: BaseDevice | Client | null = null;
    const {
      connections: {selectedDevice, deepLinkPayload},
      plugins: {installedPlugins},
      pluginMessageQueue,
    } = state;
    const selectedClient = getActiveClient(state);
    const activePlugin = getActivePlugin(state);
    if (activePlugin) {
      if (selectedDevice && isDevicePlugin(activePlugin)) {
        target = selectedDevice;
        pluginKey = getPluginKey(
          selectedDevice.serial,
          activePlugin.details.id,
        );
      } else if (selectedClient) {
        target = selectedClient;
        pluginKey = getPluginKey(selectedClient.id, activePlugin.details.id);
      }
    }

    const pendingMessages = pluginKey
      ? pluginMessageQueue[pluginKey]
      : undefined;

    const s: StateFromProps = {
      activePlugin,
      target,
      deepLinkPayload,
      pluginKey,
      pendingMessages,
      latestInstalledVersion: installedPlugins.get(
        activePlugin?.details?.name ?? '',
      ),
    };
    return s;
  },
  {
    selectPlugin,
    setStaticView,
    enablePlugin: switchPlugin,
    loadPlugin,
  },
)(PluginContainer);
