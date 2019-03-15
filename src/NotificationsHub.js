/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {
  SearchableProps,
  FlipperBasePlugin,
  FlipperPlugin,
  Device,
} from 'flipper';
import type {PluginNotification} from './reducers/notifications';
import type {Logger} from './fb-interfaces/Logger';

import {
  FlipperDevicePlugin,
  Searchable,
  Button,
  ButtonGroup,
  FlexBox,
  FlexColumn,
  FlexRow,
  Glyph,
  ContextMenu,
  styled,
  colors,
} from 'flipper';
import {connect} from 'react-redux';
import React, {Component, Fragment} from 'react';
import {clipboard} from 'electron';
import PropTypes from 'prop-types';
import {
  clearAllNotifications,
  updatePluginBlacklist,
  updateCategoryBlacklist,
} from './reducers/notifications';
import {selectPlugin} from './reducers/connections';
import {textContent} from './utils/index';
import createPaste from './fb-stubs/createPaste';

export default class Notifications extends FlipperDevicePlugin<{}> {
  static id = 'notifications';
  static title = 'Notifications';
  static icon = 'bell';
  static keyboardActions = ['clear'];

  static contextTypes = {
    store: PropTypes.object.isRequired,
  };

  static supportsDevice(device: Device) {
    return false;
  }

  onKeyboardAction = (action: string) => {
    if (action === 'clear') {
      this.onClear();
    }
  };

  onClear = () => {
    this.context.store.dispatch(clearAllNotifications());
  };

  render() {
    const {
      blacklistedPlugins,
      blacklistedCategories,
    } = this.context.store.getState().notifications;
    return (
      <ConnectedNotificationsTable
        onClear={this.onClear}
        selectedID={this.props.deepLinkPayload}
        onSelectPlugin={this.props.selectPlugin}
        logger={this.props.logger}
        defaultFilters={[
          ...blacklistedPlugins.map(value => ({
            value,
            invertible: false,
            type: 'exclude',
            key: 'plugin',
          })),
          ...blacklistedCategories.map(value => ({
            value,
            invertible: false,
            type: 'exclude',
            key: 'category',
          })),
        ]}
        actions={
          <Fragment>
            <Button onClick={this.onClear}>Clear</Button>
          </Fragment>
        }
      />
    );
  }
}

type OwnProps = {|
  ...SearchableProps,
  onClear: () => void,
  selectedID: ?string,
  logger: Logger,
|};

type Props = {|
  ...OwnProps,
  activeNotifications: Array<PluginNotification>,
  invalidatedNotifications: Array<PluginNotification>,
  blacklistedPlugins: Array<string>,
  blacklistedCategories: Array<string>,
  devicePlugins: Map<string, Class<FlipperDevicePlugin<>>>,
  clientPlugins: Map<string, Class<FlipperPlugin<>>>,
  updatePluginBlacklist: (blacklist: Array<string>) => mixed,
  updateCategoryBlacklist: (blacklist: Array<string>) => mixed,
  selectPlugin: (payload: {|
    selectedPlugin: ?string,
    selectedApp: ?string,
    deepLinkPayload: ?string,
  |}) => mixed,
|};

type State = {|
  selectedNotification: ?string,
|};

const Content = styled(FlexColumn)({
  padding: '0 10px',
  backgroundColor: colors.light02,
  overflow: 'scroll',
  flexGrow: 1,
});

const Heading = styled(FlexBox)({
  display: 'block',
  alignItems: 'center',
  marginTop: 15,
  marginBottom: 5,
  color: colors.macOSSidebarSectionTitle,
  fontSize: 11,
  fontWeight: 500,
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  flexShrink: 0,
});

const NoContent = styled(FlexColumn)({
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
  flexGrow: 1,
  fontWeight: 500,
  lineHeight: 2.5,
  color: colors.light30,
});

class NotificationsTable extends Component<Props, State> {
  contextMenuItems = [{label: 'Clear all', click: this.props.onClear}];
  state: State = {
    selectedNotification: this.props.selectedID,
  };

