/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useCallback, useMemo, useState} from 'react';
import {Layout, theme, Notification as NotificationData} from 'flipper-plugin';
import {styled, Glyph} from '../../ui';
import {Input, Typography, Button, Collapse, Dropdown, Menu} from 'antd';
import {
  DownOutlined,
  UpOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
  EllipsisOutlined,
} from '@ant-design/icons';
import {LeftSidebar, SidebarTitle} from '../LeftSidebar';
import {useDispatch, useStore} from '../../utils/useStore';
import {selectPlugin} from '../../reducers/connections';
import {
  clearAllNotifications,
  PluginNotification as PluginNotificationOrig,
  updateCategoryBlocklist,
  updatePluginBlocklist,
} from '../../reducers/notifications';
import {filterNotifications} from './notificationUtils';
import {useMemoize} from 'flipper-plugin';
import BlocklistSettingButton from './BlocklistSettingButton';
import {Store} from '../../reducers';

type NotificationExtra = {
  onOpen: () => void;
  onHideSimilar: (() => void) | null;
  onHidePlugin: () => void;
  clientName: string | undefined;
  appName: string | undefined;
  pluginName: string;
  iconName: string | null | undefined;
};
type PluginNotification = NotificationData & NotificationExtra;

const {Title, Text, Paragraph} = Typography;

const CollapseContainer = styled.div({
  '.ant-collapse-ghost .ant-collapse-item': {
    '& > .ant-collapse-header': {
      paddingLeft: '16px',
    },
    '& > .ant-collapse-content > .ant-collapse-content-box': {
      padding: 0,
    },
  },
});

const ItemContainer = styled(Layout.Container)({
  '.notification-item-action': {visibility: 'hidden'},
  ':hover': {'.notification-item-action': {visibility: 'visible'}},
});

function DetailCollapse({detail}: {detail: string | React.ReactNode}) {
  const detailView =
    typeof detail === 'string' ? (
      <Paragraph
        type="secondary"
        style={{
          fontSize: theme.fontSize.small,
          marginBottom: 0,
        }}
        ellipsis={{rows: 3}}>
        {detail}
      </Paragraph>
    ) : (
      detail
    );
  return (
    <CollapseContainer>
      <Collapse
        ghost
        expandIcon={({isActive}) =>
          isActive ? (
            <UpOutlined style={{fontSize: 8, left: 0}} />
          ) : (
            <DownOutlined style={{fontSize: 8, left: 0}} />
          )
        }>
        <Collapse.Panel
          key="detail"
          header={
            <Text type="secondary" style={{fontSize: theme.fontSize.small}}>
              View detail
            </Text>
          }>
          {detailView}
        </Collapse.Panel>
      </Collapse>
    </CollapseContainer>
  );
}

function NotificationEntry({notification}: {notification: PluginNotification}) {
  const {
    onOpen,
    onHideSimilar,
    onHidePlugin,
    message,
    title,
    clientName,
    appName,
    pluginName,
    iconName,
  } = notification;

  const actions = useMemo(
    () => (
      <Layout.Horizontal className="notification-item-action">
        <Dropdown
          overlay={
            <Menu>
              {onHideSimilar && (
                <Menu.Item key="hide_similar" onClick={onHideSimilar}>
                  Hide Similar
                </Menu.Item>
              )}
              <Menu.Item key="hide_plugin" onClick={onHidePlugin}>
                Hide {pluginName}
              </Menu.Item>
            </Menu>
          }>
          <Button type="text" size="small" icon={<EllipsisOutlined />} />
        </Dropdown>
      </Layout.Horizontal>
    ),
    [onHideSimilar, onHidePlugin, pluginName],
  );

  const icon = iconName ? (
    <Glyph name={iconName} size={16} color={theme.primaryColor} />
  ) : (
    <ExclamationCircleOutlined style={{color: theme.primaryColor}} />
  );
  return (
    <ItemContainer gap="small" pad="medium">
      <Layout.Right center>
        <Layout.Horizontal gap="tiny" center>
          {icon}
          <Text style={{fontSize: theme.fontSize.small}}>{pluginName}</Text>
        </Layout.Horizontal>
        {actions}
      </Layout.Right>
      <Title level={4} ellipsis={{rows: 2}}>
        {title}
      </Title>
      <Text type="secondary" style={{fontSize: theme.fontSize.small}}>
        {clientName && appName
          ? `${clientName}/${appName}`
          : clientName ?? appName ?? 'Not Connected'}
      </Text>
      <Button style={{width: 'fit-content'}} size="small" onClick={onOpen}>
        Open {pluginName}
      </Button>
      <DetailCollapse detail={message} />
    </ItemContainer>
  );
}

