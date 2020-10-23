/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Layout, styled} from '../../ui';
import {Input, Typography, Button, Collapse} from 'antd';
import {
  DownOutlined,
  UpOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
  SettingOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {LeftSidebar, SidebarTitle} from '../LeftSidebar';
import {PluginNotification} from '../../reducers/notifications';
import {theme} from '../theme';

const {Title, Text, Paragraph} = Typography;

// NOTE: remove after the component link to state
const notificationExample: Array<PluginNotification> = [
  {
    notification: {
      id: 'testid_0',
      title: `
      CRASH: FATAL EXCEPTION:
      mainReason: java.lang.RuntimeException: Artificially triggered crash from Flipper sample app
      `,
      message:
        'very very very very very very very very very very very very very very very very very very very very very long',
      severity: 'error',
    },
    pluginId: 'testPluginId',
    client: 'iPortaldroid',
  },
  {
    notification: {
      id: 'testid_1',
      title: `CRASH: FATAL EXCEPTION:
      mainReason: java.lang.RuntimeException: Artificially triggered crash from Flipper sample app
      `,
      message: `FATAL EXCEPTION: main`,
      severity: 'error',
    },
    pluginId: 'testPluginId',
    client: 'iPortaldroid',
  },
  {
    notification: {
      id: 'testid_2',
      action: '1',
      title: `CRASH: FATAL EXCEPTION: mainReason: java.lang.RuntimeException: Artificially triggered`,
      message: `Callstack: FATAL EXCEPTION: main Process: com.facebook.flipper.sample, PID: 1646 java.lang.RuntimeException: Artificially triggered crash from Flipper sample app at com.facebook.flipper.sample.RootComponentSpec`,
      severity: 'error',
      category:
        'java.lang.RuntimeException: Artificially triggered crash from Flipper sample app',
    },
    pluginId: 'CrashReporter',
    client: 'emulator-5554',
  },
];

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

function DetailCollapse({detail}: {detail: string | React.ReactNode}) {
  const detailView =
    typeof detail === 'string' ? (
      <Paragraph
        type="secondary"
        style={{
          fontSize: theme.fontSize.smallBody,
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
            <Text type="secondary" style={{fontSize: theme.fontSize.smallBody}}>
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
  const {notification: content, pluginId, client} = notification;
  // TODO: figure out how to transform app name to icon
  const icon = React.createElement(ExclamationCircleOutlined, {
    style: {color: theme.primaryColor},
  });
  return (
    <Layout.Vertical gap="small" pad="medium">
      <Layout.Horizontal gap="tiny" center>
        {icon}
        <Text>{pluginId}</Text>
      </Layout.Horizontal>
      <Title level={4} ellipsis={{rows: 2}}>
        {content.title}
      </Title>
      <Text type="secondary" style={{fontSize: theme.fontSize.smallBody}}>
        {client}
      </Text>
      <Button style={{width: 'fit-content'}} size="small">
        Open
      </Button>
      <DetailCollapse detail={content.message} />
    </Layout.Vertical>
  );
}

function NotificationList({
  notifications,
}: {
  notifications: Array<PluginNotification>;
}) {
  return (
    <Layout.ScrollContainer vertical>
      <Layout.Vertical>
        {notifications.map((notification) => (
          <NotificationEntry
            key={notification.notification.id}
            notification={notification}
          />
        ))}
      </Layout.Vertical>
    </Layout.ScrollContainer>
  );
}

export function Notification() {
  const actions = (
    <div>
      <Layout.Horizontal gap="medium">
        <SettingOutlined style={{fontSize: theme.space.large}} />
        <DeleteOutlined style={{fontSize: theme.space.large}} />
      </Layout.Horizontal>
    </div>
  );
  return (
    <LeftSidebar>
      <Layout.Top>
        <Layout.Vertical gap="tiny" padv="tiny" borderBottom>
          <SidebarTitle actions={actions}>notifications</SidebarTitle>
          <Layout.Container padh="medium" padv="small">
            <Input placeholder="Search..." prefix={<SearchOutlined />} />
          </Layout.Container>
        </Layout.Vertical>
        <NotificationList notifications={notificationExample} />
      </Layout.Top>
    </LeftSidebar>
  );
}