  componentDidUpdate(prevProps: Props) {
    if (this.props.filters.length !== prevProps.filters.length) {
      this.props.updatePluginBlacklist(
        this.props.filters
          .filter(f => f.type === 'exclude' && f.key.toLowerCase() === 'plugin')
          .map(f => String(f.value)),
      );

      this.props.updateCategoryBlacklist(
        this.props.filters
          .filter(
            f => f.type === 'exclude' && f.key.toLowerCase() === 'category',
          )
          .map(f => String(f.value)),
      );
    }

    if (
      this.props.selectedID &&
      prevProps.selectedID !== this.props.selectedID
    ) {
      this.setState({
        selectedNotification: this.props.selectedID,
      });
    }
  }

  onHidePlugin = (pluginId: string) => {
    // add filter to searchbar
    this.props.addFilter({
      value: pluginId,
      type: 'exclude',
      key: 'plugin',
      invertible: false,
    });
    this.props.updatePluginBlacklist(
      this.props.blacklistedPlugins.concat(pluginId),
    );
  };

  onHideCategory = (category: string) => {
    // add filter to searchbar
    this.props.addFilter({
      value: category,
      type: 'exclude',
      key: 'category',
      invertible: false,
    });
    this.props.updatePluginBlacklist(
      this.props.blacklistedCategories.concat(category),
    );
  };

  getFilter = (): ((n: PluginNotification) => boolean) => (
    n: PluginNotification,
  ) => {
    const searchTerm = this.props.searchTerm.toLowerCase();

    // filter plugins
    const blacklistedPlugins = new Set(
      this.props.blacklistedPlugins.map(p => p.toLowerCase()),
    );
    if (blacklistedPlugins.has(n.pluginId.toLowerCase())) {
      return false;
    }

    // filter categories
    const {category} = n.notification;
    if (category) {
      const blacklistedCategories = new Set(
        this.props.blacklistedCategories.map(p => p.toLowerCase()),
      );
      if (blacklistedCategories.has(category.toLowerCase())) {
        return false;
      }
    }

    if (searchTerm.length === 0) {
      return true;
    } else if (n.notification.title.toLowerCase().indexOf(searchTerm) > -1) {
      return true;
    } else if (
      typeof n.notification.message === 'string' &&
      n.notification.message.toLowerCase().indexOf(searchTerm) > -1
    ) {
      return true;
    }
    return false;
  };

  getPlugin = (id: string) =>
    this.props.clientPlugins.get(id) || this.props.devicePlugins.get(id);

  render() {
    const activeNotifications = this.props.activeNotifications
      .filter(this.getFilter())
      .map((n: PluginNotification) => {
        const {category} = n.notification;

        return (
          <NotificationItem
            key={n.notification.id}
            {...n}
            plugin={this.getPlugin(n.pluginId)}
            isSelected={this.state.selectedNotification === n.notification.id}
            onHighlight={() =>
              this.setState({selectedNotification: n.notification.id})
            }
            onClear={this.props.onClear}
            onHidePlugin={() => this.onHidePlugin(n.pluginId)}
            onHideCategory={
              category ? () => this.onHideCategory(category) : undefined
            }
            selectPlugin={this.props.selectPlugin}
            logger={this.props.logger}
          />
        );
      })
      .reverse();

    const invalidatedNotifications = this.props.invalidatedNotifications
      .filter(this.getFilter())
      .map((n: PluginNotification) => (
        <NotificationItem
          key={n.notification.id}
          {...n}
          plugin={this.getPlugin(n.pluginId)}
          onClear={this.props.onClear}
          inactive
        />
      ))
      .reverse();

    return (
      <ContextMenu items={this.contextMenuItems} component={Content}>
        {activeNotifications.length > 0 && (
          <Fragment>
            <Heading>Active notifications</Heading>
            <FlexColumn shrink={false}>{activeNotifications}</FlexColumn>
          </Fragment>
        )}
        {invalidatedNotifications.length > 0 && (
          <Fragment>
            <Heading>Past notifications</Heading>
            <FlexColumn shrink={false}>{invalidatedNotifications}</FlexColumn>
          </Fragment>
        )}
        {activeNotifications.length + invalidatedNotifications.length === 0 && (
          <NoContent>
            <Glyph
              name="bell-null"
              size={24}
              variant="outline"
              color={colors.light30}
            />
            No Notifications
          </NoContent>
        )}
      </ContextMenu>
    );
  }
}