function NotificationList({
  notifications,
}: {
  notifications: Array<PluginNotification>;
}) {
  return (
    <Layout.ScrollContainer vertical>
      <Layout.Container>
        {notifications.map((notification) => (
          <NotificationEntry
            key={notification.id}
            notification={notification}
          />
        ))}
      </Layout.Container>
    </Layout.ScrollContainer>
  );
}

export function Notification() {
  const store = useStore();
  const dispatch = useDispatch();

  const [searchString, setSearchString] = useState('');

  const clientPlugins = useStore((state) => state.plugins.clientPlugins);
  const devicePlugins = useStore((state) => state.plugins.devicePlugins);
  const getPlugin = useCallback(
    (id: string) => clientPlugins.get(id) || devicePlugins.get(id),
    [clientPlugins, devicePlugins],
  );

  const notifications = useStore((state) => state.notifications);

  const activeNotifications = useMemoize(filterNotifications, [
    notifications.activeNotifications,
    notifications.blocklistedPlugins,
    notifications.blocklistedCategories,
  ]);
  const displayedNotifications: Array<PluginNotification> = useMemo(
    () =>
      activeNotifications.map((noti) => {
        const client = getClientById(store, noti.client);
        const device = client
          ? client.deviceSync
          : getDeviceById(store, noti.client);
        const plugin = getPlugin(noti.pluginId);
        return {
          ...noti.notification,
          onOpen: () => {
            openNotification(store, noti);
          },
          onHideSimilar: noti.notification.category
            ? () =>
                store.dispatch(
                  updateCategoryBlocklist([
                    ...notifications.blocklistedCategories,
                    noti.notification.category!,
                  ]),
                )
            : null,
          onHidePlugin: () =>
            store.dispatch(
              updatePluginBlocklist([
                ...notifications.blocklistedPlugins,
                noti.pluginId,
              ]),
            ),
          clientName: client?.query.device_id ?? device?.displayTitle(),
          appName: client?.query.app,
          pluginName: plugin?.title ?? noti.pluginId,
          iconName: plugin?.icon,
        };
      }),
    [activeNotifications, notifications, getPlugin, store],
  );

  const actions = (
    <div>
      <Layout.Horizontal>
        <BlocklistSettingButton
          blocklistedPlugins={notifications.blocklistedPlugins}
          blocklistedCategories={notifications.blocklistedCategories}
          onRemovePlugin={(removedPluginId) =>
            dispatch(
              updatePluginBlocklist(
                notifications.blocklistedPlugins.filter(
                  (pluginId) => pluginId !== removedPluginId,
                ),
              ),
            )
          }
          onRemoveCategory={(removedCategory) =>
            dispatch(
              updateCategoryBlocklist(
                notifications.blocklistedCategories.filter(
                  (category) => category !== removedCategory,
                ),
              ),
            )
          }
        />
        <Button
          type="text"
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => dispatch(clearAllNotifications())}
        />
      </Layout.Horizontal>
    </div>
  );
  return (
    <LeftSidebar>
      <Layout.Top>
        <Layout.Container gap="tiny" padv="tiny" borderBottom>
          <SidebarTitle actions={actions}>notifications</SidebarTitle>
          <Layout.Container padh="medium" padv="small">
            <Input
              placeholder="Search..."
              prefix={<SearchOutlined />}
              value={searchString}
              onChange={(e) => setSearchString(e.target.value)}
            />
          </Layout.Container>
        </Layout.Container>
        <NotificationList notifications={displayedNotifications} />
      </Layout.Top>
    </LeftSidebar>
  );
}

export function openNotification(store: Store, noti: PluginNotificationOrig) {
  const client = getClientById(store, noti.client);
  if (client) {
    store.dispatch(
      selectPlugin({
        selectedPlugin: noti.pluginId,
        selectedApp: noti.client,
        selectedDevice: client.deviceSync,
        deepLinkPayload: noti.notification.action,
      }),
    );
  } else {
    const device = getDeviceById(store, noti.client);
    if (device) {
      store.dispatch(
        selectPlugin({
          selectedPlugin: noti.pluginId,
          selectedDevice: device,
          deepLinkPayload: noti.notification.action,
        }),
      );
    }
  }
}

function getClientById(store: Store, identifier: string | null) {
  return store.getState().connections.clients.find((c) => c.id === identifier);
}

function getDeviceById(store: Store, identifier: string | null) {
  return store
    .getState()
    .connections.devices.find((c) => c.serial === identifier);
}
