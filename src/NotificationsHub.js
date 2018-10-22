/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {SearchableProps, FlipperBasePlugin, Device} from 'flipper';
import type {PluginNotification} from './reducers/notifications';
import {selectPlugin} from './reducers/connections';

import {
  FlipperDevicePlugin,
  Searchable,
  Button,
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
import plugins from './plugins/index';
import {clipboard} from 'electron';
import PropTypes from 'prop-types';
import {
  clearAllNotifications,
  updatePluginBlacklist,
} from './reducers/notifications';
import {createPaste, textContent} from './utils/index';

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
    return (
      <ConnectedNotificationsTable
        onClear={this.onClear}
        selectedID={this.props.deepLinkPayload}
        onSelectPlugin={this.props.selectPlugin}
        defaultFilters={this.context.store
          .getState()
          .notifications.blacklistedPlugins.map(value => ({
            value,
            invertible: false,
            type: 'exclude',
            key: 'plugin',
          }))}
        actions={
          <Fragment>
            <Button onClick={this.onClear}>Clear</Button>
          </Fragment>
        }
      />
    );
  }
}

type Props = {|
  ...SearchableProps,
  activeNotifications: Array<PluginNotification>,
  invalidatedNotifications: Array<PluginNotification>,
  blacklistedPlugins: Array<string>,
  onClear: () => void,
  updatePluginBlacklist: (blacklist: Array<string>) => mixed,
  selectPlugin: ({
    selectedPlugin: ?string,
    selectedApp: ?string,
    deepLinkPayload?: ?string,
  }) => mixed,
  selectedID: ?string,
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
  static getDerivedStateFromProps(props: Props): State {
    return {
      selectedNotification: props.selectedID,
    };
  }

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
    }
  }

  onHide = (pluginId: string) => {
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

  getFilter = (): ((n: PluginNotification) => boolean) => (
    n: PluginNotification,
  ) => {
    const searchTerm = this.props.searchTerm.toLowerCase();
    const blacklist = new Set(
      this.props.blacklistedPlugins.map(p => p.toLowerCase()),
    );
    if (blacklist.has(n.pluginId.toLowerCase())) {
      return false;
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

  render() {
    const activeNotifications = this.props.activeNotifications
      .filter(this.getFilter())
      .map((n: PluginNotification) => (
        <NotificationItem
          key={n.notification.id}
          {...n}
          isSelected={this.state.selectedNotification === n.notification.id}
          onClick={() =>
            this.setState({selectedNotification: n.notification.id})
          }
          onClear={this.props.onClear}
          onHide={() => this.onHide(n.pluginId)}
          selectPlugin={this.props.selectPlugin}
        />
      ))
      .reverse();

    const invalidatedNotifications = this.props.invalidatedNotifications
      .filter(this.getFilter())
      .map((n: PluginNotification) => (
        <NotificationItem
          key={n.notification.id}
          {...n}
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

const ConnectedNotificationsTable = connect(
  ({
    notifications: {
      activeNotifications,
      invalidatedNotifications,
      blacklistedPlugins,
    },
  }) => ({
    activeNotifications,
    invalidatedNotifications,
    blacklistedPlugins,
  }),
  {
    updatePluginBlacklist,
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
  width: 55,
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
  onClick?: () => mixed,
  onHide?: () => mixed,
  isSelected?: boolean,
  inactive?: boolean,
  selectPlugin?: ({
    selectedPlugin: ?string,
    selectedApp: ?string,
    deepLinkPayload?: ?string,
  }) => mixed,
};

class NotificationItem extends Component<ItemProps> {
  constructor(props: ItemProps) {
    super(props);
    const plugin = plugins.find(p => p.id === props.pluginId);

    const items = [];
    if (props.onHide && plugin) {
      items.push({
        label: `Hide ${plugin.title} plugin`,
        click: this.props.onHide,
      });
    }
    items.push(
      {label: 'Copy', click: this.copy},
      {label: 'Create Paste', click: this.createPaste},
    );

    this.contextMenuItems = items;
    this.plugin = plugin;
  }

  plugin: ?Class<FlipperBasePlugin<>>;
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

  render() {
    const {notification, isSelected, inactive, onHide} = this.props;
    const {action} = notification;

    return (
      <ContextMenu
        data-role="notification"
        component={NotificationBox}
        severity={notification.severity}
        onClick={this.props.onClick}
        isSelected={isSelected}
        inactive={inactive}
        items={this.contextMenuItems}>
        <Glyph name={this.plugin?.icon || 'bell'} size={12} />
        <NotificationContent isSelected={isSelected}>
          <Title>{notification.title}</Title>
          {notification.message}
          {!inactive &&
            isSelected &&
            this.plugin &&
            (action || onHide) && (
              <Actions>
                <FlexRow>
                  {action && (
                    <Button onClick={this.openDeeplink}>
                      Open in {this.plugin.title}
                    </Button>
                  )}
                  {onHide && (
                    <Button onClick={onHide}>Hide {this.plugin.title}</Button>
                  )}
                </FlexRow>
                <span>
                  {notification.timestamp
                    ? new Date(notification.timestamp).toTimeString()
                    : ''}
                </span>
              </Actions>
            )}
        </NotificationContent>
        {action &&
          !inactive &&
          !isSelected && (
            <FlexColumn style={{alignSelf: 'center'}}>
              {action && (
                <NotificationButton compact onClick={this.openDeeplink}>
                  Open
                </NotificationButton>
              )}
              {onHide && (
                <NotificationButton compact onClick={onHide}>
                  Hide
                </NotificationButton>
              )}
            </FlexColumn>
          )}
      </ContextMenu>
    );
  }
}