const ConnectedNotificationsTable = connect<Props, OwnProps, _, _, _, _>(
  ({
    notifications: {
      activeNotifications,
      invalidatedNotifications,
      blacklistedPlugins,
      blacklistedCategories,
    },
    plugins: {devicePlugins, clientPlugins},
  }) => ({
    activeNotifications,
    invalidatedNotifications,
    blacklistedPlugins,
    blacklistedCategories,
    devicePlugins,
    clientPlugins,
  }),
  {
    updatePluginBlacklist,
    updateCategoryBlacklist,
    selectPlugin,
  },
)(Searchable(NotificationsTable));

const shadow = (props, hover) => {
  if (props.inactive) {
    return `inset 0 0 0 1px ${colors.light10}`;
  }
  let shadow = ['1px 1px 5px rgba(0,0,0,0.1)'];
  if (props.isSelected) {
    shadow.push(`inset 0 0 0 2px ${colors.macOSTitleBarIconSelected}`);
  }

  return shadow.join(',');
};

const SEVERITY_COLOR_MAP = {
  warning: colors.yellow,
  error: colors.red,
};

const NotificationBox = styled(FlexRow)(props => ({
  backgroundColor: props.inactive ? 'transparent' : colors.white,
  opacity: props.inactive ? 0.5 : 1,
  alignItems: 'flex-start',
  borderRadius: 5,
  padding: 10,
  flexShrink: 0,
  overflow: 'hidden',
  position: 'relative',
  marginBottom: 10,
  boxShadow: shadow(props),
  '::before': {
    content: '""',
    display: !props.inactive && !props.isSelected ? 'block' : 'none',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: SEVERITY_COLOR_MAP[props.severity] || colors.info,
  },
  ':hover': {
    boxShadow: shadow(props, true),
    '& > *': {
      opacity: 1,
    },
  },
}));

const Title = styled('div')({
  minWidth: 150,
  color: colors.light80,
  flexShrink: 0,
  marginBottom: 6,
  fontWeight: 500,
  lineHeight: 1,
  fontSize: '1.1em',
});

const NotificationContent = styled(FlexColumn)(props => ({
  marginLeft: 6,
  marginRight: 10,
  flexGrow: 1,
  overflow: 'hidden',
  maxHeight: props.isSelected ? 'none' : 56,
  lineHeight: 1.4,
  color: props.isSelected ? colors.light50 : colors.light30,
}));

const Actions = styled(FlexRow)({
  alignItems: 'center',
  justifyContent: 'space-between',
  color: colors.light20,
  marginTop: 12,
  borderTop: `1px solid ${colors.light05}`,
  paddingTop: 8,
});

const NotificationButton = styled('div')({
  border: `1px solid ${colors.light20}`,
  color: colors.light50,
  borderRadius: 4,
  textAlign: 'center',
  padding: 4,
  width: 80,
  marginBottom: 4,
  opacity: 0,
  transition: '0.15s opacity',
  '[data-role="notification"]:hover &': {
    opacity: 0.5,
  },
  ':last-child': {
    marginBottom: 0,
  },
  '[data-role="notification"] &:hover': {
    opacity: 1,
  },
});

type ItemProps = {
  ...PluginNotification,
  onHighlight?: () => mixed,
  onHidePlugin?: () => mixed,
  onHideCategory?: () => mixed,
  isSelected?: boolean,
  inactive?: boolean,
  selectPlugin?: (payload: {|
    selectedPlugin: ?string,
    selectedApp: ?string,
    deepLinkPayload: ?string,
  |}) => mixed,
  logger?: Logger,
  plugin: ?Class<FlipperBasePlugin<>>,
};

