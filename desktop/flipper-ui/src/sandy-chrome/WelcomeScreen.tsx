/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {cloneElement} from 'react';
import {styled} from '../ui';
import {Modal, Button, Image, Space, Typography, Tooltip} from 'antd';
import {
  RocketOutlined,
  AppstoreAddOutlined,
  CodeOutlined,
  BugOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import {Layout, NUX, theme, Tracked, TrackingScope} from 'flipper-plugin';

const {Text, Title} = Typography;

import constants from '../fb-stubs/constants';
import config from '../fb-stubs/config';
import isProduction from '../utils/isProduction';
import {getAppVersion} from '../utils/info';
import {getFlipperLib} from 'flipper-plugin';
import {ReleaseChannel} from 'flipper-common';
import {showChangelog} from '../chrome/ChangelogSheet';

const RowContainer = styled(Layout.Horizontal)({
  alignItems: 'flex-start',
  padding: `${theme.space.small}px`,
  cursor: 'pointer',
  '&:hover, &:focus, &:active': {
    backgroundColor: theme.backgroundTransparentHover,
    borderRadius: theme.borderRadius,
    textDecoration: 'none',
  },
});

function Row(props: {
  icon: React.ReactElement;
  title: string;
  subtitle: string;
  onClick?: () => void;
}) {
  return (
    <Tracked action={props.title}>
      <RowContainer onClick={props.onClick}>
        <Space size="middle">
          {cloneElement(props.icon, {
            style: {fontSize: 36, color: theme.primaryColor},
          })}
          <Layout.Container>
            <Title level={3} style={{color: theme.primaryColor}}>
              {props.title}
            </Title>
            <Text type="secondary">{props.subtitle}</Text>
          </Layout.Container>
        </Space>
      </RowContainer>
    </Tracked>
  );
}

const openExternal = (url: string) => () => getFlipperLib().openLink(url);

export default function WelcomeScreen({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      centered
      closable={false}
      open={visible}
      footer={
        <div style={{display: 'flex', justifyContent: 'end'}}>
          <Button type="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
      onCancel={onClose}>
      <WelcomeScreenContent />
    </Modal>
  );
}

export function WelcomeScreenStaticView() {
  return (
    <Layout.Container
      center
      style={{
        justifyContent: 'center',
        overflow: 'hidden',
      }}
      pad
      grow>
      <Layout.Container width={400} center>
        <WelcomeScreenContent />
      </Layout.Container>
    </Layout.Container>
  );
}

function WelcomeScreenContent() {
  const isInsidersChannel =
    config.getReleaseChannel() === ReleaseChannel.INSIDERS;

  return (
    <TrackingScope scope="welcomescreen">
      <Space
        direction="vertical"
        size="middle"
        style={{width: '100%', padding: '0 32px 32px', alignItems: 'center'}}>
        <Image
          style={{
            filter: isInsidersChannel ? 'hue-rotate(230deg)' : 'none',
          }}
          width={125}
          height={125}
          src={
            process.env.FLIPPER_REACT_NATIVE_ONLY
              ? './icon-rn-only.png'
              : './icon.png'
          }
          preview={false}
        />
        <Title level={1}>Welcome to Flipper</Title>
        <Text>
          Using release channel{' '}
          <code
            style={{
              margin: 0,
              padding: 0,
              border: 'none',
              background: 'none',
              color: isInsidersChannel
                ? 'rgb(62, 124, 66)'
                : theme.textColorSecondary,
              textTransform: 'capitalize',
              fontSize: theme.fontSize.default,
              fontWeight: isInsidersChannel ? theme.bold : 'normal',
            }}>
            {config.getReleaseChannel()}
          </code>
        </Text>
        <Space direction="horizontal" size="middle">
          <Text style={{color: theme.textColorPlaceholder}}>
            {isProduction() ? `Version ${getAppVersion()}` : 'Development Mode'}
          </Text>
          <Tooltip title="Changelog" placement="bottom">
            <NUX title="See Flipper changelog" placement="top">
              <Button
                size="small"
                icon={<HistoryOutlined />}
                title="Changelog"
                onClick={showChangelog}
              />
            </NUX>
          </Tooltip>
        </Space>
      </Space>
      <Space direction="vertical" size="large" style={{width: '100%'}}>
        <Row
          icon={<RocketOutlined />}
          title="Using Flipper"
          subtitle="Learn how Flipper can help you debug your App"
          onClick={openExternal('https://fbflipper.com/docs/features')}
        />
        <Row
          icon={<AppstoreAddOutlined />}
          title="Create Your Own Plugin"
          subtitle="Get started with these pointers"
          onClick={openExternal('https://fbflipper.com/docs/tutorial/intro')}
        />
        <Row
          icon={<CodeOutlined />}
          title="Add Flipper Support to Your App"
          subtitle="Get started with these pointers"
          onClick={openExternal('https://fbflipper.com/docs/getting-started')}
        />
        <Row
          icon={<BugOutlined />}
          title="Contributing and Feedback"
          subtitle="Report issues and help us improve Flipper"
          onClick={openExternal(constants.FEEDBACK_GROUP_LINK)}
        />
      </Space>
    </TrackingScope>
  );
}