type ItemState = {|
  reportedNotHelpful: boolean,
|};

class NotificationItem extends Component<ItemProps, ItemState> {
  constructor(props: ItemProps) {
    super(props);
    const items = [];
    if (props.onHidePlugin && props.plugin) {
      items.push({
        label: `Hide ${props.plugin.title || props.plugin.id} plugin`,
        click: this.props.onHidePlugin,
      });
    }
    if (props.onHideCategory) {
      items.push({
        label: 'Hide Similar',
        click: this.props.onHideCategory,
      });
    }
    items.push(
      {label: 'Copy', click: this.copy},
      {label: 'Create Paste', click: this.createPaste},
    );

    this.contextMenuItems = items;
  }

  state = {reportedNotHelpful: false};
  contextMenuItems;
  deepLinkButton = React.createRef();

  createPaste = () => {
    createPaste(this.getContent());
  };

  copy = () => clipboard.writeText(this.getContent());

  getContent = (): string =>
    [
      this.props.notification.timestamp,
      `[${this.props.notification.severity}] ${this.props.notification.title}`,
      this.props.notification.action,
      this.props.notification.category,
      textContent(this.props.notification.message),
    ]
      .filter(Boolean)
      .join('\n');

  openDeeplink = () => {
    const {notification, pluginId, client} = this.props;
    if (this.props.selectPlugin && notification.action) {
      this.props.selectPlugin({
        selectedPlugin: pluginId,
        selectedApp: client,
        deepLinkPayload: notification.action,
      });
    }
  };

  reportNotUseful = (e: UIEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (this.props.logger) {
      this.props.logger.track(
        'usage',
        'notification-not-useful',
        this.props.notification,
      );
    }
    this.setState({reportedNotHelpful: true});
  };

  onHide = (e: UIEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (this.props.onHideCategory) {
      this.props.onHideCategory();
    } else if (this.props.onHidePlugin) {
      this.props.onHidePlugin();
    }
  };

  render() {
    const {
      notification,
      isSelected,
      inactive,
      onHidePlugin,
      onHideCategory,
      plugin,
    } = this.props;
    const {action} = notification;

    return (
      <ContextMenu
        data-role="notification"
        component={NotificationBox}
        severity={notification.severity}
        onClick={this.props.onHighlight}
        isSelected={isSelected}
        inactive={inactive}
        items={this.contextMenuItems}>
        <Glyph name={plugin?.icon || 'bell'} size={12} />
        <NotificationContent isSelected={isSelected}>
          <Title>{notification.title}</Title>
          {notification.message}
          {!inactive &&
            isSelected &&
            plugin &&
            (action || onHidePlugin || onHideCategory) && (
              <Actions>
                <FlexRow>
                  {action && (
                    <Button onClick={this.openDeeplink}>
                      Open in {plugin.title}
                    </Button>
                  )}
                  <ButtonGroup>
                    {onHideCategory && (
                      <Button onClick={onHideCategory}>Hide similar</Button>
                    )}
                    {onHidePlugin && (
                      <Button onClick={onHidePlugin}>
                        Hide {plugin.title}
                      </Button>
                    )}
                  </ButtonGroup>
                </FlexRow>
                <span>
                  {notification.timestamp
                    ? new Date(notification.timestamp).toTimeString()
                    : ''}
                </span>
              </Actions>
            )}
        </NotificationContent>
        {action && !inactive && !isSelected && (
          <FlexColumn style={{alignSelf: 'center'}}>
            {action && (
              <NotificationButton compact onClick={this.openDeeplink}>
                Open
              </NotificationButton>
            )}
            {this.state.reportedNotHelpful ? (
              <NotificationButton compact onClick={this.onHide}>
                Hide
              </NotificationButton>
            ) : (
              <NotificationButton compact onClick={this.reportNotUseful}>
                Not helpful
              </NotificationButton>
            )}
          </FlexColumn>
        )}
      </ContextMenu>
    );
  }
}
